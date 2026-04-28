// ============================================================================
// invoice.controller.ts — CRUD de facturas con numeración correlativa atómica
// ============================================================================
// Estados:
//   DRAFT   — sin número asignado, editable
//   ISSUED  — número asignado, inmutable salvo void
//   PAID    — vinculado a Payment con status=PAID
//   VOIDED  — anulada (rectificada por otra)
//
// La asignación del número en `issue()` corre dentro de una transacción
// para garantizar correlatividad bajo concurrencia.
// ============================================================================

import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { round2 } from "../services/paymentMath.js";
import { generateInvoicePdf } from "../services/invoicePdf.js";
import {
  computeInvoiceHash, buildQrPayload, auditPayload, GENESIS_HASH,
} from "../services/invoiceHash.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LineInput {
  description:    string;
  quantity?:      number;
  unitPrice:      number;
  vatRate?:       number;
  irpfRate?:      number;
  surchargeRate?: number;
  discount?:      number;
}

interface ComputedLine {
  description:   string;
  quantity:      number;
  unitPrice:     number;
  vatRate:       number;
  irpfRate:      number;
  surchargeRate: number;
  discount:      number;
  lineNet:       number;
  lineSurcharge: number;
  lineGross:     number;
  position:      number;
}

interface InvoiceTotals {
  subtotalNet:    number;
  totalVat:       number;
  totalIrpf:      number;
  totalSurcharge: number;
  totalGross:     number;
}

/** Recargo de equivalencia oficial según tipo de IVA. */
function defaultSurchargeFor(vatRate: number): number {
  if (vatRate === 21) return 5.2;
  if (vatRate === 10) return 1.4;
  if (vatRate === 4)  return 0.5;
  return 0;
}

function computeLine(line: LineInput, position: number): ComputedLine {
  const quantity      = line.quantity      ?? 1;
  const unitPrice     = line.unitPrice;
  const vatRate       = line.vatRate       ?? 21;
  const irpfRate      = line.irpfRate      ?? 0;
  const surchargeRate = line.surchargeRate ?? 0;
  const discount      = line.discount      ?? 0;

  // Base imponible = qty * price * (1 - discount/100). IRPF se descuenta del
  // total a recibir pero no afecta a la base; se calcula en totales.
  const lineNet       = round2(quantity * unitPrice * (1 - discount / 100));
  const lineSurcharge = round2(lineNet * surchargeRate / 100);
  // El recargo de equivalencia se SUMA al gross junto con el IVA, ya que
  // el cliente minorista lo paga al proveedor (que luego lo declara).
  const lineGross     = round2(lineNet * (1 + vatRate / 100) + lineSurcharge);

  return {
    description: line.description,
    quantity:    round2(quantity),
    unitPrice:   round2(unitPrice),
    vatRate:     round2(vatRate),
    irpfRate:    round2(irpfRate),
    surchargeRate: round2(surchargeRate),
    discount:    round2(discount),
    lineNet,
    lineSurcharge,
    lineGross,
    position,
  };
}

function computeTotals(lines: ComputedLine[]): InvoiceTotals {
  let subtotalNet    = 0;
  let totalVat       = 0;
  let totalIrpf      = 0;
  let totalSurcharge = 0;
  let totalGross     = 0;
  for (const l of lines) {
    subtotalNet    += l.lineNet;
    totalVat       += l.lineGross - l.lineNet - l.lineSurcharge;
    totalIrpf      += l.lineNet * (l.irpfRate / 100);
    totalSurcharge += l.lineSurcharge;
    totalGross     += l.lineGross;
  }
  totalIrpf  = round2(totalIrpf);
  totalGross = round2(totalGross - totalIrpf); // total a recibir = gross - IRPF
  return {
    subtotalNet:    round2(subtotalNet),
    totalVat:       round2(totalVat),
    totalIrpf,
    totalSurcharge: round2(totalSurcharge),
    totalGross,
  };
}

/** Aplica recargo de equivalencia a las líneas si el cliente lo tiene marcado.
 *  Sólo para clientes nacionales (NATIONAL): los EU_INTRA y NON_EU van con
 *  IVA 0% y ningún recargo. */
