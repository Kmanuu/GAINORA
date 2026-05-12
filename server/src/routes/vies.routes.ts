import { Router } from "express";
import { z } from "zod";
import { validateNif } from "../controllers/vies.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const validateNifSchema = z.object({
  taxId: z.string().min(5).max(20),
});

router.post("/validate", validate(validateNifSchema), validateNif);

export default router;
