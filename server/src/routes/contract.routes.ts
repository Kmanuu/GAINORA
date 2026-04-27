import { Router } from "express";
import { z } from "zod";
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  convertContract,
} from "../controllers/contract.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const tierEnum         = z.enum(["FREE", "PRO", "MAX"]);
const billingModeEnum  = z.enum(["FIXED", "HOURLY", "HYBRID", "SUBSCRIPTION"]);
const statusEnum       = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);
const maintenanceEnum  = z.enum(["NONE", "SHARED", "CUSTOM"]);

const contractDateRefine = (data: { startedAt?: string; endedAt?: string | null }): boolean => {
  if (!data.startedAt || !data.endedAt) return true;
  return new Date(data.endedAt).getTime() >= new Date(data.startedAt).getTime();
};

const createContractSchema = z
  .object({
    projectId:              z.string().uuid(),
    clientId:               z.string().uuid(),
    planId:                 z.string().uuid().nullish(),
    tier:                   tierEnum.optional(),
    billingMode:            billingModeEnum.optional(),
    price:                  z.number().nonnegative().optional(),
    setupFee:               z.number().nonnegative().nullish(),
    hourlyRate:             z.number().nonnegative().nullish(),
    budgetHours:            z.number().nonnegative().nullish(),
    partsMarkupPct:         z.number().min(-100).max(1000).nullish(),
    maintenanceMode:        maintenanceEnum.optional(),
    maintenanceExtraPct:    z.number().min(0).max(1000).nullish(),
    maintenanceFixedAmount: z.number().nonnegative().nullish(),
    billingDay:             z.number().int().min(1).max(31).nullish(),
    priceIncludesVat:       z.boolean().optional(),
    vatRate:                z.number().min(0).max(100).optional(),
    status:                 statusEnum.optional(),
    startedAt:              z.string().optional(),
    endedAt:                z.string().nullish(),
    notes:                  z.string().nullish(),
  })
  .refine(contractDateRefine, {
    path: ["endedAt"],
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
  });

const updateContractSchema = z
  .object({
    tier:                   tierEnum.optional(),
    billingMode:            billingModeEnum.optional(),
    price:                  z.number().nonnegative().optional(),
    setupFee:               z.number().nonnegative().nullish(),
    hourlyRate:             z.number().nonnegative().nullish(),
    budgetHours:            z.number().nonnegative().nullish(),
    partsMarkupPct:         z.number().min(-100).max(1000).nullish(),
    maintenanceMode:        maintenanceEnum.optional(),
    maintenanceExtraPct:    z.number().min(0).max(1000).nullish(),
    maintenanceFixedAmount: z.number().nonnegative().nullish(),
    billingDay:             z.number().int().min(1).max(31).nullish(),
    priceIncludesVat:       z.boolean().optional(),
    vatRate:                z.number().min(0).max(100).optional(),
    status:                 statusEnum.optional(),
    startedAt:              z.string().optional(),
    endedAt:                z.string().nullish(),
    notes:                  z.string().nullish(),
  })
  .refine(contractDateRefine, {
    path: ["endedAt"],
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
  });

const convertContractSchema = z.object({
  billingMode:          billingModeEnum,
  price:                z.number().nonnegative().optional(),
  generateFirstPayment: z.boolean().optional(),
});

router.get("/",             listContracts);
router.post("/",            validate(createContractSchema),  createContract);
router.get("/:id",          getContract);
router.patch("/:id",        validate(updateContractSchema),  updateContract);
router.delete("/:id",       deleteContract);
router.post("/:id/convert", validate(convertContractSchema), convertContract);

export default router;
