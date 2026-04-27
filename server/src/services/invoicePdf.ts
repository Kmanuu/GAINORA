// ============================================================================
// invoicePdf.ts — Generación de PDF de factura con pdfkit
// ============================================================================
// Layout limpio y legible. Cabecera con datos del emisor, recuadro con
// número/fechas, datos del receptor, tabla de líneas con IVA por línea,
// totales (base, IVA, IRPF, total a recibir), notas y pie con condiciones.
// ============================================================================

import PDFDocument from "pdfkit";

interface BillingProfile {
  fullName?:   string | null;
  taxId?:      string | null;
  address?:    string | null;
  postalCode?: string | null;
  city?:       string | null;
  country?:    string | null;
  email?:      string | null;
  phone?:      string | null;
  iban?:       string | null;
}

interface InvoiceForPdf {
  number:      number | null;
  status:      string;
  issueDate:   Date;
  dueDate:     Date | null;
  series:      { code: string; name: string };
  client:      { name: string; taxId: string | null };
  notes:       string | null;
  subtotalNet: number;
  totalVat:    number;
  totalIrpf:   number;
  totalGross:  number;
  lines: Array<{
    description: string;
    quantity:    number;
    unitPrice:   number;
    vatRate:     number;
    irpfRate:    number;
    discount:    number;
    lineNet:     number;
    lineGross:   number;
  }>;
  rectifies?: { number: number | null; series: { code: string } } | null;
}

const EUR = (n: number): string =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const FMT_DATE = (d: Date): string =>
  new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(d);

const COLOR_TEXT      = "#1d1d1f";
const COLOR_SECONDARY = "#6e6e73";
const COLOR_BORDER    = "#d2d2d7";
const COLOR_ACCENT    = "#0a84ff";
const COLOR_DANGER    = "#ff453a";

