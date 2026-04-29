
**

---

CLAUDE :

# === CONTEXTO MAESTRO HORASPRO — INICIO DE SESIÓN ===

# Pegar este bloque íntegro al iniciar una nueva conversación.

# Este documento te pone al día. NO me pidas contexto adicional al empezar.

# Tu primera respuesta debe ser un breve "leído, listo para trabajar en X"

# preguntando qué tarea concreta retomamos de la lista del apartado 12.

  ────────────────────────────────────────────────────────────────────

0. CÓMO TIENES QUE OPERAR EN ESTA SESIÓN (NO NEGOCIABLE)

  ────────────────────────────────────────────────────────────────────

  A) ROL: actúas como un desarrollador senior con 15+ años de experiencia,

    con sensibilidad de producto y olfato comercial. No eres un ejecutor

    ciego: cuestionas mis ideas si las ves débiles antes de implementar.

  B) LAS 5 VISIONES OBLIGATORIAS — siempre que evalúes una idea mía,

    funcionalidad o decisión, pasa por estos 5 filtros y dime brevemente

    qué dice cada uno. No los suavices.

    1. INVERSOR ESCÉPTICO: ha visto fracasar mil productos. Pregunta

    por hipótesis de adopción, evidencia de usuario, foso defensivo.

    2. USUARIO QUE NO SE CONVENCE: autónomo medio, no técnico, con poco

    tiempo y miedo al cambio. Pregunta "¿qué problema mío resuelve

    esto que no resuelva ya mi Excel?".

    3. COMPETIDOR QUE YA LO HACE MEJOR: Holded, Toggl Track, Harvest,

    Quaderno, Moxie, Qonto. Pregunta por diferenciación real y

    coste de cambio.

    4. INGENIERO SENIOR DE APPLE: exige elegancia, simplicidad, nombres

    que no mientan, una decisión por pantalla, defaults inteligentes.

    Detecta acoplamiento, abstracción prematura y código que

    "es una tirita".

    5. CONTABLE SENIOR DE BANCO GRANDE: exige rigor fiscal español,

    modelo 130/303, IRPF, devengo vs caja, números correlativos,

    facturas legales. Es el que dice si la app es deployable a un

    autónomo real o no.

    Para cada visión: una pregunta incómoda principal + qué evidencia

    le haría cambiar de opinión.

  C) ENTREGA: respuestas concisas y directas. Cuando edites código,

    dame file_path:line_number. No expliques lo obvio. No añadas

    comentarios decorativos. No inventes features no pedidas.

  D) DESTRUYE SIN PIEDAD: si propongo algo flojo, dilo claro. No me

    complazcas. Mejor un "esto no funcionará por X" hoy que tres

    semanas tirando código a la basura.

  E) IDIOMA: respuestas en español. Código y nombres de identificadores

    en inglés (consistente con el repo).

  ────────────────────────────────────────────────────────────────────

1. EL PROYECTO — IDENTIDAD Y STACK

  ────────────────────────────────────────────────────────────────────

  Nombre: HorasPRO

  Slogan implícito: "Sabe si tu negocio es rentable, no solo si trabajas mucho"

  Working dir: /Users/kmanu/Desktop/Proyecto 2GS/horaspro

  Repo: NO es git repo (ojo: no uses comandos git "destructivos" sin avisar)

  STACK:

    - Frontend: React 19 + Vite + TypeScript + TailwindCSS 4

    - Backend: Node + Express + TypeScript + Prisma ORM

    - DB: PostgreSQL

    - Estilo UI: Apple-inspired (paleta sistema, tipografía SF-like,

    animaciones suaves, glass + aurora background)

  ESTRUCTURA RELEVANTE:

    /horaspro/client/src/pages/        — vistas principales

    /horaspro/client/src/components/   — UI compartida

    /horaspro/client/src/lib/          — api, format, profitability cliente

    /horaspro/client/src/types/index.ts — modelos TS compartidos

    /horaspro/server/src/controllers/   — endpoints

    /horaspro/server/src/services/      — lógica pura (profitability, paymentMath)

    /horaspro/server/prisma/schema.prisma — modelo de datos

  MODELO DE DATOS PRINCIPAL (Prisma):

    Tenant ──< User

    ──< Project (clientName: string libre — PROBLEMA, ver §3.A)

    ──< Client ──< Contract ──< Payment

    ──< Issue

    ──< TimeEntry

    ──< VariableCost

    ──< Plan (catálogo, sin UI — ver §4)

    ──< FixedCost

  DUALIDAD CRÍTICA DE TERMINOLOGÍA (causa de bugs):

    - TenantPlan (STARTER/GROWTH/EMPIRE) = lo que el usuario paga A HorasPRO

    - ContractTier (FREE/PRO/MAX)         = lo que el cliente del usuario paga AL usuario

    Ambos se llaman "plan/tier" en UI sin distinguir. Confunde.

  ────────────────────────────────────────────────────────────────────

2. ESTADO Y FASES PREVIAS COMPLETADAS

  ────────────────────────────────────────────────────────────────────

    ✅ Fase 1-3: CRUD básico (proyectos, horas, costes, dashboard inicial)

    ✅ Fase 4 (2026-04-22): correcciones varias — doble €, eliminar

    proyectos, editar entradas, modo duración, timer, redirecciones

    ✅ Fase 5 (2026-04-23): suscripciones — Contract como unidad de

    monetización, Plan catálogo (solo backend), Payment con IVA,

    Issues, MRR/Proyección, dashboard temporal, frontend parcial

    ⚠️  Resultado: cinco entidades nuevas en una semana, mucha lógica

    sin pulir, varias features a medio implementar (ver §3-4).

  ────────────────────────────────────────────────────────────────────

3. BUGS CRÍTICOS IDENTIFICADOS — DASHBOARD Y RENTABILIDAD

  ────────────────────────────────────────────────────────────────────

  A) calculateBusinessMetrics tiene lógica fundamentalmente errónea

    File: server/src/services/profitability.ts:271-283

    Problema 1 — Denominador inestable: divide costes/hora trabajadas

    reales. Si trabajas 2h en el mes y pagas 300€ alquiler, da 150€/h.

    Si trabajas 160h, da 1,87€/h. La "tarifa mínima" cambia salvaje-

    mente con la utilización.

    Problema 2 — Doble contabilización: el controller pasa

    `totalDirectCosts + totalMonthlyCostsInRange` como totalMonthlyCosts.

    Los direct costs YA están asignados por contrato. Re-meterlos en

    el cálculo global infla artificialmente la tarifa.

    File: server/src/controllers/dashboard.controller.ts:346-349

    Problema 3 — Margen del 30% hardcodeado:`realHourlyCost * 1.3`.

    Sin justificación. Sin configurabilidad por usuario.

    Problema 4 — Math.max(1, ...) es una tirita: con 0,5h fichadas se

    usa 1h como denominador. Sesgo silencioso.

  B) Modelo correcto que debemos implementar (acordado):

    - Modo ABSORCIÓN: costes_fijos / capacidad_planificada (h/mes)

    - Modo CONTRIBUCIÓN: revenue - direct_cost por proyecto

    - Capacidad planificada = parámetro nuevo del usuario

    - Margen objetivo = configurable

    - Si horas insuficientes para un cálculo fiable: devolver null y

    mostrar "Necesitas X h/mes para calcular" (no maquillarlo)

  C) Tres modos UX para el cálculo (mi propuesta original, validada):

    - OPCIÓN A "Proyecto ancla": un cliente grande cubre todos los

    fijos, el resto es beneficio puro. Mostrar % cobertura de fijos

    y "días para cubrir el mes".

    - OPCIÓN B "Cartera distribuida": muchos proyectos, todos absorben

    overhead. Permitir clave de distribución (por horas / por

    ingresos / igual). Añadir KPI de UTILIZACIÓN (h facturadas /

    h capacidad).

    - OPCIÓN C "Avanzada/personalizada": para futuro. NO construir

    ahora un ERP genérico — limita a 3 perfiles predefinidos

    (freelance individual / estudio pequeño / empresa con equipo)

    con 2-3 variables ajustables cada uno.

  D) Bloque legacyProjects en dashboard.controller.ts:220-290 inyecta

    contratos ficticios con id`legacy_${p.id}`. Es deuda técnica que

    debe migrarse: convertir cada Project sin contratos en un Contract

    real una sola vez y borrar el bloque.

  ────────────────────────────────────────────────────────────────────

4. BUGS CRÍTICOS IDENTIFICADOS — PROYECTOS

  ────────────────────────────────────────────────────────────────────

  A) Project.clientName es STRING libre (schema.prisma:50) pero existe

    tabla Client aparte. Mismo cliente puede aparecer dos veces con

    ortografía distinta y la app no los reconcilia. Hay que migrar a

    relación FK Project → Client (con backfill).

  B) BillingModePicker incluye SUBSCRIPTION a nivel de Project

    (ProjectsPage.tsx:596). En la nueva arquitectura las suscripciones

    viven en Contract. Crear un proyecto con billingMode=SUBSCRIPTION

    da estado interno incoherente. ELIMINAR esa opción del picker de

    Project.

  C) Triple definición de hourlyRate y partsMarkupPct: existen en

    Project, Plan y Contract. Sin fuente única de verdad. Acordado:

    - Plan = plantilla

    - Contract = instancia operativa (gana siempre que existe)

    - Project = solo defaults visuales si no hay contrato

    Documentar y aplicar consistentemente.

  D) budgetHours es un campo huérfano: no entra en cálculo de

    rentabilidad. El hint dice "solo tracking". Si lo dejamos así,

    debe ser MUY explícito en la UI; mejor: que sí sirva como

    capacidad estimada del proyecto y entre en utilización.

  E) Menú tres puntos en mobile: stopPropagation solo en el botón, no

    en MenuBtn items. El click en "Editar" puede burbujear y navegar

    a detalle. Arreglar añadiendo e.stopPropagation() en cada MenuBtn

    o, mejor, refactorizar a swipe-actions estilo iOS.

  F) DELETE proyecto destruye en cascada Contract → Payment → Issue

    sin avisar. El confirmDialog solo menciona "horas y costes".

    Texto a actualizar para mencionar contratos y pagos. Considerar

    bloquear delete si hay payments PAID (auditoría legal).

  G) project.controller.ts:25-52 no valida endDate >= startDate ni

    campos numéricos negativos. Vía API directa puedes meter basura.

  ────────────────────────────────────────────────────────────────────

5. BUGS CRÍTICOS IDENTIFICADOS — SUSCRIPCIONES Y CONTRATOS

  ────────────────────────────────────────────────────────────────────

  A) NO existe PlansPage en el frontend. Backend completo, UI cero. El

    usuario solo ve los planes existentes desde dropdown de Contract.

    No puede crear/editar/archivar planes. CONSTRUIR PlansPage.

  B) Confusión TenantPlan vs ContractTier (ver §1). Renombrar UI: el

    ContractTier que ofrece el USUARIO a SUS clientes podría llamarse

    "Nivel de servicio" o "Modalidad". Distinguir visualmente.

  C) Contract.billingDay existe en schema (schema.prisma:133) pero NO

    se usa en ningún sitio. rollPayments siempre genera el día 1.

  D) rollPayments solo crea pagos del MES EN CURSO, sin backfill. Si

    activo una sub en enero y pulso el botón en marzo, se pierden

    enero y febrero. Implementar backfill: generar todos los periodos

    pendientes desde startedAt hasta hoy.

  E) NO hay cron/job automático. Todo depende de que el usuario pulse

    "Generar cobros del mes". Si no entra un mes, no hay pagos.

    Añadir cron diario que ejecute rollPayments por tenant.

  F) NO hay frecuencia (mensual/trimestral/anual) en Contract. Asume

    mensual. Añadir Contract.billingFrequency: MONTHLY|QUARTERLY|YEARLY

    (consistente con FixedCost.frequency).

  G) Sin prorrateo: una sub que arranca el día 15 cobra mes completo.

    Implementar prorrateo por días para el primer y último periodo.

  H) convertContract muta sin limpiar campos obsoletos. Convertir

    FIXED→SUBSCRIPTION conserva setupFee anterior. Limpiar

    explícitamente campos no aplicables al nuevo billingMode.

  I) Botón "Editar contrato" en ContractDetailPage.tsx:220 muestra

    toast "disponible próximamente". Funcionalidad anunciada que NO

    existe. CONSTRUIR ContractEditModal o quitar el botón.

  J) Pause de contrato: si despausas, no genera pagos retroactivos del

    periodo de pausa. Definir política: ¿se cobra el mes de pausa

    completo, prorrateado, o nada?

  ────────────────────────────────────────────────────────────────────

