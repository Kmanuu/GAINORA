// ============================================================================
// ClientsPage.tsx — CRUD de clientes (la cartera del tenant)
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, AlertCircle, RefreshCw, MoreHorizontal,
  Pencil, Trash2, Search, FileText, Mail, Phone, FileBadge,
} from 'lucide-react';
import clsx from 'clsx';
import { api }     from '@/lib/api';
import type { Client } from '@/types';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import Modal       from '@/components/ui/Modal';
import Input       from '@/components/ui/Input';
import Textarea    from '@/components/ui/Textarea';
import EmptyState  from '@/components/ui/EmptyState';
import Select      from '@/components/ui/Select';
import Toggle      from '@/components/ui/Toggle';
import DemoBadge   from '@/components/ui/DemoBadge';
import { useToast }    from '@/components/ui/Toast';
import { useConfirm }  from '@/components/ui/ConfirmDialog';

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

interface ClientFormState {
  name:         string;
  taxId:        string;
  email:        string;
  phone:        string;
  notes:        string;
  taxRegime:    'NATIONAL' | 'EU_INTRA' | 'NON_EU';
  hasSurcharge: boolean;
}

const EMPTY_FORM: ClientFormState = {
  name: '', taxId: '', email: '', phone: '', notes: '',
  taxRegime: 'NATIONAL', hasSurcharge: false,
};

