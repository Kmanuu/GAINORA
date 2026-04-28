// ============================================================================
// InvoicesPage.tsx — CRUD de facturas con descarga de PDF
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FileText, AlertCircle, RefreshCw, Eye, Download,
  Send, Ban, Trash2, MoreHorizontal, X as XIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { fmtDate, toNum } from '@/lib/format';
import type { Invoice, InvoiceStatus, Client } from '@/types';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import Input            from '@/components/ui/Input';
import Textarea         from '@/components/ui/Textarea';
import DatePicker       from '@/components/ui/DatePicker';
import Select           from '@/components/ui/Select';
import SegmentedControl from '@/components/ui/SegmentedControl';
import DemoBadge        from '@/components/ui/DemoBadge';
import { useToast }     from '@/components/ui/Toast';
import { useConfirm }   from '@/components/ui/ConfirmDialog';
import { useCan }       from '@/hooks/useCan';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT:  'Borrador',
  ISSUED: 'Emitida',
  PAID:   'Pagada',
  VOIDED: 'Anulada',
};
const STATUS_BADGE: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  DRAFT:  'gray',
  ISSUED: 'blue',
  PAID:   'green',
  VOIDED: 'red',
};

type Filter = InvoiceStatus | 'ALL';

const EUR = (n: number, decimals = 2): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals })
    .format(n);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const canWrite    = useCan('invoice:write');
  const canVoid     = useCan('invoice:void');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState<Filter>('ALL');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    Promise.all([
      api.get<Invoice[]>('/v1/invoices'),
      api.get<Client[]>('/v1/clients'),
    ])
      .then(([ins, cls]) => { setInvoices(ins); setClients(cls); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  async function openPdf(inv: Invoice) {
    try {
      const blob = await api.blob(`/v1/invoices/${inv.id}/pdf`);
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // El URL se libera cuando el navegador cierra la pestaña.
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'No se pudo abrir el PDF');
    }
  }

  async function downloadPdf(inv: Invoice) {
    try {
      const blob = await api.blob(`/v1/invoices/${inv.id}/pdf`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = inv.number != null && inv.series
        ? `factura-${inv.series.code}-${inv.number}.pdf`
        : `factura-borrador-${inv.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'No se pudo descargar el PDF');
    }
  }

  async function issueInvoice(inv: Invoice) {
    setMenuOpen(null);
    try {
      await api.post(`/v1/invoices/${inv.id}/issue`, {});
      toast('success', 'Factura emitida');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al emitir');
    }
  }

  async function voidInvoice(inv: Invoice) {
    setMenuOpen(null);
    const ok = await confirm({
      title:       `Anular factura ${inv.series?.code}-${inv.number}`,
      message:     'Se marcará como ANULADA y se generará automáticamente una factura rectificativa con líneas negativas y nuevo número correlativo. Esta acción no se puede deshacer.',
      confirmText: 'Anular y generar rectificativa',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.post(`/v1/invoices/${inv.id}/void`, {});
      toast('success', 'Factura anulada y rectificativa creada');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al anular');
    }
  }

  async function deleteDraft(inv: Invoice) {
    setMenuOpen(null);
    const ok = await confirm({
      title:       `Eliminar borrador`,
      message:     'Esta factura aún no ha sido emitida. Se borrará definitivamente.',
      confirmText: 'Eliminar borrador',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/invoices/${inv.id}`);
      toast('success', 'Borrador eliminado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  const counts = {
    ALL:    invoices.length,
    DRAFT:  invoices.filter((i) => i.status === 'DRAFT').length,
    ISSUED: invoices.filter((i) => i.status === 'ISSUED').length,
    PAID:   invoices.filter((i) => i.status === 'PAID').length,
    VOIDED: invoices.filter((i) => i.status === 'VOIDED').length,
  };
  const visible = invoices.filter((i) => filter === 'ALL' ? true : i.status === filter);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="space-y-2">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-20 rounded-[14px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--color-red-subtle)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[var(--color-red)]" strokeWidth={1.8} />
        </div>
        <p className="text-[16px] font-semibold text-[var(--color-text)]">Error al cargar facturas</p>
        <p className="text-[14px] text-[var(--color-text-secondary)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Facturas</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            Documentos legales con número correlativo. Configura tus datos en Ajustes → Facturación.
          </p>
        </div>
        {canWrite && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" strokeWidth={2.4} />}
            onClick={() => setModalOpen(true)}
            disabled={clients.length === 0}
          >
            Nueva factura
          </Button>
        )}
      </header>

      <div className="mb-6 animate-fade-up stagger-1">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL',    label: 'Todas',     count: counts.ALL },
            { value: 'DRAFT',  label: 'Borradores', count: counts.DRAFT },
            { value: 'ISSUED', label: 'Emitidas',  count: counts.ISSUED },
            { value: 'PAID',   label: 'Pagadas',   count: counts.PAID },
            { value: 'VOIDED', label: 'Anuladas',  count: counts.VOIDED },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyInvoices onNew={() => setModalOpen(true)} hasAny={invoices.length > 0} />
      ) : (
        <div className="space-y-2">
          {visible.map((inv, i) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              index={i}
              menuOpen={menuOpen === inv.id}
              onMenuToggle={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === inv.id ? null : inv.id); }}
              onView={() => openPdf(inv)}
              onDownload={() => downloadPdf(inv)}
              onIssue={() => issueInvoice(inv)}
              onVoid={() => voidInvoice(inv)}
              onDelete={() => deleteDraft(inv)}
              canWrite={canWrite}
              canVoid={canVoid}
            />
          ))}
        </div>
      )}

      <NewInvoiceModal
        open={modalOpen}
        clients={clients}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); load(true); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvoiceRow
