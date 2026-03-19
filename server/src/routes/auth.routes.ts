import { Router } from "express";
import { z } from "zod/v4";
import { register, login, refreshToken } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const registerSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  tenantSlug: z.string(),
  email: z.email(),
  password: z.string(),
});

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshToken);

export default router;
