// ============================================================================
// useCan.ts — Hook para preguntar si el usuario actual puede una acción
// ============================================================================
// Uso:
//   const canEdit = useCan('client:write');
//   {canEdit && <Button>Editar</Button>}
// ============================================================================

import { useAuth } from '@/context/AuthContext';
import { userCan, type Action } from '@/lib/permissions';

export function useCan(action: Action): boolean {
  const { user } = useAuth();
  return userCan(user?.role, action);
}

/** Versión que devuelve un mapa con todos los permisos clave precomputados.
 *  Útil para componentes con muchos checks (ej: una página entera). */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    canWriteClients:    userCan(role, 'client:write'),
    canWriteProjects:   userCan(role, 'project:write'),
    canWriteContracts:  userCan(role, 'contract:write'),
    canWritePlans:      userCan(role, 'plan:write'),
    canWriteInvoices:   userCan(role, 'invoice:write'),
    canVoidInvoices:    userCan(role, 'invoice:void'),
    canWritePayments:   userCan(role, 'payment:write'),
    canWriteFixedCosts: userCan(role, 'fixedcost:write'),
    canWriteVarCosts:   userCan(role, 'varcost:write:own'),
    canTimeEntryAny:    userCan(role, 'timeentry:write:any'),
    canTimeEntryOwn:    userCan(role, 'timeentry:write:own'),
    canTenantLegal:     userCan(role, 'tenant:legal'),
    canTenantDemo:      userCan(role, 'tenant:demo'),
    canManageTeam:      userCan(role, 'team:manage'),
    canWriteIssues:     userCan(role, 'issue:write'),
  };
}