function applySurcharge(lines: LineInput[], hasSurcharge: boolean): LineInput[] {
  if (!hasSurcharge) return lines;
  return lines.map((l) => ({
    ...l,
    surchargeRate: l.surchargeRate ?? defaultSurchargeFor(l.vatRate ?? 21),
  }));
}

async function getDefaultSeriesId(tenantId: string): Promise<string> {
  const series = await prisma.invoiceSeries.findFirst({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    select: { id: true },
  });
  if (!series) {
    throw new AppError(409, "No tienes ninguna serie de facturación. Crea una en Ajustes → Facturación antes de emitir facturas.");
  }
  return series.id;
}

/**
 * Encadena la factura recién emitida con la última de la misma serie y
 * persiste previousHash, currentHash y qrPayload. Crea InvoiceAuditLog
 * con la acción indicada. Debe llamarse DENTRO de la misma transacción
 * que asignó el número de la factura.
 */
async function applyHashChain(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  options: {
    seriesId: string;
    seriesCode: string;
    number: number;
    issueDate: Date;
    subtotalNet: number;
    totalVat: number;
    totalGross: number;
    emitterTaxId: string | null;
    receiverTaxId: string | null;
    tenantId: string;
    userId: string | null;
    action: "ISSUE" | "VOID" | "RECTIFY";
    clientId: string;
    status: string;
  },
) {
  // Buscamos la última factura de la serie con currentHash. Excluimos la
  // factura actual para que reseed/regenerate no se enlace consigo misma.
  const last = await tx.invoice.findFirst({
    where: {
      seriesId: options.seriesId,
      currentHash: { not: null },
      id: { not: invoiceId },
    },
    orderBy: { number: "desc" },
    select: { currentHash: true },
  });
  const previousHash = last?.currentHash ?? GENESIS_HASH;
  const issueDateStr = options.issueDate.toISOString().slice(0, 10);
  const currentHash = computeInvoiceHash({
    emitterTaxId:  options.emitterTaxId,
    receiverTaxId: options.receiverTaxId,
    seriesCode:    options.seriesCode,
    number:        options.number,
    issueDate:     issueDateStr,
    subtotalNet:   options.subtotalNet,
    totalVat:      options.totalVat,
    totalGross:    options.totalGross,
    previousHash,
  });
  const qrPayload = buildQrPayload({
    emitterTaxId: options.emitterTaxId,
    seriesCode:   options.seriesCode,
    number:       options.number,
    issueDate:    issueDateStr,
    totalGross:   options.totalGross,
    hash:         currentHash,
  });

  await tx.invoice.update({
    where: { id: invoiceId },
    data:  { previousHash, currentHash, qrPayload },
  });

  await tx.invoiceAuditLog.create({
    data: {
      tenantId:  options.tenantId,
      invoiceId,
      userId:    options.userId,
      action:    options.action,
      payload:   auditPayload({
        id: invoiceId,
        number: options.number,
        status: options.status,
        issueDate: options.issueDate,
        subtotalNet: options.subtotalNet,
        totalVat: options.totalVat,
        totalGross: options.totalGross,
        clientId: options.clientId,
      }, { previousHash }),
      hash:      currentHash,
    },
  });

  return { previousHash, currentHash, qrPayload };
}

/** Si el cliente es UE intracomunitario o tercer país, fuerza vatRate=0
 *  en todas las líneas. Para clientes nacionales devuelve las líneas tal cual. */
function applyTaxRegime(lines: LineInput[], taxRegime: "NATIONAL" | "EU_INTRA" | "NON_EU"): LineInput[] {
  if (taxRegime === "NATIONAL") return lines;
  return lines.map((l) => ({ ...l, vatRate: 0 }));
}

