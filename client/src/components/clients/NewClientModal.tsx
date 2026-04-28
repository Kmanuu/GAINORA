import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import Modal  from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

/**
 * Modal de creación rápida de Cliente desde otros formularios (Project, Contract).
 * Devuelve el Client creado vía onCreated; el componente padre decide qué hacer
 * (ej. seleccionarlo automáticamente en su Select).
 */
export default function NewClientModal({
  open, onClose, onCreated,
}: {
  open:      boolean;
  onClose:   () => void;
  onCreated: (c: Client) => void;
}) {
  const { toast } = useToast();
  const [name,   setName]   = useState('');
  const [taxId,  setTaxId]  = useState('');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  useEffect(() => {
    if (open) { setName(''); setTaxId(''); setErr(''); }
  }, [open]);

  async function submit() {
    if (!name.trim()) { setErr('El nombre es obligatorio'); return; }
    setSaving(true);
    setErr('');
    try {
      const created = await api.post<Client>('/v1/clients', {
        name:  name.trim(),
        taxId: taxId.trim() || null,
      });
      toast('success', 'Cliente creado');
      onCreated(created);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo cliente"
      subtitle="Datos básicos. Podrás completarlo desde la sección Clientes."
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Crear cliente</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label="Nombre *"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(''); }}
        />
        <Input
          label="NIF / CIF"
          type="text"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          hint="Opcional. Necesario para facturación legal."
        />
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
