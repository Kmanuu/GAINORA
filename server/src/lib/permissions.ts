// ============================================================================
// permissions.ts — Matriz de permisos por rol
// ============================================================================
// Fuente de verdad ÚNICA del sistema de roles. Si una acción no está aquí,
// no existe. Si una acción no está en el set de un rol, ese rol no la puede
// hacer. El middleware requireCan(action) y el frontend useCan(action) leen
// de aquí. Cambiar la matriz aquí basta para cambiar el comportamiento.
// ============================================================================

export type Role = "SUPERADMIN" | "OWNER" | "ADMIN" | "EMPLOYEE" | "VIEWER";

/** Cada acción del sistema. Nombres en formato `recurso:operación`. */
export type Action =
  // Cliente / proyecto / contrato / plan
  | "client:write"          // crear/editar/borrar
  | "project:write"
  | "contract:write"
  | "plan:write"
  // Facturación
  | "invoice:write"         // crear, editar borrador, emitir
  | "invoice:void"          // anular (rectificativa) — solo OWNER
  | "payment:write"         // registrar abonos / regenerar
  // Horas
  | "timeentry:write:any"   // editar horas de cualquier user
  | "timeentry:write:own"   // editar horas propias
  // Costes
  | "varcost:write:any"     // crear/editar varCost en cualquier contrato
  | "varcost:write:own"     // crear/editar varCost en contratos donde el user tiene horas
  | "fixedcost:write"       // crear/editar/borrar costes fijos
  // Datos legales y fiscales
  | "tenant:legal"          // NIF, IBAN, billing profile, criterio Devengo/Caja, taxOverrides
  | "tenant:demo"           // demo seed/wipe
  // Usuarios del tenant
  | "team:manage"           // crear/editar/cambiar role/eliminar users del tenant
  // Issues
  | "issue:write";

const OWNER_PERMISSIONS: Set<Action> = new Set([
  "client:write", "project:write", "contract:write", "plan:write",
  "invoice:write", "invoice:void", "payment:write",
  "timeentry:write:any", "timeentry:write:own",
  "varcost:write:any", "varcost:write:own",
  "fixedcost:write",
  "tenant:legal", "tenant:demo",
  "team:manage",
  "issue:write",
]);

const ADMIN_PERMISSIONS: Set<Action> = new Set([
  "client:write", "project:write", "contract:write", "plan:write",
  "invoice:write", "payment:write",
  "timeentry:write:any", "timeentry:write:own",
  "varcost:write:any", "varcost:write:own",
  "fixedcost:write",
  "issue:write",
]);

const EMPLOYEE_PERMISSIONS: Set<Action> = new Set([
  "timeentry:write:own",
  "varcost:write:own",
  "issue:write",
]);

const VIEWER_PERMISSIONS: Set<Action> = new Set([]);

const SUPERADMIN_PERMISSIONS: Set<Action> = new Set([]); // Sólo accede a /admin/*; no opera dentro de un tenant

const PERMISSIONS_BY_ROLE: Record<Role, Set<Action>> = {
  SUPERADMIN: SUPERADMIN_PERMISSIONS,
  OWNER:      OWNER_PERMISSIONS,
  ADMIN:      ADMIN_PERMISSIONS,
  EMPLOYEE:   EMPLOYEE_PERMISSIONS,
  VIEWER:     VIEWER_PERMISSIONS,
};

/** Si el rol puede ejecutar la acción. Devuelve false si rol desconocido. */
export function userCan(role: string | undefined | null, action: Action): boolean {
  if (!role) return false;
  const set = PERMISSIONS_BY_ROLE[role as Role];
  return set ? set.has(action) : false;
}

/** Devuelve TODAS las acciones permitidas a un rol. Útil para frontend
 *  y para tests. */
export function permissionsOf(role: string | undefined | null): Action[] {
  if (!role) return [];
  const set = PERMISSIONS_BY_ROLE[role as Role];
  return set ? Array.from(set) : [];
}
