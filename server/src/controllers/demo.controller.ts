import { Request, Response } from "express";
import { seedDemo, wipeDemo, countDemoArtifacts } from "../services/demoSeed.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getDemoStatus(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const status = await countDemoArtifacts(tenantId);
  res.json(status);
}

export async function postDemoSeed(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const userId   = req.user!.userId;

  // Si ya hay demo presente, evitamos duplicar — el usuario tendría que
  // borrar primero. Mensaje claro en lugar de fallar a medias.
  const existing = await countDemoArtifacts(tenantId);
  if (existing.hasDemo) {
    throw new AppError(409, "Ya hay datos demo cargados. Bórralos antes de volver a sembrar.");
  }

  const result = await seedDemo({ tenantId, userId });
  res.status(201).json(result);
}

export async function deleteDemoWipe(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const result = await wipeDemo(tenantId);
  res.json(result);
}