/** Recupera taxId del emisor (tenant) y del receptor (cliente) en una query. */
async function getHashContext(tenantId: string, clientId: string) {
  const [tenant, client] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { taxId: true } }),
    prisma.client.findUnique({ where: { id: clientId }, select: { taxId: true } }),
  ]);
  return {
    emitterTaxId:  tenant?.taxId  ?? null,
    receiverTaxId: client?.taxId  ?? null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/invoices
// ---------------------------------------------------------------------------
export async function listInvoices(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { status, seriesId, clientId } = req.query;

  const where: any = { tenantId };
  if (status)   where.status   = status   as string;
  if (seriesId) where.seriesId = seriesId as string;
  if (clientId) where.clientId = clientId as string;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    include: {
      series: { select: { code: true, name: true } },
      client: { select: { id: true, name: true, taxId: true } },
      _count: { select: { lines: true } },
    },
  });

  res.json(invoices);
}

// ---------------------------------------------------------------------------
// GET /api/v1/invoices/:id
// ---------------------------------------------------------------------------
export async function getInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: id as string, tenantId },
    include: {
      series:    { select: { id: true, code: true, name: true } },
      client:    { select: { id: true, name: true, taxId: true } },
      contract:  { select: { id: true } },
      payment:   { select: { id: true, periodStart: true, periodEnd: true } },
      rectifies: { select: { id: true, number: true, series: { select: { code: true } } } },
      lines:     { orderBy: { position: "asc" } },
    },
  });
  if (!invoice) throw new AppError(404, "Factura no encontrada");
  res.json(invoice);
}

// ---------------------------------------------------------------------------
// POST /api/v1/invoices
// ---------------------------------------------------------------------------
// Crea una factura en estado DRAFT (sin número). Para asignar número y
// hacerla legalmente válida, llamar después a POST /:id/issue.
// ---------------------------------------------------------------------------
export async function createInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { seriesId, clientId, contractId, paymentId, issueDate, dueDate, notes, lines = [] } = req.body;

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new AppError(422, "La factura debe tener al menos una línea.");
  }

  // Validar pertenencia al tenant
  const client = await prisma.client.findFirst({
    where:  { id: clientId, tenantId },
    select: { id: true, taxRegime: true, hasSurcharge: true },
  });
  if (!client) throw new AppError(422, "Cliente no encontrado o no pertenece a tu cuenta.");

  const series = seriesId
    ? await prisma.invoiceSeries.findFirst({ where: { id: seriesId, tenantId }, select: { id: true } })
    : null;
  const finalSeriesId = series?.id ?? await getDefaultSeriesId(tenantId);

  // Régimen fiscal del cliente: si es EU_INTRA o NON_EU, las líneas van con
  // IVA 0% (operación exenta art. 25 LIVA o exportación de servicios).
  // Recargo de equivalencia sólo se aplica a clientes NACIONALES con flag.
  let processed = applyTaxRegime(lines as LineInput[], client.taxRegime);
  processed = applySurcharge(processed, client.taxRegime === "NATIONAL" && client.hasSurcharge);
  const computed = processed.map((l, i) => computeLine(l, i));
  const totals   = computeTotals(computed);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      seriesId:  finalSeriesId,
      clientId,
      contractId: contractId ?? null,
      paymentId:  paymentId  ?? null,
      issueDate:  issueDate ? new Date(issueDate) : new Date(),
      dueDate:    dueDate   ? new Date(dueDate)   : null,
      notes:      notes ?? null,
      status:     "DRAFT",
      ...totals,
      lines: { create: computed },
    },
    include: {
      series: { select: { code: true, name: true } },
      lines:  { orderBy: { position: "asc" } },
    },
  });

  res.status(201).json(invoice);
}

