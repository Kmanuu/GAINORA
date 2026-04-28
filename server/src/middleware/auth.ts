import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import { userCan, type Action } from "../lib/permissions.js";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Token no proporcionado");
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "Token inválido o expirado");
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "No tienes permisos para esta acción");
    }
    next();
  };
}

/** Sólo deja pasar si el usuario tiene rol SUPERADMIN. Es el dueño del
 *  SaaS — nunca se asigna desde la web, sólo desde el script
 *  admin-users.ts ejecutado en local con acceso a la BD. */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "SUPERADMIN") {
    throw new AppError(403, "Acceso restringido al administrador del SaaS");
  }
  next();
}

/** Bloquea la petición si el rol del usuario autenticado no tiene la
 *  capacidad indicada. Ver `lib/permissions.ts` para la matriz. */
export function requireCan(action: Action) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "No autenticado");
    }
    if (!userCan(req.user.role, action)) {
      throw new AppError(403, `Tu rol (${req.user.role}) no permite esta acción`);
    }
    next();
  };
}
