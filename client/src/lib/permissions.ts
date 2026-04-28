// ============================================================================
// permissions.ts (frontend) — Espejo de la matriz del backend
// ============================================================================
// MISMA matriz que server/src/lib/permissions.ts. Si cambias allí, cambia
// aquí también. El backend siempre es la fuente de verdad — esto es UX.
// ============================================================================

import type { UserRole } from '@/types';

export type Action =
  | 'client:write' | 'project:write' | 'contract:write' | 'plan:write'
  | 'invoice:write' | 'invoice:void' | 'payment:write'
  | 'timeentry:write:any' | 'timeentry:write:own'
  | 'varcost:write:any'   | 'varcost:write:own'
  | 'fixedcost:write'
  | 'tenant:legal' | 'tenant:demo'
  | 'team:manage'
  | 'issue:write';

const PERMS: Record<UserRole, ReadonlySet<Action>> = {
  SUPERADMIN: new Set([]),
  OWNER: new Set([
    'client:write', 'project:write', 'contract:write', 'plan:write',
    'invoice:write', 'invoice:void', 'payment:write',
    'timeentry:write:any', 'timeentry:write:own',
    'varcost:write:any', 'varcost:write:own',
    'fixedcost:write',
    'tenant:legal', 'tenant:demo',
    'team:manage',
    'issue:write',
  ]),
  ADMIN: new Set([
    'client:write', 'project:write', 'contract:write', 'plan:write',
    'invoice:write', 'payment:write',
    'timeentry:write:any', 'timeentry:write:own',
    'varcost:write:any', 'varcost:write:own',
    'fixedcost:write',
    'issue:write',
  ]),
  EMPLOYEE: new Set([
    'timeentry:write:own', 'varcost:write:own', 'issue:write',
  ]),
  VIEWER: new Set([]),
};

export function userCan(role: UserRole | undefined | null, action: Action): boolean {
  if (!role) return false;
  const set = PERMS[role];
  return set ? set.has(action) : false;
}
