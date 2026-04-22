import { Router } from "express";
import { z } from "zod/v4";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const createClientSchema = z.object({
  name: z.string().min(2),
  taxId: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
});

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  taxId: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
});

router.get("/", listClients);
router.post("/", validate(createClientSchema), createClient);
router.get("/:id", getClient);
router.patch("/:id", validate(updateClientSchema), updateClient);
router.delete("/:id", deleteClient);

export default router;
