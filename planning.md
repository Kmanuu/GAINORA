# Planning y Registro de Problemas (HorasPRO)

Aquí se registran los problemas, bugs y puntos de mejora ("problemas 5") identificados durante las auditorías de UX y funcionalidad, junto con su estado actual.

## Auditoría UX y Filosofía Apple (Abril 2026)

- [X] **1. Falta de inmediatez (Skeleton Loaders disruptivos)**

  - *Problema*: Al guardar, editar o eliminar registros, la aplicación muestra un esqueleto de carga de toda la página, rompiendo la fluidez.
  - *Solución*: Implementar *Silent Fetching* (recarga silenciosa en segundo plano) manteniendo la tabla visible. Aplicado en `FixedCostsPage`, `VarCostsPage`, `ProjectsPage` y `HorasPage`.
- [X] **2. Timer rígido y desincronizado (Falta de adaptabilidad)**

  - *Problema*: El temporizador no se sincroniza si el usuario abre la aplicación en varias pestañas.
  - *Solución*: Añadido un `StorageEvent` listener en `HorasPage` para sincronizar el estado del temporizador en tiempo real entre pestañas.
- [ ] **3. Dashboard estático (Desconexión de datos)**

  - *Problema*: Los insights (ej. "Tarifa Mínima") se calculan estáticamente. Si el usuario modifica un coste, debe recargar o navegar al dashboard para ver el cambio.
  - *Solución*: Implementar un sistema de caché reactiva o actualizar los insights dinámicamente en el frontend durante las simulaciones.
- [X] **4. Entrada manual de horas poco flexible**

  - *Problema*: Añadir horas manualmente exige escribir números en campos separados con demasiada fricción.
  - *Solución*: Añadidos botones de suma rápida (+15m, +30m, +1h, +2h) en el modal de registro manual para acelerar la entrada de datos.
- [X] **5. Micro-interacciones y Feedback visual**

  - *Problema*: El modal de formularios desaparecía de forma abrupta solapándose con la pantalla de carga principal.
  - *Solución*: Al haber implementado la recarga silenciosa (punto 1), el modal ahora se cierra limpiamente y la interfaz se siente mucho más orgánica y natural.
