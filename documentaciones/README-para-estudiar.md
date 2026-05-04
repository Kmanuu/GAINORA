# Gainora — La caja negra abierta

> Cómo funciona TODO, explicado pieza a pieza para que no tengas que adivinar nada.  
> Escrito para que puedas defender cualquier pregunta técnica del tribunal.

---

## La idea en una frase

Gainora es una SPA (Single Page Application) con un backend REST. El navegador hace peticiones HTTP al servidor, el servidor lee o escribe en PostgreSQL, y devuelve JSON. Simple. La complejidad está en *lo que hace* con esos datos, no en la arquitectura.

---

## Tabla de contenidos

1. [El mapa completo: cómo fluyen los datos](#1-el-mapa-completo)
2. [El backend: Express por dentro](#2-el-backend-express-por-dentro)
3. [La base de datos: Prisma y PostgreSQL](#3-la-base-de-datos)
4. [Autenticación: cómo sabe el servidor quién eres](#4-autenticación)
5. [Multi-tenancy: cómo no se mezclan las empresas](#5-multi-tenancy)
6. [Roles y permisos: quién puede hacer qué](#6-roles-y-permisos)
7. [El ciclo de vida de una factura (lo más complicado)](#7-el-ciclo-de-vida-de-una-factura)
8. [VeriFactu: la cadena de hashes](#8-verifactu-la-cadena-de-hashes)
9. [El cron de pagos: el robot nocturno](#9-el-cron-de-pagos)
10. [El frontend: React por dentro](#10-el-frontend-react-por-dentro)
11. [Cómo se comunican frontend y backend](#11-comunicación-frontend-backend)
12. [El cálculo de tarifa mínima](#12-el-cálculo-de-tarifa-mínima)
13. [Despliegue: del código a Internet](#13-despliegue)
14. [Preguntas que puede hacer el tribunal](#14-preguntas-del-tribunal)

---

## 1. El mapa completo

Cuando Laura abre el navegador y entra en Gainora, esto es lo que pasa:

```
Laura escribe la URL
        ↓
Vercel devuelve los ficheros JS/HTML/CSS del frontend React
        ↓
React se ejecuta en el navegador de Laura
        ↓
React hace petición: GET /api/v1/dashboard
        ↓
La petición viaja por Internet hasta Railway
        ↓
Express recibe la petición
   → middleware de auth: ¿tienes un JWT válido? Sí → continúa
   → middleware de tenant: extrae el tenantId del JWT
   → controller del dashboard: llama al servicio
   → servicio: hace queries a PostgreSQL con Prisma
   → PostgreSQL devuelve los datos
   → servicio calcula métricas y devuelve JSON
        ↓
Express envía la respuesta JSON al navegador
        ↓
React recibe el JSON, actualiza el estado, re-renderiza
        ↓
Laura ve los datos en pantalla
```

Todo eso pasa en menos de 500ms. Vamos a ver cada paso en detalle.

---

## 2. El backend: Express por dentro

El punto de entrada es `server/src/server.ts`. Es pequeño, solo 58 líneas. Hace tres cosas:

**1. Configura middlewares globales**
```
helmet()    →  añade headers de seguridad HTTP
cors()      →  solo acepta peticiones de los dominios permitidos
json()      →  parsea el body de las peticiones como JSON
```

**2. Monta las rutas**
Cada recurso tiene su propio fichero de rutas:
```
/api/auth           → auth.routes.ts         (login, register, refresh)
/api/v1/clients     → client.routes.ts       (CRUD clientes)
/api/v1/projects    → project.routes.ts      (CRUD proyectos)
/api/v1/contracts   → contract.routes.ts     (CRUD contratos)
/api/v1/payments    → payment.routes.ts      (cobros)
/api/v1/invoices    → invoice.routes.ts      (facturación)
/api/v1/dashboard   → dashboard.routes.ts    (métricas)
... etc.
```

**3. Arranca el servidor y el cron**
```typescript
app.listen(env.PORT, "0.0.0.0", () => {
  startRollPaymentsCron(); // el robot nocturno
});
```

### Cómo fluye una petición dentro del backend

Cada petición pasa por capas, como una cebolla:

```
Petición HTTP
     ↓
  helmet / cors / json   (middlewares globales)
     ↓
  authMiddleware         (verifica JWT, extrae userId y role)
     ↓
  tenantMiddleware       (extrae tenantId, verifica que el user pertenece a ese tenant)
     ↓
  validateMiddleware     (valida el body con Zod)
     ↓
  Controller             (coordinador: llama al servicio, devuelve respuesta)
     ↓
  Service                (lógica de negocio real: queries, cálculos, reglas)
     ↓
  Prisma                 (traduce a SQL y ejecuta)
     ↓
  PostgreSQL
```

La separación Controller → Service es importante: el controller sabe de HTTP (status codes, request, response). El service no sabe nada de HTTP, solo recibe datos y devuelve resultados. Esto facilita los tests.

---

## 3. La base de datos

El schema completo está en `server/prisma/schema.prisma`. Son 533 líneas. Vamos a lo importante.

### El Tenant: el centro de todo

```prisma
model Tenant {
  id    String @id @default(uuid())
  name  String
  slug  String @unique
  plan  TenantPlan @default(STARTER)
  // ... configuración fiscal, capacidad, margen objetivo
}
```

El Tenant es "la empresa". Todo lo demás apunta a un Tenant. Si borras un Tenant, PostgreSQL borrará en cascada TODOS sus datos (users, clients, projects, invoices...).

### El árbol de relaciones

```
Tenant
  └── Users (empleados)
  └── Clients (clientes de la empresa)
        └── Projects (proyectos del cliente)
              └── Contracts (la relación económica)
                    └── TimeEntries (horas trabajadas)
                    └── VariableCosts (gastos del proyecto)
                    └── Issues (incidencias)
                    └── Payments (cobros periódicos)
                          └── Invoices (documentos fiscales)
                                └── InvoiceLines (líneas del PDF)
                                └── InvoiceAuditLog (historial inmutable)
  └── FixedCosts (gastos de la empresa, no de proyectos)
  └── Plans (catálogo de planes que ofreces)
  └── InvoiceSeries (series de numeración: A, R, F...)
```

### Por qué existe Contract

Un Project es "estoy haciendo una web para Acme Corp". Un Contract es "el deal económico de ese trabajo: 500€/mes, con IVA al 21%, IRPF al 15%, facturación el día 1 de cada mes".

Un proyecto puede tener varios contratos a lo largo del tiempo (renuevas las condiciones, añades mantenimiento, etc.). Esta separación es lo que permite manejar contratos de suscripción sin complicar el modelo de proyectos.

### Índices: por qué las queries son rápidas

Fíjate en los `@@index` del schema. Por ejemplo en Contract:
```prisma
@@index([tenantId, status])
@@index([projectId])
@@index([clientId])
```

Sin índices, PostgreSQL haría full table scan para encontrar los contratos activos de un tenant. Con el índice compuesto `[tenantId, status]`, la query es instantánea aunque haya millones de filas.

---

## 4. Autenticación

### El login paso a paso

1. El usuario envía `{ email, password }` a `POST /api/auth/login`
2. El servidor busca el usuario en BD por `{ tenantId, email }`
3. Compara la contraseña con `bcrypt.compare(password, user.passwordHash)`. bcrypt es lento a propósito para dificultar ataques de fuerza bruta.
4. Si coincide, genera DOS tokens JWT:
   - **accessToken**: expira en 15 minutos. Lleva `{ userId, tenantId, role }` en el payload.
   - **refreshToken**: expira en 7 días. Solo lleva `{ userId }`.
5. Los tokens se devuelven al frontend. El frontend los guarda en `localStorage`.

### JWT: cómo funciona el brazalete

Un JWT tiene tres partes separadas por puntos: `header.payload.signature`

El payload del accessToken de Gainora tiene esto:
```json
{
  "userId":   "uuid-del-user",
  "tenantId": "uuid-del-tenant",
  "role":     "OWNER",
  "exp":      1747123456
}
```

Este payload **no está cifrado**, solo codificado en base64. Cualquiera puede leerlo. La magia está en la `signature`: el servidor firma el token con `JWT_SECRET`. Si alguien modifica el payload (e.g., cambia "EMPLOYEE" por "OWNER"), la firma no coincide y el servidor rechaza el token.

### El auto-refresh

En `client/src/lib/api.ts` hay lógica para que si el accessToken está a punto de expirar (menos de 15 segundos), antes de enviar la petición lo renueva automáticamente usando el refreshToken. El usuario nunca nota que su sesión se renueva.

Si el refreshToken también ha expirado, limpia el localStorage y redirige a `/login`.

---

## 5. Multi-tenancy

Esta es la parte de seguridad más crítica. Si hay un bug aquí, una empresa puede ver los datos de otra.

### El middleware de tenant

```typescript
// tenant.ts (simplificado)
export function tenantGuard(req, res, next) {
  const tenantId = req.auth.tenantId; // viene del JWT
  req.tenantId = tenantId;           // se inyecta en el request
  next();
}
```

### Cómo se usa en cada query

Cada vez que un controller hace una query, pasa el `tenantId`:

```typescript
// Ejemplo: buscar contratos
const contracts = await prisma.contract.findMany({
  where: { tenantId: req.tenantId }
});
```

El `WHERE tenantId = 'uuid-de-laura'` que Prisma genera garantiza que Laura nunca ve datos de otra empresa. No importa qué ID ponga en la URL: si ese contrato no pertenece a su tenant, la query devuelve 0 resultados (o 404).

### ¿Qué pasa con el SUPERADMIN?

El SUPERADMIN es el único rol que puede hacer queries cross-tenant. Existen rutas bajo `/api/v1/admin/` que no aplican el filtro de tenantId. Esas rutas tienen un guard adicional que verifica que `role === 'SUPERADMIN'`.

---

## 6. Roles y permisos

### Dónde vive la lógica

`server/src/lib/permissions.ts` (backend) y `client/src/lib/permissions.ts` (frontend) contienen la misma matriz de permisos. No DRY perfecto, pero garantiza que el frontend no muestra botones que el backend rechazaría de todas formas.

### La jerarquía

```
SUPERADMIN  →  puede todo, en todas las empresas
OWNER       →  puede todo, en su empresa
ADMIN       →  puede casi todo (no anular facturas, no gestionar equipo)
EMPLOYEE    →  solo puede fichar sus propias horas
VIEWER      →  solo lectura
```

### El hook useCan en frontend

```typescript
// client/src/hooks/useCan.ts
const can = useCan();
if (can('invoice:void')) {
  // mostrar el botón de anular factura
}
```

`useCan` lee el rol del usuario del AuthContext y comprueba la matriz de permisos. Si el role es EMPLOYEE, `can('invoice:void')` devuelve `false` y el botón no aparece en pantalla.

### La doble verificación

El frontend oculta botones. El backend **rechaza** peticiones no autorizadas. Siempre los dos. El frontend es UX; el backend es seguridad real. Si alguien mandara una petición con curl, el backend la rechazaría independientemente de lo que muestre el frontend.

---

## 7. El ciclo de vida de una factura

Este es el flujo más complejo del sistema. Cada paso tiene reglas que no se pueden saltarse.

### Estados posibles

```
DRAFT  →  ISSUED  →  PAID
                 ↘  VOIDED
```

- **DRAFT**: existe en BD, sin número. Se puede editar y borrar.
- **ISSUED**: tiene número inmutable, hash SHA-256, PDF generado. No se puede editar.
- **PAID**: el cliente ha pagado. Solo cambia el campo `paidAt`.
- **VOIDED**: anulada. Genera automáticamente una rectificativa (serie R).

### El momento crítico: pasar de DRAFT a ISSUED

Aquí están los tres riesgos que el código maneja:

**Riesgo 1: dos usuarios emitiendo facturas a la vez**  
Si Laura y Pepa pulsan "Emitir" en el mismo segundo, podrían generar dos facturas con el mismo número. Solución: `SELECT ... FOR UPDATE` en `InvoiceSeries`. PostgreSQL bloquea la fila mientras se incrementa el número. El segundo proceso espera.

**Riesgo 2: el número debe ser correlativo sin huecos**  
La ley española exige que la numeración sea correlativa. Si hay huecos (1, 2, 4, 5...) es ilegal. La asignación de número y el incremento de `InvoiceSeries.nextNumber` son atómicos: o los dos pasan, o ninguno.

**Riesgo 3: la cadena VeriFactu**  
Al emitir, hay que calcular `previousHash` (el hash de la última factura emitida de esa serie) y el nuevo `currentHash`. Si esto falla a mitad, la cadena se rompería. Todo el proceso está en una transacción Prisma.

```typescript
// Simplificado de invoiceService.issueInvoice()
await prisma.$transaction(async (tx) => {
  // 1. Bloquear la serie
  const series = await tx.$queryRaw`SELECT * FROM invoice_series WHERE id = ${seriesId} FOR UPDATE`;
  
  // 2. Asignar número
  const number = series.nextNumber;
  await tx.invoiceSeries.update({ where: { id: seriesId }, data: { nextNumber: number + 1 } });
  
  // 3. Calcular hash
  const previousHash = lastIssuedInvoice?.currentHash ?? 'GENESIS';
  const currentHash = sha256(`${seriesId}${number}${date}${totalGross}${previousHash}`);
  
  // 4. Actualizar factura
  await tx.invoice.update({ where: { id }, data: { number, status: 'ISSUED', previousHash, currentHash } });
  
  // 5. Escribir audit log (inmutable)
  await tx.invoiceAuditLog.create({ data: { invoiceId: id, action: 'ISSUE', hash: currentHash, payload: {...} } });
});
// Si cualquier paso falla, todo se revierte. La factura queda como DRAFT.
```

---

## 8. VeriFactu: la cadena de hashes

### ¿Por qué existe?

El Real Decreto 1007/2023 nació porque era demasiado fácil "borrar" facturas del sistema después de haberlas emitido para pagar menos impuestos. VeriFactu hace eso imposible: si borras o modificas una factura, la cadena de hashes se rompe y es detectable.

### Cómo funciona la cadena

Imagina que tienes tres facturas:

```
Factura 1:
  previousHash = "GENESIS"
  datos = "A-2026-001, 1000€, 2026-01-01"
  currentHash = SHA256("GENESIS" + "A-2026-001" + "1000€" + "2026-01-01")
             = "abc123..."

Factura 2:
  previousHash = "abc123..."   ← el currentHash de la factura 1
  datos = "A-2026-002, 2000€, 2026-01-15"
  currentHash = SHA256("abc123..." + "A-2026-002" + "2000€" + "2026-01-15")
             = "def456..."

Factura 3:
  previousHash = "def456..."   ← el currentHash de la factura 2
  ...
```

Si alguien modifica la Factura 1 (cambia 1000€ por 500€), su hash cambia. Pero la Factura 2 todavía apunta al hash antiguo. La cadena está rota. Un auditor puede detectarlo.

### El QR en el PDF

El PDF de cada factura lleva un código QR. Ese QR contiene el `qrPayload`, que incluye el hash de la factura. En el futuro, cuando la AEAT tenga el sistema activo, se podrá verificar la autenticidad escaneando ese QR.

### La tabla InvoiceAuditLog

Es insert-only: solo se escribe, nunca se actualiza ni borra. Cada emisión, anulación y rectificación deja un registro. Es el "libro de contabilidad" inmutable del sistema.

---

## 9. El cron de pagos

### Dónde vive

`server/src/jobs/rollPaymentsCron.ts`

### Qué hace a las 03:00

```typescript
cron.schedule('0 3 * * *', async () => {
  // Para cada contrato activo de tipo SUBSCRIPTION o HYBRID:
  //   ¿Debería haberse generado un pago hoy?
  //   Si sí y no existe ya → crearlo con amountNet, vatRate, irpfAmount calculados
});
```

La lógica de "¿debería haberse generado hoy?" depende de:
- `billingDay`: el día del mes en que se factura (ej: día 1)
- `billingFrequency`: MONTHLY, QUARTERLY o YEARLY
- `startedAt`: cuándo empezó el contrato

Si un contrato empezó el 15 de enero, el pago de enero solo cubre del 15 al 31 (prorrateo). El cron calcula el importe proporcional automáticamente.

### ¿Por qué a las 03:00?

Porque es cuando hay menos tráfico y no interrumpe a ningún usuario. En un sistema de producción real también evita zonas de transición de día en distintas zonas horarias.

---

## 10. El frontend: React por dentro

### La estructura de carpetas

```
client/src/
├── pages/          ← una página = un componente grande (DashboardPage, InvoicesPage...)
├── components/
│   ├── ui/         ← átomos: Button, Input, Modal, Toast, Badge...
│   ├── layout/     ← esqueleto: AppLayout, Sidebar, BottomNav
│   └── (domain)/   ← componentes específicos de negocio
├── context/        ← AuthContext, ThemeContext, OnboardingContext
├── lib/
│   ├── api.ts      ← cliente HTTP
│   ├── permissions.ts ← matriz de permisos
│   └── format.ts   ← formatters (moneda, fecha, duración)
├── hooks/
│   └── useCan.ts   ← hook de permisos
└── router/
    └── index.tsx   ← árbol de rutas
```

### El AuthContext: quién eres en todo momento

`AuthContext` es un Context de React que guarda el usuario y tenant autenticados. Está disponible en cualquier componente de la app sin pasar props:

```typescript
const { user, tenant, logout } = useAuth();
```

Al cargar la app, `AuthContext` lee el token del localStorage, lo decodifica (sin verificar firma, eso es del servidor) y extrae `{ userId, tenantId, role }`. Si el token existe y no ha expirado, el usuario está "logueado" en el frontend.

### React Router 7 y las rutas protegidas

El router define dos tipos de rutas:
- **Rutas públicas**: `/login`, `/register`, `/` (landing), páginas legales. Accesibles sin login.
- **Rutas protegidas**: todo lo demás. Si no hay token válido, redirige a `/login`.

```typescript
// Simplificado
<Route element={<PrivateRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/invoices" element={<InvoicesPage />} />
  // ...
</Route>
```

`PrivateRoute` comprueba `useAuth()`. Si no hay usuario, hace `<Navigate to="/login" />`.

### El OnboardingContext

La primera vez que una empresa entra, el `OnboardingWizard` los guía paso a paso. El `OnboardingContext` guarda en qué paso están y si han completado el onboarding. Se persiste en localStorage para que si cierran el navegador a mitad, puedan continuar.

---

## 11. Comunicación frontend-backend

### El cliente HTTP centralizado (api.ts)

Todos los fetch del frontend pasan por `client/src/lib/api.ts`. Nunca se hace `fetch('/api/...')` directamente en un componente. Esto centraliza:
- La URL base (de `VITE_API_URL`)
- Los headers de autenticación (`Authorization: Bearer ${accessToken}`)
- El auto-refresh del token
- El manejo de errores HTTP

```typescript
// Ejemplo de cómo se usa desde una página
import { api } from '../lib/api';

const invoices = await api.get('/v1/invoices');
const newInvoice = await api.post('/v1/invoices', { contractId, clientId });
```

### CORS: por qué el backend necesita saber de dónde llega el frontend

El navegador bloquea peticiones cross-origin por defecto (seguridad). Para que `https://gainora.vercel.app` pueda hacer fetch a `https://gainora.up.railway.app`, el backend tiene que decir explícitamente "acepto peticiones de esos dominios":

```typescript
app.use(cors({
  origin: ['https://gainora.vercel.app', 'http://localhost:5173']
}));
```

---

## 12. El cálculo de tarifa mínima

### La fórmula

La tarifa mínima rentable es la respuesta a: "¿Cuánto tengo que cobrar la hora para cubrir TODOS mis costes y obtener el margen que quiero?"

```
Coste total mensual = Costes fijos mensualizados + Coste de los empleados
Tarifa mínima = (Coste total / Horas disponibles) / (1 - margenObjetivo)
```

Ejemplo concreto:
- Costes fijos: 800 €/mes (alquiler, software, etc.)
- Sueldo del autónomo: 2.000 €/mes
- Capacidad: 160 horas/mes
- Margen objetivo: 30%

```
Coste total = 800 + 2000 = 2.800 €
Tarifa base = 2.800 / 160 = 17,5 €/h
Tarifa con margen = 17,5 / (1 - 0,30) = 25 €/h
```

Si cobras menos de 25 €/hora, trabajas a pérdidas (o sin el margen que necesitas para crecer).

### Los dos modos de costeo

El schema tiene `costingMode: ABSORPTION | CONTRIBUTION`.

- **ABSORPTION**: distribuye TODOS los costes fijos entre las horas. Es el modo conservador: "cada hora tiene que pagar su parte de la luz y el alquiler".
- **CONTRIBUTION**: solo calcula el coste variable por hora. Útil cuando ya tienes el alquiler pagado y quieres saber si un proyecto extra es rentable.

---

## 13. Despliegue

### El flujo de deploy

```
git push origin main
         ↓
┌────────────────────┐    ┌────────────────────────────────┐
│     Vercel         │    │          Railway               │
│  (frontend)        │    │    (backend + PostgreSQL)      │
│                    │    │                                │
│  1. npm run build  │    │  1. npm run build              │
│  2. vite build     │    │     (prisma generate + tsc)    │
│  3. CDN global     │    │  2. prisma db push             │
│  < 30 segundos     │    │  3. node dist/server.js        │
└────────────────────┘    └────────────────────────────────┘
```

### Variables de entorno

Nunca en el código. Siempre en el dashboard de Vercel/Railway:

**Backend (Railway)**:
- `DATABASE_URL` — URL de conexión PostgreSQL con usuario/contraseña
- `JWT_SECRET` — clave secreta para firmar tokens (mínimo 32 caracteres aleatorios)
- `CLIENT_URL` — URL del frontend (para CORS)
- `NODE_ENV=production`

**Frontend (Vercel)**:
- `VITE_API_URL` — URL del backend Railway

### ¿Por qué Vercel para el frontend y Railway para el backend?

- **Vercel** sirve archivos estáticos desde CDN global. El HTML/JS/CSS se carga desde el servidor más cercano al usuario. No tiene sentido poner el frontend en Railway.
- **Railway** gestiona el servidor Node.js y la base de datos PostgreSQL en el mismo entorno, lo que simplifica la conexión y reduce la latencia entre backend y BD.

### El comando de arranque en Railway

```bash
prisma db push --accept-data-loss && node dist/server.js
```

`prisma db push` sincroniza el schema con la BD real. `--accept-data-loss` solo es seguro en producción si los cambios del schema son aditivos (añadir columnas, no borrarlas). En producción real habría que usar `prisma migrate deploy`.

---

## 14. Preguntas que puede hacer el tribunal

### "¿Por qué TypeScript y no JavaScript?"

TypeScript detecta errores en tiempo de compilación que JavaScript dejaría pasar hasta producción. En un sistema con facturas legales, tener type-safety es especialmente importante. El coste de aprender TypeScript se amortiza muy rápido.

### "¿Qué es Prisma y para qué sirve?"

Prisma es un ORM (*Object-Relational Mapper*): traduce objetos TypeScript a queries SQL automáticamente. En lugar de escribir `SELECT * FROM invoices WHERE tenant_id = $1 AND status = $2`, escribes `prisma.invoice.findMany({ where: { tenantId, status } })`. Las ventajas: TypeScript sabe qué campos existen y qué tipos tienen, el autocompletado funciona, y las migraciones de base de datos se versionan en ficheros.

### "¿Cómo protege la app los datos entre empresas?"

Cada registro en la BD tiene un `tenantId`. El middleware de tenant extrae el `tenantId` del JWT y lo inyecta en todas las queries. No hay ningún endpoint que devuelva datos de un tenant distinto al del token. Aunque alguien conozca el UUID de un contrato de otra empresa, no puede acceder a él.

### "¿Qué pasa si dos usuarios emiten una factura a la vez?"

PostgreSQL bloquea la fila de `InvoiceSeries` con `SELECT FOR UPDATE`. El segundo proceso espera hasta que el primero termine. Después, lee el número ya incrementado y genera su factura con el siguiente. No hay race condition.

### "¿Por qué generas el PDF en el servidor y no en el navegador?"

Tres razones: (1) el hash VeriFactu se calcula en el servidor — el PDF debe contenerlo, así que debe generarse después; (2) la apariencia del PDF sería diferente en cada navegador/sistema operativo si se generara en el cliente; (3) un PDF generado en el servidor no puede ser manipulado por el usuario antes de descargarlo.

### "¿Qué es VeriFactu y cómo lo implementaste?"

Real Decreto 1007/2023: cada factura emitida debe encadenarse con la anterior mediante una firma digital. Implementé una cadena SHA-256: `currentHash = SHA256(seriesId + number + date + totalGross + previousHash)`. Si alguien modifica cualquier campo de cualquier factura, la cadena se rompe. Toda la lógica está en `invoiceService.issueInvoice()` dentro de una transacción atómica.

### "¿Cómo implementaste el sistema de roles?"

Hay un enum `Role` en Prisma con los cinco valores. El JWT lleva el role del usuario. En el backend, cada endpoint que necesita un permiso específico llama a `requirePermission('invoice:void')`, que comprueba si el role del token tiene ese permiso. En el frontend, el hook `useCan` hace lo mismo para ocultar elementos de la UI.

### "¿Qué harías diferente si lo volvieras a hacer?"

- Usaría `prisma migrate` en lugar de `prisma db push` desde el principio, para tener un historial de migraciones.
- Separaría los schemas de Zod (validación) en un paquete compartido entre frontend y backend, para no tener la misma lógica duplicada.
- Añadiría tests E2E con Playwright desde el principio, no al final.

### "¿Cómo escalaría la app si tuviese 10.000 empresas?"

La arquitectura actual es stateless (sin sesiones en servidor), así que se puede escalar horizontalmente añadiendo más instancias del backend. El cuello de botella sería la BD — se resolvería con read replicas o connection pooling (PgBouncer). El multi-tenancy con `tenantId` en cada tabla aguanta perfectamente ese volumen.

---

*Última actualización: mayo 2026*
