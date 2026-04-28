// ============================================================================
// me.routes.ts — Rutas del perfil del usuario autenticado
// ============================================================================

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate }    from "../middleware/validate.js";
import { getMe, updateMe, changePassword, updateTenant } from "../controllers/me.controller.js";

const router = Router();

const updateMeSchema = z.object({
  fullName:   z.string().min(2).optional(),
  hourlyCost: z.number().min(0).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

const billingProfileSchema = z.object({
  fullName:   z.string().nullish(),
  address:    z.string().nullish(),
  postalCode: z.string().nullish(),
  city:       z.string().nullish(),
  country:    z.string().nullish(),
  email:      z.string().nullish(),
  phone:      z.string().nullish(),
  iban:       z.string().nullish(),
}).partial();

const taxOverrides130Schema = z.object({
  /** year (4 dígitos) → quarter (1-4) → importe ya pagado en sede AEAT */
  model130: z.record(z.string(), z.record(z.string(), z.number().min(0))).optional(),
}).partial().optional();

const updateTenantSchema = z.object({
  name:                 z.string().min(2).optional(),
  taxId:                z.string().nullish(),
  plannedCapacityHours: z.number().int().min(1).max(2000).optional(),
  targetMarginPct:      z.number().min(0).max(500).optional(),
  costingMode:          z.enum(["ABSORPTION", "CONTRIBUTION"]).optional(),
  reliabilityMinHours:  z.number().int().min(0).max(1000).optional(),
  taxCriterion:         z.enum(["ACCRUAL", "CASH"]).optional(),
  billing:              billingProfileSchema.optional(),
  taxOverrides:         taxOverrides130Schema,
});

router.get(  "/",          requireAuth, getMe);
router.patch("/",          requireAuth, validate(updateMeSchema),      updateMe);
router.patch("/password",  requireAuth, validate(changePasswordSchema), changePassword);
router.patch("/tenant",    requireAuth, validate(updateTenantSchema),  updateTenant);

export default router;
