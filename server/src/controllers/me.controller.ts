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
      taxId:                true,
      plan:                 true,
      settings:             true,
      plannedCapacityHours: true,
      targetMarginPct:      true,
      costingMode:          true,
      reliabilityMinHours:  true,
      taxCriterion:         true,
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
    taxCriterion,
    name,
    taxId,
    billing,
    taxOverrides,
  } = req.body;

  // Merge de settings: solo sobreescribimos `billing` y `taxOverrides`
  // cuando vienen en el body. El merge es PROFUNDO para taxOverrides:
  // si llega { model130: { 2026: { 1: 250 } } }, se fusiona con lo
  // existente en lugar de reemplazar todo el árbol.
  let mergedSettings: any | undefined;
  if (billing !== undefined || taxOverrides !== undefined) {
    const current = await prisma.tenant.findUnique({
      where: { id: tenantId }, select: { settings: true },
    });
    const settings = (current?.settings ?? {}) as Record<string, any>;
    mergedSettings = { ...settings };
    if (billing !== undefined) {
      mergedSettings.billing = { ...(settings.billing ?? {}), ...billing };
    }
    if (taxOverrides !== undefined) {
      const prev = (settings.taxOverrides ?? {}) as Record<string, any>;
      const merged: Record<string, any> = { ...prev };
      if (taxOverrides.model130) {
        const prev130 = (prev.model130 ?? {}) as Record<string, any>;
        const next130: Record<string, any> = { ...prev130 };
        for (const [year, qs] of Object.entries(taxOverrides.model130)) {
          next130[year] = { ...(prev130[year] ?? {}), ...(qs as Record<string, number>) };
        }
        merged.model130 = next130;
      }
      mergedSettings.taxOverrides = merged;
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name                 !== undefined && { name }),
      ...(taxId                !== undefined && { taxId }),
      ...(plannedCapacityHours !== undefined && { plannedCapacityHours }),
      ...(targetMarginPct      !== undefined && { targetMarginPct }),
      ...(costingMode          !== undefined && { costingMode }),
      ...(reliabilityMinHours  !== undefined && { reliabilityMinHours }),
      ...(taxCriterion         !== undefined && { taxCriterion }),
      ...(mergedSettings       !== undefined && { settings: mergedSettings }),
    },
    select: {
      id:                   true,
      name:                 true,
      slug:                 true,
      taxId:                true,
      plan:                 true,
      settings:             true,
      plannedCapacityHours: true,
      targetMarginPct:      true,
      costingMode:          true,
      reliabilityMinHours:  true,
      taxCriterion:         true,
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
