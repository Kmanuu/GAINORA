// ============================================================================
// DashboardPage.tsx — Panel principal de rentabilidad (diseño Apple responsive)
// ============================================================================

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Receipt,
  AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react';
import { api }     from '@/lib/api';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import type { DashboardData, ApiResponse, ProjectMetrics } from '@/types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function profitColor(pct: number): { badge: 'green' | 'orange' | 'red'; hex: string; bg: string } {
  if (pct >= 20) return { badge: 'green',  hex: '#30D158', bg: 'rgba(48,209,88,0.10)'  };
  if (pct >= 10) return { badge: 'orange', hex: '#FF9F0A', bg: 'rgba(255,159,10,0.10)' };
  return          { badge: 'red',    hex: '#FF453A', bg: 'rgba(255,69,58,0.10)'  };
}

function profitLabel(pct: number) {
  if (pct >= 20) return 'Rentable';
  if (pct >= 10) return 'Ajustado';
  return 'En riesgo';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user }  = useAuth();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .get<ApiResponse<DashboardData>>('/v1/dashboard')
      .then((res) => setData(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="w-12 h-12 rounded-full bg-[rgba(255,69,58,0.10)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[#FF453A]" strokeWidth={1.8} />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-[#1D1D1F]">Error al cargar datos</p>
          <p className="text-[13px] text-[#6E6E73] mt-1">{error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { business, projects, summary } = data;
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">

      {/* ——— Cabecera ——— */}
      <header className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <p className="text-[13px] text-[#6E6E73] font-medium mb-0.5">
            {greeting()}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F] leading-tight">
            Dashboard
          </h1>
          <p className="text-[12px] text-[#86868B] mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-[10px] text-[#6E6E73] hover:bg-[rgba(0,0,0,0.05)] transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </header>

      {/* ——— KPI Cards (2 columnas en móvil, 4 en desktop) ——— */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <KpiCard
          delay={0}
          label="Tarifa mínima"
          value={`${fmt(business.minimumRate)} €/h`}
          subLabel="Para cubrir costes"
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="#0A84FF"
          accentBg="rgba(10,132,255,0.08)"
        />
        <KpiCard
          delay={60}
          label="Coste/hora real"
          value={`${fmt(business.realHourlyCost)} €/h`}
          subLabel="Tu coste por hora"
          icon={<TrendingDown className="w-5 h-5" />}
          accentColor="#FF9F0A"
          accentBg="rgba(255,159,10,0.08)"
        />
        <KpiCard
          delay={120}
          label="Costes fijos/mes"
          value={`${fmt(summary.totalFixedCostsMonthly)} €`}
          subLabel="Gastos recurrentes"
          icon={<Receipt className="w-5 h-5" />}
          accentColor="#FF453A"
          accentBg="rgba(255,69,58,0.08)"
        />
        <KpiCard
          delay={180}
          label="Horas facturables"
          value={`${fmt(summary.totalBillableHours, 1)} h`}
          subLabel={`${summary.activeProjectCount} proyectos activos`}
          icon={<Clock className="w-5 h-5" />}
          accentColor="#30D158"
          accentBg="rgba(48,209,88,0.08)"
        />
      </section>

      {/* ——— Proyectos ——— */}
      {projects.length > 0 ? (
        <section className="animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#1D1D1F]">
              Proyectos activos
            </h2>
            <Badge variant="blue" dot>
              {`${summary.activeProjectCount} activo${summary.activeProjectCount !== 1 ? 's' : ''}`}
            </Badge>
          </div>

          {/* Desktop: tabla */}
          <div className="hidden lg:block">
            <Card padding="none" className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    {['Proyecto','Ingresos','Coste directo','Coste indirecto','Margen neto','Rentabilidad'].map((h) => (
                      <th key={h} className={`py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868B] ${h === 'Proyecto' ? 'text-left px-5' : 'text-right px-5'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => <ProjectTableRow key={p.id} project={p} index={i} />)}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Móvil/tablet: cards apiladas */}
          <div className="lg:hidden space-y-3">
            {projects.map((p, i) => <ProjectMobileCard key={p.id} project={p} index={i} />)}
          </div>
        </section>
      ) : (
        <EmptyProjects />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card — responsive
// ---------------------------------------------------------------------------

function KpiCard({
  label, value, subLabel, icon, accentColor, accentBg, delay,
}: {
  label: string; value: string; subLabel: string;
  icon: React.ReactNode; accentColor: string; accentBg: string; delay: number;
}) {
  return (
    <Card
      padding="none"
      className="animate-fade-up p-4 lg:p-5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' } as React.CSSProperties}
    >
      <div
        className="w-8 h-8 lg:w-9 lg:h-9 rounded-[9px] lg:rounded-[10px] flex items-center justify-center mb-3"
        style={{ background: accentBg, color: accentColor }}
      >
        {icon}
      </div>
      <p className="text-[20px] sm:text-[22px] lg:text-[24px] font-semibold text-[#1D1D1F] leading-tight tabular-nums">
        {value}
      </p>
      <p className="text-[12px] lg:text-[12px] font-medium text-[#1D1D1F] mt-1 leading-tight">{label}</p>
      <p className="text-[11px] text-[#86868B] mt-0.5 leading-tight">{subLabel}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Project row — Desktop table
// ---------------------------------------------------------------------------

function ProjectTableRow({ project, index }: { project: ProjectMetrics; index: number }) {
  const { hex, badge } = profitColor(project.profitabilityPct);
  const pct = Math.min(100, Math.max(0, project.profitabilityPct));

  return (
    <tr className={clsx(
      'border-b border-[rgba(0,0,0,0.04)] last:border-0',
      'hover:bg-[rgba(0,0,0,0.015)] transition-colors',
      index % 2 === 1 && 'bg-[rgba(0,0,0,0.012)]',
    )}>
      <td className="px-5 py-4">
        <p className="text-[13.5px] font-medium text-[#1D1D1F]">{project.name}</p>
        {project.clientName && <p className="text-[11px] text-[#86868B] mt-0.5">{project.clientName}</p>}
      </td>
      <td className="px-5 py-4 text-right text-[13px] text-[#3A3A3C] tabular-nums">{fmt(project.revenue)} €</td>
      <td className="px-5 py-4 text-right text-[13px] text-[#3A3A3C] tabular-nums">{fmt(project.directCost)} €</td>
      <td className="px-5 py-4 text-right text-[13px] text-[#3A3A3C] tabular-nums">{fmt(project.indirectCost)} €</td>
      <td className="px-5 py-4 text-right">
        <span className={clsx('text-[13px] font-semibold tabular-nums', project.netMargin >= 0 ? 'text-[#25A244]' : 'text-[#D93025]')}>
          {project.netMargin >= 0 ? '+' : ''}{fmt(project.netMargin)} €
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: hex }}>
              {fmt(project.profitabilityPct, 1)}%
            </span>
            <Badge variant={badge} dot>{profitLabel(project.profitabilityPct)}</Badge>
          </div>
          <div className="w-[80px] h-1.5 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: hex }} />
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Project card — Móvil (el que de verdad vende la sensación)
// ---------------------------------------------------------------------------

function ProjectMobileCard({ project, index }: { project: ProjectMetrics; index: number }) {
  const { hex, badge, bg } = profitColor(project.profitabilityPct);
  const pct = Math.min(100, Math.max(0, project.profitabilityPct));

  return (
    <div
      className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] overflow-hidden animate-fade-up"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.03)',
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Barra de color superior según rentabilidad */}
      <div className="h-1" style={{ background: hex }} />

      <div className="p-4">
        {/* Nombre + badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[15px] font-semibold text-[#1D1D1F] leading-tight">{project.name}</p>
            {project.clientName && (
              <p className="text-[12px] text-[#86868B] mt-0.5">{project.clientName}</p>
            )}
          </div>
          <Badge variant={badge} dot>{profitLabel(project.profitabilityPct)}</Badge>
        </div>

        {/* BIG NUMBER — la rentabilidad, protagonista en móvil */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-[0.05em] mb-0.5">
              Rentabilidad
            </p>
            <p className="text-[36px] font-bold tabular-nums leading-none" style={{ color: hex }}>
              {fmt(project.profitabilityPct, 1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-[0.05em] mb-0.5">
              Margen neto
            </p>
            <p className={clsx('text-[20px] font-semibold tabular-nums', project.netMargin >= 0 ? 'text-[#25A244]' : 'text-[#D93025]')}>
              {project.netMargin >= 0 ? '+' : ''}{fmt(project.netMargin, 0)} €
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: bg }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: hex }}
          />
        </div>

        {/* Fila ingresos / costes */}
        <div className="flex justify-between text-[12px] border-t border-[rgba(0,0,0,0.05)] pt-3">
          <div>
            <p className="text-[#86868B]">Ingresos</p>
            <p className="font-semibold text-[#1D1D1F] tabular-nums">{fmt(project.revenue, 0)} €</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC] self-center" strokeWidth={1.5} />
          <div>
            <p className="text-[#86868B]">Coste directo</p>
            <p className="font-semibold text-[#1D1D1F] tabular-nums">{fmt(project.directCost, 0)} €</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC] self-center" strokeWidth={1.5} />
          <div className="text-right">
            <p className="text-[#86868B]">Indirecto</p>
            <p className="font-semibold text-[#1D1D1F] tabular-nums">{fmt(project.indirectCost, 0)} €</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyProjects() {
  return (
    <Card padding="lg" className="flex flex-col items-center py-12 text-center animate-fade-up">
      <div className="w-14 h-14 rounded-full bg-[rgba(10,132,255,0.08)] flex items-center justify-center mb-4">
        <TrendingUp className="w-6 h-6 text-[#0A84FF]" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-semibold text-[#1D1D1F]">Sin proyectos activos</p>
      <p className="text-[14px] text-[#6E6E73] mt-1 max-w-[280px]">
        Crea tu primer proyecto para ver la rentabilidad en tiempo real.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-7 w-44 mb-1" />
        <div className="skeleton h-3 w-36 hidden sm:block" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {[0,1,2,3].map((i) => (
          <div key={i} className="bg-white rounded-[16px] p-4 lg:p-5 border border-[rgba(0,0,0,0.06)]">
            <div className="skeleton w-8 h-8 rounded-[9px] mb-3" />
            <div className="skeleton h-6 w-24 mb-1" />
            <div className="skeleton h-3 w-20 mb-0.5" />
            <div className="skeleton h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="skeleton h-12 w-40 mb-3" />
      <div className="space-y-3">
        {[0,1,2].map((i) => <div key={i} className="skeleton h-32 lg:h-16 rounded-[16px]" />)}
      </div>
    </div>
  );
}
