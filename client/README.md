# Gainora — Frontend (client)

SPA de Gainora construida con React 19, Vite 8, TypeScript y Tailwind CSS 4.
Consume la API REST del workspace `server/` mediante la variable `VITE_API_URL`.

## Scripts

```bash
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # bundle de producción en dist/
npm run preview   # servir el bundle de producción local
npm run lint      # ESLint
```

## Variables de entorno

- `VITE_API_URL` — URL base de la API. En producción apunta a Railway
  (ver `.env.production`); en local por defecto se asume
  `http://localhost:3001/api`.

## Tests end-to-end

`npx playwright test` ejecuta los flujos de `e2e/` (tutorial, planes,
badges de demo) contra el servidor de desarrollo.
