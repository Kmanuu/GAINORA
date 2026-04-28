// ============================================================================
// AdminPage.tsx — Panel SUPERADMIN: visión global del SaaS
// ============================================================================
// Sólo accesible si user.role === 'SUPERADMIN'. Lista todos los tenants con
// sus stats (clientes, contratos, facturas emitidas, ingresos totales).
// Drill-down al detalle de cada tenant.
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Building2, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtCurrency } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

interface TenantSummary {
  id:               string;
  name:             string;
  slug:             string;
  taxId:            string | null;
  plan:             string;
  createdAt:        string;
  users:            number;
  clients:          number;
  projects:         number;
  contracts:        number;
  invoicesIssued:   number;
  totalGrossIssued: number;
  fixedCostsActive: number;
  hasDemo:          boolean;
}

interface AdminTotals {
  tenants:        number;
  users:          number;
  clients:        number;
  contracts:      number;
  invoicesIssued: number;
  totalGross:     number;
}

export default function AdminPage() {
  const { user }    = useAuth();
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [totals,  setTotals]  = useState<AdminTotals | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      navigate('/dashboard', { replace: true });
      return;
    }
    api.get<{ tenants: TenantSummary[]; totals: AdminTotals }>('/v1/admin/tenants')
      .then((r) => { setTenants(r.tenants); setTotals(r.totals); })
      .catch((e: Error) => { setError(e.message); toast('error', e.message); });
  }, [user, navigate, toast]);

  if (user?.role !== 'SUPERADMIN') return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
      <header className="mb-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-purple-subtle)] text-[var(--color-purple)] text-[10.5px] font-semibold uppercase tracking-[0.06em]">
            <Shield className="w-3 h-3" strokeWidth={2.4} />
            Superadmin
          </span>
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-[var(--color-text)]">Panel del SaaS</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
          Vista global de todos los tenants. Sólo lectura.
        </p>
      </header>

      {error && (
        <Card padding="md" className="bg-[var(--color-red-subtle)] border-[rgba(255,69,58,0.18)] flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-[var(--color-red)]" />
          <span className="text-[13px] text-[var(--color-red)]">{error}</span>
        </Card>
      )}

      {/* KPIs globales */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <KpiBox icon={<Building2 className="w-4 h-4" />} label="Tenants"        value={String(totals.tenants)} />
          <KpiBox icon={<Users      className="w-4 h-4" />} label="Usuarios"       value={String(totals.users)} />
          <KpiBox icon={<FileText   className="w-4 h-4" />} label="Facturas emit." value={String(totals.invoicesIssued)} />
          <KpiBox icon={<TrendingUp className="w-4 h-4" />} label="Facturado total" value={fmtCurrency(totals.totalGross, 0)} />
        </div>
      )}

      {/* Lista de tenants */}
      {tenants === null ? (
        <Card padding="md"><div className="skeleton h-32 rounded-[12px]" /></Card>
      ) : tenants.length === 0 ? (
        <Card padding="md" className="text-center text-[var(--color-text-secondary)] py-10">
          Sin tenants registrados todavía.
        </Card>
      ) : (
        <div className="space-y-2">
          {tenants.map((t) => (
            <TenantRow key={t.id} tenant={t} />
          ))}
        </div>
      )}

      <p className="mt-6 text-[11.5px] text-[var(--color-text-tertiary)] italic">
        Este panel sólo es visible para usuarios con rol SUPERADMIN. No permite editar datos de otros tenants — sólo lectura para soporte y operaciones del SaaS.
      </p>
    </div>
  );
}

function KpiBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card padding="md" className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-[10px] bg-[var(--color-blue-subtle)] text-[var(--color-blue)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] font-semibold">
          {label}
        </p>
        <p className="text-[18px] font-semibold text-[var(--color-text)] tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </Card>
  );
}

function TenantRow({ tenant }: { tenant: TenantSummary }) {
  return (
    <Link
      to={`/admin/tenant/${tenant.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] rounded-[12px]"
    >
      <Card padding="md" className="hover:border-[var(--color-border-strong)] transition-colors">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold text-[var(--color-text)] truncate">
                {tenant.name}
              </h3>
              <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                {tenant.slug}
              </span>
              {tenant.hasDemo && (
                <span className="px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em] bg-[var(--color-purple-subtle)] text-[var(--color-purple)]">
                  demo
                </span>
              )}
              <span className="px-1.5 py-[1px] rounded-full text-[10px] font-semibold uppercase tracking-[0.04em] bg-[rgba(0,0,0,0.04)] text-[var(--color-text-secondary)]">
                {tenant.plan}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
              NIF {tenant.taxId ?? '—'} · creado {new Date(tenant.createdAt).toLocaleDateString('es-ES')}
            </p>
          </div>
          <div className="flex items-baseline gap-4 text-[12px] text-[var(--color-text-secondary)] tabular-nums shrink-0">
            <Stat n={tenant.users}          label="users" />
            <Stat n={tenant.clients}        label="clientes" />
            <Stat n={tenant.contracts}      label="contratos" />
            <Stat n={tenant.invoicesIssued} label="facturas" />
            <span className="text-[14px] font-semibold text-[var(--color-text)]">
              {fmtCurrency(tenant.totalGrossIssued, 0)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="hidden sm:inline-flex items-baseline gap-0.5">
      <span className="text-[14px] font-semibold text-[var(--color-text)]">{n}</span>
      <span className="text-[10.5px] text-[var(--color-text-tertiary)]">{label}</span>
    </span>
  );
}
