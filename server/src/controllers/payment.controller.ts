import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

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

export async function createPayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { contractId, periodStart, periodEnd, amount, status, paidAmount, paidAt, notes } = req.body;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId, tenantId },
  });
  if (!contract) throw new AppError(404, "Contrato no encontrado");

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      contractId,
      periodStart: new Date(periodStart),
      periodEnd:   new Date(periodEnd),
      amount,
      paidAmount: paidAmount ?? 0,
      status:     status     ?? "PENDING",
      paidAt:     paidAt ? new Date(paidAt) : null,
      notes,
    },
  });

  res.status(201).json(payment);
}

export async function updatePayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Pago no encontrado");

  const data = { ...req.body };
  if (data.paidAt)      data.paidAt      = new Date(data.paidAt);
  if (data.periodStart) data.periodStart = new Date(data.periodStart);
  if (data.periodEnd)   data.periodEnd   = new Date(data.periodEnd);

  // Auto-derivar status a partir de paidAmount cuando el cliente no lo fija
  if (data.paidAmount !== undefined && data.status === undefined) {
    const paid  = Number(data.paidAmount);
    const total = Number(data.amount ?? existing.amount);
    if (paid <= 0)        data.status = "PENDING";
    else if (paid < total) data.status = "PARTIAL";
    else                   data.status = "PAID";
  }

  // Al pasar a PAID, rellenar paidAt si no venía
  if (data.status === "PAID" && !data.paidAt && !existing.paidAt) {
    data.paidAt = new Date();
  }

  const updated = await prisma.payment.update({
    where: { id: id as string },
    data,
  });

  res.json(updated);
}

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

// POST /v1/payments/roll — genera pagos PENDING del mes actual para cada
// suscripción activa del tenant que no tenga pago ya creado para ese periodo.
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
    try {
      await prisma.payment.create({
        data: {
          tenantId,
          contractId: contract.id,
          periodStart,
          periodEnd,
          amount:     contract.price,
          status:     "PENDING",
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
