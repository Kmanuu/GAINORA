import { Router } from "express";
import { z } from "zod";
import {
  listFixedCosts,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  importFixedCosts,
} from "../controllers/fixedCost.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

const createFixedCostSchema = z.object({
  name: z.string().min(2),
  amount: z.number().positive(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  category: z.string().nullish(),
  isActive: z.boolean().optional(),
  isInvestment: z.boolean().optional(),
});

const updateFixedCostSchema = z.object({
  name: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  category: z.string().nullish(),
  isActive: z.boolean().optional(),
  isInvestment: z.boolean().optional(),
});

const importSchema = z.object({
  rows: z.array(z.object({
    name:         z.string().min(2),
    amount:       z.number().positive(),
    frequency:    z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
    category:     z.string().nullish(),
    isInvestment: z.boolean().optional(),
  })).min(1).max(500),
});

router.get("/", listFixedCosts);
router.post("/import", validate(importSchema), importFixedCosts);
router.post("/", validate(createFixedCostSchema), createFixedCost);
router.patch("/:id", validate(updateFixedCostSchema), updateFixedCost);
router.delete("/:id", deleteFixedCost);

export default router;
