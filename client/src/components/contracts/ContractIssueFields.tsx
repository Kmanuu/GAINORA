// ============================================================================
// ContractIssueFields.tsx — Selectores dependientes Contrato → Inconveniente
// ============================================================================
// Reutilizable en HorasPage (timer + modal manual) y en VarCostsPage (modal).
// Solo se renderiza si el proyecto seleccionado tiene contratos activos.
// El issue solo se ofrece si el contrato seleccionado tiene issues abiertos.
// ============================================================================

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Select   from '@/components/ui/Select';
import type { Contract, Issue } from '@/types';

interface Props {
  projectId:  string;
  contractId: string;
  issueId:    string;
  onChange:   (next: { contractId: string; issueId: string }) => void;
  disabled?:  boolean;
  /** Texto auxiliar bajo el bloque (opcional) */
  hint?: string;
}

export default function ContractIssueFields({
  projectId, contractId, issueId, onChange, disabled, hint,
}: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [issues,    setIssues]    = useState<Issue[]>([]);

  useEffect(() => {
    if (!projectId) { setContracts([]); return; }
    api.get<Contract[]>(`/v1/contracts?projectId=${projectId}&status=ACTIVE`)
      .then(setContracts)
      .catch(() => setContracts([]));
  }, [projectId]);

  useEffect(() => {
    if (!contractId) { setIssues([]); return; }
    api.get<Issue[]>(`/v1/issues?contractId=${contractId}&isOpen=true`)
      .then(setIssues)
      .catch(() => setIssues([]));
  }, [contractId]);

  // Si no hay proyecto o no hay contratos, no mostramos nada (no contamina UX)
  if (!projectId || contracts.length === 0) return null;

  return (
    <div className="rounded-[12px] bg-[var(--color-blue-subtle)] border border-[rgba(10,132,255,0.18)] p-3 space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-blue)]">
        Asignar a cliente / inconveniente (opcional)
      </p>
      <Select
        label="Contrato del cliente"
        value={contractId}
        onChange={(e) => onChange({ contractId: e.target.value, issueId: '' })}
        disabled={disabled}
        options={[
          { value: '', label: 'Trabajo del proyecto general' },
          ...contracts.map((c) => ({
            value: c.id,
            label: `${c.client?.name ?? 'Sin cliente'} · ${c.tier}`,
          })),
        ]}
      />
      {contractId && issues.length > 0 && (
        <Select
          label="Inconveniente abierto"
          value={issueId}
          onChange={(e) => onChange({ contractId, issueId: e.target.value })}
          disabled={disabled}
          options={[
            { value: '', label: 'Trabajo normal del contrato' },
            ...issues.map((i) => ({ value: i.id, label: i.title })),
          ]}
        />
      )}
      {hint && (
        <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
