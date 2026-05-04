# Gainora — Memoria del Proyecto

> Esqueleto provisional · 30 abril 2026
> Versión 0.1 — pendiente de contenido detallado, capturas y referencias.

---

## 0. Portada (a maquetar al final)

- Título: **Gainora — Plataforma SaaS de control de rentabilidad para autónomos y pequeñas agencias**
- Autor: Manuel Laguna Prieto
- Tutor: *(rellenar)*
- Centro / Titulación: IES Francisco de los Ríos · Proyecto Intermodular DAW
- Convocatoria: *(rellenar)*
- Fecha de entrega: 15 de mayo de 2026

---

## 1. Resumen ejecutivo *(1 página)*

Tres párrafos cortos, escritos para alguien que no conoce ni programación ni contabilidad:

1. **Qué problema resuelve.** Un autónomo o una pequeña agencia normalmente no sabe si está ganando o perdiendo dinero hasta el final del año, cuando habla con su gestor. Gainora le dice **cada mes** cuánto cuesta su hora de trabajo, cuánto está ingresando y si su negocio es rentable.
2. **Qué es Gainora.** Una aplicación web a la que se entra desde el navegador. No hay que instalar nada. Funciona como Gmail o Google Drive: cada empresa tiene su propio espacio aislado, con sus clientes, proyectos, horas, costes y facturas.
3. **Qué tiene de especial.** Calcula la **tarifa mínima rentable** automáticamente, genera **facturas legales en PDF** con todos los requisitos fiscales españoles (IVA, IRPF, recargo de equivalencia), y mantiene un **historial inalterable de facturas** según el Real Decreto VeriFactu, sin que el usuario tenga que entender ninguno de esos términos.

---

## 2. Glosario para no expertos *(IMPORTANTE — leer antes que el resto)*

Esta memoria menciona conceptos contables y técnicos. Esta tabla los explica con palabras del día a día:

| Término | Qué significa de verdad |
|---|---|
| **Tarifa mínima** | Lo mínimo que tienes que cobrar la hora para no perder dinero. Si tu coste fijo mensual (alquiler, luz, software) más tus horas de trabajo suman 2.000 €, y trabajas 100 horas al mes, tu tarifa mínima es 20 €/h. Por debajo de eso, pierdes. |
| **MRR** | *Monthly Recurring Revenue* — los ingresos que recibes cada mes de forma fija (suscripciones, mantenimientos). Como el "fijo" del trabajo, pero del cliente que te paga regularmente. |
| **IVA** | Impuesto que añades al precio de tu servicio (21% en España general) y que luego le entregas a Hacienda. No es tuyo, eres "intermediario". |
| **IRPF** | Lo que retienes a Hacienda por adelantado. Si facturas a una empresa, ellos te pagan 79€ de cada 100€, y los 21€ los envían directamente a Hacienda en tu nombre. |
| **Recargo de equivalencia** | Régimen especial de IVA para comerciantes minoristas: pagan un IVA extra y a cambio Hacienda no les pide declaración trimestral. |
| **VeriFactu** | Real Decreto 1007/2023. Obliga desde 2026 a que cada factura "esté encadenada" con la anterior mediante una huella digital, para que sea imposible falsificar facturas a posteriori. |
| **SaaS** | *Software as a Service* — software al que se accede desde la web, sin instalación. Ej: Gmail, Netflix, Spotify, Gainora. |
| **Multi-tenant** | Una sola aplicación que sirve a muchas empresas distintas, cada una con su espacio privado. Como un edificio de oficinas: el edificio es uno solo, pero cada empresa alquila su planta y nadie ve lo de los demás. |
| **API** | El "camarero" entre el navegador del usuario y la base de datos. La página le pide cosas, la API las trae. |
| **Base de datos** | Donde se guarda toda la información (usuarios, facturas, horas) de forma estructurada. |

---

## 3. Introducción y motivación *(2-3 páginas)*

### 3.1 Contexto: el autónomo invisible

- Cuántos autónomos hay en España, cuántas pequeñas agencias.
- Por qué el problema de "no saber si soy rentable" es tan común.
- Por qué Excel no es la solución (errores manuales, no actualiza el coste-hora real, no genera facturas legales).

### 3.2 Soluciones existentes y su limitación

Comparativa breve con tres alternativas reales:

- **Holded / Quipu** — buen software contable pero pensado para gestores; el autónomo no lo entiende.
- **FreshBooks / QuickBooks** — internacionales, no soportan particularidades fiscales españolas (IRPF, recargo de equivalencia, VeriFactu).
- **Excels caseros** — flexibles pero llenos de errores y sin facturas legales.

### 3.3 Hueco que ocupa Gainora

Software pensado para el autónomo, en español, con fiscalidad española al día, y que **traduce los números a decisiones**: "sube tu tarifa", "cuidado, este mes pierdes dinero", "este cliente no es rentable".

