// ============================================================================
// team.controller.ts — Gestión de usuarios dentro del tenant (rol OWNER)
// ============================================================================
// CRUD de los users que pertenecen al tenant del OWNER autenticado.
// Restricciones:
//   · No se pueden crear usuarios con rol SUPERADMIN desde aquí (rol global).
//   · No se puede degradar al último OWNER del tenant (always one OWNER).
//   · No se puede eliminar el último OWNER.
//   · Un OWNER no puede modificar su propio rol (evita auto-bloqueo).
// ============================================================================

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const ASSIGNABLE_ROLES = ["OWNER", "ADMIN", "EMPLOYEE", "VIEWER"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

export async function listTeamUsers(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  // SUPERADMIN no forma parte del equipo del tenant aunque comparta tenantId
  // (es admin global del SaaS, asignado fuera de la app). No aparece en /team.
  const users = await prisma.user.findMany({
    where: { tenantId, role: { not: "SUPERADMIN" } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, email: true, fullName: true, role: true,
      hourlyCost: true, isActive: true, createdAt: true,
    },
  });
  res.json(users);
}

export async function createTeamUser(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const { email, password, fullName, role, hourlyCost } = req.body as {
    email: string; password: string; fullName: string;
    role: AssignableRole; hourlyCost?: number;
  };

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError(400, `Rol inválido. Permitidos: ${ASSIGNABLE_ROLES.join(", ")}`);
  }

  // Comprueba que el email no esté ya en este tenant.
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "Ya existe un usuario con ese correo en tu empresa");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId, email, passwordHash, fullName, role,
      hourlyCost: hourlyCost ?? null,
    },
    select: {
      id: true, email: true, fullName: true, role: true,
      hourlyCost: true, isActive: true, createdAt: true,
    },
  });
  res.status(201).json(user);
}

export async function updateTeamUser(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const actingUserId = req.user!.userId;
  const { id } = req.params;
  const { fullName, role, hourlyCost, isActive, password } = req.body as {
    fullName?: string; role?: AssignableRole;
    hourlyCost?: number | null; isActive?: boolean; password?: string;
  };

  const target = await prisma.user.findUnique({
    where: { id: id as string, tenantId },
    select: { id: true, role: true },
  });
  if (!target) throw new AppError(404, "Usuario no encontrado");

  // No te puedes modificar el rol a ti mismo (evita degradarte sin querer).
  if (target.id === actingUserId && role && role !== target.role) {
    throw new AppError(409, "No puedes cambiar tu propio rol. Pide a otro OWNER que lo haga.");
  }

  // No degradar al último OWNER del tenant.
  if (role && role !== "OWNER" && target.role === "OWNER") {
    const ownersCount = await prisma.user.count({
      where: { tenantId, role: "OWNER", isActive: true },
    });
    if (ownersCount <= 1) {
      throw new AppError(409, "Debe quedar al menos un OWNER activo en la empresa");
    }
  }

  if (role && !ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError(400, `Rol inválido. Permitidos: ${ASSIGNABLE_ROLES.join(", ")}`);
  }

  const data: Record<string, unknown> = {};
  if (fullName   !== undefined) data.fullName   = fullName;
  if (role       !== undefined) data.role       = role;
  if (hourlyCost !== undefined) data.hourlyCost = hourlyCost;
  if (isActive   !== undefined) data.isActive   = isActive;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({
    where: { id: id as string },
    data,
    select: {
      id: true, email: true, fullName: true, role: true,
      hourlyCost: true, isActive: true, createdAt: true,
    },
  });
  res.json(updated);
}

export async function deleteTeamUser(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const actingUserId = req.user!.userId;
  const { id } = req.params;

  if (id === actingUserId) {
    throw new AppError(409, "No puedes eliminarte a ti mismo");
  }

  const target = await prisma.user.findUnique({
    where: { id: id as string, tenantId },
    select: { role: true },
  });
  if (!target) throw new AppError(404, "Usuario no encontrado");

  if (target.role === "OWNER") {
    const ownersCount = await prisma.user.count({
      where: { tenantId, role: "OWNER", isActive: true },
    });
    if (ownersCount <= 1) {
      throw new AppError(409, "No puedes eliminar al último OWNER de la empresa");
    }
  }

  // El user tiene timeEntries que harían FK con onDelete=Cascade. Borramos
  // limpiamente — el histórico se va con el user.
  await prisma.user.delete({ where: { id: id as string } });
  res.status(204).send();
}
