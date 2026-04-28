import { Router } from "express";
import { z } from "zod";
import {
  listTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "../controllers/timeEntry.controller.js";
import { requireAuth, requireCan } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createTimeEntrySchema = z.object({
  projectId:   z.string().uuid(),
  contractId:  z.string().uuid().nullish(),
  issueId:     z.string().uuid().nullish(),
  description: z.string().nullish(),
  startedAt:   z.string(),
  endedAt:     z.string().nullish(),
  durationMin: z.number().int().positive().optional(),
  isBillable:  z.boolean().optional(),
});

const updateTimeEntrySchema = z.object({
  contractId:  z.string().uuid().nullish(),
  issueId:     z.string().uuid().nullish(),
  description: z.string().nullish(),
  startedAt:   z.string().optional(),
  endedAt:     z.string().nullish(),
  durationMin: z.number().int().positive().optional(),
  isBillable:  z.boolean().optional(),
});

// VIEWER no puede crear/editar/borrar time entries.
// EMPLOYEE sólo puede tocar las SUYAS — verificación fina en controller.
router.get("/", listTimeEntries);
router.post("/",      requireCan("timeentry:write:own"), validate(createTimeEntrySchema), createTimeEntry);
router.patch("/:id",  requireCan("timeentry:write:own"), validate(updateTimeEntrySchema), updateTimeEntry);
router.delete("/:id", requireCan("timeentry:write:own"), deleteTimeEntry);

export default router;
