# Gainora

> Control de rentabilidad para autónomos y agencias: clientes, contratos,
> horas, costes, suscripciones y facturación legal (VeriFactu) en una sola app.

Proyecto Intermodular del Ciclo Superior **Desarrollo de Aplicaciones Web (DAW)**.
Entrega: mayo de 2026.

## Producción

- Frontend (Vercel): https://gainora.vercel.app
- API (Railway): https://gainora.up.railway.app/api

## Estructura

```
client/   SPA React 19 + Vite + TypeScript + Tailwind 4
server/   API Node + Express + Prisma + PostgreSQL
docker-compose.yml   Postgres local para desarrollo
.env.example         plantilla de variables de entorno del backend
```

## Stack

- **Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4,
  Framer Motion, Lucide Icons.
- **Backend:** Node ≥ 22, Express 5, Prisma 7, PostgreSQL 16, JWT,
  Helmet, node-cron, PDFKit, QRCode.
- **API externa:** VIES (validación de NIF intracomunitario).
- **Despliegue:** Vercel (frontend) + Railway (API + base de datos).

## Puesta en marcha local

```bash
# 1. Base de datos local (Postgres en Docker)
docker compose up -d

# 2. Backend
cd server
cp ../.env.example .env          # ajustar JWT_SECRET, RESEND_API_KEY si aplica
npm install
npm run db:push
npm run db:seed                  # datos de demostración
npm run dev                      # http://localhost:3001

# 3. Frontend (en otra terminal)
cd client
npm install
npm run dev                      # http://localhost:5173
```

## Tests

```bash
cd server && npm test            # unit tests con Vitest
cd client && npx playwright test # E2E con Playwright
```

## Autoría

Manuel Laguna Prieto — IES Francisco de los Ríos, Fernán Núñez (Córdoba).