---

## 4. Objetivos *(1 página)*

### 4.1 Objetivo general

Diseñar, desarrollar y desplegar una aplicación web SaaS multi-tenant que permita a un autónomo o pequeña agencia conocer en tiempo real su rentabilidad y cumplir con la normativa fiscal española de facturación.

### 4.2 Objetivos específicos

1. Calcular automáticamente la tarifa mínima rentable a partir de costes fijos, capacidad y margen objetivo.
2. Permitir el seguimiento de horas trabajadas por proyecto y empleado.
3. Generar facturas en PDF con todos los requisitos legales (IVA, IRPF, recargo de equivalencia, hash chain VeriFactu).
4. Implementar un sistema de roles (Owner, Admin, Empleado, Viewer, Superadmin) con permisos diferenciados.
5. Aislar los datos de cada empresa (multi-tenancy) con seguridad.
6. Desplegar la aplicación en producción accesible desde Internet.

---

## 5. Análisis previo *(2 páginas)*

### 5.1 Requisitos funcionales

Lista numerada (RF-01, RF-02…) explicada en una frase cada uno. Bloques:

- Autenticación y registro
- Gestión de clientes y proyectos
- Fichaje de horas
- Costes fijos y variables
- Contratos de suscripción
- Facturación legal con PDF
- Panel de control y métricas
- Roles y permisos

### 5.2 Requisitos no funcionales

- **Seguridad**: contraseñas hasheadas, JWT, aislamiento entre empresas.
- **Disponibilidad**: la app debe estar online 24/7.
- **Rendimiento**: respuesta en menos de 1s en operaciones normales.
- **Usabilidad**: cualquier persona sin formación técnica debe entenderla.
- **Cumplimiento legal**: facturas conformes con la normativa española.

### 5.3 Casos de uso principales

5-6 casos de uso descritos en lenguaje natural, con un diagrama simple:
- "Laura, dueña de una agencia, da de alta un cliente nuevo"
- "Juan, empleado, ficha sus horas en un proyecto"
- "Laura emite una factura mensual y la descarga en PDF"
- "Pepa, administradora, anula una factura por error y emite una rectificativa"
- etc.

---

## 6. Diseño *(3-4 páginas)*

### 6.1 Arquitectura general

Diagrama explicando las 3 capas:

```
[Navegador del usuario]
      ↓ HTTPS
[Frontend React (Vercel)]
      ↓ HTTPS API REST
[Backend Express + Node.js (Railway)]
      ↓ TCP
[Base de datos PostgreSQL (Railway)]
```

Explicado en lenguaje llano: el navegador es el escaparate, el backend es el cerebro, y la base de datos es la memoria a largo plazo.

### 6.2 Modelo de datos

Diagrama de las entidades principales y cómo se relacionan:

- Tenant (empresa) → contiene Users, Clients, Projects, Plans, Invoices…
- Project → tiene Contracts y TimeEntries
- Contract → genera Payments y Invoices
- Invoice → tiene InvoiceLines y queda encadenada con la anterior por hash

Explicación de por qué cada relación es como es. Captura del diagrama generado por Prisma.

### 6.3 Diseño de la interfaz

- Decisiones de UX: paleta oscura/clara, sidebar, dashboard como pantalla principal.
- Capturas grandes de las 6 pantallas más representativas.
- Mención de la "Apple-inspired design system": tipografía, tokens de color, espaciado.

### 6.4 Roles y permisos

Tabla con la matriz de permisos:

| Acción | OWNER | ADMIN | EMPLOYEE | VIEWER |
|---|:-:|:-:|:-:|:-:|
| Ver dashboard | ✓ | ✓ | ✓ | ✓ |
| Crear/editar clientes y proyectos | ✓ | ✓ | ✗ | ✗ |
| Emitir facturas | ✓ | ✓ | ✗ | ✗ |
| Anular factura (rectificativa) | ✓ | ✗ | ✗ | ✗ |
| Fichar horas propias | ✓ | ✓ | ✓ | ✗ |
| Datos legales y fiscales | ✓ | ✗ | ✗ | ✗ |
| Gestión de equipo | ✓ | ✗ | ✗ | ✗ |

### 6.5 Flujo de facturación legal

Diagrama de cómo una factura nace, se firma con hash, se encadena con la anterior y se exporta a PDF. Explicación de VeriFactu en lenguaje no técnico.

---

## 7. Implementación *(3 páginas)*

