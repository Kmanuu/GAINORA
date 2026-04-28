import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  breakdownPayment,
  breakdownFromContractPrice,
  deriveStatus,
  round2,
  getMissingPeriods,
  prorationFactor,
  type BillingFrequency,
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
          isDemo: true,
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
      transactions: { orderBy: { paidAt: "desc" } },
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
// ---------------------------------------------------------------------------
// POST /api/v1/payments/roll
// ---------------------------------------------------------------------------
// Backfill: para cada suscripción activa, genera todos los Payments de
// periodos faltantes desde startedAt hasta hoy (o endedAt). Respeta la
// frecuencia (MONTHLY/QUARTERLY/YEARLY) y aplica prorrateo en primer y
// último periodo si el contrato no cubre el periodo entero.
//
// Idempotente: el @@unique([contractId, periodStart]) bloquea duplicados,
// así que volver a pulsar solo crea los que falten.
// ---------------------------------------------------------------------------
export async function rollPayments(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const result = await runRollForTenant(tenantId);
  res.json({ success: true, ...result });
}

/**
 * Ejecuta rollPayments para un tenant concreto. Reutilizable desde el cron
 * (rollPaymentsCron.ts) sin pasar por la capa HTTP.
 */
export async function runRollForTenant(tenantId: string): Promise<{
  created:                  number;
  skipped:                  number;
  totalActiveSubscriptions: number;
  backfilledPeriods:        number;
}> {
  const now = new Date();

  const subscriptions = await prisma.contract.findMany({
    where: {
      tenantId,
      billingMode: "SUBSCRIPTION",
      status:      "ACTIVE",
    },
  });

  let created = 0;
  let skipped = 0;
  let backfilledPeriods = 0;

  for (const contract of subscriptions) {
    const periods = getMissingPeriods(
      contract.startedAt,
      contract.endedAt ?? null,
      (contract.billingFrequency ?? "MONTHLY") as BillingFrequency,
      now,
    );

    if (periods.length > 1) backfilledPeriods += periods.length - 1;

    const vatRate  = Number(contract.vatRate ?? 21);
    const price    = Number(contract.price);
    const irpfRate = contract.irpfRate != null ? Number(contract.irpfRate) : 0;

    for (const p of periods) {
      const base = breakdownFromContractPrice(price, vatRate, contract.priceIncludesVat);
      const amountNet   = round2(base.amountNet   * p.prorationFactor);
      const amountGross = round2(base.amountGross * p.prorationFactor);
      const irpfAmount  = round2(amountNet * (irpfRate / 100));
      // amountDue = lo que el cliente abona = gross − irpf (IRPF lo retiene él
      // y lo ingresa al Estado en nuestro nombre).
      const amountDue   = round2(amountGross - irpfAmount);
      try {
        await prisma.payment.create({
          data: {
            tenantId,
            contractId:  contract.id,
            periodStart: p.periodStart,
            periodEnd:   p.periodEnd,
            amountNet,
            vatRate,
            amountGross,
            irpfAmount,
            amountDue,
            amountPaid:  0,
            status:      "PENDING",
          },
        });
        created++;
      } catch {
        skipped++; // ya existe por @@unique([contractId, periodStart])
      }
    }
  }

  return {
    created,
    skipped,
    totalActiveSubscriptions: subscriptions.length,
    backfilledPeriods,
  };
}

