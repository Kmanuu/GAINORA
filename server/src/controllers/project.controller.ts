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
  const { clientName, clientTaxId, name, description, status, budgetHours, budgetAmount, startDate, endDate } = req.body;

  const project = await prisma.project.create({
    data: {
      tenantId,
      clientName,
      clientTaxId,
      name,
      description,
      status,
      budgetHours,
      budgetAmount,
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

export async function deleteProject(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.project.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Proyecto no encontrado");
  }

  // Soft delete: marcar como CANCELLED
  await prisma.project.update({
    where: { id: id as string },
    data: { status: "CANCELLED" },
  });

  res.status(204).send();
}
