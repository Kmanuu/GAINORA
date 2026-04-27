import { Router } from "express";
import { z } from "zod";
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/plan.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const tierEnum        = z.enum(["FREE", "PRO", "MAX"]);
const billingModeEnum = z.enum(["FIXED", "HOURLY", "HYBRID", "SUBSCRIPTION"]);
const maintModeEnum   = z.enum(["NONE", "SHARED", "CUSTOM"]);

const createPlanSchema = z.object({
  name:                z.string().min(1).max(80),
  tier:                tierEnum.optional(),
  description:         z.string().nullish(),
  billingMode:         billingModeEnum.optional(),
  price:               z.number().nonnegative(),
  setupFee:            z.number().nonnegative().nullish(),
  hourlyRate:          z.number().nonnegative().nullish(),
  partsMarkupPct:      z.number().min(-100).max(1000).nullish(),
  maintenanceMode:     maintModeEnum.optional(),
  maintenanceExtraPct: z.number().min(-100).max(1000).nullish(),
  vatRate:             z.number().min(0).max(100).optional(),
  priceIncludesVat:    z.boolean().optional(),
  features:            z.array(z.string()).optional(),
  limits:              z.record(z.string(), z.unknown()).optional(),
  isActive:            z.boolean().optional(),
});

const updatePlanSchema = z.object({
  name:                z.string().min(1).max(80).optional(),
  tier:                tierEnum.optional(),
  description:         z.string().nullish(),
  billingMode:         billingModeEnum.optional(),
  price:               z.number().nonnegative().optional(),
  setupFee:            z.number().nonnegative().nullish(),
  hourlyRate:          z.number().nonnegative().nullish(),
  partsMarkupPct:      z.number().min(-100).max(1000).nullish(),
  maintenanceMode:     maintModeEnum.optional(),
  maintenanceExtraPct: z.number().min(-100).max(1000).nullish(),
  vatRate:             z.number().min(0).max(100).optional(),
  priceIncludesVat:    z.boolean().optional(),
  features:            z.array(z.string()).optional(),
  limits:              z.record(z.string(), z.unknown()).optional(),
  isActive:            z.boolean().optional(),
});

router.get("/",       listPlans);
router.post("/",      validate(createPlanSchema), createPlan);
router.get("/:id",    getPlan);
router.patch("/:id",  validate(updatePlanSchema), updatePlan);
router.delete("/:id", deletePlan);

export default router;
