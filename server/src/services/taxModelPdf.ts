// ============================================================================
// taxModelPdf.ts — PDF preformulario de los modelos AEAT 303 y 130
// ============================================================================
// IMPORTANTE: estos PDF NO sustituyen al formulario oficial de la AEAT.
// Son una hoja resumen para que el autónomo (o su gestor) tenga los números
// listos en orden de casillas y los copie en la sede electrónica de Hacienda.
// El layout imita el orden y la nomenclatura del modelo oficial pero no su
// formato visual exacto, por eso no es presentable directamente.
// ============================================================================

import PDFDocument from "pdfkit";
import type { TaxSummaryData } from "../controllers/dashboard.controller.js";

interface BillingProfile {
  fullName?:   string | null;
  taxId?:      string | null;
  address?:    string | null;
  postalCode?: string | null;
  city?:       string | null;
  country?:    string | null;
}

interface EmitterContext extends BillingProfile {
  tenantName: string;
  tenantTaxId?: string | null;
}

const EUR = (n: number): string =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const COLOR_TEXT      = "#1d1d1f";
const COLOR_SECONDARY = "#6e6e73";
const COLOR_BORDER    = "#d2d2d7";
const COLOR_ACCENT    = "#0a84ff";
const COLOR_SOFT      = "#f5f5f7";
const COLOR_WARN_BG   = "#fff4d6";
const COLOR_WARN_TEXT = "#8a6d00";

// ---------------------------------------------------------------------------
// MODELO 303 — IVA trimestral
// ---------------------------------------------------------------------------

