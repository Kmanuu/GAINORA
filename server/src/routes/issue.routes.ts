import { Router } from "express";
import { z } from "zod/v4";
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  closeIssue,
  deleteIssue,
} from "../controllers/issue.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const createIssueSchema = z.object({
  contractId:    z.string().uuid(),
  title:         z.string().min(2),
  description:   z.string().nullish(),
  isBillable:    z.boolean().optional(),
  internalFault: z.boolean().optional(),
});

const updateIssueSchema = z.object({
  title:         z.string().min(2).optional(),
  description:   z.string().nullish(),
  isBillable:    z.boolean().optional(),
  internalFault: z.boolean().optional(),
  closedAt:      z.string().nullish(),
});

router.get("/",          listIssues);
router.post("/",         validate(createIssueSchema), createIssue);
router.get("/:id",       getIssue);
router.patch("/:id",     validate(updateIssueSchema), updateIssue);
router.post("/:id/close", closeIssue);
router.delete("/:id",    deleteIssue);

export default router;
