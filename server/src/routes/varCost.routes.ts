import { Router } from "express";
import { z } from "zod";
import { listVarCosts, createVarCost, updateVarCost, deleteVarCost } from "../controllers/varCost.controller.js";
import { requireAuth, requireCan } from "../middleware/auth.js";
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
  isInvestment:     z.boolean().optional(),
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
  isInvestment:     z.boolean().optional(),
});

// EMPLOYEE puede crear/editar varCosts (su rol incluye varcost:write:own).
// VIEWER no puede. La verificación fina "el contrato pertenece al user"
// se delega al controller en una iteración futura.
router.get("/", listVarCosts);
router.post("/",     requireCan("varcost:write:own"), validate(createVarCostSchema), createVarCost);
router.patch("/:id", requireCan("varcost:write:own"), validate(updateVarCostSchema), updateVarCost);
router.delete("/:id", requireCan("varcost:write:own"), deleteVarCost);

export default router;
