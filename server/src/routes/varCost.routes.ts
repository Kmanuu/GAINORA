import { Router } from "express";
import { z } from "zod";
import { listVarCosts, createVarCost, updateVarCost, deleteVarCost } from "../controllers/varCost.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createVarCostSchema = z.object({
  projectId:        z.string().uuid().nullish(),
  contractId:       z.string().uuid().nullish(),
  issueId:          z.string().uuid().nullish(),
  name:             z.string().min(2),
  amount:           z.number().positive(),
  quantity:         z.number().positive().optional(),
  priceIncludesVat: z.boolean().optional(),
  vatRate:          z.number().min(0).max(100).optional(),
  markupPct:        z.number().min(-100).max(1000).nullish(),
  date:             z.string(),
  category:         z.string().nullish(),
});

const updateVarCostSchema = z.object({
  projectId:        z.string().uuid().nullish(),
  contractId:       z.string().uuid().nullish(),
  issueId:          z.string().uuid().nullish(),
  name:             z.string().min(2).optional(),
  amount:           z.number().positive().optional(),
  quantity:         z.number().positive().optional(),
  priceIncludesVat: z.boolean().optional(),
  vatRate:          z.number().min(0).max(100).optional(),
  markupPct:        z.number().min(-100).max(1000).nullish(),
  date:             z.string().optional(),
  category:         z.string().nullish(),
});

router.get("/", listVarCosts);
router.post("/", validate(createVarCostSchema), createVarCost);
router.patch("/:id", validate(updateVarCostSchema), updateVarCost);
router.delete("/:id", deleteVarCost);

export default router;
