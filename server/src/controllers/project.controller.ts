import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listProjects(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { status } = req.query;

  const where: any = { tenantId };
  if (status) {
    where.status = status as string;
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { timeEntries: true, varCosts: true } },
    },
  });

  res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const {
    clientName, clientTaxId, name, description, status,
    billingMode, budgetHours, budgetAmount, hourlyRate, partsMarkupPct,
    startDate, endDate,
  } = req.body;

  const project = await prisma.project.create({
    data: {
      tenantId,
      clientName,
      clientTaxId,
      name,
      description,
      status,
      billingMode,
      budgetHours,
      budgetAmount,
      hourlyRate,
      partsMarkupPct,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  res.status(201).json(project);
}

export async function getProject(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: id as string, tenantId },
    include: {
      timeEntries: {
        include: { user: { select: { id: true, fullName: true, hourlyCost: true } } },
        orderBy: { startedAt: "desc" },
      },
      varCosts: { orderBy: { date: "desc" } },
    },
  });

  if (!project) {
    throw new AppError(404, "Proyecto no encontrado");
  }

  res.json(project);
}

export async function updateProject(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const data = { ...req.body };

  const existing = await prisma.project.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Proyecto no encontrado");
  }

  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const updated = await prisma.project.update({
    where: { id: id as string },
    data,
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/delete-preview
// ---------------------------------------------------------------------------
// Devuelve un resumen de qué se eliminará si se borra el proyecto. La UI
// lo usa para mostrar al usuario las consecuencias reales antes de
// confirmar (contratos, pagos, issues, horas registradas, costes).
// ---------------------------------------------------------------------------
export async function getDeletePreview(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: id as string, tenantId },
    select: { id: true, name: true },
  });
  if (!project) throw new AppError(404, "Proyecto no encontrado");

  const [
    contractCount,
    paymentCount,
    paidPaymentCount,
    issueCount,
    timeEntryCount,
    varCostCount,
  ] = await Promise.all([
    prisma.contract.count({ where: { projectId: id as string } }),
    prisma.payment.count({ where: { contract: { projectId: id as string } } }),
    prisma.payment.count({ where: { contract: { projectId: id as string }, status: "PAID" } }),
    prisma.issue.count({ where: { contract: { projectId: id as string } } }),
    prisma.timeEntry.count({ where: { projectId: id as string } }),
    prisma.variableCost.count({ where: { projectId: id as string } }),
  ]);

  res.json({
    projectId:        project.id,
    projectName:      project.name,
    contractCount,
    paymentCount,
    paidPaymentCount,
    issueCount,
    timeEntryCount,
    varCostCount,
    canDelete:        paidPaymentCount === 0,
    blockReason:      paidPaymentCount > 0
      ? `No se puede borrar: hay ${paidPaymentCount} pago(s) cobrado(s) en este proyecto. Por contabilidad, debes archivarlo (cambiar estado a "Cancelado") en vez de eliminarlo.`
      : null,
  });
}

export async function deleteProject(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.project.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Proyecto no encontrado");
  }

  // Bloquear borrado si hay pagos cobrados — protección contable.
  const paidPayments = await prisma.payment.count({
    where: { contract: { projectId: id as string }, status: "PAID" },
  });
  if (paidPayments > 0) {
    throw new AppError(
      409,
      `No se puede eliminar el proyecto: tiene ${paidPayments} pago(s) ya cobrado(s). Cambia su estado a "Cancelado" para archivarlo sin perder el histórico.`,
    );
  }

  // Cascada: Project → Contracts → Payments/Issues/TimeEntries/VarCosts.
  // Lo gestionan los onDelete: Cascade del schema.
  await prisma.project.delete({ where: { id: id as string } });

  res.status(204).send();
}
