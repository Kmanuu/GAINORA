import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listClients(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;

  const clients = await prisma.client.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contracts: { where: { status: "ACTIVE" } } } },
    },
  });

  res.json(clients);
}

export async function getClient(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id: id as string, tenantId },
    include: {
      contracts: {
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    throw new AppError(404, "Cliente no encontrado");
  }

  res.json(client);
}

export async function createClient(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { name, taxId, email, phone, notes, taxRegime, hasSurcharge } = req.body;

  const client = await prisma.client.create({
    data: {
      tenantId, name, taxId, email, phone, notes,
      ...(taxRegime    !== undefined && { taxRegime }),
      ...(hasSurcharge !== undefined && { hasSurcharge }),
    },
  });

  res.status(201).json(client);
}

export async function updateClient(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.client.findUnique({
    where: { id: id as string, tenantId },
  });

  if (!existing) {
    throw new AppError(404, "Cliente no encontrado");
  }

  const updated = await prisma.client.update({
    where: { id: id as string },
    data: req.body,
  });

  res.json(updated);
}

export async function deleteClient(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const existing = await prisma.client.findUnique({
    where: { id: id as string, tenantId },
    include: { _count: { select: { contracts: true } } },
  });

  if (!existing) {
    throw new AppError(404, "Cliente no encontrado");
  }

  if (existing._count.contracts > 0) {
    throw new AppError(
      409,
      "No se puede eliminar un cliente con contratos asociados. Cancela primero los contratos.",
    );
  }

  await prisma.client.delete({ where: { id: id as string } });

  res.status(204).send();
}
