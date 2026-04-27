import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

// ---------------------------------------------------------------------------
// GET /api/v1/plans
// ---------------------------------------------------------------------------
export async function listPlans(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { isActive, tier, billingMode } = req.query;

  const where: any = { tenantId };
  if (isActive    !== undefined) where.isActive    = isActive === "true";
  if (tier)        where.tier        = tier as string;
  if (billingMode) where.billingMode = billingMode as string;

  const plans = await prisma.plan.findMany({
    where,
    orderBy: [{ tier: "asc" }, { price: "asc" }],
    include: {
      _count: { select: { contracts: true } },
    },
  });

  res.json(plans);
}

// ---------------------------------------------------------------------------
// GET /api/v1/plans/:id
// ---------------------------------------------------------------------------
export async function getPlan(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const plan = await prisma.plan.findUnique({
    where: { id: id as string, tenantId },
    include: {
      _count:    { select: { contracts: true } },
      contracts: {
        select: {
          id: true,
          status: true,
          client:  { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!plan) throw new AppError(404, "Plan no encontrado");
  res.json(plan);
}

// ---------------------------------------------------------------------------
// POST /api/v1/plans
// ---------------------------------------------------------------------------
export async function createPlan(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { name } = req.body;

  // Unicidad por (tenantId, name) ya está en el schema, pero detectamos antes
  // para devolver un 409 amigable en vez de un error de Prisma.
  const dup = await prisma.plan.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (dup) throw new AppError(409, `Ya existe un plan con el nombre "${name}"`);

  const plan = await prisma.plan.create({
    data: {
      tenantId,
      ...req.body,
    },
  });

  res.status(201).json(plan);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/plans/:id
// ---------------------------------------------------------------------------
export async function updatePlan(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.plan.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Plan no encontrado");

  // Si se cambia el nombre, comprobar que no choque con otro plan existente.
  if (req.body.name && req.body.name !== existing.name) {
    const dup = await prisma.plan.findUnique({
      where: { tenantId_name: { tenantId, name: req.body.name } },
    });
    if (dup) throw new AppError(409, `Ya existe otro plan con el nombre "${req.body.name}"`);
  }

  const updated = await prisma.plan.update({
    where: { id: id as string },
    data:  req.body,
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/plans/:id
// ---------------------------------------------------------------------------
// Soft delete por defecto (isActive=false). Si ?hard=true y no hay contratos
// asociados, hard delete. Si hay contratos, se exige usar soft delete.
// ---------------------------------------------------------------------------
export async function deletePlan(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const hard = req.query.hard === "true";

  const existing = await prisma.plan.findUnique({
    where: { id: id as string, tenantId },
    include: { _count: { select: { contracts: true } } },
  });
  if (!existing) throw new AppError(404, "Plan no encontrado");

  if (hard) {
    if (existing._count.contracts > 0) {
      throw new AppError(
        409,
        `No se puede eliminar: el plan tiene ${existing._count.contracts} contrato(s) asociado(s). Usa soft delete (sin ?hard=true) o cambia los contratos a otro plan primero.`,
      );
    }
    await prisma.plan.delete({ where: { id: id as string } });
    res.status(204).send();
    return;
  }

  // Soft delete: archivar
  const archived = await prisma.plan.update({
    where: { id: id as string },
    data:  { isActive: false },
  });
  res.json(archived);
}