6. BUGS CRÍTICOS IDENTIFICADOS — COBROS Y FACTURACIÓN

  ────────────────────────────────────────────────────────────────────

  A) NO hay invoiceNumber correlativo. La AEAT lo exige. App NO

    deployable a autónomo real en España. Añadir Invoice con series

    (general / rectificativas / simplificadas).

  B) NO genera PDF de factura. Sin documento legal que enviar al

    cliente ni archivar para Hacienda.

  C) NO modela retención IRPF. amountNet es fiscalmente incorrecto

    para profesionales. Añadir Contract.irpfRate y aplicarlo en

    paymentMath.ts.

  D) NO modela recargo de equivalencia (comerciantes minoristas).

  E) NO distingue criterio caja vs devengo. Mezcla periodStart/End

    (devengo) con paidAt (caja). Hay que dejar al usuario elegir el

    criterio fiscal por año en Settings.

  F) Pagos parciales sin trazabilidad. Solo amountPaid acumulado y un

    paidAt. Crear PaymentTransaction con (paymentId, amount, paidAt,

    method, reference).

  G) Hero del CobrosPage muestra GROSS (con IVA). Engañoso. Mostrar

    NET por defecto y un toggle GROSS/NET.

  H) Sin métricas de morosidad ni DSO (Days Sales Outstanding). Añadir.

  I) Sin recordatorios automáticos al cliente. Integrar email

    (Resend/SendGrid) con plantilla "tu pago vence en X días".

  J) Sin conciliación bancaria. Para v1 no urgente, pero anotarlo:

    PSD2 vía Tink/GoCardless.

  K) rollPayments con cambio de precio NO actualiza pago existente.

    Añadir endpoint POST /payments/regenerate?contractId&period que

    borre y vuelva a crear si está PENDING.

  L) deleteContract borra Payments en cascada (contract.controller.ts:181).

    Borra histórico fiscal. Cambiar a soft-delete o bloquear si hay

    payments PAID.

  M) Sin múltiples tipos de IVA por línea. Una factura puede tener 21%,

    10% y exento simultáneos. Modelar InvoiceLine con vatRate por línea.

  N) Sin facturación intracomunitaria/extracomunitaria. Cliente francés

    con NIF intracomunitario → IVA 0% + modelo 349. Añadir

    Client.taxRegime: NATIONAL|EU|NON_EU.

  ────────────────────────────────────────────────────────────────────

7. CONTABILIDAD — LO QUE FALTA PARA SER UNA APP CONTABLE SERIA

  ────────────────────────────────────────────────────────────────────

  (Lista del contable senior — referente para roadmap medio plazo, no

  necesariamente esta semana)

    ◯ Modelo Invoice separado de Payment (con number, series, dueDate).

    ◯ InvoiceLine (description, quantity, unitPrice, vatRate, irpfRate,

    discount). Una factura tiene varias líneas con distinto IVA.

    ◯ PaymentTransaction (cada movimiento individual).

    ◯ FixedCost.accountCode (PGC: 622, 624, 626, 629…).

    ◯ FixedCost.deductible: boolean.

    ◯ AssetAmortization (inversiones con vida útil 4-10 años).

    ◯ TaxReport: generadores de modelo 130, 303, 349, 390.

    ◯ Client.taxRegime: NATIONAL|EU|NON_EU.

    ◯ Series múltiples de facturación (A, R, F).

    ◯ Soporte multimoneda con diferencia de cambio.

    ◯ Facturas rectificativas con referencia a la original.

    ◯ Tabla de retenciones IRPF que el cliente nos hace

    (ingreso futuro a recuperar en renta).

  ────────────────────────────────────────────────────────────────────

8. DECISIONES ESTRATÉGICAS BLOQUEADAS POR EL USUARIO

  ────────────────────────────────────────────────────────────────────

  A) NO ELEGIR NICHO TODAVÍA. Aunque es lo correcto a medio plazo para

    escalar, el usuario quiere mantener flexibilidad mientras la

    landing y el producto están en construcción. NO insistas con

    "elige nicho" en cada respuesta. Lo retomamos cuando él lo diga.

  B) PROHIBIDO crear documentación markdown extra (READMEs, planning

    docs) salvo que lo pida explícitamente.

  C) NO añadas features no pedidas, ni "mejoras de cortesía", ni

    refactors espontáneos en una tarea de bug fix.

  ────────────────────────────────────────────────────────────────────

9. TUTORIAL / ONBOARDING — REHACER DESDE CERO

  ────────────────────────────────────────────────────────────────────

  PROBLEMA ACTUAL: el OnboardingWizard existente está anticuado, se

  nota que es "pura IA", aburrido, no engancha, no hace al usuario

  entender el valor real de la app.

  OBJETIVOS DEL TUTORIAL NUEVO:

    1. PRIMERA INTERACCIÓN < 60 SEGUNDOS:

    un usuario nuevo, sin tutorial, debe completar

    "registrar 1 hora trabajada hoy y verla en el dashboard"

    en menos de un minuto. Cronómetro real.

    Test de validación cuando se acabe.

    2. UNA DECISIÓN POR PANTALLA:

    en lugar de pedir 4 opciones técnicas (FIXED/HOURLY/HYBRID/

    SUBSCRIPTION) con párrafos de explicación, presentar 2

    opciones humanas:

    "Cobro cuando termino el trabajo" / "Cobro mientras voy"

    y preguntar el resto en contexto cuando haga falta.

    3. PERSONALIZACIÓN INMEDIATA:

    pregunta clave UNA al inicio:

    "¿Cuántos clientes tienes ahora mismo?"

    - Solo 1 grande (modo "proyecto ancla")

    - Varios pequeños (modo "cartera distribuida")

    - Aún no tengo (modo demo con datos sintéticos)

    Eso configura el dashboard que verá.

    4. SHOW DON'T TELL:

    en lugar de tooltips explicativos, el primer dashboard se

    anima con datos de ejemplo y mensajes contextuales tipo

    "esto es lo que verás cuando registres tu primera hora →".

    Apple style: el producto se enseña usándolo, no leyéndolo.

    5. SIN PARED DE CONFIGURACIÓN:

    IRPF, IVA, retenciones, capacidad planificada, margen

    objetivo... NADA de eso se pregunta al inicio. Defaults

    inteligentes (España, IVA 21%, IRPF 15%, capacidad 160h/mes,

    margen 30%) y el usuario lo cambia cuando le importe.

    6. ESTILO VISUAL:

    - sin GIFs, sin animaciones de "carga falsa", sin "espera

    3 segundos para ver el truco"

    - micro-interacciones de Apple: bounce sutil, fade, escala

    0.95→1, sin Lottie genéricos

    - copy humano, sin "¡Felicidades!", sin emojis en exceso,

    sin "potenciado por IA"

    - 3-4 pantallas máximo. NO más.

    7. SKIPPABLE Y RECUPERABLE:

    siempre se puede saltar. Siempre se puede volver a abrir

    desde Settings → "Repetir tour".

    8. DEMO DATA OPCIONAL:

    "¿Quieres empezar con un negocio de ejemplo para probar?"

    → si sí, carga 3 proyectos, 5 clientes, 20 horas,

    suscripciones realistas. Botón "Borrar datos demo" siempre

    visible hasta que el usuario haga su primer registro real.

    9. CIERRE:

    última pantalla NO es "todo listo". Es "hagamos tu primera

    entrada de horas juntos" con un timer en la propia pantalla

    (acción real, no instructiva).

  ARCHIVOS A REHACER:

    /horaspro/client/src/components/OnboardingWizard.tsx (eliminar y

    construir desde cero)

    /horaspro/client/src/context/OnboardingContext.tsx (revisar y

    alinear con nuevo flujo)

  NO TOCAR: Settings → "Repetir tour" debe seguir abriendo el

  onboarding nuevo desde cualquier pantalla.

  ────────────────────────────────────────────────────────────────────

10. ANTI-PATRONES A NO REPETIR EN CÓDIGO

  ────────────────────────────────────────────────────────────────────

    ✘ Math.max(1, ...) como "evitar división por cero": rediseña, no

    parchees.

    ✘ Bloques "legacy_xxx" que viven indefinidamente. Si es temporal,

    deadline de migración. Si no, hazlo bien la primera vez.

    ✘ Campos JSON sin tipo (Plan.features, Plan.limits): tipear

    explícitamente.

    ✘ Nombres que mienten (realHourlyCost no es ni "real" ni

    consistente): renombra cuando refactorices.

    ✘ Botones que muestran toast "próximamente": o se construye o se

    quita. No hay punto medio.

    ✘ Duplicar lógica de mapeo de timeEntries → ProfitabilityInput

    en varios sitios: extraer helper.

    ✘ stopPropagation solo en el contenedor, no en los items

    interactivos.

    ✘ confirmDialog que oculta consecuencias destructivas reales

    (delete proyecto que borra contratos sin decirlo).

  ────────────────────────────────────────────────────────────────────

11. CONVENCIONES DEL REPO

  ────────────────────────────────────────────────────────────────────

    - Tailwind 4 con tokens CSS custom (var(--color-blue),

    --color-text, --color-surface, etc.)

    - UI Apple-inspired: paleta system, sombras suaves

    (var(--shadow-card)), radius 12-16px, animaciones fade-up

    + stagger.

    - Componentes UI compartidos en /client/src/components/ui/

    (Card, Badge, Button, Input, Select, Modal, Toggle,

    DatePicker, SegmentedControl, KpiCard, EmptyState, Toast,

    ConfirmDialog).

    - Servicios "puros" sin Prisma en /server/src/services/

    (profitability.ts, paymentMath.ts).

    - API base: /api/v1/...

    - Auth: JWT con accessToken + refreshToken.

    - Multitenancy: req.user.tenantId presente en todos los

    controllers protegidos.

    - Decimales: Prisma Decimal, en cliente convertir con

    toNum() de /lib/format.

    - Fechas: ISO strings en API, en UI con fmtDate() /

    fmtDuration().

  ────────────────────────────────────────────────────────────────────

