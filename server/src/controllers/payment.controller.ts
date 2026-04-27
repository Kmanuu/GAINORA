import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  breakdownPayment,
  breakdownFromContractPrice,
  deriveStatus,
  round2,
} from "../services/paymentMath.js";

// ---------------------------------------------------------------------------
// GET /api/v1/payments
// ---------------------------------------------------------------------------
export async function listPayments(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { contractId, status, from, to } = req.query;

  const where: any = { tenantId };
  if (contractId) where.contractId = contractId as string;
  if (status)     where.status     = status as string;
  if (from || to) {
    where.periodStart = {};
    if (from) where.periodStart.gte = new Date(from as string);
    if (to)   where.periodStart.lte = new Date(to as string);
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { periodStart: "desc" },
    include: {
      contract: {
        select: {
          id: true,
          billingMode: true,
          client:  { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  res.json(payments);
}

// ---------------------------------------------------------------------------
// GET /api/v1/payments/:id
// ---------------------------------------------------------------------------
export async function getPayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
    include: {
      contract: {
        include: {
          client:  { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!payment) throw new AppError(404, "Pago no encontrado");
  res.json(payment);
}

// ---------------------------------------------------------------------------
// POST /api/v1/payments
// ---------------------------------------------------------------------------
// Acepta `amountGross` o `amountNet` (al menos uno). Si solo viene uno,
// el otro se deriva con `vatRate` (del body o, en su defecto, del contrato).
// `amountDue` por defecto = amountGross. `amountPaid` por defecto = 0.
// `status` se auto-deriva si no viene explícito.
// ---------------------------------------------------------------------------
export async function createPayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const {
    contractId, periodStart, periodEnd,
    amountGross, amountNet, vatRate, amountDue, amountPaid,
    status, paidAt, notes,
  } = req.body;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId, tenantId },
  });
  if (!contract) throw new AppError(404, "Contrato no encontrado");

  const effectiveVat = vatRate ?? Number(contract.vatRate ?? 21);
  const breakdown = breakdownPayment({
    amountGross: amountGross !== undefined ? Number(amountGross) : undefined,
    amountNet:   amountNet   !== undefined ? Number(amountNet)   : undefined,
    vatRate:     effectiveVat,
  });

  if (breakdown.amountGross <= 0 && breakdown.amountNet <= 0) {
    throw new AppError(400, "Debes indicar amountGross o amountNet");
  }

  const due  = amountDue  !== undefined ? Number(amountDue)  : breakdown.amountGross;
  const paid = amountPaid !== undefined ? Number(amountPaid) : 0;
  const finalStatus = status ?? deriveStatus(paid, due);

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      contractId,
      periodStart: new Date(periodStart),
      periodEnd:   new Date(periodEnd),
      amountNet:   breakdown.amountNet,
      vatRate:     effectiveVat,
      amountGross: breakdown.amountGross,
      amountDue:   round2(due),
      amountPaid:  round2(paid),
      status:      finalStatus,
      paidAt:      paidAt ? new Date(paidAt) : (finalStatus === "PAID" ? new Date() : null),
      notes,
    },
  });

  res.status(201).json(payment);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/payments/:id
// ---------------------------------------------------------------------------
export async function updatePayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Pago no encontrado");

  const body = req.body;
  const data: any = {};

  if (body.periodStart) data.periodStart = new Date(body.periodStart);
  if (body.periodEnd)   data.periodEnd   = new Date(body.periodEnd);
  if (body.notes !== undefined) data.notes = body.notes;

  // Recalcular Net/Gross/vatRate si viene cualquier importe
  const touchesAmounts =
    body.amountGross !== undefined ||
    body.amountNet   !== undefined ||
    body.vatRate     !== undefined;

  if (touchesAmounts) {
    const effectiveVat = body.vatRate ?? Number(existing.vatRate);
    const breakdown = breakdownPayment({
      amountGross: body.amountGross !== undefined
        ? Number(body.amountGross)
        : Number(existing.amountGross),
      amountNet:   body.amountNet   !== undefined
        ? Number(body.amountNet)
        : Number(existing.amountNet),
      vatRate:     effectiveVat,
    });
    data.amountGross = breakdown.amountGross;
    data.amountNet   = breakdown.amountNet;
    data.vatRate     = effectiveVat;
  }

  if (body.amountDue  !== undefined) data.amountDue  = round2(Number(body.amountDue));
  if (body.amountPaid !== undefined) data.amountPaid = round2(Number(body.amountPaid));

  // Auto-derivar status si el cliente no lo fija pero cambia amountPaid o amountDue
  if (body.status === undefined && (data.amountPaid !== undefined || data.amountDue !== undefined)) {
    const paid = data.amountPaid ?? Number(existing.amountPaid);
    const due  = data.amountDue  ?? Number(existing.amountDue);
    data.status = deriveStatus(paid, due);
  } else if (body.status !== undefined) {
    data.status = body.status;
  }

  // paidAt: explícito > derivado al pasar a PAID
  if (body.paidAt !== undefined) {
    data.paidAt = body.paidAt ? new Date(body.paidAt) : null;
  } else if (data.status === "PAID" && !existing.paidAt) {
    data.paidAt = new Date();
  }

  const updated = await prisma.payment.update({
    where: { id: id as string },
    data,
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/payments/:id
// ---------------------------------------------------------------------------
export async function deletePayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Pago no encontrado");

  await prisma.payment.delete({ where: { id: id as string } });
  res.status(204).send();
}

// ---------------------------------------------------------------------------
// POST /api/v1/payments/roll
// ---------------------------------------------------------------------------
// Genera Payments PENDING del mes actual para cada suscripción activa que
// aún no tenga pago en ese periodo. Calcula el desglose IVA desde el contrato.
// ---------------------------------------------------------------------------
export async function rollPayments(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const subscriptions = await prisma.contract.findMany({
    where: {
      tenantId,
      billingMode: "SUBSCRIPTION",
      status:      "ACTIVE",
      startedAt:   { lte: periodEnd },
      OR: [{ endedAt: null }, { endedAt: { gte: periodStart } }],
    },
  });

  let created = 0;
  let skipped = 0;

  for (const contract of subscriptions) {
    const breakdown = breakdownFromContractPrice(
      Number(contract.price),
      Number(contract.vatRate ?? 21),
      contract.priceIncludesVat,
    );
    try {
      await prisma.payment.create({
        data: {
          tenantId,
          contractId:  contract.id,
          periodStart,
          periodEnd,
          amountNet:   breakdown.amountNet,
          vatRate:     Number(contract.vatRate ?? 21),
          amountGross: breakdown.amountGross,
          amountDue:   breakdown.amountGross,
          amountPaid:  0,
          status:      "PENDING",
        },
      });
      created++;
    } catch {
      skipped++; // Ya existe por @@unique([contractId, periodStart])
    }
  }

  res.json({
    success: true,
    created,
    skipped,
    totalActiveSubscriptions: subscriptions.length,
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
  });
}
