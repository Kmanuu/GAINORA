import { Router } from "express";
import { z } from "zod";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getDeletePreview,
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

// SUBSCRIPTION queda fuera del Project: las cuotas recurrentes viven en Contract.
const projectBillingMode = z.enum(["FIXED", "HOURLY", "HYBRID"]);
const projectStatus      = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);

const dateRangeRefine = (data: { startDate?: string | null; endDate?: string | null }): boolean => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
};

const createProjectSchema = z
  .object({
    name:                    z.string().min(2),
    clientId:                z.string().uuid("clientId debe ser un UUID válido"),
    description:             z.string().nullish(),
    status:                  projectStatus.optional(),
    billingMode:             projectBillingMode.optional(),
    budgetHours:             z.number().nonnegative().nullish(),
    budgetAmount:            z.number().nonnegative().nullish(),
    hourlyRate:              z.number().nonnegative().nullish(),
    partsMarkupPct:          z.number().min(-100).max(1000).nullish(),
    productMaintenanceCost:  z.number().nonnegative().nullish(),
    startDate:               z.string().nullish(),
    endDate:                 z.string().nullish(),
  })
  .refine(dateRangeRefine, {
    path: ["endDate"],
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
  });

const updateProjectSchema = z
  .object({
    name:                    z.string().min(2).optional(),
    clientId:                z.string().uuid().optional(),
    description:             z.string().nullish(),
    status:                  projectStatus.optional(),
    billingMode:             projectBillingMode.optional(),
    budgetHours:             z.number().nonnegative().nullish(),
    budgetAmount:            z.number().nonnegative().nullish(),
    hourlyRate:              z.number().nonnegative().nullish(),
    partsMarkupPct:          z.number().min(-100).max(1000).nullish(),
    productMaintenanceCost:  z.number().nonnegative().nullish(),
    startDate:               z.string().nullish(),
    endDate:                 z.string().nullish(),
  })
  .refine(dateRangeRefine, {
    path: ["endDate"],
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
  });

router.get("/", listProjects);
router.post("/", validate(createProjectSchema), createProject);
router.get("/:id", getProject);
router.get("/:id/delete-preview", getDeletePreview);
router.patch("/:id", validate(updateProjectSchema), updateProject);
router.delete("/:id", deleteProject);

export default router;