### 7.1 Tecnologías utilizadas y por qué

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 | Estándar de la industria, ecosistema enorme, velocidad de desarrollo. |
| Backend | Node.js + Express 5 + TypeScript | JavaScript en ambos lados → un solo lenguaje, menos contexto. |
| Base de datos | PostgreSQL 17 + Prisma 7 | Postgres es el estándar para datos relacionales fiables. Prisma da type-safety end-to-end. |
| Autenticación | JWT + bcryptjs | Estándar para APIs sin estado. |
| PDF | PDFKit | Control total sobre el layout legal de la factura. |
| Cron | node-cron | Generar pagos recurrentes a las 03:00 cada noche. |
| Despliegue | Railway (back+BD) + Vercel (front) | Gratis para el alcance del proyecto, despliegue continuo desde GitHub. |

### 7.2 Decisiones técnicas relevantes

3-4 decisiones que se justifican por escrito:

- **Multi-tenancy con `tenantId` en cada tabla** vs schema-per-tenant. Por qué esa elección (más simple, suficiente para el alcance).
- **JWT con refresh token** vs sesiones en cookie. Por qué JWT (sin estado, escalable).
- **Hash chain de facturas con SHA-256** según VeriFactu. Cómo se implementa.
- **Generación de PDF en backend** vs frontend. Por qué backend (consistencia, firma, sin depender del navegador).

### 7.3 Estructura del código

```
horaspro/
├── client/          ← lo que el usuario ve (React)
│   └── src/
│       ├── pages/   ← una carpeta por pantalla
│       ├── components/
│       └── lib/     ← utilidades (cliente HTTP, formatters)
├── server/          ← el cerebro (Node.js)
│   └── src/
│       ├── routes/  ← qué URLs existen
│       ├── controllers/  ← qué hace cada URL
│       ├── services/     ← lógica de negocio
│       └── lib/
└── prisma/          ← cómo se llama y conecta cada tabla
    └── schema.prisma
```

---

## 8. Validación y pruebas *(1-2 páginas)*

### 8.1 Pruebas manuales

Sesiones de QA con Claude Chrome y revisión humana. Se documentan los 8 bugs detectados y los 3 que se resolvieron antes del despliegue final.

### 8.2 Pruebas automáticas

Referencia a los tests de Vitest existentes para servicios críticos (cálculo de tarifa, generación de hash, etc.).

### 8.3 Pruebas de roles

Matriz: cada rol intenta cada acción y se verifica que el sistema le permite/deniega lo que toca.

### 8.4 Despliegue real

URL de producción, capturas, prueba de creación de cuenta nueva por un usuario externo.

---

## 9. Despliegue *(1 página)*

### 9.1 Infraestructura

GitHub → push → Railway (backend) y Vercel (frontend) despliegan automáticamente.

### 9.2 URLs públicas

- Frontend: https://client-five-ebon-83.vercel.app
- Backend: https://gainora.up.railway.app
- Base de datos: PostgreSQL gestionada por Railway

### 9.3 Variables de entorno y secretos

Cómo se gestionan (sin exponer valores reales en la memoria).

---

## 10. Conclusiones *(1 página)*

- Objetivos cumplidos / parcialmente cumplidos / no cumplidos.
- Aprendizajes técnicos: TypeScript estricto, Prisma 7, despliegue real, fiscalidad.
- Aprendizajes no técnicos: priorización, deuda técnica consciente, QA con IA.

---

## 11. Trabajo futuro *(media página)*

- Página de detalle de cliente (B5 del QA).
- Sección dedicada de Contratos en el sidebar (B6 del QA).
- Integración con bancos vía PSD2 para conciliación automática.
- App móvil nativa o PWA.
- Exportación a SII (declaración trimestral automatizada).
- Internacionalización (otros países, otros idiomas).

---

## 12. Bibliografía y referencias

- Real Decreto 1007/2023 (VeriFactu) — BOE.
- Documentación oficial de React, Express, Prisma, PostgreSQL.
- Holded, Quipu (referencias del estado del arte).
- Recursos sobre multi-tenancy y JWT.

---

## 13. Anexos

- A. Capturas de pantalla completas de cada pantalla.
- B. Esquema completo de la base de datos.
- C. Ejemplo de factura PDF generada.
- D. Credenciales de la cuenta de demostración.
- E. Manual de usuario rápido (para el tribunal en la defensa).

---

## 📝 Lista de control (a borrar antes de entregar)

- [ ] §1 Resumen ejecutivo
- [x] §2 Glosario *(esqueleto ya hecho, falta pulir)*
- [ ] §3 Introducción y motivación
- [ ] §4 Objetivos
- [ ] §5 Análisis previo
- [ ] §6 Diseño
- [ ] §7 Implementación
- [ ] §8 Validación y pruebas
- [ ] §9 Despliegue
- [ ] §10 Conclusiones
- [ ] §11 Trabajo futuro
- [ ] §12 Bibliografía
- [ ] §13 Anexos
- [ ] Capturas de pantalla
- [ ] Diagramas (arquitectura, modelo de datos, flujo de factura)
- [ ] Maquetación final con portada y formato del centro
