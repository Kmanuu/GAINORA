import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { breakdownFromContractPrice } from "../services/paymentMath.js";

// ---------------------------------------------------------------------------
// GET /api/v1/contracts
// ---------------------------------------------------------------------------
export async function listContracts(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { projectId, clientId, planId, status, tier, billingMode } = req.query;

  const where: any = { tenantId };
  if (projectId)   where.projectId   = projectId as string;
  if (clientId)    where.clientId    = clientId as string;
  if (planId)      where.planId      = planId as string;
  if (status)      where.status      = status as string;
  if (tier)        where.tier        = tier as string;
  if (billingMode) where.billingMode = billingMode as string;

  const contracts = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client:  { select: { id: true, name: true, taxId: true } },
      project: { select: { id: true, name: true, productMaintenanceCost: true } },
      plan:    { select: { id: true, name: true, tier: true } },
      _count:  { select: { issues: true, payments: true, timeEntries: true, varCosts: true } },
    },
  });

  res.json(contracts);
}

// ---------------------------------------------------------------------------
// GET /api/v1/contracts/:id
// ---------------------------------------------------------------------------
export async function getContract(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const contract = await prisma.contract.findUnique({
    where: { id: id as string, tenantId },
    include: {
      client:  true,
      project: { select: { id: true, name: true, productMaintenanceCost: true, billingMode: true } },
      plan:    true,
      payments: { orderBy: { periodStart: "desc" } },
      issues: {
        orderBy: { openedAt: "desc" },
        include: {
          _count: { select: { timeEntries: true, varCosts: true } },
        },
      },
      timeEntries: {
        include: { user: { select: { id: true, fullName: true, hourlyCost: true } } },
        orderBy: { startedAt: "desc" },
      },
      varCosts: { orderBy: { date: "desc" } },
    },
  });

  if (!contract) throw new AppError(404, "Contrato no encontrado");
  res.json(contract);
}

// ---------------------------------------------------------------------------
// POST /api/v1/contracts
// ---------------------------------------------------------------------------
// Si el body trae `planId`, los campos no especificados se autorrellenan
// desde ese Plan (tier, billingMode, price, setupFee, hourlyRate,
// partsMarkupPct, maintenanceMode, maintenanceExtraPct, vatRate,
// priceIncludesVat). El cliente puede sobreescribir cualquiera.
// ---------------------------------------------------------------------------
export async function createContract(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { projectId, clientId, planId, startedAt, endedAt, ...rest } = req.body;

  const [project, client, plan] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId, tenantId } }),
    prisma.client.findUnique({  where: { id: clientId,  tenantId } }),
    planId ? prisma.plan.findUnique({ where: { id: planId, tenantId } }) : Promise.resolve(null),
  ]);
  if (!project)         throw new AppError(404, "Proyecto no encontrado");
  if (!client)          throw new AppError(404, "Cliente no encontrado");
  if (planId && !plan)  throw new AppError(404, "Plan no encontrado");

  // Autorrelleno desde el Plan: solo se aplica donde el cliente NO ha pasado valor.
  const filled: Record<string, any> = { ...rest };
  if (plan) {
    const map: Record<string, any> = {
      tier:                plan.tier,
      billingMode:         plan.billingMode,
      price:               Number(plan.price),
      setupFee:            plan.setupFee !== null ? Number(plan.setupFee) : undefined,
      hourlyRate:          plan.hourlyRate !== null ? Number(plan.hourlyRate) : undefined,
      partsMarkupPct:      plan.partsMarkupPct !== null ? Number(plan.partsMarkupPct) : undefined,
      maintenanceMode:     plan.maintenanceMode,
      maintenanceExtraPct: plan.maintenanceExtraPct !== null ? Number(plan.maintenanceExtraPct) : undefined,
      vatRate:             Number(plan.vatRate),
      priceIncludesVat:    plan.priceIncludesVat,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined && filled[k] === undefined) filled[k] = v;
    }
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId,
      projectId,
      clientId,
      planId:    planId ?? null,
      ...filled,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt:   endedAt   ? new Date(endedAt)   : null,
    },
    include: {
      client:  { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      plan:    { select: { id: true, name: true, tier: true } },
    },
  });

  res.status(201).json(contract);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/contracts/:id
// ---------------------------------------------------------------------------
export async function updateContract(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.contract.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Contrato no encontrado");

  const data = { ...req.body };
  if (data.startedAt) data.startedAt = new Date(data.startedAt);
  if (data.endedAt)   data.endedAt   = new Date(data.endedAt);

  const updated = await prisma.contract.update({
    where: { id: id as string },
    data,
    include: {
      client:  { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      plan:    { select: { id: true, name: true, tier: true } },
    },
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/contracts/:id
// ---------------------------------------------------------------------------
export async function deleteContract(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.contract.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Contrato no encontrado");

  // Borrar en cascada pero desacoplar los TimeEntry/VariableCost que siguen
  // perteneciendo a su proyecto (sólo quitamos la referencia al contrato).
  await prisma.$transaction([
    prisma.timeEntry.updateMany({
      where: { contractId: id as string },
      data:  { contractId: null, issueId: null },
    }),
    prisma.variableCost.updateMany({
      where: { contractId: id as string },
      data:  { contractId: null, issueId: null },
    }),
    prisma.payment.deleteMany({ where: { contractId: id as string } }),
    prisma.issue.deleteMany({   where: { contractId: id as string } }),
    prisma.contract.delete({    where: { id: id as string } }),
  ]);

  res.status(204).send();
}

// ---------------------------------------------------------------------------
// POST /api/v1/contracts/:id/convert
// ---------------------------------------------------------------------------
export async function convertContract(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { billingMode, price, generateFirstPayment } = req.body;

  const existing = await prisma.contract.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Contrato no encontrado");

  const updated = await prisma.contract.update({
    where: { id: id as string },
    data: {
      billingMode,
      ...(price !== undefined && { price }),
    },
  });

  let payment = null;
  if (generateFirstPayment && billingMode === "SUBSCRIPTION") {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const breakdown = breakdownFromContractPrice(
      Number(updated.price),
      Number(updated.vatRate ?? 21),
      updated.priceIncludesVat,
    );
    try {
      payment = await prisma.payment.create({
        data: {
          tenantId,
          contractId:  id as string,
          periodStart,
          periodEnd,
          amountNet:   breakdown.amountNet,
          vatRate:     Number(updated.vatRate ?? 21),
          amountGross: breakdown.amountGross,
          amountDue:   breakdown.amountGross,
          amountPaid:  0,
          status:      "PENDING",
        },
      });
    } catch {
      // Ya existe un Payment para este periodo — ignorar.
    }
  }

  res.json({ contract: updated, payment });
}