export function generateModel303Pdf(
  data: TaxSummaryData,
  emitter: EmitterContext,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      bufferPages: true,
    });
    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const W = doc.page.width - 100; // ancho útil entre márgenes
    let y = 40;

    // ── Cabecera ──────────────────────────────────────────────────────────
    doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(20)
       .text("Modelo 303", 50, y);
    doc.font("Helvetica").fontSize(11).fillColor(COLOR_SECONDARY)
       .text("Autoliquidación trimestral del IVA — preformulario", 50, y + 24);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_ACCENT)
       .text(data.period.label, 50 + W - 80, y, { width: 80, align: "right" });
    y += 50;

    // Aviso "no oficial"
    doc.roundedRect(50, y, W, 28, 6).fill(COLOR_WARN_BG).fillColor(COLOR_WARN_TEXT)
       .font("Helvetica").fontSize(9.5)
       .text(
         "Documento no oficial. No sustituye al formulario AEAT. Lleva estos números a la sede electrónica de la Agencia Tributaria o entrégalos a tu gestor.",
         58, y + 7, { width: W - 16 },
       );
    y += 38;

    // ── Datos del declarante ──────────────────────────────────────────────
    doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(11)
       .text("Declarante", 50, y);
    y += 16;
    const decLines: Array<[string, string]> = [
      ["NIF",       emitter.taxId || emitter.tenantTaxId || "—"],
      ["Nombre",    emitter.fullName || emitter.tenantName],
      ["Domicilio", [emitter.address, emitter.postalCode, emitter.city, emitter.country].filter(Boolean).join(", ") || "—"],
      ["Periodo",   `${data.period.year} — Trimestre ${data.period.quarter}`],
      ["Criterio",  data.criterion === "CASH" ? "Caja" : "Devengo"],
    ];
    doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT);
    for (const [k, v] of decLines) {
      doc.fillColor(COLOR_SECONDARY).text(k, 50, y, { width: 90 });
      doc.fillColor(COLOR_TEXT).text(v, 145, y, { width: W - 95 });
      y += 14;
    }
    y += 8;

    // ── Sección A: IVA Devengado (repercutido) ────────────────────────────
    y = drawSectionTitle(doc, "A. IVA devengado (repercutido)", y, W);
    y += 4;

    // Mapeo casillas oficiales modelo 303 por tipo de IVA:
    //   Régimen general 21% → casillas 01 (base) / 03 (cuota) — la 02 es %
    //   Régimen reducido 10% → casillas 04 / 06
    //   Super-reducido 4%   → casillas 07 / 09
    // Cualquier otro tipo (0%, exento) lo agrupamos en una fila aparte.
    const boxesByRate: Record<string, { base: string; cuota: string }> = {
      "21": { base: "01", cuota: "03" },
      "10": { base: "04", cuota: "06" },
      "4":  { base: "07", cuota: "09" },
    };

    y = drawTableHeader(doc, y, W, ["Casilla", "Concepto", "Base imp.", "Cuota"]);
    let totalCuota = 0;

    // ── Régimen general (operaciones interiores corrientes) — casillas 01-09
    const domestic = data.invoices.domesticByVatRate.length > 0
      ? data.invoices.domesticByVatRate
      : [];
    for (const r of domestic) {
      const map = boxesByRate[String(r.rate)] ?? { base: "—", cuota: "—" };
      y = drawRow(doc, y, W, [
        `${map.base}/${map.cuota}`,
        `Régimen general ${r.rate}% — base / cuota`,
        EUR(r.base),
        EUR(r.vat),
      ]);
      totalCuota += r.vat;
    }

    // ── Recargo de equivalencia — casillas 16-21
    // Casillas 16/17/18 son base imponible por tipo (5,2 / 1,4 / 0,5)
    // Casillas 19/20/21 son cuota del recargo
    const surchargeBoxes: Record<string, { base: string; cuota: string }> = {
      "5.2": { base: "16", cuota: "19" },
      "5":   { base: "16", cuota: "19" }, // tolerancia decimal
      "1.4": { base: "17", cuota: "20" },
      "0.5": { base: "18", cuota: "21" },
    };
    let totalSurcharge = 0;
    for (const r of data.invoices.surchargeByRate) {
      const map = surchargeBoxes[String(r.rate)] ?? { base: "—", cuota: "—" };
      y = drawRow(doc, y, W, [
        `${map.base}/${map.cuota}`,
        `Recargo equivalencia ${r.rate}% — base / cuota`,
        EUR(r.base),
        EUR(r.surcharge),
      ]);
      totalSurcharge += r.surcharge;
    }
    if (totalSurcharge > 0) {
      totalCuota += totalSurcharge;
    }

    // ── Entregas intracomunitarias — casillas 59/60
    const intra = data.invoices.intraCommunity;
    if (intra.base > 0) {
      y = drawRow(doc, y, W, [
        "59/60",
        "Entregas intracomunitarias (art. 25 LIVA)",
        EUR(intra.base),
        EUR(intra.vat),
      ]);
      // La cuota intracomunitaria normalmente es 0, no suma a totalCuota.
    }

    if (domestic.length === 0 && totalSurcharge === 0 && intra.base === 0) {
      y = drawRow(doc, y, W, ["—", "Sin operaciones devengadas en el trimestre", "0,00 €", "0,00 €"]);
    }

    // Total IVA devengado (casilla 27 = régimen general + cuota recargo)
    y = drawSummaryRow(doc, y, W, "27", "Total cuota IVA devengado", EUR(totalCuota));
    y += 10;

    // Exportaciones a tercer país: informativo, no van al 303 estándar
    if (data.invoices.exportNet > 0) {
      doc.fillColor(COLOR_SECONDARY).font("Helvetica").fontSize(8.5)
         .text(
           `Exportaciones a tercer país (informativo): ${EUR(data.invoices.exportNet)}. No se declaran en el 303 sino en modelo 349 / aduanas.`,
           50, y, { width: W, align: "left" },
         );
      y += 16;
    }

    // ── Sección B: IVA Deducible (soportado) ──────────────────────────────
    y = drawSectionTitle(doc, "B. IVA deducible (soportado)", y, W);
    y += 4;

    y = drawTableHeader(doc, y, W, ["Casilla", "Concepto", "Base imp.", "Cuota"]);
    y = drawRow(doc, y, W, [
      "28/29",
      "Operaciones interiores corrientes",
      EUR(data.deductibleExpenses.currentNet),
      EUR(data.deductibleExpenses.currentVat),
    ]);
    if (data.deductibleExpenses.investmentNet > 0 || data.deductibleExpenses.investmentVat > 0) {
      y = drawRow(doc, y, W, [
        "30/31",
        "Bienes de inversión",
        EUR(data.deductibleExpenses.investmentNet),
        EUR(data.deductibleExpenses.investmentVat),
      ]);
    }
    y = drawSummaryRow(doc, y, W, "45", "Total a deducir", EUR(data.deductibleExpenses.totalVat));
    y += 10;

    // ── Sección C: Resultado ──────────────────────────────────────────────
    y = drawSectionTitle(doc, "C. Resultado de la liquidación", y, W);
    y += 4;

    const result   = data.model303.result;
    const isToPay  = data.model303.status === "TO_PAY";
    y = drawSummaryRow(doc, y, W, "46", "Régimen general (27 - 45)", EUR(result));
    y = drawSummaryRow(doc, y, W, "64", "Resultado de la liquidación", EUR(result));
    y += 6;

    // Caja final destacada
    doc.roundedRect(50, y, W, 36, 8)
       .fill(isToPay ? "#fef2f2" : "#ecfdf5");
    doc.fillColor(isToPay ? "#b91c1c" : "#047857")
       .font("Helvetica-Bold").fontSize(12)
       .text(isToPay ? "Resultado: A INGRESAR" : "Resultado: A COMPENSAR", 60, y + 9);
    doc.fontSize(15)
       .text(EUR(Math.abs(result)), 60, y + 9, { width: W - 20, align: "right" });
    y += 46;

    // Disclaimer final
    doc.fillColor(COLOR_SECONDARY).font("Helvetica").fontSize(8.5)
       .text(
         "Generado por HorasPRO el " +
           new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()) +
           ". Cifras calculadas a partir de las facturas emitidas y los gastos deducibles registrados. " +
           "El IVA de los costes fijos se asume al 21% por defecto si no se ha especificado otro tipo. " +
           "Verifica con tu gestor antes de presentar la declaración.",
         50, y + 8, { width: W, align: "left" },
       );

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// MODELO 130 — Pago fraccionado IRPF
// ---------------------------------------------------------------------------

