// ============================================================================
// IssuesPanel.tsx — Pestaña "Inconvenientes" dentro de ContractDetailPage
// ============================================================================
// Lista de issues del contrato (abiertos arriba, cerrados colapsables).
// Modal para crear nuevo inconveniente. Acción "Cerrar" para los abiertos.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, AlertOctagon, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Receipt, Circle,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import type { Issue } from '@/types';
import Card       from '@/components/ui/Card';
import Badge      from '@/components/ui/Badge';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import Input      from '@/components/ui/Input';
import Textarea   from '@/components/ui/Textarea';
import Toggle     from '@/components/ui/Toggle';
import EmptyState from '@/components/ui/EmptyState';
import { useToast }   from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface IssueFormState {
  title:         string;
  description:   string;
  isBillable:    boolean;
  internalFault: boolean;
}

const EMPTY_FORM: IssueFormState = {
  title: '', description: '', isBillable: false, internalFault: false,
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function IssuesPanel({ contractId }: { contractId: string }) {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const [issues,  setIssues]  = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [showClosed,   setShowClosed]   = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [form,         setForm]         = useState<IssueFormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    api.get<Issue[]>(`/v1/issues?contractId=${contractId}`)
      .then(setIssues)
      .catch((e: Error) => toast('error', e.message))
      .finally(() => setLoading(false));
  }, [contractId, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError('El título es obligatorio'); return; }
    setSaving(true);
    try {
      await api.post<Issue>('/v1/issues', {
        contractId,
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        isBillable:    form.isBillable,
        internalFault: form.internalFault,
      });
      toast('success', 'Inconveniente creado');
      setModalOpen(false);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(issue: Issue) {
    const ok = await confirm({
      title:       'Cerrar inconveniente',
      message:     `Se marcará "${issue.title}" como cerrado. Las horas y costes ya registrados se conservan.`,
      confirmText: 'Cerrar',
    });
    if (!ok) return;
    try {
      await api.post(`/v1/issues/${issue.id}/close`, {});
      toast('success', 'Inconveniente cerrado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al cerrar');
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0,1].map((i) => <div key={i} className="skeleton h-20 rounded-[14px]" />)}
      </div>
    );
  }

  const open    = issues.filter((i) => !i.closedAt);
  const closed  = issues.filter((i) =>  i.closedAt);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text)] tabular-nums">{open.length}</span> abiertos ·{' '}
            <span className="tabular-nums">{closed.length}</span> cerrados
          </p>
        </div>
        <Button
          variant="primary" size="sm"
          icon={<Plus className="w-4 h-4" strokeWidth={2.4} />}
          onClick={openCreate}
        >
          Nuevo inconveniente
        </Button>
      </div>

      {issues.length === 0 ? (
        <EmptyState
          icon={<AlertOctagon className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />}
          title="Sin inconvenientes"
          description="Cuando algo no salga como esperabas (avería, reclamación, soporte adicional...) crea un ticket aquí. Las horas y costes que registres se imputarán al inconveniente, no al contrato general."
          actionLabel="Crear inconveniente"
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {open.map((i, idx) => (
            <IssueRow key={i.id} issue={i} index={idx} onClose={() => handleClose(i)} />
          ))}

          {closed.length > 0 && (
            <>
              <button
                onClick={() => setShowClosed((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 mt-3 text-[12.5px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                {showClosed
                  ? <ChevronDown  className="w-4 h-4" strokeWidth={2} />
                  : <ChevronRight className="w-4 h-4" strokeWidth={2} />}
                {showClosed ? 'Ocultar cerrados' : `Mostrar ${closed.length} cerrado${closed.length !== 1 ? 's' : ''}`}
              </button>
              {showClosed && (
                <div className="space-y-2 opacity-75">
                  {closed.map((i, idx) => (
                    <IssueRow key={i.id} issue={i} index={idx} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo inconveniente"
        subtitle="Avería, soporte, reclamación o ajuste extra"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Crear</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Título *"
            type="text"
            value={form.title}
            onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setFormError(''); }}
            placeholder="Ej: Bug en el listado, avería del motor..."
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Detalles, contexto, qué se ha probado..."
          />

          <div className="rounded-[14px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--color-text)]">Facturable al cliente</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-relaxed mt-0.5">
                  Si está activo, las horas/piezas del inconveniente se cobran como trabajo extra. Si no, restan margen como coste interno.
                </p>
              </div>
              <Toggle checked={form.isBillable} onChange={(v) => setForm((p) => ({ ...p, isBillable: v }))} />
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--color-text)]">Fallo interno (culpa nuestra)</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-relaxed mt-0.5">
                  Marca esto si la avería es por algo que hicimos mal. Solo es informativo, no afecta al cálculo.
                </p>
              </div>
              <Toggle checked={form.internalFault} onChange={(v) => setForm((p) => ({ ...p, internalFault: v }))} />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
              <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IssueRow
// ---------------------------------------------------------------------------

function IssueRow({ issue, index, onClose }: {
  issue: Issue;
  index: number;
  onClose?: () => void;
}) {
  const isOpen = !issue.closedAt;
  const hours  = issue._count?.timeEntries ?? 0;
  const costs  = issue._count?.varCosts    ?? 0;

  return (
    <Card
      padding="md"
      className="animate-fade-up"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0',
            isOpen
              ? 'bg-[var(--color-orange-subtle)] text-[var(--color-orange)]'
              : 'bg-[var(--color-green-subtle)] text-[var(--color-green)]',
          )}
        >
          {isOpen
            ? <Circle className="w-4 h-4" strokeWidth={2.2} />
            : <CheckCircle2 className="w-4 h-4" strokeWidth={2} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--color-text)] tracking-tight">
              {issue.title}
            </p>
            <Badge variant={issue.isBillable ? 'green' : 'gray'} size="sm">
              {issue.isBillable ? 'Facturable' : 'No facturable'}
            </Badge>
            {issue.internalFault && <Badge variant="red" size="sm">Fallo interno</Badge>}
          </div>

          {issue.description && (
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
              {issue.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-[var(--color-text-tertiary)] tabular-nums">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={2} /> {hours} entrada{hours !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Receipt className="w-3 h-3" strokeWidth={2} /> {costs} coste{costs !== 1 ? 's' : ''}
            </span>
            <span>· abierto {fmtDate(issue.openedAt)}</span>
            {issue.closedAt && <span>· cerrado {fmtDate(issue.closedAt)}</span>}
          </div>
        </div>

        {isOpen && onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>
    </Card>
  );
}
