import { Router } from "express";
import { z } from "zod/v4";
import { listVarCosts, createVarCost, updateVarCost, deleteVarCost } from "../controllers/varCost.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createVarCostSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(2),
  amount: z.number().positive(),
  date: z.string(),
  category: z.string().optional(),
});

const updateVarCostSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  category: z.string().optional(),
});

router.get("/", listVarCosts);
router.post("/", validate(createVarCostSchema), createVarCost);
router.patch("/:id", validate(updateVarCostSchema), updateVarCost);
router.delete("/:id", deleteVarCost);

export default router;