export function generateInvoicePdf(
  invoice: InvoiceForPdf,
  emitter: BillingProfile & { tenantName: string },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      // bottom:0 — toda la maquetación es por coordenadas absolutas,
      // no necesitamos page-break automático; antes producía página vacía.
      margins: { top: 40, bottom: 0, left: 50, right: 50 },
      bufferPages: true,
    });
    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // ─── Cabecera: emisor (izquierda) y recuadro (derecha) ────────────────
    const top = 40;
    const leftX = 50;
    const rightX = 350;

    doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(18)
       .text(emitter.tenantName || emitter.fullName || "—", leftX, top, { width: 280 });

    let y = top + 24;
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_SECONDARY);
    if (emitter.fullName && emitter.fullName !== emitter.tenantName) {
      doc.text(emitter.fullName, leftX, y, { width: 280 });
      y += 12;
    }
    if (emitter.taxId) {
      doc.text(`NIF/CIF: ${emitter.taxId}`, leftX, y, { width: 280 });
      y += 12;
    }
    if (emitter.address) {
      doc.text(emitter.address, leftX, y, { width: 280 });
      y += 12;
    }
    const cityLine = [emitter.postalCode, emitter.city, emitter.country].filter(Boolean).join(" · ");
    if (cityLine) {
      doc.text(cityLine, leftX, y, { width: 280 });
      y += 12;
    }
    if (emitter.email) {
      doc.text(emitter.email, leftX, y, { width: 280 });
      y += 12;
    }
    if (emitter.phone) {
      doc.text(emitter.phone, leftX, y, { width: 280 });
      y += 12;
    }
    const emitterBottom = y;

    // Recuadro de identificación de la factura (derecha)
    const boxX = rightX;
    const boxY = top;
    const boxW = 195;
    doc.roundedRect(boxX, boxY, boxW, 90, 8).strokeColor(COLOR_BORDER).lineWidth(1).stroke();

    const isVoided = invoice.status === "VOIDED";
    const isRectif = !!invoice.rectifies;
    const docLabel = isRectif ? "FACTURA RECTIFICATIVA" : "FACTURA";

    doc.font("Helvetica-Bold").fontSize(11).fillColor(isVoided ? COLOR_DANGER : COLOR_ACCENT)
       .text(docLabel, boxX + 14, boxY + 12, { width: boxW - 28 });

    const numStr = invoice.number != null ? `${invoice.series.code}-${invoice.number}` : "BORRADOR";
    doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR_TEXT)
       .text(numStr, boxX + 14, boxY + 28, { width: boxW - 28 });

    doc.font("Helvetica").fontSize(9).fillColor(COLOR_SECONDARY);
    doc.text(`Fecha emisión: ${FMT_DATE(invoice.issueDate)}`,        boxX + 14, boxY + 56, { width: boxW - 28 });
    if (invoice.dueDate) {
      doc.text(`Vencimiento:   ${FMT_DATE(invoice.dueDate)}`,        boxX + 14, boxY + 70, { width: boxW - 28 });
    } else {
      doc.text(`Estado:        ${statusLabel(invoice.status)}`,      boxX + 14, boxY + 70, { width: boxW - 28 });
    }

    if (isRectif && invoice.rectifies) {
      doc.fontSize(8).fillColor(COLOR_DANGER)
         .text(
           `Rectifica: ${invoice.rectifies.series.code}-${invoice.rectifies.number}`,
           boxX + 14, boxY + 95, { width: boxW - 28 },
         );
    }

    // ─── Bloque receptor ──────────────────────────────────────────────────
    const recipY = Math.max(emitterBottom, boxY + 120) + 10;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_SECONDARY)
       .text("FACTURADO A", leftX, recipY);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_TEXT)
       .text(invoice.client.name, leftX, recipY + 14, { width: 495 });
    if (invoice.client.taxId) {
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_SECONDARY)
         .text(`NIF/CIF: ${invoice.client.taxId}`, leftX, recipY + 32, { width: 495 });
    }

    // ─── Tabla de líneas ──────────────────────────────────────────────────
    const tableTop = recipY + 60;
    const cols = {
      desc: { x: 50,  w: 240 },
      qty:  { x: 290, w: 35  },
      unit: { x: 325, w: 60  },
      vat:  { x: 385, w: 40  },
      irpf: { x: 425, w: 40  },
      tot:  { x: 465, w: 80  },
    } as const;

    // Header
    doc.rect(50, tableTop, 495, 22).fillColor("#f5f5f7").fill();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_SECONDARY);
    doc.text("DESCRIPCIÓN", cols.desc.x + 6,  tableTop + 7, { width: cols.desc.w - 6 });
    doc.text("CANT.",        cols.qty.x,      tableTop + 7, { width: cols.qty.w, align: "right" });
    doc.text("PRECIO",       cols.unit.x,     tableTop + 7, { width: cols.unit.w, align: "right" });
    doc.text("IVA %",        cols.vat.x,      tableTop + 7, { width: cols.vat.w, align: "right" });
    doc.text("IRPF %",       cols.irpf.x,     tableTop + 7, { width: cols.irpf.w, align: "right" });
    doc.text("TOTAL",        cols.tot.x,      tableTop + 7, { width: cols.tot.w - 6, align: "right" });

    let rowY = tableTop + 24;
    doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_TEXT);

    for (const l of invoice.lines) {
      // Calcular alto de fila según descripción
      const descHeight = doc.heightOfString(l.description, { width: cols.desc.w - 6 });
      const rowHeight = Math.max(20, descHeight + 8);

      doc.fillColor(COLOR_TEXT).font("Helvetica").fontSize(9.5);
      doc.text(l.description,                cols.desc.x + 6, rowY + 4, { width: cols.desc.w - 6 });
      doc.text(formatQty(l.quantity),        cols.qty.x,      rowY + 4, { width: cols.qty.w, align: "right" });
      doc.text(EUR(l.unitPrice),             cols.unit.x,     rowY + 4, { width: cols.unit.w, align: "right" });
      doc.text(`${l.vatRate}%`,              cols.vat.x,      rowY + 4, { width: cols.vat.w, align: "right" });
      doc.text(l.irpfRate ? `${l.irpfRate}%` : "—", cols.irpf.x, rowY + 4, { width: cols.irpf.w, align: "right" });
      doc.font("Helvetica-Bold")
         .text(EUR(l.lineNet),               cols.tot.x,      rowY + 4, { width: cols.tot.w - 6, align: "right" });

      rowY += rowHeight;
      doc.strokeColor(COLOR_BORDER).lineWidth(0.5)
         .moveTo(50, rowY).lineTo(545, rowY).stroke();
    }

    // ─── Totales ──────────────────────────────────────────────────────────
    const totY = rowY + 16;
    const totLabelX = 360;
    const totValueX = 460;
    const totW = 85;

    doc.font("Helvetica").fontSize(10).fillColor(COLOR_SECONDARY);
    doc.text("Base imponible", totLabelX, totY,        { width: 100, align: "right" });
    doc.text("IVA",             totLabelX, totY + 16,  { width: 100, align: "right" });
    if (invoice.totalIrpf !== 0) {
      doc.text("Retención IRPF", totLabelX, totY + 32, { width: 100, align: "right" });
    }
    doc.fillColor(COLOR_TEXT).font("Helvetica");
    doc.text(EUR(invoice.subtotalNet),  totValueX, totY,        { width: totW, align: "right" });
    doc.text(EUR(invoice.totalVat),     totValueX, totY + 16,   { width: totW, align: "right" });
    if (invoice.totalIrpf !== 0) {
      // En facturas normales se imprime con signo - delante del valor positivo.
      // En rectificativas el totalIrpf llega ya negativo (-150) y al prefijar
      // lo dejábamos como "--150 €". Detectar el signo y escribir el formato
      // correcto en cada caso.
      const irpfAbs   = Math.abs(invoice.totalIrpf);
      const irpfLabel = invoice.totalIrpf > 0 ? `-${EUR(irpfAbs)}` : `+${EUR(irpfAbs)}`;
      doc.fillColor(COLOR_DANGER)
         .text(irpfLabel, totValueX, totY + 32, { width: totW, align: "right" });
    }

    const finalY = invoice.totalIrpf !== 0 ? totY + 56 : totY + 40;
    doc.strokeColor(COLOR_TEXT).lineWidth(1).moveTo(totLabelX, finalY).lineTo(545, finalY).stroke();

    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_TEXT)
       .text("TOTAL A RECIBIR", totLabelX, finalY + 8,  { width: 100, align: "right" });
    doc.fontSize(15)
       .text(EUR(invoice.totalGross),   totValueX, finalY + 6,  { width: totW, align: "right" });

    // ─── Notas + IBAN al pie ──────────────────────────────────────────────
    let footY = finalY + 50;
    if (invoice.notes) {
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_SECONDARY)
         .text("Notas:", 50, footY);
      doc.text(invoice.notes, 50, footY + 12, { width: 495 });
      footY += 12 + doc.heightOfString(invoice.notes, { width: 495 }) + 16;
    }

    if (emitter.iban) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_TEXT)
         .text("Forma de pago: transferencia", 50, footY);
      doc.font("Helvetica").fillColor(COLOR_SECONDARY)
         .text(`IBAN: ${emitter.iban}`, 50, footY + 12);
    }

    // Pie. y=792 es el último pixel útil con bottom margin 50 sobre A4 (842).
    // lineBreak:false impide que pdfkit añada otra página al medir overflow.
    doc.font("Helvetica").fontSize(7).fillColor(COLOR_SECONDARY)
       .text(
         "Documento generado por HorasPRO · Conserva este documento durante 5 años (LGT art. 70).",
         50, 790, { width: 495, align: "center", lineBreak: false },
       );

    if (isVoided) {
      // bufferPages permite volver a páginas ya pintadas. Sin esto, el texto
      // a fontSize 120 desbordaba el flow y se pintaba en una página nueva.
      // lineBreak:false impide que pdfkit añada otra página al hacer overflow.
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.save();
        doc.fillColor(COLOR_DANGER).opacity(0.15)
           .font("Helvetica-Bold").fontSize(120)
           .rotate(-30, { origin: [297, 421] })
           .text("ANULADA", 50, 380, {
             align: "center",
             width: 495,
             lineBreak: false,
           });
        doc.restore();
      }
    }

    doc.end();
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":  return "Borrador";
    case "ISSUED": return "Emitida";
    case "PAID":   return "Pagada";
    case "VOIDED": return "Anulada";
    default:       return status;
  }
}

function formatQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}
