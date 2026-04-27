// ============================================================================
// me.controller.ts — Perfil del usuario autenticado
// ============================================================================

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

// ---------------------------------------------------------------------------
// GET /api/v1/me — Devuelve usuario + tenant del token
// ---------------------------------------------------------------------------

export async function getMe(req: Request, res: Response) {
  const { userId, tenantId } = req.user!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:          true,
      email:       true,
      fullName:    true,
      role:        true,
      hourlyCost:  true,
      isActive:    true,
      createdAt:   true,
    },
  });

  if (!user) throw new AppError(404, "Usuario no encontrado");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id:                   true,
      name:                 true,
      slug:                 true,
      plan:                 true,
      plannedCapacityHours: true,
      targetMarginPct:      true,
      costingMode:          true,
      reliabilityMinHours:  true,
    },
  });

  res.json({ user, tenant });
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/me/tenant — Actualiza configuración de cálculo del tenant
// ---------------------------------------------------------------------------

export async function updateTenant(req: Request, res: Response) {
  const { tenantId } = req.user!;
  const {
    plannedCapacityHours,
    targetMarginPct,
    costingMode,
    reliabilityMinHours,
    name,
  } = req.body;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name                 !== undefined && { name }),
      ...(plannedCapacityHours !== undefined && { plannedCapacityHours }),
      ...(targetMarginPct      !== undefined && { targetMarginPct }),
      ...(costingMode          !== undefined && { costingMode }),
      ...(reliabilityMinHours  !== undefined && { reliabilityMinHours }),
    },
    select: {
      id:                   true,
      name:                 true,
      slug:                 true,
      plan:                 true,
      plannedCapacityHours: true,
      targetMarginPct:      true,
      costingMode:          true,
      reliabilityMinHours:  true,
    },
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/me — Actualiza nombre y coste/hora del usuario
// ---------------------------------------------------------------------------

export async function updateMe(req: Request, res: Response) {
  const { userId } = req.user!;
  const { fullName, hourlyCost } = req.body;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName   !== undefined && { fullName }),
      ...(hourlyCost !== undefined && { hourlyCost }),
    },
    select: {
      id:         true,
      email:      true,
      fullName:   true,
      role:       true,
      hourlyCost: true,
    },
  });

  res.json(updated);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/me/password — Cambia la contraseña
// ---------------------------------------------------------------------------

export async function changePassword(req: Request, res: Response) {
  const { userId } = req.user!;
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, "La contraseña actual no es correcta");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  res.json({ message: "Contraseña actualizada correctamente" });
}
