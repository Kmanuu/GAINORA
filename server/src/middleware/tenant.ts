import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

/** Inyecta tenantId en req para que los controllers hagan scope automático */
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.tenantId) {
    throw new AppError(401, "Tenant no identificado");
  }
  next();
}
