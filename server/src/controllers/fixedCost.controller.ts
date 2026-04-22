import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listFixedCosts(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;

  const fixedCosts = await prisma.fixedCost.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  res.json(fixedCosts);
}

export async function createFixedCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { name, amount, frequency, category, isActive } = req.body;

  const fixedCost = await prisma.fixedCost.create({
    data: {
      name,
      amount,
      frequency,
      category,
      tenantId,
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(201).json(fixedCost);
}

export async function updateFixedCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const data = req.body;

  // Verificar que el coste pertenece al tenant
  const existing = await prisma.fixedCost.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Coste fijo no encontrado");
  }

  const updated = await prisma.fixedCost.update({
    where: { id: id as string },
    data,
  });

  res.json(updated);
}

export async function deleteFixedCost(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  // Verificar que el coste pertenece al tenant
  const existing = await prisma.fixedCost.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Coste fijo no encontrado");
  }

  await prisma.fixedCost.delete({
    where: { id: id as string },
  });

  res.status(204).send();
}
