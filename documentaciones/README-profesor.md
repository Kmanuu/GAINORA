# Gainora — Guía para el tribunal evaluador

> Este documento explica el proyecto sin jerga técnica, pensado para cualquier persona del tribunal independientemente de su perfil técnico.

---

## ¿Qué es Gainora?

Gainora es una **aplicación web** que ayuda a autónomos y pequeñas agencias a saber en todo momento si su negocio es rentable. Se usa desde el navegador, como Gmail o Google Drive, sin instalar nada.

**El problema que resuelve**: la mayoría de autónomos no saben si están ganando o perdiendo dinero hasta que hablan con el gestor a final de año. Para entonces ya es demasiado tarde para cambiar nada. Gainora les da esa información **en tiempo real**, cada mes.

---

## ¿Qué puede hacer un usuario con Gainora?

Imagine que Laura es dueña de una pequeña agencia de diseño con tres empleados:

**1. Saber cuánto le cuesta trabajar**  
Laura introduce sus gastos fijos mensuales (alquiler de la oficina, software, sueldos). Gainora le dice automáticamente: *"Para no perder dinero, tienes que cobrar mínimo 38 €/hora."*

**2. Controlar sus proyectos y clientes**  
Cada empleado registra cuántas horas dedica a cada proyecto. Laura ve en pantalla si un proyecto está siendo rentable o si están invirtiendo más horas de las que cobran.

**3. Cobros automáticos**  
Gainora genera automáticamente los cobros mensuales de los clientes con contrato de mantenimiento, sin que Laura tenga que recordarlo.

**4. Facturas legales**  
Con un clic, Gainora genera una factura en PDF lista para enviar al cliente, con todos los impuestos correctamente calculados (IVA, IRPF) y un número correlativo. Las facturas cumplen la normativa española más reciente (Real Decreto VeriFactu 1007/2023).

**5. Ver si el negocio va bien**  
El panel de control muestra, de un vistazo: ingresos del mes, margen de beneficio, proyección para fin de año y cuánto dinero está pendiente de cobrar.

---

## ¿Qué diferencia a Gainora de otras herramientas?

| | Gainora | Software de contabilidad (Holded, Quipu) | Excel |
|---|---|---|---|
| Pensado para el autónomo sin formación financiera | ✓ | ✗ (es complejo) | ✗ |
| Fiscalidad española al día (VeriFactu) | ✓ | ✓ | ✗ |
| Calcula la tarifa mínima rentable | ✓ | ✗ | Manual |
| Control de horas por proyecto | ✓ | ✗ | Manual |
| Genera facturas legales en PDF | ✓ | ✓ | ✗ |
| Funciona desde el navegador sin instalar nada | ✓ | ✓ | ✗ |

---

## ¿Qué tecnología hay detrás?

Sin entrar en detalles técnicos, la aplicación tiene tres partes:

```
Lo que el usuario ve   →   El cerebro de la app   →   Donde se guardan los datos
    (navegador)               (servidor)               (base de datos)
```

- **Lo que el usuario ve** se construyó con React, la tecnología de interfaces web más usada en la industria (la misma que usa Facebook, Airbnb o Notion).
- **El cerebro** corre en un servidor en la nube que recibe peticiones del navegador y devuelve los datos correctos.
- **Los datos** se guardan en una base de datos PostgreSQL, el estándar industrial para información empresarial.

La aplicación está **publicada en Internet** y cualquier persona puede crearle una cuenta desde cualquier dispositivo con navegador.

---

## ¿Qué hace técnicamente especial este proyecto?

Aunque el objetivo es la sencillez para el usuario, por dentro hay elementos técnicos sofisticados:

**Multi-tenancy**: aunque la aplicación es una sola, sirve a muchas empresas simultáneamente, cada una con su espacio completamente privado. Es como un edificio de oficinas: el edificio es uno, pero cada empresa tiene su planta y nadie puede ver lo de los demás.

**Cadena VeriFactu (Real Decreto 1007/2023)**: cada factura emitida queda "encadenada" con la anterior mediante una huella digital matemática (SHA-256). Esto hace que sea imposible falsificar o modificar facturas a posteriori, cumpliendo la nueva legislación española obligatoria desde 2026 para todos los programas de facturación.

**Sistema de roles**: hay cinco tipos de usuario con permisos distintos. El empleado solo puede registrar sus horas; el administrador puede gestionar proyectos pero no anular facturas; el propietario tiene acceso total.

**Generación automática de cobros**: cada noche a las 3:00, el servidor revisa todos los contratos activos y genera automáticamente los cobros mensuales que correspondan, incluido el cálculo proporcional si el contrato empezó a mitad de mes.

---

## Datos del despliegue

La aplicación está en producción y accesible en:

- **Frontend (lo que ve el usuario)**: https://gainora.vercel.app
- **Backend (el servidor)**: https://gainora.up.railway.app

Para hacer una prueba rápida en el tribunal, puede entrar con:
- Email: `laura@lapri.app` / Contraseña: `password123` (perfil de propietaria, acceso completo)

---

## ¿Qué ha aprendido el alumno con este proyecto?

Este proyecto ha obligado al alumno a resolver problemas reales:

- Diseñar una base de datos compleja con 15+ entidades relacionadas.
- Implementar seguridad real: contraseñas encriptadas, tokens de sesión, aislamiento entre empresas.
- Entender y aplicar legislación fiscal española en código (IVA, IRPF, VeriFactu).
- Desplegar en producción con despliegue continuo (cada cambio en GitHub publica automáticamente).
- Construir una interfaz de usuario completa y coherente sin librerías de componentes externas.
- Trabajar con TypeScript tanto en frontend como en backend, garantizando la consistencia de los datos de extremo a extremo.

El proyecto representa aproximadamente **200-250 horas de desarrollo** real, documentadas en el historial de commits de Git.

---

*Gainora — Proyecto Final de Grado DAW · IES Francisco de los Ríos · Mayo 2026*  
*Autor: Manuel Laguna Prieto*