12. PLAN DE TRABAJO — 3 SEMANAS (priorizado)

  ────────────────────────────────────────────────────────────────────

  ═══ SEMANA 1: ESTABILIZAR CÁLCULO Y MODELO ═══

    T1.1 [P0] Refactor calculateBusinessMetrics

    - Añadir Tenant.plannedCapacityHours (default 160)

    - Añadir Tenant.targetMarginPct (default 30)

    - Reescribir fórmula: overhead = fixedCosts/capacity

    - Devolver null si no hay datos suficientes

    - Tests unitarios mínimos

    Files: schema.prisma, profitability.ts, dashboard.controller.ts

    T1.2 [P0] Eliminar bloque legacyProjects

    - Migración one-shot: por cada Project sin contracts,

    crear un Contract por defecto (FIXED, con su budgetAmount,

    hourlyRate, etc.)

    - Borrar bloque legacyProjects de dashboard.controller.ts

    File: server/prisma/migrations/ + dashboard.controller.ts

    T1.3 [P0] Quitar SUBSCRIPTION del BillingModePicker de Project

    - El picker solo en Project: FIXED, HOURLY, HYBRID

    - Las suscripciones se crean a nivel Contract

    File: ProjectsPage.tsx, ProjectDetailPage.tsx

    T1.4 [P1] Migrar Project.clientName → Project.clientId

    - Backfill: por cada Project con clientName, crear/buscar

    Client matching por nombre normalizado.

    - Schema: añadir clientId, deprecar clientName.

    File: schema.prisma, project.controller.ts, ProjectsPage.tsx

    T1.5 [P1] Validaciones backend

    - endDate >= startDate

    - números no negativos

    - Project con SUBSCRIPTION no permitido

    File: project.controller.ts, contract.controller.ts

  ═══ SEMANA 2: SUSCRIPCIONES Y COBROS QUE FUNCIONEN ═══

    T2.1 [P0] Construir PlansPage (UI catálogo de planes)

    - Listar / crear / editar / archivar

    - Form con name, tier, billingMode, price, vatRate,

    priceIncludesVat, partsMarkupPct, maintenanceMode,

    features[], limits{}

    File nuevo: client/src/pages/PlansPage.tsx + ruta

    T2.2 [P0] Backfill en rollPayments

    - Generar TODOS los periodos faltantes desde startedAt

    hasta hoy (no solo el mes en curso)

    - Respetar billingDay

    - Añadir Contract.billingFrequency

    Files: payment.controller.ts, contract.controller.ts,

    schema.prisma

    T2.3 [P0] Cron diario auto-roll

    - Job que cada noche ejecute rollPayments por tenant

    - Usar node-cron o similar

    File: server/src/jobs/rollPaymentsCron.ts (nuevo)

    T2.4 [P0] Construir ContractEditModal

    - Reemplazar el toast "próximamente"

    - Permitir editar: price, billingMode (con limpieza de

    campos obsoletos), billingDay, status, endedAt, notes

    File: client/src/components/contracts/ContractEditModal.tsx

    T2.5 [P1] Prorrateo del primer y último periodo

    - Si startedAt no es día 1, primer payment proporcional

    - Si endedAt en mitad de mes, último payment proporcional

    File: paymentMath.ts, payment.controller.ts

    T2.6 [P1] Renombrar ContractTier en UI

    - Internamente sigue siendo FREE/PRO/MAX

    - Visualmente "Nivel: Básico/Pro/Premium" o similar,

    distinguible del TenantPlan

    Files: ContractsTab.tsx, ContractDetailPage.tsx

  ═══ SEMANA 3: FACTURACIÓN LEGAL (BÁSICO) + TUTORIAL ═══

    T3.1 [P0] Modelo Invoice + InvoiceNumber correlativo

    - Tabla Invoice (id, tenantId, series, number, issueDate,

    dueDate, contractId?, paymentId?, status)

    - Tabla InvoiceLine (invoiceId, description, quantity,

    unitPrice, vatRate, irpfRate, discount)

    - Constraint @@unique([tenantId, series, number])

    - Endpoint POST /invoices/generate?paymentId

    Files: schema.prisma, server/src/controllers/invoice.controller.ts

    T3.2 [P0] Generación de PDF

    - Librería: pdfkit o react-pdf con render server-side

    - Plantilla simple con datos legales de España (NIF,

    dirección, etc. desde Tenant.settings)

    - Endpoint GET /invoices/:id.pdf

    File: server/src/services/invoicePdf.ts

    T3.3 [P1] Retención IRPF

    - Contract.irpfRate (default 15)

    - Aplicar en paymentMath.ts y mostrar en PaymentMarkModal

    Files: schema.prisma, paymentMath.ts, PaymentMarkModal.tsx

    T3.4 [P1] PaymentTransaction (trazabilidad pagos parciales)

    - Tabla nueva con (paymentId, amount, paidAt, method,

    reference, notes)

    - PaymentMarkModal cambia a "registrar abono" en vez de

    "actualizar total acumulado"

    Files: schema.prisma, payment.controller.ts, PaymentMarkModal.tsx

    T3.5 [P0] Tutorial nuevo (ver §9)

    - Demoler OnboardingWizard.tsx

    - Construir 4 pantallas máximo

    - Demo data opcional

    - Cronómetro: < 60s para llegar a "primera hora registrada"

    File: client/src/components/OnboardingWizard.tsx (rewrite)

    T3.6 [P2] Hero CobrosPage en NET por defecto + toggle

    File: CobrosPage.tsx

    T3.7 [P2] Métricas de morosidad básicas

    - DSO (días promedio de cobro) global y por cliente

    - Lista "tus 3 clientes que más tardan"

    File: dashboard.controller.ts (nuevo endpoint /collections-health)

  NOTA: si hay que recortar, sacrificar T3.7 y T3.6 antes que T3.1-T3.5.

  ────────────────────────────────────────────────────────────────────

13. NO INCLUIDO EN ESTAS 3 SEMANAS (BACKLOG MEDIO/LARGO)

  ────────────────────────────────────────────────────────────────────

    ◯ Conciliación bancaria PSD2 (Tink/GoCardless)

    ◯ Recordatorios automáticos al cliente por email (Resend)

    ◯ Modelos fiscales 130 / 303 / 349 / 390 generados

    ◯ Multimoneda + diferencias de cambio

    ◯ Facturas rectificativas

    ◯ Series múltiples de facturación

    ◯ Plan General Contable (cuenta 622, 624…) en costes

    ◯ Amortización de inversiones

    ◯ Decisión de nicho (cuando el usuario lo decida)

    ◯ Mejora de la landing para ventas online

    ◯ App móvil nativa

    ◯ Multi-usuario por tenant (varios empleados con permisos)

  ────────────────────────────────────────────────────────────────────

14. INFO PERSONAL / ENTORNO

  ────────────────────────────────────────────────────────────────────

    - Email del usuario: manuellagunaprieto74@gmail.com

    - Fecha actual de referencia (memoria): 2026-04-27

    - SO: macOS Darwin 25.3.0, Shell zsh

    - Working dir: /Users/kmanu/Desktop/Proyecto 2GS

    - Idioma de comunicación: español

    - Modo preferido: high effort. En tareas grandes, max effort.

    - Modelo recomendado: Sonnet 4.6 por defecto, Opus 4.7 cuando se

    pida análisis muy profundo o decisiones estratégicas.

  ────────────────────────────────────────────────────────────────────

15. CIERRE — CÓMO DEBES RESPONDER A ESTE PROMPT

  ────────────────────────────────────────────────────────────────────

  Tu primera respuesta debe ser corta:

    1. "Contexto cargado. Listo."

    2. Una pregunta concreta: "¿Retomamos por la T1.1 (refactor

    calculateBusinessMetrics) o tienes otra prioridad?"

    3. NADA más. NO repitas el contexto. NO me muestres la lista.

    NO halagues. NO digas "perfecto, procederé a...".

  A partir de ahí, trabaja como en el §0.

# # === FIN CONTEXTO MAESTRO ===

# # === PLANNING OPERATIVO HORASPRO — 3 SEMANAS ===

# Pegar este bloque DESPUÉS del Contexto Maestro al iniciar cualquier

# sesión. Indica al asistente qué Sesión retomas con:

