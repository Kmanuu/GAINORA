import { Router } from "express";
import { getMetrics } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Todas las rutas del dashboard requieren autenticación
router.use(requireAuth);

// GET /api/v1/dashboard — Métricas de rentabilidad del negocio
router.get("/", getMetrics);

export default router;
