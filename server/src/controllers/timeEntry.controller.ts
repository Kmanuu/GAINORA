import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { userCan } from "../lib/permissions.js";

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
      user: { select: { id: true, fullName: true, hourlyCost: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json(entries);
}

export async function createTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.userId;
  const { projectId, contractId, issueId, description, startedAt, endedAt, durationMin, isBillable } = req.body;

  const project = await prisma.project.findUnique({
    where: { id: projectId, tenantId },
  });
  if (!project) throw new AppError(404, "Proyecto no encontrado");

  // Si viene contractId, validar que pertenece al tenant y al mismo proyecto
  if (contractId) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new AppError(404, "Contrato no encontrado");
    if (contract.projectId !== projectId) {
      throw new AppError(400, "El contrato no pertenece al proyecto indicado");
    }
  }

  // Si viene issueId, validar que pertenece al tenant y al contrato
  if (issueId) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId, tenantId },
    });
    if (!issue) throw new AppError(404, "Inconveniente no encontrado");
    if (contractId && issue.contractId !== contractId) {
      throw new AppError(400, "El inconveniente no pertenece al contrato indicado");
    }
  }

  let duration = durationMin;
  if (startedAt && endedAt && !durationMin) {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const rawDuration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    duration = Math.min(rawDuration, 1440); // Límite de 24h para evitar bugs de temporizador olvidado
  }

  const entry = await prisma.timeEntry.create({
    data: {
      tenantId,
      userId,
      projectId,
      contractId:  contractId ?? null,
      issueId:     issueId    ?? null,
      description,
      startedAt:   new Date(startedAt),
      endedAt:     endedAt ? new Date(endedAt) : null,
      durationMin: duration,
      isBillable:  isBillable ?? true,
    },
    include: {
      user:    { select: { id: true, fullName: true, hourlyCost: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(entry);
}

export async function updateTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const userId   = req.user!.userId;
  const role     = req.user!.role;
  const { id } = req.params;
  const data = { ...req.body };

  const existing = await prisma.timeEntry.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Entrada de tiempo no encontrada");
  }

  // EMPLOYEE sólo puede editar SUS PROPIAS entries. OWNER/ADMIN pueden editar
  // cualquiera del tenant.
  if (existing.userId !== userId && !userCan(role, "timeentry:write:any")) {
    throw new AppError(403, "Sólo puedes editar tus propias horas");
  }

  // Recalcular duración si cambian las fechas
  const startedAt = data.startedAt ? new Date(data.startedAt) : existing.startedAt;
  const endedAt = data.endedAt ? new Date(data.endedAt) : existing.endedAt;

  if ((data.startedAt || data.endedAt) && endedAt && !data.durationMin) {
    const rawDuration = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    data.durationMin = Math.min(rawDuration, 1440); // Límite de 24h
  }

  if (data.startedAt) data.startedAt = new Date(data.startedAt);
  if (data.endedAt) data.endedAt = new Date(data.endedAt);

  const updated = await prisma.timeEntry.update({
    where: { id: id as string },
    data,
    include: {
      user: { select: { id: true, fullName: true, hourlyCost: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
}

export async function deleteTimeEntry(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const userId   = req.user!.userId;
  const role     = req.user!.role;
  const { id } = req.params;

  const existing = await prisma.timeEntry.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Entrada de tiempo no encontrada");
  }

  if (existing.userId !== userId && !userCan(role, "timeentry:write:any")) {
    throw new AppError(403, "Sólo puedes borrar tus propias horas");
  }

  await prisma.timeEntry.delete({
    where: { id: id as string },
  });

  res.status(204).send();
}
