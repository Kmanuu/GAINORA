import { Router } from "express";
import { getMetrics, getProjection } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// GET /api/v1/dashboard?range=week|month|quarter|year|custom&from=&to=
router.get("/",           getMetrics);
// GET /api/v1/dashboard/projection?months=N
router.get("/projection", getProjection);

export default router;
