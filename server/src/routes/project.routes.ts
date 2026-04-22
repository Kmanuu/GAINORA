import { Router } from "express";
import { z } from "zod/v4";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createProjectSchema = z.object({
  name:                    z.string().min(2),
  clientName:              z.string().nullish(),
  clientTaxId:             z.string().nullish(),
  description:             z.string().nullish(),
  status:                  z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  billingMode:             z.enum(["FIXED", "HOURLY", "HYBRID", "SUBSCRIPTION"]).optional(),
  budgetHours:             z.number().positive().nullish(),
  budgetAmount:            z.number().positive().nullish(),
  hourlyRate:              z.number().nonnegative().nullish(),
  partsMarkupPct:          z.number().min(-100).max(1000).nullish(),
  productMaintenanceCost:  z.number().nonnegative().nullish(),
  startDate:               z.string().nullish(),
  endDate:                 z.string().nullish(),
});

const updateProjectSchema = z.object({
  name:                    z.string().min(2).optional(),
  clientName:              z.string().nullish(),
  clientTaxId:             z.string().nullish(),
  description:             z.string().nullish(),
  status:                  z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  billingMode:             z.enum(["FIXED", "HOURLY", "HYBRID", "SUBSCRIPTION"]).optional(),
  budgetHours:             z.number().positive().nullish(),
  budgetAmount:            z.number().positive().nullish(),
  hourlyRate:              z.number().nonnegative().nullish(),
  partsMarkupPct:          z.number().min(-100).max(1000).nullish(),
  productMaintenanceCost:  z.number().nonnegative().nullish(),
  startDate:               z.string().nullish(),
  endDate:                 z.string().nullish(),
});

router.get("/", listProjects);
router.post("/", validate(createProjectSchema), createProject);
router.get("/:id", getProject);
router.patch("/:id", validate(updateProjectSchema), updateProject);
router.delete("/:id", deleteProject);

export default router;
