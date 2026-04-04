// ============================================================================
// me.routes.ts — Rutas del perfil del usuario autenticado
// ============================================================================

import { Router } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth.js";
import { validate }    from "../middleware/validate.js";
import { getMe, updateMe, changePassword } from "../controllers/me.controller.js";

const router = Router();

const updateMeSchema = z.object({
  fullName:   z.string().min(2).optional(),
  hourlyCost: z.number().min(0).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

router.get(  "/",          requireAuth, getMe);
router.patch("/",          requireAuth, validate(updateMeSchema),      updateMe);
router.patch("/password",  requireAuth, validate(changePasswordSchema), changePassword);

export default router;
