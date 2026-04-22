import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listVarCosts(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { projectId } = req.query;

  const where: any = { tenantId };
  if (projectId) where.projectId = projectId as string;

  const varCosts = await prisma.variableCost.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  res.json(varCosts);
}

export async function createVarCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const {
    projectId, contractId, issueId, name, amount, quantity,
    priceIncludesVat, vatRate, markupPct, date, category,
  } = req.body;

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new AppError(404, "Proyecto no encontrado");
  }

  if (contractId) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new AppError(404, "Contrato no encontrado");
    if (projectId && contract.projectId !== projectId) {
      throw new AppError(400, "El contrato no pertenece al proyecto indicado");
    }
  }

  if (issueId) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId, tenantId } });
    if (!issue) throw new AppError(404, "Inconveniente no encontrado");
    if (contractId && issue.contractId !== contractId) {
      throw new AppError(400, "El inconveniente no pertenece al contrato indicado");
    }
  }

  const varCost = await prisma.variableCost.create({
    data: {
      tenantId,
      projectId:        projectId  ?? null,
      contractId:       contractId ?? null,
      issueId:          issueId    ?? null,
      name,
      amount,
      quantity:         quantity         ?? 1,
      priceIncludesVat: priceIncludesVat ?? false,
      vatRate:          vatRate          ?? 21,
      markupPct:        markupPct        ?? null,
      date:             new Date(date),
      category,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(varCost);
}

export async function updateVarCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const data = { ...req.body };

  // Verificar que el coste pertenece al tenant
  const existing = await prisma.variableCost.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Coste variable no encontrado");
  }

  // Si cambia el projectId, verificar que el nuevo proyecto pertenece al tenant
  if (data.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId, tenantId },
    });
    if (!project) {
      throw new AppError(404, "Proyecto no encontrado");
    }
  }

  if (data.date) data.date = new Date(data.date);

  const updated = await prisma.variableCost.update({
    where: { id: id as string },
    data,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
}

export async function deleteVarCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.variableCost.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Coste variable no encontrado");
  }

  await prisma.variableCost.delete({
    where: { id: id as string },
  });

  res.status(204).send();
}