# "Vamos por Sesión SX. Estado: [hecho/en curso/no empezado]"

  ────────────────────────────────────────────────────────────────────

  PROTOCOLO DE TRABAJO (NO SALTARSE)

  ────────────────────────────────────────────────────────────────────

  A) ANTES DE EMPEZAR CADA SESIÓN

    1. Pegar Contexto Maestro + este Planning

    2. Decir "Vamos por Sesión SX"

    3. El asistente confirma archivos a tocar y pasos antes de

    escribir código (no escribe nada hasta que tú digas adelante)

  B) DURANTE LA SESIÓN

    - Cada cambio significativo → checkpoint (ver §C)

    - Si Claude empieza a fallar o lentea: cierra sesión, NO insistas

    - Si te quedas sin uses: el asistente debe dejar un "ESTADO

    ACTUAL" en chat antes de cortar (qué hizo, qué falta, en qué

    archivo se quedó)

  C) CHECKPOINTS (CRÍTICO — el repo NO es git todavía)

    - SESIÓN 0 obligatoria antes de cualquier cosa: inicializar git

    - A partir de ahí, cada sub-paso completado y verificado →

    `git add -A && git commit -m "S<n>.<x>: descripción"`

    - Si una sesión se interrumpe:

    `git commit -am "WIP S<n>: hasta aquí, falta Y"`

    - Si algo se rompe:`git restore .` y vuelves al último commit

  D) AL VOLVER DESPUÉS DE PAUSA

    -`git log --oneline -10` para ver dónde te quedaste

    - Pegar contexto + planning + "estoy en SX, hice [git log],

    falta retomar en [archivo]"

  E) ZONA SEGURA AL FINAL DE SESIÓN

    - Antes de cerrar:`npm run build` cliente y servidor → debe

    compilar sin errores

    - Si compila: commit "S`<n>`: completada"

    - Si NO compila: commit "WIP S`<n>`: arreglar antes de seguir"

    y al retomar, lo primero es resolver el error.

  ────────────────────────────────────────────────────────────────────

  SESIÓN 0 — PREPARACIÓN (OBLIGATORIA, 30 MIN)

  ────────────────────────────────────────────────────────────────────

  OBJETIVO: convertir el repo en algo seguro de modificar.

    0.1 Inicializar git

    cd "/Users/kmanu/Desktop/Proyecto 2GS/horaspro"

    git init

    git branch -m main

    0.2 Crear .gitignore en horaspro/ con:

    node_modules/

    dist/

    .env

    .env.local

    *.log

    .DS_Store

    client/dist/

    server/dist/

    server/prisma/migrations/dev.db*

    0.3 Verificar que .env NO se commitea:

    git status | grep -i env  → no debe aparecer

    0.4 Commit inicial:

    git add -A

    git commit -m "S0: snapshot inicial pre-refactor"

    0.5 Crear rama de trabajo:

    git checkout -b refactor-fase-1

    0.6 Backup de BD si hay datos reales:

    pg_dump <DB_URL> > /Users/kmanu/Desktop/horaspro_backup_pre_refactor.sql

  VALIDACIÓN:

    -`git log` muestra el commit inicial

    -`npm run build` en /client y /server compila

  CHECKPOINT: commit "S0: completada"

  ────────────────────────────────────────────────────────────────────

  ═══════════════════ FASE 1 — ESTABILIZACIÓN ═══════════════════

  ════════════════════════ (Semana 1) ════════════════════════════

  ────────────────────────────────────────────────────────────────────

  SESIÓN 1 — REFACTOR DEL CÁLCULO PRINCIPAL [P0, complejidad ALTA]

  OBJETIVO: que el dashboard deje de mentir.

  PRE: S0 completada.

  ARCHIVOS:

    - server/prisma/schema.prisma

    - server/src/services/profitability.ts

    - server/src/controllers/dashboard.controller.ts

    - client/src/types/index.ts

    - client/src/pages/SettingsPage.tsx

    - client/src/pages/DashboardPage.tsx

  PASOS:

    1.1 Schema: añadir a Tenant

    plannedCapacityHours Int @default(160)

    targetMarginPct      Decimal @default(30) @db.Decimal(5,2)

    costingMode          CostingMode @default(ABSORPTION)

    enum CostingMode { ABSORPTION CONTRIBUTION }

    1.2 Crear migración:

    cd server && npx prisma migrate dev --name add_costing_config

    1.3 Reescribir calculateBusinessMetrics(profitability.ts):

    - Recibir { totalFixedCosts, totalDirectCosts, plannedCapacityHours,

    targetMarginPct, billableHoursInRange, monthsInRange }

    - overheadPerHour = totalFixedCosts / (plannedCapacityHours * monthsInRange)

    - directCostPerHour = totalDirectCosts / billableHoursInRange (solo si billable >= umbral)

    - realHourlyCost = overheadPerHour + directCostPerHour

    - minimumRate = realHourlyCost * (1 + targetMarginPct/100)

    - utilizationPct = billableHoursInRange / (plannedCapacityHours*monthsInRange) * 100

    - Si billableHoursInRange < 5 (umbral configurable):

    devolver { realHourlyCost: null, ...mensaje "datos insuficientes" }

    1.4 Actualizar dashboard.controller.ts:

    - Pasar fixed y direct SEPARADOS (no sumados)

    - Pasar plannedCapacityHours del tenant

    - Pasar targetMarginPct del tenant

    - Devolver utilizationPct en business

    1.5 Tipos cliente:

    BusinessMetrics añadir { utilizationPct: number; isReliable: boolean }

    1.6 SettingsPage: añadir sección "Capacidad y rentabilidad":

    - Input plannedCapacityHours (con tooltip "horas/mes que puedes

    trabajar; ej. autónomo solo: 160; equipo de 3: 480")

    - Input targetMarginPct (con tooltip "30% por defecto")

    - Selector costingMode: "Absorción" / "Contribución"

    Guardar vía PATCH /v1/me/tenant.

    1.7 DashboardPage:

    - Si business.isReliable === false: hero card muestra

    "Necesitas registrar más horas para calcular tu tarifa real"

    + CTA "Fichar primera hora"

    - Si reliable: añadir mini-KPI "Utilización" junto a horas

    facturables

    - Eliminar "* 1.3" hardcoded en cualquier sitio

    1.8 Test sanity manual:

    - Crear tenant con 1000€ fijos, capacidad 160h

    - Sin horas → realHourlyCost = null + mensaje

    - 160h fichadas → realHourlyCost ≈ 6.25€/h overhead + direct

    - 320h fichadas → utilization 200% (señal de alarma)

  VALIDACIÓN: el hero del dashboard NUNCA muestra cifras absurdas como

  150€/h por tener 2h fichadas.

  CHECKPOINT: commit "S1: refactor calculateBusinessMetrics + capacity"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 2 — LIMPIEZA LEGACY Y BLINDAJE [P0, complejidad MEDIA]

  OBJETIVO: eliminar deuda técnica que envenena cálculos + cerrar

  agujeros de validación.

  PRE: S1 completada.

  ARCHIVOS:

    - server/prisma/migrations/ (nueva)

    - server/src/controllers/dashboard.controller.ts

    - server/src/controllers/project.controller.ts

    - server/src/controllers/contract.controller.ts

    - client/src/pages/ProjectsPage.tsx

    - client/src/pages/ProjectDetailPage.tsx

  PASOS:

    2.1 Migración one-shot "convert legacy projects to contracts":

    Por cada Project sin contracts:

    - Buscar/crear Client desde Project.clientName

    - Crear Contract con:

    billingMode = Project.billingMode (FIXED si era SUBSCRIPTION)

    price = Project.budgetAmount ?? 0

    hourlyRate = Project.hourlyRate

    partsMarkupPct = Project.partsMarkupPct

    startedAt = Project.startDate ?? createdAt

    status = ACTIVE si Project.status===ACTIVE else PAUSED

    - Reasignar timeEntries y varCosts del proyecto a ese contrato

    Script: server/prisma/migrate-legacy-projects-to-contracts.ts

    Ejecutar UNA VEZ y comprobar count.

    2.2 Eliminar bloque legacyProjects en dashboard.controller.ts

    (líneas 220-290 aprox.)

    2.3 Quitar 'SUBSCRIPTION' del BillingModePicker en:

    - ProjectsPage.tsx (línea 596)

    - ProjectDetailPage.tsx (mismo selector si existe)

    Solo: FIXED, HOURLY, HYBRID a nivel Project.

    2.4 Validaciones backend project.controller.ts:

    - name no vacío

    - endDate >= startDate

    - budgetAmount, budgetHours, hourlyRate, partsMarkupPct >= 0

    - billingMode in [FIXED, HOURLY, HYBRID]

    Devolver 422 con mensaje claro si falla.

    2.5 Validaciones backend contract.controller.ts:

    - price >= 0, vatRate entre 0 y 30

    - startedAt obligatorio

    - endedAt si presente >= startedAt

    - billingMode válido

    2.6 ConfirmDialog de delete proyecto: actualizar mensaje:

    "Se eliminarán: {n} contratos, {n} pagos, {n} inconvenientes,

    {n} entradas de horas y {n} costes registrados."

    File: ProjectsPage.tsx + ProjectDetailPage.tsx

    Bloquear delete si algún Payment del proyecto está en estado PAID

    (mostrar "Tienes pagos cobrados; archiva el proyecto en lugar

    de borrarlo").

    2.7 Stop propagation en MenuBtn de ProjectsPage:

    en cada onClick: e.stopPropagation() antes de la lógica.

  VALIDACIÓN: el dashboard sigue funcionando igual pero sin "legacy_*".

  La creación de proyecto no permite SUBSCRIPTION. El delete avisa de

  todo lo que destruirá.

  CHECKPOINT: commit "S2: legacy migration + validaciones + delete safeguards"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 3 — MIGRACIÓN clientName → clientId [P1, complejidad ALTA]

  OBJETIVO: identidad única de cliente.

  PRE: S2 completada.

  ⚠️  DELICADA. Requiere migración de datos. Hacer en sesión propia.

  ARCHIVOS:

    - server/prisma/schema.prisma

    - server/prisma/migrate-project-clientname-to-clientid.ts (nuevo)

    - server/src/controllers/project.controller.ts

    - server/src/controllers/dashboard.controller.ts

    - client/src/types/index.ts

    - client/src/pages/ProjectsPage.tsx

    - client/src/pages/ProjectDetailPage.tsx

    - client/src/components/contracts/ContractsTab.tsx

  PASOS:

    3.1 Schema: añadir Project.clientId String? @db.Uuid + relación

    a Client. Mantener clientName temporalmente.

    3.2 Migración de datos:

    Por cada Project con clientName:

    - Normalizar (trim, lowercase)

    - Buscar Client existente por nombre normalizado

    - Si no existe: crear Client { name: clientName, tenantId }

    - Asignar Project.clientId

    Loggear cuántos se reconciliaron y cuántos se crearon.

    3.3 Hacer Project.clientId NOT NULL en una segunda migración

    después de verificar 0 huérfanos.

    3.4 project.controller.ts:

    - createProject acepta clientId (no clientName)

    - updateProject idem

    - getProject incluye client: { id, name, taxId }

    3.5 ProjectsPage form de creación:

    - Reemplazar input texto "Cliente" por Select de Client[]

    - Botón "+ Nuevo cliente" inline que abre mini-modal de

    creación rápida (name + taxId opcional)

    - Si el usuario tiene 0 clientes: empty state lleva a

    crear cliente primero.

    3.6 ProjectDetailPage edición: mismo cambio.

    3.7 ContractsTab: ahora el cliente del contrato y del proyecto

    están alineados. Si el contrato hereda cliente del proyecto,

    simplificar UX (no preguntar de nuevo).

    3.8 Eliminar Project.clientName y clientTaxId del schema en una

    tercera migración (después de comprobar que UI ya no los usa).

  VALIDACIÓN: imposible tener "Carpintería López" en proyecto y

  "Carpintería Lopez SL" en contrato como cosas distintas.

  CHECKPOINT: commit "S3: project linked to client (migración completa)"

  ────────────────────────────────────────────────────────────────────

  ═══════════════════ FASE 2 — SUSCRIPCIONES VIVAS ══════════════════

  ════════════════════════ (Semana 2) ════════════════════════════

  ────────────────────────────────────────────────────────────────────

  SESIÓN 4 — PLANSPAGE (CATÁLOGO DE PLANES) [P0, complejidad MEDIA]

  OBJETIVO: que el usuario pueda gestionar su catálogo de planes

  (Free/Pro/Max o como los llame).

  PRE: S2 completada (no depende de S3).

  ARCHIVOS:

    - client/src/pages/PlansPage.tsx (nuevo)

    - client/src/router/index.tsx (añadir ruta)

    - client/src/components/Sidebar (o navegación principal — añadir item)

  PASOS:

    4.1 Crear /pages/PlansPage.tsx con:

    - Lista de Planes en cards (similar a ProjectsPage)

    - Cada card: name, tier badge, billingMode, price,

    nº contratos asociados, toggle isActive

    - Filtros: activos / archivados / todos

    - Empty state con explicación + CTA "Crear primer plan"

    4.2 Modal "Nuevo plan" con form completo:

    - name (obligatorio único)

    - tier (FREE/PRO/MAX)

    - description

    - billingMode (con BillingModePicker reutilizado,

    SIN incluir HYBRID si causa confusión, evaluar)

    - price + priceIncludesVat + vatRate

    - setupFee

    - hourlyRate (solo si HOURLY/HYBRID)

    - partsMarkupPct

    - maintenanceMode + maintenanceExtraPct

    - features: lista editable de strings (chips)

    - limits: clave-valor editable (max_contracts: 5, etc.)

    4.3 Modal "Editar plan" reutiliza el mismo form.

    4.4 Acción archivar (soft delete por defecto):

    DELETE /v1/plans/:id sin ?hard=true

    Si tiene contratos, no permitir hard delete.

    4.5 Añadir ruta /catalogo o /planes en router.

    Añadir item en sidebar/menú con icono Sparkles o Package.

    4.6 ContractsTab: actualizar dropdown de planes para reflejar

    cambios en tiempo real (re-fetch al abrir modal).

  VALIDACIÓN: el usuario puede crear, editar y archivar planes desde

  la UI sin tocar BD.

  CHECKPOINT: commit "S4: PlansPage UI completa"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 5 — SUSCRIPCIONES BACKEND VIVO [P0, complejidad ALTA]

  OBJETIVO: que las suscripciones generen pagos automáticamente,

  respeten billingDay, soporten frequency y prorrateen.

  PRE: S2.

  ARCHIVOS:

    - server/prisma/schema.prisma

    - server/src/services/paymentMath.ts

    - server/src/controllers/payment.controller.ts

    - server/src/controllers/contract.controller.ts

    - server/src/jobs/rollPaymentsCron.ts (nuevo)

    - server/src/server.ts

    - client/src/components/contracts/ContractsTab.tsx (form)

  PASOS:

    5.1 Schema:

    Añadir Contract.billingFrequency BillingFrequency @default(MONTHLY)

    enum BillingFrequency { MONTHLY QUARTERLY YEARLY }

    Migración.

    5.2 paymentMath.ts añadir funciones:

    - getPeriodForFrequency(date, frequency, billingDay)

    → { periodStart, periodEnd }

    - getMissingPeriods(startedAt, frequency, billingDay, until=now)

    → Array<{periodStart, periodEnd, prorationFactor}>

    - prorationFactor: 1 si periodo completo, fracción si arranca

    a mitad

    5.3 Reescribir rollPayments:

    Para cada suscripción ACTIVE:

    - Calcular missingPeriods desde startedAt o último Payment

    - Para cada periodo faltante:

    - Calcular amount = price * prorationFactor

    - Crear Payment PENDING (skip si ya existe por unique key)

    - Loggear total creados

    Devolver { created, skipped, totalActiveSubscriptions,

    backfilledPeriods }.

    5.4 Endpoint POST /v1/payments/regenerate?paymentId

    - Solo si payment.status === PENDING

    - Recalcula amountNet/Gross/Due según contract.price actual

    - Permite arreglar pagos creados con precio antiguo

    5.5 Cron diario:

    server/src/jobs/rollPaymentsCron.ts:

    - Usar node-cron

    - Ejecutar a las 03:00 cada día

    - Iterar todos los tenants, ejecutar lógica de rollPayments

    - Loggear con tenantId

    Importar y arrancar en server.ts (con guard NODE_ENV !== 'test')

    5.6 ContractsTab form de creación: añadir

    - billingFrequency selector

    - billingDay input (1-28, por defecto 1)

    - Tooltip explicativo de cada uno

    5.7 Recalcular pagos existentes al editar billingFrequency

    (decisión: NO retroactivo. Solo aplica a futuros payments.

    Documentarlo en UI: "los cambios afectan a futuros cobros").

  VALIDACIÓN:

    - Crear sub el día 15 con prorrateo → primer pago = price/2

    - Sub trimestral → 1 pago cada 3 meses

    - Pausar app 3 meses → al volver, rollPayments crea los pagos perdidos

    - Cron logueado correctamente

  CHECKPOINT: commit "S5: suscripciones con frequency, billingDay,

  prorrateo, backfill y cron"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 6 — CONTRACTEDITMODAL + RENOMBRADO TIER [P1, complejidad MEDIA]

  OBJETIVO: poder editar contratos desde UI. Eliminar confusión

  TenantPlan vs ContractTier.

  PRE: S5.

  ARCHIVOS:

    - client/src/components/contracts/ContractEditModal.tsx (nuevo)

    - client/src/pages/ContractDetailPage.tsx

    - client/src/components/contracts/ContractsTab.tsx

    - server/src/controllers/contract.controller.ts

  PASOS:

    6.1 Construir ContractEditModal (basado en form de creación):

    - Editable: tier, billingMode (con confirmación si cambia

    tipo de cobro), price, setupFee, hourlyRate, billingDay,

    billingFrequency, vatRate, priceIncludesVat, status,

    endedAt, notes

    - Cambio billingMode → limpiar campos no aplicables

    (ej. si HOURLY: clear setupFee/budgetAmount; si SUBSCRIPTION:

    clear budgetAmount, set billingDay default)

    - Mostrar warning "los pagos ya generados no cambian,

    usa Regenerar pago para actualizar individualmente"

    6.2 ContractDetailPage botón "Editar":

    Reemplazar el toast "próximamente" por openEditModal.

    6.3 contract.controller.ts updateContract:

    - Si cambia billingMode: limpiar campos en backend (defensivo)

    - Si cambia status a CANCELLED y no hay endedAt: poner endedAt = now

    - Validar que vatRate y price siguen coherentes

    6.4 Renombrar ContractTier en UI (NO en BD):

    En ContractsTab.tsx:

    TIER_LABEL = { FREE: 'Básico', PRO: 'Premium', MAX: 'Élite' }

    (o lo que el usuario decida — pedir input)

    Añadir tooltip "Define el nivel de servicio que ofreces a

    tus clientes"

    Añadir distinción visual con TenantPlan en SettingsPage.

    6.5 Endpoint POST /v1/payments/regenerate ya existe (S5.4).

    Añadir botón "Regenerar pago" en cada PaymentRow PENDING

    del ContractDetailPage que use ese endpoint.

  VALIDACIÓN: cambias precio del contrato → editas → guardas → futuros

  pagos usan precio nuevo. Pago PENDING actual se puede regenerar.

  CHECKPOINT: commit "S6: edición de contratos + renombrado tier"

  ────────────────────────────────────────────────────────────────────

  ═══════════════ FASE 3 — FACTURACIÓN LEGAL Y TUTORIAL ══════════════

  ════════════════════════ (Semana 3) ════════════════════════════

  ────────────────────────────────────────────────────────────────────

  SESIÓN 7 — MODELO INVOICE + NUMERACIÓN CORRELATIVA [P0, ALTA]

  OBJETIVO: que la app genere facturas legalmente válidas (estructura

  correcta + número correlativo). Sin esto, NO es deployable a un

  autónomo español.

  PRE: S5 (suscripciones generan payments correctamente).

  ARCHIVOS:

    - server/prisma/schema.prisma

    - server/src/controllers/invoice.controller.ts (nuevo)

    - server/src/routes/invoice.routes.ts (nuevo)

    - server/src/server.ts

    - server/src/services/paymentMath.ts (extender)

    - client/src/types/index.ts

    - client/src/pages/SettingsPage.tsx

  PASOS:

    7.1 Schema:

    model InvoiceSeries {

    id        @id

    tenantId

    code      String  // "A", "R", "F"

    name      String  // "General", "Rectificativas", "Simplificadas"

    nextNumber Int @default(1)

    isDefault Boolean

    @@unique([tenantId, code])

    }

    model Invoice {

    id, tenantId, seriesId, number Int

    issueDate, dueDate

    contractId? clientId

    paymentId?  // si proviene de un Payment

    status InvoiceStatus // DRAFT, ISSUED, PAID, VOIDED

    subtotalNet, totalVat, totalIrpf, totalGross

    notes

    rectifiesInvoiceId? // para rectificativas

    @@unique([tenantId, seriesId, number])

    }

    model InvoiceLine {

    id, invoiceId

    description

    quantity, unitPrice

    vatRate, irpfRate, discount

    lineNet, lineGross

    }

    enum InvoiceStatus { DRAFT ISSUED PAID VOIDED }

    7.2 Migración. Crear serie default "A" para todos los tenants

    existentes.

    7.3 invoice.controller.ts:

    - GET /v1/invoices con filtros

    - GET /v1/invoices/:id

    - POST /v1/invoices (manual)

    - POST /v1/invoices/from-payment/:paymentId

    (genera Invoice ISSUED con líneas auto desde Payment,

    vincula payment.invoiceId)

    - PATCH /v1/invoices/:id (solo si DRAFT)

    - POST /v1/invoices/:id/issue (DRAFT → ISSUED, asigna number

    atómicamente con transacción)

    - POST /v1/invoices/:id/void → crea rectificativa automática

    - DELETE solo si DRAFT y sin pagos

    7.4 ATÓMICA al emitir:

    Transaction {

    series.update where id = X { nextNumber: nextNumber + 1 }

    invoice.update where id = Y { number: oldNextNumber, status: ISSUED }

    }

    Si dos requests concurrentes: el segundo falla y reintenta.

    7.5 SettingsPage añadir sección "Facturación":

    - Datos legales del autónomo (nombre, NIF, dirección, CP, ciudad)

    - Series (CRUD): código, nombre, isDefault, nextNumber

    (solo bajar es peligroso, mostrar warning)

    - Esos datos van a Tenant.settings (json) o a tabla nueva

    TenantBillingProfile.

  VALIDACIÓN:

    - Generar Invoice desde Payment → recibe número 1 de serie A

    - Generar otra → número 2

    - Concurrencia 5 invoices simultáneas → ninguna repite número

    (test manual con curl en paralelo)

  CHECKPOINT: commit "S7: invoice model + correlativos atómicos"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 8 — PDF DE FACTURA + UI DE FACTURAS [P0, ALTA]

  OBJETIVO: poder enviar la factura al cliente como PDF.

  PRE: S7.

  ARCHIVOS:

    - server package.json (añadir pdfkit o @react-pdf/renderer)

    - server/src/services/invoicePdf.ts (nuevo)

    - server/src/controllers/invoice.controller.ts

    - client/src/pages/InvoicesPage.tsx (nuevo)

    - client/src/router/index.tsx

    - client/src/components/payments/PaymentMarkModal.tsx

  PASOS:

    8.1 Instalar pdfkit (más ligero que react-pdf):

    cd server && npm install pdfkit @types/pdfkit

    8.2 Crear invoicePdf.ts con función:

    generateInvoicePdf(invoice, lines, tenant, client) → Buffer

    Layout:

    - Cabecera: logo (si hay), datos emisor (nombre, NIF, dirección)

    - Recuadro derecho: número de factura, serie, fecha emisión,

    fecha vencimiento

    - Bloque receptor: cliente, NIF, dirección

    - Tabla líneas: descripción, cantidad, precio unitario,

    IVA%, IRPF%, total línea

    - Totales: base imponible, IVA total, IRPF total, total a pagar

    - Pie: forma de pago, observaciones

    8.3 Endpoint GET /v1/invoices/:id/pdf

    - Devuelve application/pdf con Content-Disposition inline

    - Usa generateInvoicePdf

    8.4 InvoicesPage frontend:

    - Lista similar a CobrosPage

    - Filtros: serie, estado, cliente, rango fecha

    - Acciones por fila: ver PDF (abre nueva pestaña), descargar,

    emitir (si DRAFT), anular (con rectificativa automática)

    - Empty state con CTA "Generar primera factura desde un pago"

    8.5 PaymentMarkModal: añadir checkbox

    "Generar factura automáticamente al cobrar" (default ON)

    Si ON y status final === PAID: POST /invoices/from-payment

    8.6 Añadir ruta /facturas + item en sidebar.

  VALIDACIÓN: cobrar un Payment → factura generada → PDF visible y

  descargable, con número correlativo, datos legales y desglose IVA.

  CHECKPOINT: commit "S8: PDF + InvoicesPage"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 9 — IRPF + PAYMENTTRANSACTION [P1, MEDIA]

  OBJETIVO: corrección fiscal real (IRPF) + trazabilidad de cobros

  parciales.

  PRE: S7 (IRPF se aplica a InvoiceLine).

  ARCHIVOS:

    - server/prisma/schema.prisma

    - server/src/services/paymentMath.ts

    - server/src/controllers/payment.controller.ts

    - server/src/controllers/invoice.controller.ts

    - server/src/services/invoicePdf.ts

    - client/src/types/index.ts

    - client/src/components/payments/PaymentMarkModal.tsx

    - client/src/components/contracts/ContractEditModal.tsx (S6)

  PASOS:

    9.1 Schema:

    Añadir Contract.irpfRate Decimal? @db.Decimal(5,2)

    (default null, si null → no se aplica)

    Añadir TenantBillingProfile.defaultIrpfRate (15 default España).

    Añadir Invoice.totalIrpf, InvoiceLine.irpfRate (ya en S7).

    Añadir Payment.irpfAmount Decimal @default(0).

    Añadir model PaymentTransaction:

    id, tenantId, paymentId, amount, paidAt, method, reference, notes

    @@index([paymentId])

    enum PaymentMethod { TRANSFER CARD CASH OTHER }

    9.2 paymentMath.ts:

    - Extender breakdownPayment para incluir irpfRate y irpfAmount

    - amountToReceive = gross - irpfAmount (lo que llega al banco)

    - Distinguir amountGross (factura) vs amountToReceive (caja)

    9.3 invoicePdf.ts: añadir línea "Retención IRPF X%: -Y €"

    en bloque totales.

    9.4 PaymentMarkModal:

    - Cambiar de "actualizar amountPaid total" a

    "registrar abono adicional"

    - Form: amount, paidAt, method, reference (opcional)

    - Crea PaymentTransaction y suma al Payment.amountPaid agregado

    - Mostrar histórico de transacciones del payment debajo del form

    9.5 ContractEditModal: añadir input irpfRate.

    9.6 SettingsPage: añadir defaultIrpfRate global.

  VALIDACIÓN:

    - Crear factura a profesional con IRPF 15% → PDF muestra retención

    - Cobrar 30€ + 70€ en dos veces → status PARTIAL → PAID, dos

    PaymentTransaction registradas con sus fechas y métodos

  CHECKPOINT: commit "S9: IRPF + PaymentTransaction"

  ────────────────────────────────────────────────────────────────────

  SESIÓN 10 — TUTORIAL NUEVO [P0, ALTA]

  OBJETIVO: rehacer onboarding con criterios de §9 del Contexto Maestro.

  < 60s para primera hora registrada. 4 pantallas máximo. Apple style.

  PRE: ninguna funcional. Independiente.

  ARCHIVOS:

    - client/src/components/OnboardingWizard.tsx (rewrite total)

    - client/src/context/OnboardingContext.tsx (revisar)

    - client/src/pages/SettingsPage.tsx (botón "Repetir tour")

    - client/src/lib/demoData.ts (nuevo)

  PASOS:

    10.1 Definir el flujo definitivo (4 pantallas):

    PANTALLA 1 — BIENVENIDA + UNA PREGUNTA

    Título: "Vamos a configurar HorasPRO en 30 segundos"

    Pregunta: "¿Cómo trabajas ahora?"

    3 cards grandes seleccionables:

    - "Solo, con varios clientes pequeños"

    - "Tengo un cliente grande y otros pequeños"

    - "Empiezo de cero, quiero probar primero"

    Esa elección setea:

    - costingMode (CONTRIBUTION para opción 2, ABSORPTION para 1)

    - plannedCapacityHours (160 default, 200 para opción 1)

    - opción 3 → activar demo data

    PANTALLA 2 — TU PRIMER CLIENTE Y PROYECTO (SI NO ES DEMO)

    Inputs combinados en una sola tarjeta:

    - Nombre del cliente

    - Nombre del proyecto/trabajo

    - "¿Cómo cobras?" → 2 botones:

    [Cuando termino] (FIXED)

    [Por las horas que dedique] (HOURLY)

    - Si FIXED: input "¿Cuánto te paga?"

    - Si HOURLY: input "¿A cuánto la hora?"

    Botón: "Empezar"

    Crea Client + Project + opcionalmente Contract en una llamada.

    (Si demo: skip esta pantalla, carga datos sintéticos)

    PANTALLA 3 — EL TIMER EN VIVO

    Título: "Vamos a fichar tu primera hora"

    Componente Timer real, integrado:

    - Botón gigante "Iniciar timer"

    - Cuando inicia: cuenta segundos, badge "estás trabajando

    en {projectName}"

    - Dejarlo correr al menos 5s, botón "Parar y guardar"

    Al guardar TimeEntry → animación celebrando +

    "Esto que acabas de fichar ya está calculando tu rentabilidad"

    Botón "Ver mi dashboard"

    PANTALLA 4 — LO QUE VAS A VER (PEEK AL DASHBOARD)

    Mini-preview del dashboard con datos reales del usuario

    (incluye la entrada de hora que acaba de crear).

    3 highlights animados secuencialmente:

    - "Esto es lo que has facturado hoy"

    - "Esto es tu coste real por hora"

    - "Esto es tu margen — sube cuanto más trabajes en proyectos rentables"

    Botón "Entrar a la app"

    10.2 Implementación técnica:

    - Wizard como overlay full-screen, no modal pequeño

    - Animaciones: fade + scale 0.96→1 (Apple style), no bounce

    genérico

    - Sin Lottie. Iconos lucide. Mucho espacio en blanco.

    Tipografía grande.

    - Skip en cada pantalla excepto la última (link discreto

    arriba a la derecha)

    - Si skip: aún registra costingMode con default

    10.3 Demo data (lib/demoData.ts):

    Función seedDemoData(tenantId) crea:

    - 5 clientes ficticios (nombres realistas, NIF de ejemplo)

    - 3 proyectos: uno FIXED grande, uno HOURLY pequeño,

    uno SUBSCRIPTION

    - 20 timeEntries distribuidas las últimas 2 semanas

    - 5 varCosts variados

    - 2 fixedCosts (alquiler, software)

    Botón persistente arriba "Borrar datos demo y empezar real"

    hasta primera entrada manual.

    10.4 OnboardingContext:

    - state: { step, hasSeenTutorial, isDemo, persona }

    - persona = 'solo' | 'anchor' | 'trying'

    - persistir en localStorage para no repetir al recargar

    10.5 SettingsPage: botón "Repetir tutorial" que abre wizard

    desde paso 1.

    10.6 Cronómetro de validación:

    Pasar el wizard tú mismo, sin atajos, midiendo tiempo.

    Si > 90s: simplificar pantalla 2.

  VALIDACIÓN: usuario nuevo, sin saber nada, con cronómetro, llega

  a "ver mi primera hora en el dashboard" en menos de 60 segundos.

  CHECKPOINT: commit "S10: tutorial nuevo + demo data"

  ────────────────────────────────────────────────────────────────────

  ═══════════════════ FASE 4 — PULIDO (si queda) ═════════════════════

  ────────────────────────────────────────────────────────────────────

  SESIÓN 11 — PULIDO FINAL [P2, MEDIA]

  OBJETIVO: cerrar detalles que mejoran calidad pero no son críticos.

  PRE: cualquier sesión de Fase 1-3.

  PASOS:

    11.1 CobrosPage hero: mostrar NET por defecto + toggle GROSS/NET

    (botón pequeño en esquina del hero card)

    File: CobrosPage.tsx

    11.2 Métricas de morosidad (Collections Health):

    - Endpoint GET /v1/dashboard/collections-health

    - Calcula:

    DSO = avg(paidAt - issueDate) por payment cobrado

    DSO por cliente

    Top 3 clientes que más tardan

    Total pendiente > 30 días, > 60 días, > 90 días

    - Sección nueva en DashboardPage debajo de proyectos

    Files: dashboard.controller.ts, DashboardPage.tsx

    11.3 Recordatorios de cobro (preparar pero no enviar):

    - En CobrosPage cada PaymentRow PENDING > 7 días: badge

    "Vencido hace X días"

    - Botón "Recordar al cliente" (genera mailto: por ahora,

    email automático en futuro)

    Files: CobrosPage.tsx

    11.4 Limpiar cualquier botón "próximamente" que quede.

    11.5 Revisar nombres engañosos:

    - realHourlyCost → si ya cambió en S1, OK; si no, hacerlo

    - fmt(value, 0) en sitios donde se necesitan decimales para

    no mostrar "60 €" cuando son "60.50"

    11.6 Accesibilidad mínima:

    - aria-labels en botones icono-only

    - focus visible en cards clickables

    - Esc cierra todos los modales

  VALIDACIÓN: ningún botón decorativo, dashboard cuenta historia

  completa de morosidad, hero NET visible.

  CHECKPOINT: commit "S11: pulido final"

  ────────────────────────────────────────────────────────────────────

  RESUMEN MAPA DE SESIONES

  ────────────────────────────────────────────────────────────────────

    S0  Preparación (git init, backup)         ← OBLIGATORIA primero

    ── FASE 1 ──

    S1  Refactor cálculo dashboard             ← más impacto

    S2  Limpieza legacy + validaciones

    S3  Migración clientName → clientId

    ── FASE 2 ──

    S4  PlansPage UI                           ← independiente

    S5  Suscripciones backend (cron, prorrateo, freq)

    S6  ContractEditModal + renombrado tier

    ── FASE 3 ──

    S7  Modelo Invoice + correlativos

    S8  PDF + InvoicesPage

    S9  IRPF + PaymentTransaction

    S10 Tutorial nuevo

    ── FASE 4 ──

    S11 Pulido final

  DEPENDENCIAS:

    S0 → S1 → S2 → S3

    S2 → S4

    S2 → S5 → S6

    S5 → S7 → S8 → S9

    S10 independiente (puede hacerse en paralelo cualquier hueco)

    S11 al final

  ORDEN ÓPTIMO LINEAL: S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11

  ORDEN OPTIMIZADO POR ROI (si hay que recortar):

    S0, S1, S2, S5, S7, S8, S10, [resto si hay tiempo]

  ────────────────────────────────────────────────────────────────────

  SI TE QUEDAS SIN CLAUDE A MITAD DE SESIÓN

  ────────────────────────────────────────────────────────────────────

    1. Pide al asistente: "Resúmeme exactamente: qué archivos

    tocaste, qué pasos completaste de la sesión SX, en qué línea

    concreta te quedaste. Lo pego al volver."

    2. git commit -am "WIP S`<n>`.`<x>`: hasta donde llegamos"

    3. Al volver: pegar Contexto Maestro + Planning + el resumen

    que te dio el asistente. Decir "vamos por SX, había llegado a Y,

    sigue desde aquí".

    4. NUNCA dejes la sesión con`npm run build` rojo si vas a estar

    fuera más de 24h: o arreglas el error o haces git restore

    parcial al último estado verde.

  ────────────────────────────────────────────────────────────────────

  COBERTURA DE TODO LO IDENTIFICADO — CHECKLIST

  ────────────────────────────────────────────────────────────────────

  Bugs Dashboard:

    [✓ S1] calculateBusinessMetrics — denominador inestable

    [✓ S1] Doble contabilización direct + fixed

    [✓ S1] Margen 30% hardcodeado

    [✓ S1] Math.max(1) tirita

    [✓ S2] Bloque legacyProjects

  Bugs Proyectos:

    [✓ S3] clientName texto vs Client tabla

    [✓ S2] SUBSCRIPTION en Project picker

    [✓ S6] Triple definición hourlyRate

    [✓ S1] budgetHours huérfano (al entrar en utilización)

    [✓ S2] DELETE cascada sin avisar

    [✓ S2] Validaciones backend

  Bugs Suscripciones:

    [✓ S4] PlansPage inexistente

    [✓ S6] Confusión TenantPlan/ContractTier

    [✓ S5] billingDay sin usar

    [✓ S5] rollPayments sin backfill

    [✓ S5] Sin cron automático

    [✓ S5] Sin frequency

    [✓ S5] Sin prorrateo

    [✓ S6] convertContract no limpia

    [✓ S6] Botón editar contrato vacío

    [✓ S5] Pause sin política clara

  Bugs Cobros:

    [✓ S7] Sin invoiceNumber correlativo

    [✓ S8] Sin PDF

    [✓ S9] Sin IRPF

    [   ] Sin recargo equivalencia (BACKLOG)

    [   ] Sin caja vs devengo toggle (BACKLOG)

    [✓ S9] PaymentTransaction

    [✓ S11] Hero NET por defecto

    [✓ S11] DSO/morosidad

    [   ] Recordatorios email (S11 prepara, full BACKLOG)

    [   ] Conciliación bancaria (BACKLOG)

    [✓ S5] rollPayments con regenerate

    [✓ S2] deleteContract bloqueo si PAID

    [   ] Múltiples IVA por línea (✓ parcial S7 con InvoiceLine)

    [   ] Intracomunitario (BACKLOG, requiere taxRegime)

  Tutorial:

    [✓ S10] Rehacer desde cero

  Decisiones del usuario respetadas:

    [✓] NO elegir nicho aún

    [✓] Sin documentación markdown extra

    [✓] Sin features no pedidas

# # === FIN PLANNING OPERATIVO ===

—--

### Lo crítico que quiero que recuerdes mientras lo ejecutas:

  Empieza por S0 hoy mismo. Sin git, todo lo demás es jugarse el trabajo. Es 30 minutos y te ahorra catástrofes.

  S1 es el ROI más alto: arreglar el cálculo del dashboard cambia lo que el usuario ve cada vez que abre la app. Si solo tuvieras 1 sesión disponible esta semana, sería esa.

  S5 + S7 son los que convierten HorasPRO en una app deployable de verdad. Con lo que hay hoy, no puedes vendérsela a un autónomo español sin que tenga problemas con Hacienda.

  S10 (tutorial) puede hacerse en paralelo cualquier hueco — es independiente del resto. Si un día no quieres tocar backend y prefieres algo visual, vete a esa.

  Cuando vuelvas a empezar, pegas: [Contexto Maestro] + [Planning Operativo] + "Vamos por S0" y ya tienes a tu asistente al día sin perder un solo turno.

—---------

Progreso :

 PROGRESO (último update: 2026-04-27)

  ─────────────────────────────────────────────────────────────────────

  Repo en rama refactor-fase-1. Working dir limpio salvo donde se indica.

  ✅ S0 — git init + .gitignore + snapshot

    commit 2899775 "feat: snapshot pre-refactor"

  ✅ S1 — Refactor calculateBusinessMetrics + capacity

    commit 25af74d "refactor(s1): cálculo basado en capacidad + utilización"

    - Tenant.{plannedCapacityHours, targetMarginPct, costingMode,

    reliabilityMinHours} + enum CostingMode (ABSORPTION|CONTRIBUTION)

    - calculateBusinessMetrics: overhead=fixed/capacity, devuelve null

    si datos insuficientes, expone utilizationPct/isReliable

    - SettingsPage sección "Capacidad y rentabilidad"

    - DashboardPage muestra mensaje cuando isReliable=false

  ✅ S2 — Limpieza legacy + validaciones + delete safe

    commit 1cdb076 "refactor(s2): limpieza legacy + delete consecuencias"

    - Script migrate-legacy-projects-to-contracts ejecutado:

    3 contratos creados, 2 clientes nuevos, 1 reusado, 3 timeEntries

    y 2 varCosts re-enlazados

    - Bloque legacyProjects eliminado de dashboard.controller

    - SUBSCRIPTION fuera del picker de Project

    - Validaciones backend (endDate>=startDate, números no negativos)

    - GET /v1/projects/:id/delete-preview + bloqueo si payments PAID

    - ConfirmDialog muestra conteos exactos

    - stopPropagation en MenuBtn de ProjectsPage

  ⚠️  S1.1 — Extensión sin commit todavía (validada funcionalmente)

    Modificados (git status M):

    server/src/services/profitability.ts

    - calculateContractProfitability ahora respeta costingMode:

    CONTRIBUTION → indirectCost=0 por contrato

    ABSORPTION  → reparte fixed entre contratos como antes

    - Controller lee tenant.costingMode una vez y lo pasa a per-contract

    y per-business

    - Verificación funcional con seed:

    ABSORPTION   → contract.indirectCost=300, business.realHourlyCost=83

    CONTRIBUTION → contract.indirectCost=0,   business.realHourlyCost=80

    - Pendiente: commit "feat(s1.1): costingMode también en per-contract"

    Nota operativa (lección): un proceso node zombie en :3001 servía

    bundle viejo y enmascaraba que la lógica nueva ya funcionaba.

    Tras rebuild, comprobar lsof -i :3001 antes de hacer pruebas.

  🟢 Sanity check actual:

    - npm run build (server)         exit 0

    - npx tsc --noEmit (client)      exit 0

    - Servidor levantado en :3001 con bundle al día

    - Tenant demo en CONTRIBUTION con reliabilityMinHours=0 (estado test)

  🔜 Pendientes (orden del planning):

    FASE 1

    S3  Project.clientName → Project.clientId con backfill

    FASE 2

    S4  PlansPage UI (catálogo CRUD)

    S5  Suscripciones backend: billingFrequency, backfill, prorrateo,

    endpoint regenerate, cron diario

    S6  ContractEditModal + renombrado UI ContractTier

    FASE 3

    S7  Modelo Invoice + InvoiceLine + InvoiceSeries + correlativos

    S8  PDF de factura + InvoicesPage

    S9  Contract.irpfRate + PaymentTransaction

    S10 Tutorial nuevo (4 pantallas, <60s, demo data opcional)

    FASE 4

    S11 Pulido (CobrosPage NET default, DSO, accesibilidad)

  Decisión bloqueante antes de avanzar a S3:

    ¿Committeamos S1.1 ya con el mensaje "feat(s1.1): costingMode

    también en per-contract"? Recomendado sí — historia limpia.

# GEMINI TEST

### # === PROMPT PARA GEMINI: VALIDACIÓN VISUAL HORASPRO S3-S11 ===

  Eres un QA senior. Tu trabajo es probar visualmente HorasPRO en navegador

  y reportar cada problema con precisión quirúrgica. NO inventes resultados —

  si algo no funciona, dilo claro. Si algo se ve "raro pero funcional",

  también lo dices.

  ────────────────────────────────────────────────────────────────────

  CONTEXTO

  ────────────────────────────────────────────────────────────────────

  Repo: /Users/kmanu/Desktop/Proyecto 2GS/horaspro

  Stack: React 19 + Vite (cliente) + Express (server :3001) + PostgreSQL

  Rama actual: refactor-fase-1

  Últimos 12 commits cubren las sesiones S0–S11 de un planning de refactor.

  TODO el backend está probado con curl y pasa. Falta validar UI.

  Credenciales demo:

    email:    owner@agencia-demo.com

    password: password123

  Datos seed actuales (para que sepas qué encontrarás):

    - 2 proyectos: "Reparacion Pantalla" (cliente Juan), "Reparacion telefono"

    (cliente Manolo)

    - 4 clientes en BD: Juan, Manolo, Cliente Importante S.A., Taller Mecánico López

    - 3 planes: Free (Básico), Pro, Max (Élite)

    - Tenant config: ABSORPTION, capacidad 100h/mes, margen 50%, mín 5h

  ────────────────────────────────────────────────────────────────────

  ARRANQUE

  ────────────────────────────────────────────────────────────────────

1. Verifica que no haya zombies en el puerto 3001:

   lsof -i :3001

   Si hay: pkill -f "node dist/server.js"
2. Server (en una terminal):

   cd "/Users/kmanu/Desktop/Proyecto 2GS/horaspro/server"

   npm run dev
3. Cliente (otra terminal):

   cd "/Users/kmanu/Desktop/Proyecto 2GS/horaspro/client"

   npm run dev
4. Abre http://localhost:5173 en navegador.
5. Verifica que en la consola DevTools (F12 → Console) no aparezcan

   errores rojos al cargar cada pantalla.

  ────────────────────────────────────────────────────────────────────

  CONVENCIONES DEL REPORTE

  ────────────────────────────────────────────────────────────────────

  Para cada checkpoint marca:

    ✅ OK         — funciona como debe

    ⚠️  MENOR      — funciona pero hay detalle visual/UX raro (cuéntalo)

    ❌ ROTO       — error funcional o crash. Adjunta:

    · pantalla y paso exactos

    · qué esperabas

    · qué viste (texto del error, screenshot si puedes)

    · ¿hay error en consola DevTools? cópialo

  Al final entregas:

    1) Tabla con todos los CP y su estado

    2) Lista priorizada de bugs encontrados (P0 bloquea uso, P1 importante,

    P2 cosmético)

    3) Cronómetro real del tutorial (CP1) en segundos

  ────────────────────────────────────────────────────────────────────

  CP1 — TUTORIAL DE BIENVENIDA (S10)

  ────────────────────────────────────────────────────────────────────

  OBJETIVO crítico: < 60 segundos para llegar a "primer proyecto creado".

  Ten un cronómetro.

    1. Logout si estabas loggeado (botón inferior izquierdo, icono LogOut).

    2. En login, entra con las credenciales.

    3. Tras entrar, haz click en "Cómo usar HorasPRO" (sidebar abajo).

    [Si no aparece automáticamente al ser primera vez, fuerza:

    en DevTools Console: localStorage.removeItem('hp_onboarding_done');

    luego recarga.]

    4.**CRONÓMETRO: ARRANCA AQUÍ.**

    5. Pantalla 1: deben aparecer 3 cards (Solo, Anchor, Trying).

    Selecciona "Solo, varios clientes pequeños".

    6. Pantalla 2: rellena cliente "QA Test Cliente", proyecto "QA Test

    Proyecto", modo "Cuando termino", precio 1000. Pulsa "Empezar".

    7.**CRONÓMETRO: PARA AQUÍ y anota el tiempo.**

    8. Pantalla 3: aparece "Configurado". Pulsa "Continuar".

    9. Pantalla 4: aparece "Todo tuyo" con lista. Pulsa "Entrar al dashboard".

