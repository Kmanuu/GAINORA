import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { listTenantsAdmin, getTenantDetailAdmin } from "../controllers/admin.controller.js";

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get("/tenants",     listTenantsAdmin);
router.get("/tenants/:id", getTenantDetailAdmin);

export default router;