// ---------------------------------------------------------------------------
// POST /api/v1/payments/:id/regenerate
// ---------------------------------------------------------------------------
// Recalcula amountNet/Gross/Due de un Payment PENDING usando el price
// actual del contrato (útil cuando se editó el precio después de generar
// el pago). Mantiene periodStart/periodEnd y respeta el factor de
// prorrateo implícito en el periodo (calculado desde el contrato vigente).
// ---------------------------------------------------------------------------
export async function regeneratePayment(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
    include: { contract: true },
  });
  if (!payment)                       throw new AppError(404, "Pago no encontrado");
  if (payment.status !== "PENDING")  throw new AppError(409, "Solo puedes regenerar pagos PENDIENTES. Anula y recrea si ya hay cobros.");

  const c = payment.contract;
  // Recalcular el factor del periodo: si endedAt del contrato cambió tras
  // crear el payment, el prorrateo del último periodo puede haber variado.
  const factor = prorationFactor(
    payment.periodStart, payment.periodEnd, c.startedAt, c.endedAt ?? null,
  );

  const vatRate  = Number(c.vatRate ?? 21);
  const irpfRate = c.irpfRate != null ? Number(c.irpfRate) : 0;
  const base = breakdownFromContractPrice(Number(c.price), vatRate, c.priceIncludesVat);
  const amountNet   = round2(base.amountNet   * factor);
  const amountGross = round2(base.amountGross * factor);
  const irpfAmount  = round2(amountNet * (irpfRate / 100));
  const amountDue   = round2(amountGross - irpfAmount);

  const updated = await prisma.payment.update({
    where: { id: id as string },
    data:  {
      amountNet,
      amountGross,
      amountDue,
      vatRate,
      irpfAmount,
      // amountPaid intacto; status seguirá PENDING porque solo regeneramos
      // si estaba en PENDING.
    },
  });
  res.json(updated);
}

// ---------------------------------------------------------------------------
// POST /api/v1/payments/:id/transactions
// ---------------------------------------------------------------------------
// Registra un abono parcial o total. Crea una PaymentTransaction y recalcula
// Payment.amountPaid sumando todas las transacciones existentes. Status del
// pago se deriva (PENDING/PARTIAL/PAID).
// ---------------------------------------------------------------------------
export async function addPaymentTransaction(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { amount, paidAt, method, reference, notes } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!payment) throw new AppError(404, "Pago no encontrado");
  if (Number(amount) <= 0) throw new AppError(422, "El importe del abono debe ser mayor que cero.");

  const result = await prisma.$transaction(async (tx) => {
    const trx = await tx.paymentTransaction.create({
      data: {
        tenantId,
        paymentId: id as string,
        amount:    round2(Number(amount)),
        paidAt:    paidAt ? new Date(paidAt) : new Date(),
        method:    method ?? "TRANSFER",
        reference: reference ?? null,
        notes:     notes ?? null,
      },
    });
    // Recalcular amountPaid sumando todas las transacciones del pago
    const agg = await tx.paymentTransaction.aggregate({
      where:  { paymentId: id as string },
      _sum:   { amount: true },
    });
    const totalPaid = round2(Number(agg._sum.amount ?? 0));
    const status    = deriveStatus(totalPaid, Number(payment.amountDue));
    const lastTrx   = await tx.paymentTransaction.findFirst({
      where:   { paymentId: id as string },
      orderBy: { paidAt: "desc" },
      select:  { paidAt: true },
    });
    const updated = await tx.payment.update({
      where: { id: id as string },
      data:  {
        amountPaid: totalPaid,
        status,
        paidAt: status === "PAID" ? (lastTrx?.paidAt ?? new Date()) : null,
      },
    });
    return { transaction: trx, payment: updated };
  });

  res.status(201).json(result);
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/payments/transactions/:trxId
// ---------------------------------------------------------------------------
// Elimina una transacción (corrección de error) y recalcula amountPaid/status.
// ---------------------------------------------------------------------------
export async function deletePaymentTransaction(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { trxId } = req.params;

  const trx = await prisma.paymentTransaction.findUnique({
    where: { id: trxId as string, tenantId },
  });
  if (!trx) throw new AppError(404, "Transacción no encontrada");

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.delete({ where: { id: trxId as string } });
    const agg = await tx.paymentTransaction.aggregate({
      where:  { paymentId: trx.paymentId },
      _sum:   { amount: true },
    });
    const totalPaid = round2(Number(agg._sum.amount ?? 0));
    const payment   = await tx.payment.findUnique({ where: { id: trx.paymentId } });
    const status    = payment ? deriveStatus(totalPaid, Number(payment.amountDue)) : "PENDING";
    const lastTrx   = await tx.paymentTransaction.findFirst({
      where:   { paymentId: trx.paymentId },
      orderBy: { paidAt: "desc" },
      select:  { paidAt: true },
    });
    await tx.payment.update({
      where: { id: trx.paymentId },
      data:  {
        amountPaid: totalPaid,
        status,
        paidAt: status === "PAID" ? (lastTrx?.paidAt ?? new Date()) : null,
      },
    });
  });

  res.status(204).send();
}
