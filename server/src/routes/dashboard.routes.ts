import { Router } from "express";
import { getMetrics, getProjection, getCollectionsHealth, getTaxSummary, getTaxModelPdf } from "../controllers/dashboard.controller.js";
import { requireAuth, requireCan } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Todos los KPIs financieros del tenant (tarifa real, MRR, beneficio,
// proyección, salud de cobros, resumen fiscal) requieren `dashboard:financials`.
// EMPLOYEE y VIEWER reciben 403 — la UI les sirve un dashboard reducido.
const financials = requireCan("dashboard:financials");

router.get("/",                    financials, getMetrics);
router.get("/projection",          financials, getProjection);
router.get("/collections-health",  financials, getCollectionsHealth);
router.get("/tax-summary",         financials, getTaxSummary);
router.get("/tax-summary/:model/pdf", financials, getTaxModelPdf);

export default router;