export function generateModel130Pdf(
  data: TaxSummaryData,
  emitter: EmitterContext,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      bufferPages: true,
    });
    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const W = doc.page.width - 100;
    let y = 40;

    // Cabecera
    doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(20)
       .text("Modelo 130", 50, y);
    doc.font("Helvetica").fontSize(11).fillColor(COLOR_SECONDARY)
       .text("Pago fraccionado IRPF — preformulario", 50, y + 24);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_ACCENT)
       .text(data.period.label, 50 + W - 80, y, { width: 80, align: "right" });
    y += 50;

    // Aviso
    doc.roundedRect(50, y, W, 28, 6).fill(COLOR_WARN_BG).fillColor(COLOR_WARN_TEXT)
       .font("Helvetica").fontSize(9.5)
       .text(
         "Documento no oficial. El cálculo del 130 es acumulativo desde el 1 de enero. Esta hoja muestra los números del trimestre como referencia.",
         58, y + 7, { width: W - 16 },
       );
    y += 38;

    // Aviso "puede no aplicar"
    if (data.model130.mayBeExempt) {
      doc.roundedRect(50, y, W, 26, 6).fill("#eff6ff").fillColor("#1d4ed8")
         .font("Helvetica-Bold").fontSize(10)
         .text(
           "Posible exención: si más del 70% de tus ingresos llevan retención IRPF, no estás obligado a presentar el modelo 130. Consulta con tu gestor.",
           58, y + 7, { width: W - 16 },
         );
      y += 36;
    }

    // Datos del declarante (compactos)
    doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(11)
       .text("Declarante", 50, y);
    y += 16;
    const decLines: Array<[string, string]> = [
      ["NIF",       emitter.taxId || emitter.tenantTaxId || "—"],
      ["Nombre",    emitter.fullName || emitter.tenantName],
      ["Periodo",   `${data.period.year} — Trimestre ${data.period.quarter}`],
    ];
    doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXT);
    for (const [k, v] of decLines) {
      doc.fillColor(COLOR_SECONDARY).text(k, 50, y, { width: 90 });
      doc.fillColor(COLOR_TEXT).text(v, 145, y, { width: W - 95 });
      y += 14;
    }
    y += 8;

    // Tabla casillas 01-08 modelo 130 (actividades empresariales/profesionales)
    // Mostramos DOS COLUMNAS: trimestre (informativo) y acumulado YTD
    // (que es lo que de verdad va al modelo).
    y = drawSectionTitle(doc, "Pago fraccionado — Actividades económicas", y, W);
    y += 4;
    y = drawTableHeader130(doc, y, W, ["Casilla", "Concepto", "Trimestre", "Acumulado año"]);

    const ingresosQ  = data.invoices.totalNet;
    const gastosQ    = data.deductibleExpenses.totalNet;
    const beneficioQ = data.model130.grossProfit;
    const irpfQ      = data.model130.irpfRetenido;
    const ytdNet     = data.model130.ytdNet;
    const ytdGastos  = data.model130.ytdDeductibleNet;
    const ytdProfit  = data.model130.ytdProfit;
    const ytdVeinte  = ytdProfit * 0.20;
    const ytdIrpf    = data.model130.ytdIrpfRetenido;
    const prevPaid   = data.model130.previousPayments;
    const aIngresar  = data.model130.estimate;

    y = drawRow130(doc, y, W, ["01", "Ingresos",                            EUR(ingresosQ),         EUR(ytdNet)]);
    y = drawRow130(doc, y, W, ["02", "Gastos deducibles",                   EUR(gastosQ),           EUR(ytdGastos)]);
    y = drawRow130(doc, y, W, ["03", "Rendimiento neto (01 - 02)",          EUR(beneficioQ),        EUR(ytdProfit)]);
    y = drawRow130(doc, y, W, ["04", "20% sobre rendimiento neto",          EUR(beneficioQ * 0.20), EUR(ytdVeinte)]);
    y = drawRow130(doc, y, W, ["06", "Retenciones IRPF soportadas",         EUR(irpfQ),             EUR(ytdIrpf)]);
    y = drawRow130(doc, y, W, ["07", "Pagos fraccionados trim. anteriores", "—",                    EUR(prevPaid)]);
    y = drawSummaryRow(doc, y, W, "08", "Resultado a ingresar (04 - 06 - 07)", EUR(aIngresar));
    y += 8;

    // Resultado destacado
    doc.roundedRect(50, y, W, 36, 8).fill(aIngresar > 0 ? "#fef2f2" : "#ecfdf5");
    doc.fillColor(aIngresar > 0 ? "#b91c1c" : "#047857")
       .font("Helvetica-Bold").fontSize(12)
       .text(aIngresar > 0 ? "Resultado: A INGRESAR" : "Sin importe a ingresar este trimestre", 60, y + 9);
    if (aIngresar > 0) {
      doc.fontSize(15)
         .text(EUR(aIngresar), 60, y + 9, { width: W - 20, align: "right" });
    }
    y += 46;

    doc.fillColor(COLOR_SECONDARY).font("Helvetica").fontSize(8.5)
       .text(
         "Generado por HorasPRO. El modelo 130 es ACUMULATIVO desde el 1 de enero. La columna 'Acumulado año' contiene los importes que van al formulario AEAT; la columna 'Trimestre' es informativa. " +
         "La casilla 07 se calcula sumando los pagos fraccionados estimados de los trimestres anteriores del mismo ejercicio. " +
         "Verifica con tu gestor antes de presentar.",
         50, y + 8, { width: W, align: "left" },
       );

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers compartidos
// ---------------------------------------------------------------------------

