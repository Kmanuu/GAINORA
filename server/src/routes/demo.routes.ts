import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDemoStatus, postDemoSeed, deleteDemoWipe } from "../controllers/demo.controller.js";

const router = Router();

router.get(   "/status", requireAuth, getDemoStatus);
router.post(  "/seed",   requireAuth, postDemoSeed);
router.delete("/wipe",   requireAuth, deleteDemoWipe);

export default router;
