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
  const { projectId, name, amount, date, category } = req.body;

  // Verificar que el proyecto pertenece al tenant si se proporciona
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      throw new AppError(404, "Proyecto no encontrado");
    }
  }

  const varCost = await prisma.variableCost.create({
    data: {
      tenantId,
      projectId,
      name,
      amount,
      date: new Date(date),
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
