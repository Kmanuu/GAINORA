import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listTimeEntries(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { projectId, userId, from, to } = req.query;

  const where: any = { tenantId };
  if (projectId) where.projectId = projectId as string;
  if (userId) where.userId = userId as string;
  if (from || to) {
    where.startedAt = {};
    if (from) where.startedAt.gte = new Date(from as string);
    if (to) where.startedAt.lte = new Date(to as string);
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { startedAt: "desc" },
    include: {
      user: { select: { id: true, fullName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json(entries);
}

export async function createTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.userId;
  const { projectId, description, startedAt, endedAt, durationMin, isBillable } = req.body;

  // Verificar que el proyecto pertenece al tenant
  const project = await prisma.project.findUnique({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    throw new AppError(404, "Proyecto no encontrado");
  }

  // Calcular duración si se proporcionan startedAt y endedAt
  let duration = durationMin;
  if (startedAt && endedAt && !durationMin) {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    duration = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  const entry = await prisma.timeEntry.create({
    data: {
      tenantId,
      userId,
      projectId,
      description,
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : null,
      durationMin: duration,
      isBillable: isBillable ?? true,
    },
    include: {
      user: { select: { id: true, fullName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(entry);
}

export async function updateTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const data = { ...req.body };

  const existing = await prisma.timeEntry.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Entrada de tiempo no encontrada");
  }

  // Recalcular duración si cambian las fechas
  const startedAt = data.startedAt ? new Date(data.startedAt) : existing.startedAt;
  const endedAt = data.endedAt ? new Date(data.endedAt) : existing.endedAt;

  if ((data.startedAt || data.endedAt) && endedAt && !data.durationMin) {
    data.durationMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  }

  if (data.startedAt) data.startedAt = new Date(data.startedAt);
  if (data.endedAt) data.endedAt = new Date(data.endedAt);

  const updated = await prisma.timeEntry.update({
    where: { id: id as string },
    data,
    include: {
      user: { select: { id: true, fullName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
}

export async function deleteTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.timeEntry.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Entrada de tiempo no encontrada");
  }

  await prisma.timeEntry.delete({
    where: { id: id as string },
  });

  res.status(204).send();
}
