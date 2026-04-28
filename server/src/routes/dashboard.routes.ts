import { Router } from "express";
import { getMetrics, getProjection, getCollectionsHealth, getTaxSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// GET /api/v1/dashboard?range=week|month|quarter|year|custom&from=&to=
router.get("/",                    getMetrics);
// GET /api/v1/dashboard/projection?months=N
router.get("/projection",          getProjection);
// GET /api/v1/dashboard/collections-health
router.get("/collections-health",  getCollectionsHealth);
// GET /api/v1/dashboard/tax-summary?year=YYYY&quarter=1|2|3|4
router.get("/tax-summary",         getTaxSummary);

export default router;
