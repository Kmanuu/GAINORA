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
  const force    = req.query.force === "1" || req.query.force === "true";

  // Bloqueo siempre si ya hay demo (evita duplicados).
  const existing = await countDemoArtifacts(tenantId);
  if (existing.hasDemo) {
    throw new AppError(409, "Ya hay datos demo cargados. Bórralos antes de volver a sembrar.");
  }

  // Si la cuenta tiene datos reales y no se ha confirmado con ?force=1,
  // devolvemos 409 con código distinguible para que el frontend pueda mostrar
  // un confirm específico ("se mezclarán con tus datos reales").
  if (existing.hasRealData && !force) {
    res.status(409).json({
      error: {
        code: "HAS_REAL_DATA",
        message: "La cuenta ya tiene datos reales. Repite la petición con ?force=1 para confirmar la mezcla.",
      },
    });
    return;
  }

  const result = await seedDemo({ tenantId, userId });
  res.status(201).json(result);
}

export async function deleteDemoWipe(req: Request, res: Response) {
  const tenantId = req.user!.tenantId;
  const result = await wipeDemo(tenantId);
  res.json(result);
}
