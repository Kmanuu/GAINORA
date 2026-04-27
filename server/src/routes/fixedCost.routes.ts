import { Router } from "express";
import { z } from "zod";
import { 
  listFixedCosts, 
  createFixedCost, 
  updateFixedCost, 
  deleteFixedCost 
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
});

const updateFixedCostSchema = z.object({
  name: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  category: z.string().nullish(),
  isActive: z.boolean().optional(),
});

router.get("/", listFixedCosts);
router.post("/", validate(createFixedCostSchema), createFixedCost);
router.patch("/:id", validate(updateFixedCostSchema), updateFixedCost);
router.delete("/:id", deleteFixedCost);

export default router;
