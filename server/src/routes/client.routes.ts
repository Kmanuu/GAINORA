import { Router } from "express";
import { z } from "zod";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";
import { requireAuth, requireCan } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createClientSchema = z.object({
  name: z.string().min(2),
  taxId: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
  taxRegime:    z.enum(["NATIONAL", "EU_INTRA", "NON_EU"]).optional(),
  hasSurcharge: z.boolean().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  taxId: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
  taxRegime:    z.enum(["NATIONAL", "EU_INTRA", "NON_EU"]).optional(),
  hasSurcharge: z.boolean().optional(),
});

router.get("/", listClients);
router.get("/:id", getClient);
router.post("/",      requireCan("client:write"), validate(createClientSchema), createClient);
router.patch("/:id",  requireCan("client:write"), validate(updateClientSchema), updateClient);
router.delete("/:id", requireCan("client:write"), deleteClient);

export default router;
