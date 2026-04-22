import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listIssues(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { contractId, isBillable, isOpen } = req.query;

  const where: any = { tenantId };
  if (contractId) where.contractId = contractId as string;
  if (isBillable !== undefined) where.isBillable = isBillable === "true";
  if (isOpen === "true")  where.closedAt = null;
  if (isOpen === "false") where.closedAt = { not: null };

  const issues = await prisma.issue.findMany({
    where,
    orderBy: { openedAt: "desc" },
    include: {
      contract: {
        select: {
          id: true,
          client:  { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
      _count: { select: { timeEntries: true, varCosts: true } },
    },
  });

  res.json(issues);
}

export async function getIssue(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const issue = await prisma.issue.findUnique({
    where: { id: id as string, tenantId },
    include: {
      contract: {
        include: {
          client:  { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
      timeEntries: {
        include: { user: { select: { id: true, fullName: true, hourlyCost: true } } },
        orderBy: { startedAt: "desc" },
      },
      varCosts: { orderBy: { date: "desc" } },
    },
  });

  if (!issue) throw new AppError(404, "Inconveniente no encontrado");
  res.json(issue);
}

export async function createIssue(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { contractId, title, description, isBillable, internalFault } = req.body;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId, tenantId },
  });
  if (!contract) throw new AppError(404, "Contrato no encontrado");

  const issue = await prisma.issue.create({
    data: {
      tenantId,
      contractId,
      title,
      description,
      isBillable:    isBillable    ?? false,
      internalFault: internalFault ?? false,
    },
  });

  res.status(201).json(issue);
}

export async function updateIssue(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.issue.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Inconveniente no encontrado");

  const data = { ...req.body };
  if (data.closedAt) data.closedAt = new Date(data.closedAt);

  const updated = await prisma.issue.update({
    where: { id: id as string },
    data,
  });

  res.json(updated);
}

export async function closeIssue(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.issue.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Inconveniente no encontrado");

  const updated = await prisma.issue.update({
    where: { id: id as string },
    data: { closedAt: new Date() },
  });

  res.json(updated);
}

export async function deleteIssue(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.issue.findUnique({
    where: { id: id as string, tenantId },
  });
  if (!existing) throw new AppError(404, "Inconveniente no encontrado");

  await prisma.$transaction([
    prisma.timeEntry.updateMany({
      where: { issueId: id as string },
      data:  { issueId: null },
    }),
    prisma.variableCost.updateMany({
      where: { issueId: id as string },
      data:  { issueId: null },
    }),
    prisma.issue.delete({ where: { id: id as string } }),
  ]);

  res.status(204).send();
}