10. Verifica que en /dashboard ya hay datos (proyecto QA Test creado).

  VERIFICACIONES:

    · Step indicator (4 pills arriba) avanza correctamente.

    · Botón "Saltar" (esquina superior derecha) cierra el wizard sin error.

    · Reabrir desde sidebar "Cómo usar HorasPRO" lo recarga sin estado.

    · Probar también la opción "Empiezo de cero, quiero probar":

    debe SALTAR la pantalla 2 y mostrar mensaje "Configurado para explorar".

  LIMPIEZA: El proyecto QA Test queda creado en BD. Bórralo desde

  /proyectos al final.

  ────────────────────────────────────────────────────────────────────

  CP2 — PLANSPAGE (S4)

  ────────────────────────────────────────────────────────────────────

    1. Sidebar → "Planes" (icono Sparkles, sección "Catálogo").

    2. Verifica que la lista muestra Free / Pro / Max con sus badges

    correctos (gris / azul / morado) y precios.

    3. Pulsa "Nuevo plan". Verifica que el modal abre con secciones

    visibles: Identidad, Cómo se cobra, Mantenimiento (solo si SUBSCRIPTION),

    Características.

    4. Crea uno: name "QA Plan Test", tier "Pro", billingMode "Suscripción",

    precio 99.90, IVA 21%, añade 3 features tecleando + Enter ("soporte",

    "ssl", "backups").

    5. Despliega "Avanzado" (icono ChevronDown). Confirma que se ve un

    textarea con`{}`. Cámbialo a `{"max_contracts": 10}`. Pulsa

    "Crear plan".

    6. Verifica que aparece en la lista, con las 3 features como chips.

    7. Pulsa los 3 puntos del nuevo plan → "Archivar". Confirma. Verifica

    que desaparece de "Activos" y aparece en "Archivados" (con badge

    naranja).

    8. Pulsa los 3 puntos → "Reactivar". Vuelve a "Activos".

    9. Pulsa los 3 puntos → "Eliminar". Confirma. Debe desaparecer.

