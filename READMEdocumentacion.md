# HorasPRO

> Sistema de control de rentabilidad para pequeñas agencias y profesionales freelance.
>
> **Proyecto Intermodular DAW** — IES Francisco de los Ríos, Fernán Núñez, Córdoba
>
> **Autor:** Manuel Laguna Prieto · **Entrega:** Mayo 2026

---

## Diario de desarrollo

### Sesión 1 — 1-18 de marzo de 2026

#### 1. Comprobación de herramientas

Se verificó que el equipo (Mac M4) tenía todo lo necesario instalado:

- **Git** → `git --version` → v2.50.1
- **Node.js** → ya instalado
- **Docker Desktop** → ya instalado
- **VS Code / Cursor** → ya instalado

<!-- TODO: Captura de terminal con `git --version` y `node -v` -->

#### 2. Creación del repositorio

![Code snippet 1 - bash](assets/code_snippet_1.png)

Se creó la carpeta del proyecto dentro de `~/Desktop/Proyecto 2GS/` y se inicializó el repositorio Git con la estructura básica: `client/`, `server/src/`, `server/prisma/`.

<!-- TODO: Captura de la estructura de carpetas en el explorador de VS Code -->

#### 3. PostgreSQL con Docker

Se creó `docker-compose.yml` en la raíz del proyecto para levantar PostgreSQL 16:

![Code snippet 2 - yaml](assets/code_snippet_2.png)

![Code snippet 3 - bash](assets/code_snippet_3.png)

<!-- TODO: Captura de `docker ps` mostrando el contenedor corriendo -->

#### 4. Inicialización del backend

![Code snippet 4 - bash](assets/code_snippet_4.png)

Dependencias instaladas:

| Tipo    | Paquetes                                                                   |
| ------- | -------------------------------------------------------------------------- |
| Runtime | express, @prisma/client, cors, helmet, zod, bcryptjs, jsonwebtoken, dotenv |
| Dev     | typescript, @types/\*, tsx, vitest, prisma                                 |

#### 5. Configuración de TypeScript

Se creó `server/tsconfig.json`:

![Code snippet 5 - json](assets/code_snippet_5.png)

#### 6. Inicialización de Prisma

![Code snippet 6 - bash](assets/code_snippet_6.png)

Esto generó:

- `prisma/schema.prisma` — schema de la base de datos
- `prisma.config.ts` — configuración de Prisma 7 (la URL de la BD se define aquí)
- `.env` — variables de entorno
- `.gitignore` — excluye node_modules, .env y el cliente generado

**Nota:** Prisma 7 ya no soporta `url = env("DATABASE_URL")` directamente en el schema. La conexión se configura en `prisma.config.ts`:

![Code snippet 7 - ts](assets/code_snippet_7.png)

#### 7. Schema de Prisma

Se escribió el schema completo con 7 modelos y 4 enums en `prisma/schema.prisma`:

| Modelo         | Descripción                                      |
| -------------- | ------------------------------------------------ |
| `Tenant`       | Negocio/empresa (multi-tenant)                   |
| `User`         | Usuario con rol (OWNER, ADMIN, EMPLOYEE, VIEWER) |
| `Project`      | Proyecto con cliente, presupuesto y estado       |
| `TimeEntry`    | Registro de horas trabajadas                     |
| `FixedCost`    | Costes fijos (alquiler, licencias...)            |
| `VariableCost` | Costes variables por proyecto                    |

![Code snippet 8 - bash](assets/code_snippet_8.png)

<!-- TODO: Captura de la salida de `prisma db push` -->

#### 8. Variables de entorno

Se configuró `server/.env`:

![Code snippet 9 - env](assets/code_snippet_9.png)

También se creó `.env.example` en la raíz del proyecto (sin secretos) para que cualquiera pueda configurar su entorno.

#### 9. Estructura de carpetas del servidor

Se crearon todos los archivos esqueleto con `// TODO` indicando qué implementar en cada uno:

![Code snippet 10 - ](assets/code_snippet_10.png)

#### 10. Scripts de npm

Se configuraron los scripts en `server/package.json`:

![Code snippet 11 - json](assets/code_snippet_11.png)

#### 11. Verificación del servidor

![Code snippet 12 - bash](assets/code_snippet_12.png)

El servidor arranca correctamente y responde al endpoint de health check.

<!-- TODO: Captura de la terminal con el servidor corriendo y la respuesta del health check -->

---

### Estado actual

| Componente                | Estado                   |
| ------------------------- | ------------------------ |
| Repositorio Git           | Inicializado             |
| PostgreSQL (Docker)       | Corriendo                |
| Schema Prisma (7 modelos) | Sincronizado con BD      |
| Express server            | Arranca, health check OK |
| Estructura de carpetas    | Completa con TODOs       |
| Lógica de negocio         | Pendiente                |
| Frontend (React + Vite)   | Pendiente                |

### Siguiente paso

Implementar la autenticación: registro, login, JWT, y middleware de auth.
