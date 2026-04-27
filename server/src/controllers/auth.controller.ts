import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { JwtPayload } from "../middleware/auth.js";

function signTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
  });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response) {
  const { tenantName, tenantSlug, email, password, fullName } = req.body;

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (existingTenant) {
    throw new AppError(409, "Ese slug de empresa ya está en uso");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      users: {
        create: {
          email,
          passwordHash,
          fullName,
          role: "OWNER",
        },
      },
      // Serie A por defecto. Sin esto, las primeras facturas devuelven 409
      // ("no tienes ninguna serie") y la creación falla silenciosamente.
      invoiceSeries: {
        create: {
          code: "A",
          name: "General",
          nextNumber: 1,
          isDefault: true,
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  const tokens = signTokens({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
  });

  res.status(201).json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    ...tokens,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  // Busca el primer usuario activo con el correo ingresado e incluye datos de su empresa
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    throw new AppError(401, "Credenciales incorrectas");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Credenciales incorrectas");
  }

  const tokens = signTokens({
    userId: user.id,
    tenantId: user.tenant.id,
    role: user.role,
  });

  res.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    ...tokens,
  });
}

export async function refreshToken(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    throw new AppError(400, "Token requerido");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const tokens = signTokens({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    });
    res.json(tokens);
  } catch {
    throw new AppError(401, "Refresh token inválido");
  }
}
