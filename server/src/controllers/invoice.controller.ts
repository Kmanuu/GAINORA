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
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { round2 } from "../services/paymentMath.js";
import { generateInvoicePdf } from "../services/invoicePdf.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LineInput {
  description: string;
  quantity?:   number;
  unitPrice:   number;
  vatRate?:    number;
  irpfRate?:   number;
  discount?:   number;
}

interface ComputedLine {
  description: string;
  quantity:    number;
  unitPrice:   number;
  vatRate:     number;
  irpfRate:    number;
  discount:    number;
  lineNet:     number;
  lineGross:   number;
  position:    number;
}

interface InvoiceTotals {
  subtotalNet: number;
  totalVat:    number;
  totalIrpf:   number;
  totalGross:  number;
}

function computeLine(line: LineInput, position: number): ComputedLine {
  const quantity  = line.quantity ?? 1;
  const unitPrice = line.unitPrice;
  const vatRate   = line.vatRate  ?? 21;
  const irpfRate  = line.irpfRate ?? 0;
  const discount  = line.discount ?? 0;

  // Base imponible = qty * price * (1 - discount/100). IRPF se descuenta del
  // total a recibir pero no afecta a la base; se calcula en totales.
  const lineNet   = round2(quantity * unitPrice * (1 - discount / 100));
  const lineGross = round2(lineNet * (1 + vatRate / 100));

  return {
    description: line.description,
    quantity:    round2(quantity),
    unitPrice:   round2(unitPrice),
    vatRate:     round2(vatRate),
    irpfRate:    round2(irpfRate),
    discount:    round2(discount),
    lineNet,
    lineGross,
    position,
  };
}

function computeTotals(lines: ComputedLine[]): InvoiceTotals {
  let subtotalNet = 0;
  let totalVat    = 0;
  let totalIrpf   = 0;
  let totalGross  = 0;
  for (const l of lines) {
    subtotalNet += l.lineNet;
    totalVat    += l.lineGross - l.lineNet;
    totalIrpf   += l.lineNet * (l.irpfRate / 100);
    totalGross  += l.lineGross;
  }
  totalIrpf  = round2(totalIrpf);
  totalGross = round2(totalGross - totalIrpf); // total a recibir = gross - IRPF
  return {
    subtotalNet: round2(subtotalNet),
    totalVat:    round2(totalVat),
    totalIrpf,
    totalGross,
  };
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
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
  if (!client) throw new AppError(422, "Cliente no encontrado o no pertenece a tu cuenta.");

  const series = seriesId
    ? await prisma.invoiceSeries.findFirst({ where: { id: seriesId, tenantId }, select: { id: true } })
    : null;
  const finalSeriesId = series?.id ?? await getDefaultSeriesId(tenantId);

  const computed = lines.map((l: LineInput, i: number) => computeLine(l, i));
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

  const description = payment.contract.billingMode === "SUBSCRIPTION"
    ? `${payment.contract.project.name} — Cuota ${payment.periodStart.toISOString().slice(0,10)} a ${payment.periodEnd.toISOString().slice(0,10)}`
    : `${payment.contract.project.name} — Servicio`;

  const lines: LineInput[] = [{
    description,
    quantity:  1,
    unitPrice: Number(payment.amountNet),
    vatRate:   Number(payment.vatRate),
    irpfRate:  0,
    discount:  0,
  }];
  const computed = lines.map((l, i) => computeLine(l, i));
  const totals   = computeTotals(computed);

  // Emisión atómica: reservar número primero (UPDATE ... RETURNING bloquea
  // la fila bajo concurrencia), luego crear la factura ya con ese número.
  const invoice = await prisma.$transaction(async (tx) => {
    const reserved = await tx.invoiceSeries.update({
      where:  { id: seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    const number = reserved.nextNumber - 1;
    return tx.invoice.create({
      data: {
        tenantId,
        seriesId,
        clientId:   payment.contract.clientId,
        contractId: payment.contract.id,
        paymentId:  payment.id,
        issueDate:  new Date(),
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
    computed = lines.map((l, i) => computeLine(l, i));
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
    select: { id: true, status: true, seriesId: true, lines: { select: { id: true } } },
  });
  if (!existing) throw new AppError(404, "Factura no encontrada");
  if (existing.status !== "DRAFT") throw new AppError(409, "La factura ya está emitida.");
  if (existing.lines.length === 0) throw new AppError(422, "La factura no tiene líneas.");

  const issued = await prisma.$transaction(async (tx) => {
    // Reservar número atómicamente (UPDATE bloquea la fila bajo concurrencia).
    const reserved = await tx.invoiceSeries.update({
      where:  { id: existing.seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    const number = reserved.nextNumber - 1;
    return tx.invoice.update({
      where: { id: id as string },
      data:  { number, status: "ISSUED", issueDate: new Date() },
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

  const result = await prisma.$transaction(async (tx) => {
    // Marcar la original como VOIDED
    await tx.invoice.update({
      where: { id: existing.id },
      data:  { status: "VOIDED" },
    });

    // Reservar número atómicamente para la rectificativa
    const reserved = await tx.invoiceSeries.update({
      where:  { id: existing.seriesId },
      data:   { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    const number = reserved.nextNumber - 1;

    return tx.invoice.create({
      data: {
        tenantId,
        seriesId:           existing.seriesId,
        number,
        status:             "ISSUED",
        issueDate:          new Date(),
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
      client:    { select: { name: true, taxId: true } },
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
      totalGross:  Number(invoice.totalGross),
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