// ---------------------------------------------------------------------------

function InvoiceRow({
  invoice, index, menuOpen, onMenuToggle, onView, onDownload, onIssue, onVoid, onDelete,
  canWrite, canVoid,
}: {
  invoice:      Invoice;
  index:        number;
  menuOpen:     boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onView:       () => void;
  onDownload:   () => void;
  onIssue:      () => void;
  onVoid:       () => void;
  onDelete:     () => void;
  canWrite:     boolean;
  canVoid:      boolean;
}) {
  const isDraft  = invoice.status === 'DRAFT';
  const isIssued = invoice.status === 'ISSUED' || invoice.status === 'PAID';
  // El menú "..." sólo tiene contenido útil si el usuario puede al menos
  // hacer una acción: emitir/borrar borrador (canWrite) o anular (canVoid).
  // En VIEWER ambos son false → ocultamos el botón entero.
  const hasMenuActions = (isDraft && canWrite) || (isIssued && canVoid);
  const numStr   = invoice.number != null && invoice.series
    ? `${invoice.series.code}-${invoice.number}`
    : 'BORRADOR';

  return (
    <Card
      padding="md"
      className="animate-fade-up flex items-center gap-3"
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-[var(--color-blue-subtle)] text-[var(--color-blue)]">
        <FileText className="w-[18px] h-[18px]" strokeWidth={1.9} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-[var(--color-text)] tabular-nums">{numStr}</p>
          <Badge variant={STATUS_BADGE[invoice.status]} size="sm">{STATUS_LABEL[invoice.status]}</Badge>
          {invoice.rectifies && (
            <Badge variant="orange" size="sm">Rectificativa</Badge>
          )}
          <DemoBadge show={invoice.series?.code === 'DEMO'} />
        </div>
        <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 truncate">
          {invoice.client?.name ?? '—'}
          {invoice.client?.taxId && <span className="text-[var(--color-text-tertiary)]"> · {invoice.client.taxId}</span>}
        </p>
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
          {isDraft ? 'Creada' : 'Emitida'} {fmtDate(invoice.issueDate)}
          {invoice.dueDate && !isDraft && <> · vence {fmtDate(invoice.dueDate)}</>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[15px] font-semibold text-[var(--color-text)] tabular-nums">
          {EUR(toNum(invoice.totalGross), 2)}
        </p>
        {Number(invoice.totalIrpf) > 0 && (
          <p className="text-[10.5px] text-[var(--color-text-tertiary)]">
            con IRPF -{EUR(toNum(invoice.totalIrpf), 2)}
          </p>
        )}
      </div>

      <div className="relative shrink-0">
        <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" strokeWidth={2} />} onClick={onView} />
        <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" strokeWidth={2} />} onClick={onDownload} />
        {hasMenuActions && (
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
        {menuOpen && hasMenuActions && (
          <div
            className="absolute right-0 top-9 z-20 w-44 bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border-medium)] py-1.5"
            style={{ boxShadow: 'var(--shadow-floating)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {isDraft && canWrite && (
              <>
                <MenuBtn icon={<Send   className="w-3.5 h-3.5" />} label="Emitir"             onClick={onIssue} />
                <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Eliminar borrador"  onClick={onDelete} danger />
              </>
            )}
            {isIssued && canVoid && (
              <MenuBtn icon={<Ban className="w-3.5 h-3.5" />} label="Anular (rectificativa)" onClick={onVoid} danger />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function MenuBtn({
  icon, label, onClick, danger = false,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px]',
        'transition-colors duration-100',
        danger
          ? 'text-[var(--color-red)] hover:bg-[var(--color-red-subtle)]'
          : 'text-[var(--color-text)] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NewInvoiceModal — crea DRAFT manual
// ---------------------------------------------------------------------------

interface LineDraft {
  description: string;
  quantity:    string;
  unitPrice:   string;
  vatRate:     string;
  irpfRate:    string;
  discount:    string;
}

const EMPTY_LINE: LineDraft = {
  description: '', quantity: '1', unitPrice: '', vatRate: '21', irpfRate: '0', discount: '0',
};

function NewInvoiceModal({
  open, clients, onClose, onCreated,
}: {
  open:      boolean;
  clients:   Client[];
  onClose:   () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [clientId,  setClientId]  = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate,   setDueDate]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [lines,     setLines]     = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [issueAfter, setIssueAfter] = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  useEffect(() => {
    if (open) {
      setClientId(clients[0]?.id ?? '');
      setIssueDate(today);
      setDueDate('');
      setNotes('');
      setLines([{ ...EMPTY_LINE }]);
      setIssueAfter(true);
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setLine<K extends keyof LineDraft>(i: number, key: K, value: LineDraft[K]) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: value } : l));
  }
  function addLine()    { setLines((prev) => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { setLines((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev); }

  // Cálculo de totales en tiempo real (mismo cálculo que backend)
  const totals = lines.reduce(
    (acc, l) => {
      const qty = parseFloat(l.quantity)  || 0;
      const up  = parseFloat(l.unitPrice) || 0;
      const dis = parseFloat(l.discount)  || 0;
      const vat = parseFloat(l.vatRate)   || 0;
      const irpf = parseFloat(l.irpfRate) || 0;
      const lineNet   = qty * up * (1 - dis / 100);
      const lineGross = lineNet * (1 + vat / 100);
      return {
        subtotalNet: acc.subtotalNet + lineNet,
        totalVat:    acc.totalVat    + (lineGross - lineNet),
        totalIrpf:   acc.totalIrpf   + lineNet * (irpf / 100),
      };
    },
    { subtotalNet: 0, totalVat: 0, totalIrpf: 0 },
  );
  const totalGross = totals.subtotalNet + totals.totalVat - totals.totalIrpf;

  async function submit() {
    if (!clientId) { setErr('Selecciona un cliente'); return; }
    const validLines = lines.filter((l) => l.description.trim() && parseFloat(l.unitPrice) > 0);
    if (validLines.length === 0) { setErr('Añade al menos una línea válida (descripción + precio).'); return; }

    setSaving(true);
    setErr('');
    try {
      const payload = {
        clientId,
        issueDate,
        dueDate:   dueDate || null,
        notes:     notes.trim() || null,
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          quantity:    parseFloat(l.quantity)  || 1,
          unitPrice:   parseFloat(l.unitPrice) || 0,
          vatRate:     parseFloat(l.vatRate)   || 21,
          irpfRate:    parseFloat(l.irpfRate)  || 0,
          discount:    parseFloat(l.discount)  || 0,
        })),
      };
      const created = await api.post<Invoice>('/v1/invoices', payload);
      if (issueAfter) {
        await api.post(`/v1/invoices/${created.id}/issue`, {});
        toast('success', 'Factura creada y emitida');
      } else {
        toast('success', 'Borrador guardado');
      }
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      setErr(msg);
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva factura"
      subtitle={issueAfter ? 'Se emitirá con número correlativo al guardar' : 'Se guardará como borrador'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            {issueAfter ? 'Crear y emitir' : 'Guardar borrador'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Cliente *"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: '', label: clients.length ? 'Selecciona…' : 'Sin clientes' },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Acción al guardar"
            value={issueAfter ? 'issue' : 'draft'}
            onChange={(e) => setIssueAfter(e.target.value === 'issue')}
            options={[
              { value: 'issue', label: 'Emitir con número' },
              { value: 'draft', label: 'Guardar como borrador' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Fecha emisión" value={issueDate} onChange={setIssueDate} />
          <DatePicker label="Fecha vencimiento" value={dueDate} onChange={setDueDate} min={issueDate || undefined} />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2">
            Líneas
          </p>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="rounded-[12px] border border-[var(--color-border-medium)] p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    label={i === 0 ? 'Descripción' : ''}
                    type="text"
                    value={l.description}
                    onChange={(e) => setLine(i, 'description', e.target.value)}
                    placeholder="Servicio, producto…"
                  />
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(i)}
                      className="mt-6 p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-red-subtle)] hover:text-[var(--color-red)] transition-colors"
                      aria-label="Eliminar línea"
                    >
                      <XIcon className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <Input label="Cant." type="number" min="0" step="0.01"
                    value={l.quantity}  onChange={(e) => setLine(i, 'quantity',  e.target.value)} />
                  <Input label="Precio" type="number" min="0" step="0.01" prefix="€"
                    value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} />
                  <Input label="IVA %" type="number" min="0" max="100"
                    value={l.vatRate}   onChange={(e) => setLine(i, 'vatRate',   e.target.value)} />
                  <Input label="IRPF %" type="number" min="0" max="100"
                    value={l.irpfRate}  onChange={(e) => setLine(i, 'irpfRate',  e.target.value)} />
                  <Input label="Dto %" type="number" min="0" max="100"
                    value={l.discount}  onChange={(e) => setLine(i, 'discount',  e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-blue)] hover:text-[var(--color-blue-hover)]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
            Añadir línea
          </button>
        </div>

        {/* Totales en vivo */}
        <div className="rounded-[12px] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.03)] p-3 border border-[var(--color-border-subtle)] space-y-1">
          <div className="flex justify-between text-[12.5px] text-[var(--color-text-secondary)]">
            <span>Base imponible</span><span className="tabular-nums">{EUR(totals.subtotalNet)}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-[var(--color-text-secondary)]">
            <span>IVA</span><span className="tabular-nums">{EUR(totals.totalVat)}</span>
          </div>
          {totals.totalIrpf > 0 && (
            <div className="flex justify-between text-[12.5px] text-[var(--color-red)]">
              <span>Retención IRPF</span><span className="tabular-nums">-{EUR(totals.totalIrpf)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[14px] text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
            <span>Total a recibir</span><span className="tabular-nums">{EUR(totalGross)}</span>
          </div>
        </div>

        <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Forma de pago, observaciones…" />

        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-red-subtle)] border border-[rgba(255,69,58,0.20)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
            <p className="text-[13px] text-[#D93025] dark:text-[#FF6961]">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyInvoices({ onNew, hasAny }: { onNew: () => void; hasAny: boolean }) {
  const canWrite = useCan('invoice:write');
  if (hasAny) {
    return (
      <Card padding="lg" className="flex flex-col items-center py-12 text-center animate-fade-up">
        <div className="w-14 h-14 rounded-[18px] bg-[var(--color-blue-subtle)] flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-[var(--color-blue)]" strokeWidth={1.6} />
        </div>
        <p className="text-[16px] font-semibold text-[var(--color-text)] mb-1">Sin facturas en este filtro</p>
        <p className="text-[13.5px] text-[var(--color-text-secondary)] max-w-[300px] mb-4 leading-relaxed">
          Cambia el filtro para ver el resto.
        </p>
        {canWrite && (
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
            Nueva factura
          </Button>
        )}
      </Card>
    );
  }
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-[20px] bg-[var(--color-blue-subtle)] flex items-center justify-center mb-4 animate-float">
        <FileText className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />
      </div>
      <p className="text-[18px] font-semibold text-[var(--color-text)] tracking-tight">
        Tus facturas legales, listas para Hacienda
      </p>
      <p className="text-[14px] text-[var(--color-text-secondary)] mt-1.5 max-w-[440px] leading-relaxed">
        Cada factura tiene número correlativo único, IVA por línea, IRPF cuando aplique
        y PDF descargable. Lo único legal que la AEAT te puede pedir.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-[480px] w-full mt-6 text-left">
        <div className="rounded-[10px] bg-[var(--color-surface-alt)] p-3">
          <p className="text-[12px] font-semibold text-[var(--color-text)]">📋 Número único</p>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
            Correlativo atómico por serie
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--color-surface-alt)] p-3">
          <p className="text-[12px] font-semibold text-[var(--color-text)]">🧾 IVA + IRPF</p>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
            Distintos tipos por línea
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--color-surface-alt)] p-3">
          <p className="text-[12px] font-semibold text-[var(--color-text)]">📄 PDF profesional</p>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
            Listo para enviar al cliente
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
        {canWrite && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onNew}>
            Crear primera factura
          </Button>
        )}
        <a
          href="/ayuda?a=que-es-factura"
          className="text-[12.5px] font-semibold text-[var(--color-blue)] hover:underline"
        >
          Qué tiene que llevar una factura legal
        </a>
      </div>
    </Card>
  );
}
