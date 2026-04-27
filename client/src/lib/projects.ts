// ============================================================================
// projects.ts — Helpers compartidos para gestión de proyectos
// ============================================================================
// Tipos y utilidades reutilizadas por ProjectsPage y ProjectDetailPage.
// ============================================================================

export interface DeletePreview {
  projectId:        string;
  projectName:      string;
  contractCount:    number;
  paymentCount:     number;
  paidPaymentCount: number;
  issueCount:       number;
  timeEntryCount:   number;
  varCostCount:     number;
  canDelete:        boolean;
  blockReason:      string | null;
}

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Convierte el preview en una lista de líneas humanas que describen el
 * impacto del borrado. La UI las renderiza dentro de un ConfirmDialog para
 * que el usuario sepa exactamente qué va a perder.
 */
export function buildDeleteSummary(p: DeletePreview): string[] {
  const lines: string[] = [];
  if (p.contractCount > 0)  lines.push(plural(p.contractCount, 'contrato',     'contratos'));
  if (p.paymentCount > 0) {
    const paidNote = p.paidPaymentCount > 0 ? ` (${p.paidPaymentCount} cobrados)` : '';
    lines.push(plural(p.paymentCount, 'pago', 'pagos') + paidNote);
  }
  if (p.issueCount > 0)     lines.push(plural(p.issueCount,    'incidencia',   'incidencias'));
  if (p.timeEntryCount > 0) lines.push(plural(p.timeEntryCount,'entrada de horas','entradas de horas'));
  if (p.varCostCount > 0)   lines.push(plural(p.varCostCount,  'coste variable','costes variables'));
  if (lines.length === 0)   lines.push('El proyecto no tiene datos asociados.');
  return lines;
}
