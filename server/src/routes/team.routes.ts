import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireCan } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listTeamUsers, createTeamUser, updateTeamUser, deleteTeamUser,
} from "../controllers/team.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireCan("team:manage")); // sólo OWNER del tenant

const roleEnum = z.enum(["OWNER", "ADMIN", "EMPLOYEE", "VIEWER"]);

const createSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8),
  fullName:   z.string().min(2),
  role:       roleEnum,
  hourlyCost: z.number().min(0).nullish(),
});

const updateSchema = z.object({
  fullName:   z.string().min(2).optional(),
  role:       roleEnum.optional(),
  hourlyCost: z.number().min(0).nullish(),
  isActive:   z.boolean().optional(),
  password:   z.string().min(8).optional(),
});

router.get(   "/",     listTeamUsers);
router.post(  "/",     validate(createSchema), createTeamUser);
router.patch( "/:id",  validate(updateSchema), updateTeamUser);
router.delete("/:id",  deleteTeamUser);

export default router;
