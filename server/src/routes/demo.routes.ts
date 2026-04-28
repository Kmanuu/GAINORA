import { Router } from "express";
import { requireAuth, requireCan } from "../middleware/auth.js";
import { getDemoStatus, postDemoSeed, deleteDemoWipe } from "../controllers/demo.controller.js";

const router = Router();

// Demo seed/wipe es destructivo y afecta a toda la cuenta — sólo OWNER.
router.get(   "/status", requireAuth, getDemoStatus);
router.post(  "/seed",   requireAuth, requireCan("tenant:demo"), postDemoSeed);
router.delete("/wipe",   requireAuth, requireCan("tenant:demo"), deleteDemoWipe);

export default router;