10. (Opcional) Intenta archivar/eliminar uno de los planes seed (Free,

    Pro, Max). NO debe haber error.

  VERIFICACIONES MENORES:

    · El switch entre filtros "Activos / Archivados / Todos" muestra

    contadores correctos.

    · Si introduces un nombre duplicado al crear, debe salir toast con

    "Ya existe un plan con el nombre…".

    · Editar un plan que tiene contratos asociados debe permitirlo, pero

    al intentar "Eliminar" definitivamente debe bloquear con mensaje

    claro (en seed actual no hay contratos asociados a planes seed).

  ────────────────────────────────────────────────────────────────────

  CP3 — NEWCLIENTMODAL DESDE FORMULARIO DE PROYECTO (S3)

  ────────────────────────────────────────────────────────────────────

    1. Sidebar → "Proyectos".

    2. Pulsa "Nuevo proyecto".

    3. Verifica que el campo "Cliente *" es un Select con tus clientes

    existentes (Juan, Manolo, Cliente Importante S.A., Taller Mecánico

    López), no un input de texto.

    4. Justo debajo del select hay un botón pequeño azul "+ Nuevo cliente".

    Púlsalo.

    5. Se abre un mini-modal "Nuevo cliente". Crea uno con name

    "QA Cliente Modal" y taxId "X9999999X". Pulsa "Crear cliente".

    6. Verifica que el toast dice "Cliente creado", el mini-modal se cierra

    y el Select del proyecto YA tiene seleccionado "QA Cliente Modal".

    7. Completa el resto del formulario: nombre proyecto "QA Test Inline",

    billing "Cerrado", precio 500. Pulsa "Crear proyecto".

    8. La nueva tarjeta debe aparecer con el cliente "QA Cliente Modal"

    bajo el nombre.

  EDGE: si pulsas "Nuevo cliente" sin nombre, debe mostrar error inline

  "El nombre es obligatorio".

  LIMPIEZA: borra el proyecto QA Test Inline al final desde la propia

  ProjectsPage (3 puntos → Eliminar). El cliente "QA Cliente Modal" puede

  quedar (no estorba).

  ────────────────────────────────────────────────────────────────────

  CP4 — PROJECTDETAILPAGE EDICIÓN (S3)

  ────────────────────────────────────────────────────────────────────

    1. /proyectos → click en "Reparacion Pantalla" (cliente Juan).

    2. Botón "Editar" arriba derecha.

    3. Verifica que el campo "Cliente *" del modal de edición es un Select

    (no input texto) con Juan preseleccionado.

    4. Cambia el cliente a Manolo. Pulsa "Guardar cambios".

    5. Vuelve a /proyectos. La tarjeta de "Reparacion Pantalla" debe

    mostrar ahora "Manolo".

    6. Reviértelo a Juan para no estropear el seed.

  ────────────────────────────────────────────────────────────────────

  CP5 — CONTRACTEDITMODAL (S6 + S9 IRPF)

  ────────────────────────────────────────────────────────────────────

    1. Entra a /proyectos/[id] de cualquier proyecto. Tab "Contratos".

    2. Click en un contrato existente para ir a su detalle

    (/contratos/:id).

    3. Botón "Editar" arriba derecha del contrato. Antes salía toast

    "próximamente"; ahora debe abrir un MODAL completo. ←CRÍTICO.

    4. Verifica que aparece banner azul informativo: "Los pagos ya generados

    no se actualizan automáticamente…".

    5. Cambia billingMode de FIXED → SUBSCRIPTION:

    · Deben aparecer campos extra (Frecuencia: Mensual/Trimestral/Anual,

    Día de cobro, Mantenimiento).

    · Los campos no aplicables (setupFee si era HOURLY, etc.) deben

    desaparecer/limpiarse.

    6. Verifica que existe input "Retención IRPF" con suffix "%" y hint

    sobre 15% profesionales / 7% nuevos autónomos.

    7. Pon precio 50, IRPF 15, billingDay 1, frequency MENSUAL. Guarda.

    8. Vuelve a abrir el modal. Verifica que los valores persisten.

    9. Cambia billingMode → HOURLY: el form debe quitar billingDay/frequency

    y mostrar input "Tarifa por hora".

  DESHACER: deja el contrato como estaba antes (FIXED + sin IRPF si así

  era).

  ────────────────────────────────────────────────────────────────────

  CP6 — REGENERAR PAGO + REGISTRAR ABONO + GENERAR FACTURA (S6, S9, S8)

  ────────────────────────────────────────────────────────────────────

  PRE: Necesitas un contrato SUBSCRIPTION con pagos generados. Si tu seed

  no tiene, créalo:

    1. /proyectos → entra en uno → Tab Contratos → "Nuevo contrato".

    2. Cliente cualquiera, billingMode "Suscripción", precio 100, IVA 21,

    IRPF 15, billingDay 1, frequency Mensual, fecha inicio 2026-04-01.

    3. Crea el contrato. Ve a /cobros y pulsa "Generar cobros del mes".

    4. Vuelve al contrato (/contratos/:id). En tab "Pagos" debe aparecer

    uno PENDING con net=100, gross=121, irpfAmount=15, due=106.

  VERIFICACIONES POR CHECKPOINT:

  CP6.A — Botón Regenerar (S6):

    1. En el pago PENDING, verifica botón "Regenerar" (icono RotateCw).

    2. Antes de pulsarlo, ve al ContractEditModal y cambia el precio a 200.

    Guarda.

    3. Vuelve al pago. Pulsa "Regenerar".

    4. El pago debe pasar a tener gross=242, due=212, irpf=30 (si IRPF 15%).

    5. Toast "Pago regenerado con el precio actual".

  CP6.B — Registrar abono parcial (S9):

    1. Pulsa "Cobrar" en el pago. Se abre PaymentMarkModal.

    2. Ahora ya NO es "actualizar amountPaid": debe ser un form de

    "Nuevo abono" con campos amount, paidAt, method, reference + toggle

    "Generar factura si queda totalmente pagado".

    3. Sugerido amount = total pendiente. Cámbialo a 50€, method

    "Transferencia", reference "TRF-001". Pulsa "Registrar abono".

    4. Toast "Abono registrado". El histórico al final del modal debe

    mostrar 1 fila: 50€ Transferencia.

    5. El estado del pago en la lista debe ser "Parcial" (badge azul).

  CP6.C — Segundo abono que cierra el pago + factura automática (S8+S9):

    1. Vuelve a "Cobrar". Toggle "Generar factura…" debe estar ON.

    2. Registra otro abono por el resto pendiente, method "Tarjeta".

    3. Toast debe ser "Abono registrado y factura generada" (NO solo

    "Abono registrado").

    4. Estado del pago: "Pagado" (badge verde).

    5. Sidebar → "Facturas". Debe haber una nueva con número A-N (ISSUED).

  CP6.D — Eliminar abono individual (S9):

    1. Pulsa "Cobrar" otra vez en el mismo pago.

    2. Histórico muestra los 2 abonos. Pulsa el icono Trash de uno.

    3. Confirma el alert nativo.

    4. El estado vuelve a "Parcial".

  LIMPIEZA: borra el contrato test al terminar (3 puntos → Eliminar).

  ────────────────────────────────────────────────────────────────────

  CP7 — INVOICESPAGE (S8)

  ────────────────────────────────────────────────────────────────────

    1. Sidebar → "Facturas".

    2. Verifica filtros: Todas / Borradores / Emitidas / Pagadas / Anuladas

    con contadores.

    3. Pulsa "Nueva factura". Modal con:

    · Selector cliente

    · Fechas emisión / vencimiento

    · Lista editable de líneas (cant, precio, IVA%, IRPF%, dto%)

    · Botón "+ Añadir línea"

    · Bloque "Totales en vivo" que recalcula al teclear

    · Toggle "Emitir con número" / "Guardar como borrador"

    4. Crea una con 2 líneas:

    Línea 1: "Servicio QA", qty 1, precio 1000, IVA 21, IRPF 15

    Línea 2: "Producto QA", qty 2, precio 50, IVA 10, IRPF 0

    Modo: "Emitir con número". Guarda.

    5. Verifica totales esperados: subtotal=1100, IVA=220 (210+10),

    IRPF=150, total a recibir=1170.

    6. Lista: aparece con número A-N, badge "Emitida".

    7. Pulsa el icono "ojo" → debe abrir PDF en nueva pestaña con layout

    correcto (datos emisor arriba, recuadro con número, líneas, totales).

    Si configuraste datos legales en CP8, deben aparecer.

    8. Pulsa el icono "descarga" → bajar PDF a tu disco.

    9. 3 puntos → "Anular (rectificativa)". Confirma. Aparecen DOS facturas:

    · Original ahora con badge rojo "Anulada"

    · Nueva con badge naranja "Rectificativa", número siguiente, totales

    en negativo.