function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string, y: number, W: number) {
  doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(11)
     .text(title, 50, y);
  doc.moveTo(50, y + 16).lineTo(50 + W, y + 16).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
  return y + 22;
}

function drawTableHeader(doc: InstanceType<typeof PDFDocument>, y: number, W: number, cols: string[]) {
  // Layout fijo: [60, flex, 90, 90]
  const cellY = y;
  doc.rect(50, cellY, W, 20).fill(COLOR_SOFT);
  doc.fillColor(COLOR_SECONDARY).font("Helvetica-Bold").fontSize(9);
  doc.text(cols[0] ?? "", 56,  cellY + 6, { width: 60 });
  doc.text(cols[1] ?? "", 116, cellY + 6, { width: W - 60 - 90 - 90 - 12 });
  doc.text(cols[2] ?? "", 50 + W - 180, cellY + 6, { width: 80, align: "right" });
  doc.text(cols[3] ?? "", 50 + W - 90,  cellY + 6, { width: 84, align: "right" });
  return y + 22;
}

function drawRow(doc: InstanceType<typeof PDFDocument>, y: number, W: number, cells: string[]) {
  const h = 18;
  doc.fillColor(COLOR_TEXT).font("Helvetica").fontSize(9.5);
  doc.text(cells[0] ?? "", 56,  y + 4, { width: 60 });
  doc.text(cells[1] ?? "", 116, y + 4, { width: W - 60 - 90 - 90 - 12 });
  doc.text(cells[2] ?? "", 50 + W - 180, y + 4, { width: 80, align: "right" });
  doc.text(cells[3] ?? "", 50 + W - 90,  y + 4, { width: 84, align: "right" });
  doc.moveTo(50, y + h).lineTo(50 + W, y + h).strokeColor(COLOR_BORDER).lineWidth(0.3).stroke();
  return y + h;
}

