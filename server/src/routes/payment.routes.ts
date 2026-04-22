import { Router } from "express";
import { z } from "zod/v4";
import {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  rollPayments,
} from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const statusEnum = z.enum(["PENDING", "PARTIAL", "PAID"]);

const createPaymentSchema = z.object({
  contractId:  z.string().uuid(),
  periodStart: z.string(),
  periodEnd:   z.string(),
  amount:      z.number().nonnegative(),
  paidAmount:  z.number().nonnegative().optional(),
  status:      statusEnum.optional(),
  paidAt:      z.string().nullish(),
  notes:       z.string().nullish(),
});

const updatePaymentSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd:   z.string().optional(),
  amount:      z.number().nonnegative().optional(),
  paidAmount:  z.number().nonnegative().optional(),
  status:      statusEnum.optional(),
  paidAt:      z.string().nullish(),
  notes:       z.string().nullish(),
});

router.get("/",      listPayments);
router.post("/roll", rollPayments);
router.post("/",     validate(createPaymentSchema), createPayment);
router.get("/:id",   getPayment);
router.patch("/:id", validate(updatePaymentSchema), updatePayment);
router.delete("/:id", deletePayment);

export default router;