// ---------------------------------------------------------------------------
// POST /api/v1/invoices/from-payment/:paymentId
// ---------------------------------------------------------------------------
// Genera una factura ISSUED a partir de un Payment, con una sola línea
// derivada del importe del pago. La emite en el acto (asigna número
// atómicamente). Ideal para automatizar al cobrar.
// ---------------------------------------------------------------------------
export async function createInvoiceFromPayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { paymentId } = req.params;

  const payment = await prisma.payment.findUnique({
    where:   { id: paymentId as string, tenantId },
    include: {
      contract: {
        select: {
          id:               true,
          clientId:         true,
          billingMode:      true,
          billingFrequency: true,
          project:          { select: { name: true } },
        },
      },
      invoices: { select: { id: true } },
    },
  });
  if (!payment) throw new AppError(404, "Pago no encontrado");
  if (payment.invoices.length > 0) {
    throw new AppError(409, "Este pago ya tiene una factura asociada. Anúlala primero si quieres regenerarla.");
  }

  const seriesId = await getDefaultSeriesId(tenantId);
  const { emitterTaxId, receiverTaxId } = await getHashContext(tenantId, payment.contract.clientId);
  const clientForRegime = await prisma.client.findUnique({
    where:  { id: payment.contract.clientId },
    select: { taxRegime: true, hasSurcharge: true },
  });
  const taxRegime    = clientForRegime?.taxRegime    ?? "NATIONAL";
  const hasSurcharge = clientForRegime?.hasSurcharge ?? false;

  const description = payment.contract.billingMode === "SUBSCRIPTION"
    ? `${payment.contract.project.name} — Cuota ${payment.periodStart.toISOString().slice(0,10)} a ${payment.periodEnd.toISOString().slice(0,10)}`
    : `${payment.contract.project.name} — Servicio`;

  // Derivar irpfRate efectivo: si el Payment tiene irpfAmount > 0, calcularlo
  // sobre amountNet (es lo que el contrato aplicó al generar el pago).
  const paymentNet  = Number(payment.amountNet);
  const paymentIrpf = Number(payment.irpfAmount);
  const irpfRate    = paymentNet > 0 && paymentIrpf > 0
    ? round2((paymentIrpf / paymentNet) * 100)
    : 0;

  const lines: LineInput[] = [{
    description,
    quantity:  1,
    unitPrice: paymentNet,
    vatRate:   Number(payment.vatRate),
    irpfRate,
    discount:  0,
  }];
  let processed = applyTaxRegime(lines, taxRegime);
  processed = applySurcharge(processed, taxRegime === "NATIONAL" && hasSurcharge);
  const computed = processed.map((l, i) => computeLine(l, i));
  const totals   = computeTotals(computed);

  // Emisión atómica: reservar número primero (UPDATE ... RETURNING bloquea
  // la fila bajo concurrencia), luego crear la factura ya con ese número.
  // Tras crearla, encadenamos su hash con la última de la serie (VeriFactu).
  const invoice = await prisma.$transaction(async (tx) => {
    const reserved = await tx.invoiceSeries.update({
      where:  { id: seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true, code: true },
    });
    const number = reserved.nextNumber - 1;
    const issueDate = new Date();
    const created = await tx.invoice.create({
      data: {
        tenantId,
        seriesId,
        clientId:   payment.contract.clientId,
        contractId: payment.contract.id,
        paymentId:  payment.id,
        issueDate,
        status:     "ISSUED",
        number,
        ...totals,
        lines: { create: computed },
      },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
    await applyHashChain(tx, created.id, {
      seriesId,        seriesCode: reserved.code,
      number,          issueDate,
      subtotalNet: totals.subtotalNet,
      totalVat:    totals.totalVat,
      totalGross:  totals.totalGross,
      emitterTaxId, receiverTaxId,
      tenantId,        userId: req.user!.userId ?? null,
      action: "ISSUE", clientId: payment.contract.clientId,
      status: "ISSUED",
    });
    return tx.invoice.findUnique({
      where:   { id: created.id },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
  });

  res.status(201).json(invoice);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/invoices/:id
// ---------------------------------------------------------------------------
// Solo facturas DRAFT son editables. Reemplaza líneas si se mandan; si no,
// las mantiene y solo actualiza cabecera.
// ---------------------------------------------------------------------------
export async function updateInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.invoice.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Factura no encontrada");
  if (existing.status !== "DRAFT") {
    throw new AppError(409, "Solo se pueden editar facturas en borrador. Para cambiar una emitida, anúlala y crea una rectificativa.");
  }

  const { lines, issueDate, dueDate, notes, clientId, seriesId } = req.body;

  let totals: InvoiceTotals | null = null;
  let computed: ComputedLine[] | null = null;
  if (Array.isArray(lines)) {
    if (lines.length === 0) throw new AppError(422, "La factura debe tener al menos una línea.");
    const effectiveClientId = (clientId as string | undefined) ?? existing.clientId;
    const cli = await prisma.client.findUnique({
      where:  { id: effectiveClientId },
      select: { taxRegime: true, hasSurcharge: true },
    });
    const tr = cli?.taxRegime ?? "NATIONAL";
    let processed = applyTaxRegime(lines as LineInput[], tr);
    processed = applySurcharge(processed, tr === "NATIONAL" && (cli?.hasSurcharge ?? false));
    computed = processed.map((l, i) => computeLine(l, i));
    totals   = computeTotals(computed);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (computed) {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id as string } });
      await tx.invoiceLine.createMany({ data: computed.map((l) => ({ ...l, invoiceId: id as string })) });
    }
    return tx.invoice.update({
      where: { id: id as string },
      data: {
        ...(issueDate !== undefined && { issueDate: issueDate ? new Date(issueDate) : new Date() }),
        ...(dueDate   !== undefined && { dueDate:   dueDate   ? new Date(dueDate)   : null }),
        ...(notes     !== undefined && { notes }),
        ...(clientId  !== undefined && { clientId }),
        ...(seriesId  !== undefined && { seriesId }),
        ...(totals    && totals),
      },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
  });
  res.json(updated);
}

// ---------------------------------------------------------------------------
// POST /api/v1/invoices/:id/issue
// ---------------------------------------------------------------------------
// Asigna número correlativo y pasa a ISSUED. Atómico bajo concurrencia.
// ---------------------------------------------------------------------------
export async function issueInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.invoice.findUnique({
    where:  { id: id as string, tenantId },
    select: {
      id: true, status: true, seriesId: true, clientId: true,
      subtotalNet: true, totalVat: true, totalGross: true,
      lines: { select: { id: true } },
    },
  });
  if (!existing) throw new AppError(404, "Factura no encontrada");
  if (existing.status !== "DRAFT") throw new AppError(409, "La factura ya está emitida.");
  if (existing.lines.length === 0) throw new AppError(422, "La factura no tiene líneas.");

  const { emitterTaxId, receiverTaxId } = await getHashContext(tenantId, existing.clientId);

  const issued = await prisma.$transaction(async (tx) => {
    const reserved = await tx.invoiceSeries.update({
      where:  { id: existing.seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true, code: true },
    });
    const number = reserved.nextNumber - 1;
    const issueDate = new Date();
    await tx.invoice.update({
      where: { id: id as string },
      data:  { number, status: "ISSUED", issueDate },
    });
    await applyHashChain(tx, id as string, {
      seriesId: existing.seriesId, seriesCode: reserved.code,
      number, issueDate,
      subtotalNet: Number(existing.subtotalNet),
      totalVat:    Number(existing.totalVat),
      totalGross:  Number(existing.totalGross),
      emitterTaxId, receiverTaxId,
      tenantId, userId: req.user!.userId ?? null,
      action: "ISSUE", clientId: existing.clientId,
      status: "ISSUED",
    });
    return tx.invoice.findUnique({
      where:   { id: id as string },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
  });
  res.json(issued);
}

// ---------------------------------------------------------------------------
// POST /api/v1/invoices/:id/void
// ---------------------------------------------------------------------------
// Anula una factura ISSUED y crea una rectificativa con importes negativos.
// La rectificativa también consume número de la serie (correlatividad legal).
// ---------------------------------------------------------------------------
export async function voidInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.invoice.findUnique({
    where:   { id: id as string, tenantId },
    include: { lines: true },
  });
  if (!existing) throw new AppError(404, "Factura no encontrada");
  if (existing.status === "DRAFT")  throw new AppError(409, "No anules un borrador. Bórralo directamente.");
  if (existing.status === "VOIDED") throw new AppError(409, "Factura ya anulada.");

  const negLines = existing.lines.map((l, i) => ({
    description: `[Rectificación] ${l.description}`,
    quantity:    -Number(l.quantity),
    unitPrice:   Number(l.unitPrice),
    vatRate:     Number(l.vatRate),
    irpfRate:    Number(l.irpfRate),
    discount:    Number(l.discount),
    lineNet:     -Number(l.lineNet),
    lineGross:   -Number(l.lineGross),
    position:    i,
  }));
  const totals = {
    subtotalNet: round2(negLines.reduce((s, l) => s + l.lineNet, 0)),
    totalVat:    round2(negLines.reduce((s, l) => s + (l.lineGross - l.lineNet), 0)),
    totalIrpf:   round2(negLines.reduce((s, l) => s + l.lineNet * (l.irpfRate / 100), 0)),
    totalGross:  0,
  };
  totals.totalGross = round2(totals.subtotalNet + totals.totalVat - totals.totalIrpf);

  const { emitterTaxId, receiverTaxId } = await getHashContext(tenantId, existing.clientId);

  const result = await prisma.$transaction(async (tx) => {
    // Marcar la original como VOIDED y dejar AuditLog action VOID
    await tx.invoice.update({
      where: { id: existing.id },
      data:  { status: "VOIDED" },
    });
    await tx.invoiceAuditLog.create({
      data: {
        tenantId,
        invoiceId: existing.id,
        userId:    req.user!.userId ?? null,
        action:    "VOID",
        payload:   auditPayload({
          id: existing.id,
          number: existing.number,
          status: "VOIDED",
          issueDate: existing.issueDate,
          subtotalNet: Number(existing.subtotalNet),
          totalVat:    Number(existing.totalVat),
          totalGross:  Number(existing.totalGross),
          clientId: existing.clientId,
        }, { reason: "voided" }),
        // Reusamos el hash existente — no se reescribe, sólo se anota el evento.
        hash: existing.currentHash ?? GENESIS_HASH,
      },
    });

    // Reservar número atómicamente para la rectificativa
    const reserved = await tx.invoiceSeries.update({
      where:  { id: existing.seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true, code: true },
    });
    const number = reserved.nextNumber - 1;
    const issueDate = new Date();

    const created = await tx.invoice.create({
      data: {
        tenantId,
        seriesId:           existing.seriesId,
        number,
        status:             "ISSUED",
        issueDate,
        clientId:           existing.clientId,
        contractId:         existing.contractId,
        rectifiesInvoiceId: existing.id,
        ...totals,
        lines: { create: negLines },
      },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
    await applyHashChain(tx, created.id, {
      seriesId: existing.seriesId, seriesCode: reserved.code,
      number, issueDate,
      subtotalNet: totals.subtotalNet,
      totalVat:    totals.totalVat,
      totalGross:  totals.totalGross,
      emitterTaxId, receiverTaxId,
      tenantId, userId: req.user!.userId ?? null,
      action: "RECTIFY", clientId: existing.clientId,
      status: "ISSUED",
    });
    return tx.invoice.findUnique({
      where:   { id: created.id },
      include: {
        series: { select: { code: true, name: true } },
        lines:  { orderBy: { position: "asc" } },
      },
    });
  });

  res.status(201).json(result);
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/invoices/:id
// ---------------------------------------------------------------------------
// Solo DRAFT. Las emitidas se anulan, no se borran.
// ---------------------------------------------------------------------------
export async function deleteInvoice(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.invoice.findUnique({ where: { id: id as string, tenantId } });
  if (!existing) throw new AppError(404, "Factura no encontrada");
  if (existing.status !== "DRAFT") {
    throw new AppError(409, "Solo se pueden borrar facturas en borrador. Anula la emitida en su lugar.");
  }
  await prisma.invoice.delete({ where: { id: id as string } });
  res.status(204).send();
}

// ---------------------------------------------------------------------------
// GET /api/v1/invoices/:id/pdf
// ---------------------------------------------------------------------------
export async function getInvoicePdf(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: id as string, tenantId },
    include: {
      series:    { select: { code: true, name: true } },
      client:    { select: { name: true, taxId: true, taxRegime: true } },
      rectifies: { select: { number: true, series: { select: { code: true } } } },
      lines:     { orderBy: { position: "asc" } },
    },
  });
  if (!invoice) throw new AppError(404, "Factura no encontrada");

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, taxId: true, settings: true },
  });
  const settings = (tenant?.settings ?? {}) as Record<string, any>;
  const billing  = (settings.billing ?? {}) as Record<string, any>;

  const pdf = await generateInvoicePdf(
    {
      number:      invoice.number,
      status:      invoice.status,
      issueDate:   invoice.issueDate,
      dueDate:     invoice.dueDate,
      series:      invoice.series,
      client:      invoice.client,
      notes:       invoice.notes,
      subtotalNet: Number(invoice.subtotalNet),
      totalVat:    Number(invoice.totalVat),
      totalIrpf:   Number(invoice.totalIrpf),
      totalGross:    Number(invoice.totalGross),
      totalSurcharge: Number(invoice.totalSurcharge),
      qrPayload:   invoice.qrPayload,
      currentHash: invoice.currentHash,
      lines:       invoice.lines.map((l) => ({
        description: l.description,
        quantity:    Number(l.quantity),
        unitPrice:   Number(l.unitPrice),
        vatRate:     Number(l.vatRate),
        irpfRate:    Number(l.irpfRate),
        discount:    Number(l.discount),
        lineNet:     Number(l.lineNet),
        lineGross:   Number(l.lineGross),
      })),
      rectifies:   invoice.rectifies,
    },
    {
      tenantName: tenant?.name ?? "—",
      taxId:      tenant?.taxId ?? null,
      fullName:   billing.fullName  ?? null,
      address:    billing.address   ?? null,
      postalCode: billing.postalCode ?? null,
      city:       billing.city      ?? null,
      country:    billing.country   ?? "España",
      email:      billing.email     ?? null,
      phone:      billing.phone     ?? null,
      iban:       billing.iban      ?? null,
    },
  );

  const fileName = invoice.number != null
    ? `factura-${invoice.series.code}-${invoice.number}.pdf`
    : `factura-borrador-${invoice.id.slice(0, 8)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.send(pdf);
}

// ---------------------------------------------------------------------------
// GET /api/v1/invoices/series
// ---------------------------------------------------------------------------
export async function listSeries(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const series = await prisma.invoiceSeries.findMany({
    where:   { tenantId },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
  res.json(series);
}

// ---------------------------------------------------------------------------
// POST /api/v1/invoices/series
// ---------------------------------------------------------------------------
export async function createSeries(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { code, name, nextNumber, isDefault } = req.body;

  if (isDefault) {
    await prisma.invoiceSeries.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
  }
  try {
    const series = await prisma.invoiceSeries.create({
      data: { tenantId, code, name, nextNumber: nextNumber ?? 1, isDefault: !!isDefault },
    });
    res.status(201).json(series);
  } catch {
    throw new AppError(409, `Ya existe una serie con el código "${code}".`);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/invoices/series/:id
// ---------------------------------------------------------------------------
// Permite actualizar name, isDefault y nextNumber. Bajar nextNumber por
// debajo de un número ya emitido es peligroso — se acepta pero el
// @@unique hará fallar la próxima emisión si choca.
// ---------------------------------------------------------------------------
export async function updateSeries(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.invoiceSeries.findUnique({ where: { id: id as string, tenantId } });
  if (!existing) throw new AppError(404, "Serie no encontrada");

  const { name, isDefault, nextNumber } = req.body;

  if (isDefault === true && !existing.isDefault) {
    await prisma.invoiceSeries.updateMany({
      where: { tenantId, isDefault: true, NOT: { id: id as string } },
      data:  { isDefault: false },
    });
  }

  const updated = await prisma.invoiceSeries.update({
    where: { id: id as string },
    data: {
      ...(name       !== undefined && { name }),
      ...(isDefault  !== undefined && { isDefault: !!isDefault }),
      ...(nextNumber !== undefined && { nextNumber }),
    },
  });
  res.json(updated);
}