// Variantes de tabla para el modelo 130, que tiene 4 columnas con dos importes
// (trimestre + acumulado año) en lugar del 303 (base + cuota).
function drawTableHeader130(doc: InstanceType<typeof PDFDocument>, y: number, W: number, cols: string[]) {
  const cellY = y;
  doc.rect(50, cellY, W, 20).fill(COLOR_SOFT);
  doc.fillColor(COLOR_SECONDARY).font("Helvetica-Bold").fontSize(9);
  doc.text(cols[0] ?? "", 56,  cellY + 6, { width: 60 });
  doc.text(cols[1] ?? "", 116, cellY + 6, { width: W - 60 - 100 - 110 - 12 });
  doc.text(cols[2] ?? "", 50 + W - 200, cellY + 6, { width: 95, align: "right" });
  doc.text(cols[3] ?? "", 50 + W - 100, cellY + 6, { width: 95, align: "right" });
  return y + 22;
}

function drawRow130(doc: InstanceType<typeof PDFDocument>, y: number, W: number, cells: string[]) {
  const h = 18;
  doc.fillColor(COLOR_TEXT).font("Helvetica").fontSize(9.5);
  doc.text(cells[0] ?? "", 56,  y + 4, { width: 60 });
  doc.text(cells[1] ?? "", 116, y + 4, { width: W - 60 - 100 - 110 - 12 });
  doc.text(cells[2] ?? "", 50 + W - 200, y + 4, { width: 95, align: "right" });
  doc.text(cells[3] ?? "", 50 + W - 100, y + 4, { width: 95, align: "right" });
  doc.moveTo(50, y + h).lineTo(50 + W, y + h).strokeColor(COLOR_BORDER).lineWidth(0.3).stroke();
  return y + h;
}

function drawSummaryRow(doc: InstanceType<typeof PDFDocument>, y: number, W: number, box: string, label: string, value: string) {
  const h = 22;
  doc.rect(50, y, W, h).fill("#fafafa");
  doc.fillColor(COLOR_ACCENT).font("Helvetica-Bold").fontSize(10)
     .text(box, 56, y + 6, { width: 60 });
  doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(10)
     .text(label, 116, y + 6, { width: W - 60 - 90 - 12 });
  doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(11)
     .text(value, 50 + W - 90, y + 6, { width: 84, align: "right" });
  return y + h + 2;
}