function clientToForm(c: Client): ClientFormState {
  return {
    name:         c.name,
    taxId:        c.taxId ?? '',
    email:        c.email ?? '',
    phone:        c.phone ?? '',
    notes:        c.notes ?? '',
    taxRegime:    c.taxRegime ?? 'NATIONAL',
    hasSurcharge: c.hasSurcharge ?? false,
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ClientsPage() {
  const { toast }   = useToast();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [form,       setForm]       = useState<ClientFormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get<Client[]>('/v1/clients')
      .then(setClients)
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

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditTarget(c);
    setForm(clientToForm(c));
    setFormError('');
    setModalOpen(true);
    setMenuOpen(null);
  }

  function handleField<K extends keyof ClientFormState>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    };
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('El nombre del cliente es obligatorio'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:         form.name.trim(),
        taxId:        form.taxId.trim() || null,
        email:        form.email.trim() || null,
        phone:        form.phone.trim() || null,
        notes:        form.notes.trim() || null,
        taxRegime:    form.taxRegime,
        hasSurcharge: form.taxRegime === 'NATIONAL' ? form.hasSurcharge : false,
      };
      if (editTarget) {
        await api.patch<Client>(`/v1/clients/${editTarget.id}`, payload);
        toast('success', 'Cliente actualizado');
      } else {
        await api.post<Client>('/v1/clients', payload);
        toast('success', 'Cliente creado');
      }
      setModalOpen(false);
      load(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Client) {
    const contracts = c._count?.contracts ?? 0;
    if (contracts > 0) {
      toast('error', `No se puede eliminar: tiene ${contracts} contrato${contracts !== 1 ? 's' : ''} asociado${contracts !== 1 ? 's' : ''}`);
      return;
    }
    const ok = await confirm({
      title:       'Eliminar cliente',
      message:     `Se eliminará "${c.name}" definitivamente.`,
      confirmText: 'Eliminar',
      variant:     'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/v1/clients/${c.id}`);
      toast('success', 'Cliente eliminado');
      load(true);
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  const visible = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.taxId?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-36 rounded-[16px]" />)}
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
        <p className="text-[16px] font-semibold text-[var(--color-text)]">Error al cargar clientes</p>
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
          <h1 className="text-[28px] font-semibold text-[var(--color-text)] tracking-tight">Clientes</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} en cartera
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" strokeWidth={2.4} />} onClick={openCreate}>
          Nuevo cliente
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 animate-fade-up stagger-1">
        <div className="relative sm:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, NIF..."
            className="w-full h-10 pl-9 pr-3 text-[13.5px] text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border-medium)] rounded-[11px] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-blue)] focus:ring-[3px] focus:ring-[rgba(10,132,255,0.20)] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        clients.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7 text-[var(--color-blue)]" strokeWidth={1.6} />}
            title="Sin clientes"
            description="Añade tu primer cliente para empezar a crear contratos y suscripciones."
            actionLabel="Nuevo cliente"
            actionIcon={<Plus className="w-4 h-4" />}
            onAction={openCreate}
          />
        ) : (
          <Card padding="lg" className="text-center py-10">
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              No hay clientes que coincidan con "{search}"
            </p>
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((c, i) => (
            <ClientCard
              key={c.id}
              client={c}
              index={i}
              menuOpen={menuOpen === c.id}
              onMenuToggle={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar cliente' : 'Nuevo cliente'}
        subtitle={editTarget ? editTarget.name : 'Añade un cliente a tu cartera'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTarget ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="Nombre *"  type="text"  value={form.name}  onChange={handleField('name')} />
          <Input label="NIF / CIF" type="text"  value={form.taxId} onChange={handleField('taxId')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Email"   type="email" value={form.email} onChange={handleField('email')} />
            <Input label="Teléfono" type="tel"  value={form.phone} onChange={handleField('phone')} />
          </div>
          <Textarea label="Notas" value={form.notes} onChange={handleField('notes')} placeholder="Información adicional..." />

          <Select
            label="Régimen fiscal"
            value={form.taxRegime}
            onChange={(e) => setForm((p) => ({ ...p, taxRegime: e.target.value as ClientFormState['taxRegime'] }))}
            options={[
              { value: 'NATIONAL', label: 'Nacional (España) — IVA estándar' },
              { value: 'EU_INTRA', label: 'Intracomunitario (UE) — IVA 0% art. 25 LIVA' },
              { value: 'NON_EU',   label: 'Tercer país — Exportación de servicios' },
            ]}
            hint={
              form.taxRegime === 'NATIONAL'
                ? 'Aplicará el IVA según el tipo de cada línea (21%, 10%, 4%, 0%).'
                : form.taxRegime === 'EU_INTRA'
                ? 'Sus facturas saldrán con IVA 0% y nota legal "Operación intracomunitaria exenta art. 25 LIVA".'
                : 'Sus facturas saldrán con IVA 0% y nota legal de exportación de servicios.'
            }
          />

          {form.taxRegime === 'NATIONAL' && (
            <div className="flex items-start gap-3 px-1 pt-1">
              <Toggle
                checked={form.hasSurcharge}
                onChange={(v) => setForm((p) => ({ ...p, hasSurcharge: v }))}
              />
              <div>
                <p className="text-[13.5px] text-[var(--color-text)]">Recargo de equivalencia</p>
                <p className="text-[11.5px] text-[var(--color-text-tertiary)] leading-snug">
                  Cliente comerciante minorista. Sus facturas llevarán recargo: 5,2% sobre IVA 21%, 1,4% sobre 10%, 0,5% sobre 4%.
                </p>
              </div>
            </div>
          )}

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
// ClientCard
// ---------------------------------------------------------------------------

function ClientCard({
  client, index, menuOpen, onMenuToggle, onEdit, onDelete,
}: {
  client:       Client;
  index:        number;
  menuOpen:     boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onEdit:       () => void;
  onDelete:     () => void;
}) {
  const contracts = client._count?.contracts ?? 0;

  return (
    <Card
      padding="md"
      className="animate-fade-up relative"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 text-[14px] font-semibold"
            style={{ background: 'var(--color-blue-subtle)', color: 'var(--color-blue)' }}
          >
            {client.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15.5px] font-semibold text-[var(--color-text)] leading-tight tracking-tight truncate flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{client.name}</span>
              <DemoBadge show={client.isDemo} />
              {client.taxRegime === 'EU_INTRA' && (
                <span className="px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em] bg-[var(--color-blue-subtle)] text-[var(--color-blue)]">UE</span>
              )}
              {client.taxRegime === 'NON_EU' && (
                <span className="px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em] bg-[var(--color-orange-subtle)] text-[var(--color-orange)]">Export</span>
              )}
              {client.hasSurcharge && (
                <span className="px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em] bg-[rgba(0,0,0,0.06)] text-[var(--color-text-secondary)]">RE</span>
              )}
            </h3>
            {client.taxId && (
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5 flex items-center gap-1 tabular-nums">
                <FileBadge className="w-3 h-3" strokeWidth={2} />
                {client.taxId}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 w-40 bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-border-medium)] py-1.5"
              style={{ boxShadow: 'var(--shadow-floating)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Editar"  onClick={onEdit} />
              <MenuBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Eliminar" onClick={onDelete} danger />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 text-[12.5px] text-[var(--color-text-secondary)] mb-3">
        {client.email && (
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.8} />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.8} />
            <span className="tabular-nums">{client.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[12px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-3">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" strokeWidth={2} />
          {contracts} contrato{contracts !== 1 ? 's' : ''}
        </span>
      </div>
    </Card>
  );
}

function MenuBtn({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] transition-colors duration-100',
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
