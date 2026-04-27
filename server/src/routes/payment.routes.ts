import { Router } from "express";
import { z } from "zod";
import {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  rollPayments,
  regeneratePayment,
} from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const statusEnum = z.enum(["PENDING", "PARTIAL", "PAID"]);

// El cliente puede mandar amountGross o amountNet (al menos uno).
// El controlador deriva el otro con el vatRate del body o del contrato.
const createPaymentSchema = z.object({
  contractId:  z.string().uuid(),
  periodStart: z.string(),
  periodEnd:   z.string(),
  amountGross: z.number().nonnegative().optional(),
  amountNet:   z.number().nonnegative().optional(),
  vatRate:     z.number().min(0).max(100).optional(),
  amountDue:   z.number().nonnegative().optional(),
  amountPaid:  z.number().nonnegative().optional(),
  status:      statusEnum.optional(),
  paidAt:      z.string().nullish(),
  notes:       z.string().nullish(),
}).refine(
  (d) => d.amountGross !== undefined || d.amountNet !== undefined,
  { message: "Debes indicar amountGross o amountNet" },
);

const updatePaymentSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd:   z.string().optional(),
  amountGross: z.number().nonnegative().optional(),
  amountNet:   z.number().nonnegative().optional(),
  vatRate:     z.number().min(0).max(100).optional(),
  amountDue:   z.number().nonnegative().optional(),
  amountPaid:  z.number().nonnegative().optional(),
  status:      statusEnum.optional(),
  paidAt:      z.string().nullish(),
  notes:       z.string().nullish(),
});

router.get("/",                   listPayments);
router.post("/roll",              rollPayments);
router.post("/:id/regenerate",    regeneratePayment);
router.post("/",                  validate(createPaymentSchema), createPayment);
router.get("/:id",                getPayment);
router.patch("/:id",              validate(updatePaymentSchema), updatePayment);
router.delete("/:id",             deletePayment);

export default router;
