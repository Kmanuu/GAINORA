import { Router } from "express";
import { z } from "zod";
import {
  listInvoices, getInvoice, createInvoice, createInvoiceFromPayment,
  updateInvoice, issueInvoice, voidInvoice, deleteInvoice, getInvoicePdf,
  listSeries, createSeries, updateSeries,
} from "../controllers/invoice.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  description: z.string().min(1),
  quantity:    z.number().optional(),
  unitPrice:   z.number(),
  vatRate:     z.number().min(0).max(100).optional(),
  irpfRate:    z.number().min(0).max(100).optional(),
  discount:    z.number().min(0).max(100).optional(),
});

const createSchema = z.object({
  seriesId:   z.string().uuid().optional(),
  clientId:   z.string().uuid(),
  contractId: z.string().uuid().nullish(),
  paymentId:  z.string().uuid().nullish(),
  issueDate:  z.string().optional(),
  dueDate:    z.string().nullish(),
  notes:      z.string().nullish(),
  lines:      z.array(lineSchema).min(1),
});

const updateSchema = z.object({
  seriesId:   z.string().uuid().optional(),
  clientId:   z.string().uuid().optional(),
  issueDate:  z.string().optional(),
  dueDate:    z.string().nullish(),
  notes:      z.string().nullish(),
  lines:      z.array(lineSchema).optional(),
});

const seriesCreateSchema = z.object({
  code:       z.string().min(1).max(8),
  name:       z.string().min(1),
  nextNumber: z.number().int().min(1).optional(),
  isDefault:  z.boolean().optional(),
});

const seriesUpdateSchema = z.object({
  name:       z.string().min(1).optional(),
  nextNumber: z.number().int().min(1).optional(),
  isDefault:  z.boolean().optional(),
});

// Series
router.get("/series",       listSeries);
router.post("/series",      validate(seriesCreateSchema), createSeries);
router.patch("/series/:id", validate(seriesUpdateSchema), updateSeries);

// Invoices
router.get("/",                            listInvoices);
router.post("/",                           validate(createSchema), createInvoice);
router.post("/from-payment/:paymentId",    createInvoiceFromPayment);
router.get("/:id",                         getInvoice);
router.get("/:id/pdf",                     getInvoicePdf);
router.patch("/:id",                       validate(updateSchema), updateInvoice);
router.post("/:id/issue",                  issueInvoice);
router.post("/:id/void",                   voidInvoice);
router.delete("/:id",                      deleteInvoice);

export default router;
