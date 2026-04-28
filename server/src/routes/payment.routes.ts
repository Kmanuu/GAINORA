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
  addPaymentTransaction,
  deletePaymentTransaction,
} from "../controllers/payment.controller.js";
import { requireAuth, requireCan } from "../middleware/auth.js";
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

const transactionSchema = z.object({
  amount:    z.number().positive(),
  paidAt:    z.string().optional(),
  method:    z.enum(["TRANSFER", "CARD", "CASH", "OTHER"]).optional(),
  reference: z.string().nullish(),
  notes:     z.string().nullish(),
});

router.get("/",                       listPayments);
router.get("/:id",                    getPayment);
router.post("/roll",                  requireCan("payment:write"), rollPayments);
router.post("/:id/regenerate",        requireCan("payment:write"), regeneratePayment);
router.post("/:id/transactions",      requireCan("payment:write"), validate(transactionSchema), addPaymentTransaction);
router.delete("/transactions/:trxId", requireCan("payment:write"), deletePaymentTransaction);
router.post("/",                      requireCan("payment:write"), validate(createPaymentSchema), createPayment);
router.patch("/:id",                  requireCan("payment:write"), validate(updatePaymentSchema), updatePayment);
router.delete("/:id",                 requireCan("payment:write"), deletePayment);

export default router;