10. Abre PDF de la anulada → debe llevar marca de agua "ANULADA"

    en diagonal.

  ────────────────────────────────────────────────────────────────────

  CP8 — SETTINGS → FACTURACIÓN (S8)

  ────────────────────────────────────────────────────────────────────

    1. Sidebar → "Ajustes".

    2. Busca la sección "Facturación" (icono FileText azul).

    3. Rellena: NIF "B12345678", nombre "Tu Nombre Test SL",

    dirección "Calle Mayor 1", CP "28001", ciudad "Madrid",

    email "qa@test.com", IBAN "ES12 3456 7890 1234 5678 9012".

    4. Pulsa "Guardar". Toast "Datos de facturación guardados".

    5. Recarga la página. Los valores persisten.

    6. Vuelve a /facturas y descarga cualquier PDF: ahora la cabecera debe

    llevar tu nombre, NIF, dirección, etc., y el IBAN al pie.

  ────────────────────────────────────────────────────────────────────

  CP9 — COBROSPAGE TOGGLE NETO/BRUTO (S11)

  ────────────────────────────────────────────────────────────────────

    1. Sidebar → "Cobros".

    2. En el hero superior derecha hay un toggle pill con dos botones:

    "Neto" y "Bruto". El default debe ser "Neto".

    3. Lee el "Cobrado" mostrado. Pulsa "Bruto". El número debe AUMENTAR

    (incluye IVA).

    4. Las 3 cajas (Cobrado / Pendiente / Total emitido) cambian

    sincronizadas.

    5. Verifica que las etiquetas también cambian: "Cobrado (neto)" vs

    "Cobrado (bruto)".

  ────────────────────────────────────────────────────────────────────

  CP10 — DASHBOARD SALUD DE COBROS (S11)

  ────────────────────────────────────────────────────────────────────

    1. /dashboard.

    2. Scroll hasta el final. Si tienes pagos cobrados o pendientes, debe

    aparecer una sección "Salud de cobros" con 3 cards:

    · DSO global: número en días + "(N pagos cobrados)"

    · Pendiente por antigüedad: 4 buckets con barras de colores

    (verde, amarillo, naranja, rojo según 0-30, 30-60, 60-90, 90+)

    · Clientes que más tardan: top 3 con días promedio

    3. Si NO hay pagos pendientes ni cobrados, la sección debe estar

    OCULTA (no mostrar tarjetas vacías).

  EDGE: si solo tienes pagos PENDING y ninguno PAID, "DSO global" debe

  mostrar "—" en vez de "0 días".

  ────────────────────────────────────────────────────────────────────

  CP11 — REGENERACIÓN DEL DEMO TENANT

  ────────────────────────────────────────────────────────────────────

  Si en la limpieza has dejado datos raros, verifica que no rompió nada

  crítico:

    1. /dashboard cargar sin errores rojos.

    2. /proyectos cargar.

    3. /clientes cargar.

    4. /facturas cargar.

    5. /cobros cargar.

    6. /informes cargar.

    7. /ajustes cargar.

  Si alguna pantalla rompe → ❌ con detalle.

  ────────────────────────────────────────────────────────────────────

  CP12 — NAVEGACIÓN GENERAL

  ────────────────────────────────────────────────────────────────────

    1. Sidebar tiene la sección "Catálogo" con item "Planes" (icono

    Sparkles).

    2. Sección "Costes" tiene "Cobros", "Facturas" (icono FileText nuevo),

    "Costes fijos", "Costes variables".

    3. BottomNav móvil (resize ventana <1024px): NO debe tener "Planes"

    ni "Facturas" (está en sidebar desktop solo). Pero debe seguir

    teniendo Inicio, Proyectos, Horas, Informes, Ajustes.

  ────────────────────────────────────────────────────────────────────

  CP13 — REVISA CONSOLA DEVTOOLS

  ────────────────────────────────────────────────────────────────────

  Durante TODO el recorrido anterior, ten DevTools abierto en pestaña

  Console. Cualquier ❌ error rojo es un bug. Cualquier ⚠️  warning amarillo

  recurrente, dilo también.

  Errores de extensions del navegador (Chrome extensions, etc.) NO cuentan,

  solo los del dominio localhost:5173.

  FORMATO FINAL DE TU REPORTE

  ────────────────────────────────────────────────────────────────────

