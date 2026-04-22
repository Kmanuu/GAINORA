import { Router } from "express";
import { z } from "zod/v4";
import {
  listTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "../controllers/timeEntry.controller.js";
import { requireAuth } from "../middleware/auth.js";
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

router.get("/", listTimeEntries);
router.post("/", validate(createTimeEntrySchema), createTimeEntry);
router.patch("/:id", validate(updateTimeEntrySchema), updateTimeEntry);
router.delete("/:id", deleteTimeEntry);

export default router;
