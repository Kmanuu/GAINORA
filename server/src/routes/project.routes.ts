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
  name: z.string().min(2),
  clientName: z.string().optional(),
  clientTaxId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  budgetHours: z.number().positive().optional(),
  budgetAmount: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  clientName: z.string().optional(),
  clientTaxId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  budgetHours: z.number().positive().optional(),
  budgetAmount: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.get("/", listProjects);
router.post("/", validate(createProjectSchema), createProject);
router.get("/:id", getProject);
router.patch("/:id", validate(updateProjectSchema), updateProject);
router.delete("/:id", deleteProject);

export default router;