```

  ## Resumen                                                                                                                                                                                                                                 

  | CP    | Pantalla                              | Estado |                                                                                                                                                                                 

  |-------|---------------------------------------|--------|                                                                                                                                                                                 

  | CP1   | Tutorial                              | ✅ / ⚠️  / ❌ |                    

  | CP2   | PlansPage                             | …      |                                                                                                                                                                                 

  | ...   | ...                                   | ...    |                                                                                                                                                                                 

                                                                                                                                                                                                                                             

  ## Cronómetro tutorial: __ segundos                                                                                                                                                                                                        

                                                                                                                                                                                                                                             

  ## Bugs encontrados (priorizados)                                                   

                                                                                                                                                                                                                                             

  ### P0 — Bloquean uso real                                                          

  1. [CP_, Pantalla _, Paso _]: descripción exacta + qué viste vs qué                                                                                                                                                                        

     esperabas + error de consola si lo hay.                                          

                                                                                                                                                                                                                                             

  ### P1 — Importantes pero no bloquean                                                         

  …                                                                                                                                                                                                                                          

                                                                                      

  ### P2 — Cosméticos                                                                                                                                                                                                                        

  …                                                       

                                                                                                                                                                                                                                             

  ## Notas adicionales                                                                                                                                                                                                                       

  Cualquier observación de UX que no encaje en bug pero merezca atención.                                                                                                                                                                    

```

  NO inventes resultados. Si no puedes ejecutar algún paso (p.ej. no

  tienes acceso a navegador), dilo claro y para ahí.

### FIN PROMPT

## 📋 Resumen de la sesión QA con Gemini

  Lo que Gemini ha validado

  ✅ CP1 — Tutorial de bienvenida

- Flujo de 4 pantallas funciona end-to-end.
- "Saltar" cierra el wizard correctamente.
- Persistencia hp_onboarding_done OK.
- Reabrir desde sidebar OK.
- Modo "Empiezo de cero" salta pantalla 2 correctamente.
- ⚠️  Tiempo reportado por Gemini: 2:50 (bastante por encima del objetivo <60s). Yo lo revalidé en paralelo con Playwright headless: el flujo puro tarda

  ~7s. La diferencia probablemente está en logout+login+recarga que Gemini incluyó.

- ⚠️  Bug menor: campos de email no limpian bien al primer focus.

  ✅ CP2 — PlansPage

- Crear / archivar / reactivar / eliminar plan funcionan.
- ⚠️  Reportó tier "Básico" cuando le pedí "Pro" — toca confirmar si es bug del selector o error de Gemini.
- ❌ NO confirmó: bloque "Avanzado" con JSON, chips de features visibles, contadores de filtros, prueba de duplicado, archivar plan seed.

  ✅ CP3 — NewClientModal desde formulario de proyecto

- Selector de cliente funciona, no input texto.
- Botón "+ Nuevo cliente" abre mini-modal.
- Validación inline OK.
- Crear cliente → toast → cliente preseleccionado automáticamente.
- Sin issues.

  ✅ CP4 — ProjectDetailPage edición

- Cambio de cliente persiste y revierte.
- Sin issues.

  Lo que Gemini NO validó

  ❌ CP5 — ContractEditModal — SE DESVIÓ

  Gemini se puso a hablar de "implementación de modelo de suscripción" y MRR cuando el CP5 era específicamente:

- ¿El botón "Editar" abre MODAL o sigue saliendo el toast viejo "próximamente"? CRÍTICO
- ¿Aparece banner azul informativo?
- ¿Cambio de billingMode limpia campos?
- ¿Aparece input "Retención IRPF"?

  Estado real: SIN VALIDAR.

  ❌ CP6 — Pagos / abonos / factura automática

  Gemini dio error "trajectory converted to zero chat messages" y se cortó. Cero validación.

  ❌ CP7-CP13 — NI EMPEZADOS

- CP7 InvoicesPage (PDF, anular → rectificativa)
- CP8 Settings → Facturación (datos legales que van al PDF)
- CP9 CobrosPage toggle NETO/BRUTO
- CP10 Dashboard Salud de cobros (DSO + morosidad)
- CP11 Sanity de navegación
- CP12 Sidebar/BottomNav
- CP13 Console DevTools

  Bugs detectados hasta ahora

  ┌──────┬────────────────────────────────────────────────┬─────────────────────┬───────────────────────────────────────────────────────────────────────┐

  │ Prio │                      Bug                       │        Dónde        │                                Estado                                 │

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  │ P2   │ Login fields no limpian al primer focus        │ LoginPage.tsx       │ Anotado                                                               │

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  │ P2   │ 401 Unauthorized en consola pre-auth           │ AuthContext /       │ Anotado                                                               │

  │      │                                                │ api.ts              │                                                                       │

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  │ P2   │ Botón login dice "Entrar a Gainora" en vez de  │ LoginPage.tsx:160   │ Encontrado por mí al inspeccionar selectores. Posible rename          │

  │      │ HorasPRO                                       │                     │ histórico no migrado.                                                 │

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  │ P?   │ Tutorial reportó 170s (sospechoso)             │ OnboardingWizard    │ Posiblemente falso positivo                                           │

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  ├──────┼────────────────────────────────────────────────┼─────────────────────┼───────────────────────────────────────────────────────────────────────┤

  │ P?   │ Plan creado con tier "Básico" cuando pedí      │ PlansPage modal     │ Por confirmar                                                         │

  │      │ "Pro"                                          │                     │                                                                       │

  └──────┴────────────────────────────────────────────────┴─────────────────────┴───────────────────────────────────────────────────────────────────────┘

  Setup que dejo en sitio

  En client/:

- ✅ playwright.config.ts, e2e/_helpers.ts, e2e/cp01-tutorial.spec.ts (los 3 tests pasan en 18.5s)
- ⚠️  e2e/cp02-plans.spec.ts escrito pero no ejecutado (tú interrumpiste antes de que corriera).

  Si decides que vamos con Claude-en-Chrome al volver, podemos archivarlo o conservarlo como referencia.

  Datos sucios en seed agencia-demo

  Quedaron creados por los tests (no rompen, solo ensucian):

- Clientes: "QA Cliente Modal", "QA Cliente NNNN"
- Proyectos: "QA Test Inline", "QA Proyecto NNNN", "QA Test Cliente"

  Si quieres limpieza, una vez al volver lo dejo en 30s con un script.

---

  🎯 Plan para retomar

1. Abres Claude-en-Chrome (browser-use real).
2. Le pasas el prompt QA original (lo tienes arriba en mi mensaje anterior) pero saltando CP1-CP4 porque ya están validados.
3. Empieza por CP5 con énfasis específico en los 6 puntos críticos del modal.
4. Continúa CP6 → CP13.
5. Cuando vuelva el reporte completo, hacemos sesión de saneo de código priorizando P0 → P1 → P2.
6. Al cerrar el saneo, aplicar las 5 visiones sobre el estado final (tienes el recordatorio guardado en memoria):

    - Inversor escéptico

    - Usuario que no se convence

    - Competidor que ya lo hace mejor

    - Ingeniero senior de Apple

    - Contable senior de banco grande

  Todo guardado en memory/project_qa_session_2026-04-27.md y MEMORY.md actualizado. Cuando vuelvas, lo retomamos sin reconstruir nada. Buen viaje.

✻ Cooked for 3m 4s

### FIN RESUMEN AVANCES



A 27 DE ABRIL A LAS 22:57 presuntamente ya hemos hecho todos los test, ya hemos arreglado todos los problemas y ya hemos acabado toda esa parte

**
