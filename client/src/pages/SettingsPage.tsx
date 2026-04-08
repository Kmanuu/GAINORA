// ============================================================================
// SettingsPage.tsx — Ajustes + Guía de uso interactiva estilo Apple
// ============================================================================

import { useEffect, useState, type FormEvent } from 'react';
import {
  User, Lock, Building2, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { api }      from '@/lib/api';
import { useAuth }  from '@/context/AuthContext';
import Card         from '@/components/ui/Card';
import Input        from '@/components/ui/Input';
import Button       from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface MeResponse {
  user: {
    id: string; email: string; fullName: string; role: string;
    hourlyCost: string | number; isActive: boolean; createdAt: string;
  };
  tenant: { id: string; name: string; slug: string; plan: string; };
}

type ToastState = { type: 'success' | 'error'; message: string } | null;

// ---------------------------------------------------------------------------
// Datos de la guía
// ---------------------------------------------------------------------------

interface GuideStep {
  emoji:    string;
  title:    string;
  badge?:   { text: string; color: string };
  summary:  string;
  detail:   string;
  tip?:     string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    emoji:   '🚀',
    title:   'Empieza por los costes fijos',
    badge:   { text: 'Fundamental', color: '#FF453A' },
    summary: 'Sin esto, los números del dashboard son bonitos pero mentira.',
    detail:  'Ve a "Costes fijos" y añade todo lo que pagas siempre: el alquiler de la oficina, las licencias de software, los sueldos, la gestoría... Mensual, trimestral o anual — HorasPRO lo normaliza solo.\n\nCuando termines, el dashboard ya tendrá datos reales para calcular cuánto te cuesta realmente cada hora trabajada.',
    tip:     'Si no sabes exactamente cuánto es, pon una aproximación. Siempre es mejor que nada.',
  },
  {
    emoji:   '📁',
    title:   'Un proyecto por cliente',
    summary: 'Crea una carpeta digital para cada trabajo que hagas.',
    detail:  'Cada proyecto tiene un nombre, un cliente y — lo más importante — el presupuesto que le has cobrado.\n\nCon eso, HorasPRO puede comparar lo que te llevas con lo que te cuesta hacerlo. Eso es la rentabilidad.',
    tip:     'El estado del proyecto importa: solo los "Activos" cuentan en el dashboard del mes.',
  },
  {
    emoji:   '⏱️',
    title:   'Ficha tus horas. Las de verdad.',
    summary: 'Cada minuto que trabajas tiene un coste. Si no lo mides, no lo puedes controlar.',
    detail:  'En la sección "Horas" tienes un timer. Dale al play cuando empieces un proyecto, al stop cuando pares. Así de simple.\n\nSi te olvidaste de fichar, también puedes añadir horas manualmente con fecha y hora exactas.',
    tip:     '¿Tienes equipo? Cada persona puede fichar con su propio coste/hora. El cálculo se ajusta automáticamente.',
  },
  {
    emoji:   '🚦',
    title:   'Lee el semáforo de rentabilidad',
    summary: '3 colores, 1 mensaje inmediato sobre cada proyecto.',
    detail:  '🟢  Verde (más del 20%) — Vas bien. Sigue así.\n🟡  Naranja (entre 10% y 20%) — Ajustado. Ojo con los imprevistos.\n🔴  Rojo (menos del 10%) — Estás perdiendo margen. Hora de revisar precios o de ser más eficiente.\n\nLo verás en el dashboard y en cada proyecto. Nada que interpretar, todo a golpe de vista.',
  },
  {
    emoji:   '💡',
    title:   'La tarifa mínima: lo que nadie te dice',
    badge:   { text: 'Pro', color: '#0A84FF' },
    summary: '¿Cuánto tienes que cobrar la hora para no perder dinero? Ya no tienes que adivinar.',
    detail:  'En el dashboard verás el número "Tarifa mínima". Ese es el precio por hora que necesitas cobrar para cubrir todos tus costes y tener un 30% de margen.\n\nSi cobras menos, trabajas gratis. Si cobras más, ganas dinero de verdad.\n\nEste número cambia según tus costes y las horas que trabajas cada mes. Cuantas más horas facturables, más baja la tarifa.',
    tip:     'Guárdalo en la cabeza. La próxima vez que hagas un presupuesto, úsalo como punto de partida.',
  },
  {
    emoji:   '🧾',
    title:   'Costes variables: los gastos del trabajo',
    summary: 'Subcontrataste a alguien, compraste material, hiciste un viaje...',
    detail:  'Los costes variables son gastos concretos de un proyecto específico. No se pagan siempre (eso serían los fijos), sino cuando se necesitan.\n\nAsócialos al proyecto correspondiente y entrarán en el cálculo de rentabilidad de ese proyecto.',
  },
  {
    emoji:   '📊',
    title:   'Revísalo cada semana, no cada trimestre',
    summary: 'La diferencia entre saber y enterarte tarde.',
    detail:  'Tu gestor te dice cómo fue el año... en abril del año siguiente. HorasPRO te dice cómo va el mes ahora mismo.\n\nDedica 5 minutos cada lunes: revisa el dashboard, asegúrate de que las horas están fichadas, comprueba que ningún proyecto esté en rojo.\n\nEso es todo. Con eso tienes el pulso de tu negocio.',
    tip:     'Si un proyecto está en rojo y aún no has terminado, todavía puedes actuar: renegocia, reduce horas, o al menos aprende para el siguiente.',
  },
];

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function Toast({ state }: { state: ToastState }) {
  if (!state) return null;
  const ok = state.type === 'success';
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] ${
        ok
          ? 'bg-[rgba(48,209,88,0.08)] border-[rgba(48,209,88,0.20)] text-[#25A244]'
          : 'bg-[rgba(255,69,58,0.08)] border-[rgba(255,69,58,0.15)] text-[#D93025]'
      }`}
      role="alert"
    >
      {ok
        ? <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
        : <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
      }
      {state.message}
    </div>
  );
}

function SectionCard({
  icon, title, accentColor, accentBg, children,
}: {
  icon: React.ReactNode; title: string;
  accentColor: string; accentBg: string; children: React.ReactNode;
}) {
  return (
    <Card padding="md" className="animate-fade-up" style={{ animationFillMode: 'both' } as React.CSSProperties}>
      <div className="flex items-center gap-2.5 mb-4 pb-3.5 border-b border-[rgba(0,0,0,0.05)]">
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
          style={{ background: accentBg, color: accentColor }}>
          {icon}
        </div>
        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#86868B] uppercase tracking-[0.05em] mb-0.5">{label}</p>
      <div className="text-[14px] font-medium text-[#1D1D1F]">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guía de uso — accordeon interactivo
// ---------------------------------------------------------------------------

function GuideSection() {
  const [expanded, setExpanded] = useState<number | null>(null);

  function toggle(i: number) {
    setExpanded((prev) => (prev === i ? null : i));
  }

  return (
    <SectionCard
      icon={<span className="text-[14px]">📖</span>}
      title="Guía de uso"
      accentColor="#BF5AF2"
      accentBg="rgba(191,90,242,0.08)"
    >
      {/* Intro */}
      <p className="text-[13px] text-[#6E6E73] mb-4 leading-relaxed">
        7 pasos para sacarle todo el partido a HorasPRO. Sin tecnicismos, sin rollos.
      </p>

      <div className="space-y-2">
        {GUIDE_STEPS.map((step, i) => {
          const isOpen = expanded === i;
          return (
            <div
              key={i}
              className={`rounded-[12px] border overflow-hidden transition-all duration-200 ${
                isOpen
                  ? 'border-[rgba(10,132,255,0.20)] bg-[rgba(10,132,255,0.02)]'
                  : 'border-[rgba(0,0,0,0.06)] bg-white hover:border-[rgba(0,0,0,0.12)]'
              }`}
            >
              {/* Cabecera clickable */}
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                {/* Número + emoji */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isOpen ? 'bg-[#0A84FF] text-white' : 'bg-[rgba(0,0,0,0.06)] text-[#6E6E73]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[18px] leading-none">{step.emoji}</span>
                </div>

                {/* Título + badge + resumen */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-[#1D1D1F]">{step.title}</span>
                    {step.badge && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: `${step.badge.color}18`,
                          color: step.badge.color,
                        }}
                      >
                        {step.badge.text}
                      </span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">{step.summary}</p>
                  )}
                </div>

                {/* Chevron */}
                <div className={`shrink-0 text-[#86868B] transition-transform duration-200 ${isOpen ? 'rotate-0' : ''}`}>
                  {isOpen
                    ? <ChevronUp  className="w-4 h-4" strokeWidth={1.8} />
                    : <ChevronDown className="w-4 h-4" strokeWidth={1.8} />
                  }
                </div>
              </button>

              {/* Contenido expandido */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[rgba(10,132,255,0.10)]">
                  <p className="text-[13px] text-[#6E6E73] font-medium mt-3 mb-2">{step.summary}</p>
                  {step.detail.split('\n').map((line, li) => (
                    line.trim() === ''
                      ? <div key={li} className="h-2" />
                      : <p key={li} className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{line}</p>
                  ))}
                  {step.tip && (
                    <div className="mt-3 flex gap-2.5 bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.20)] rounded-[10px] px-3.5 py-2.5">
                      <span className="text-[14px] shrink-0 mt-0.5">💡</span>
                      <p className="text-[12.5px] text-[#8B6800] leading-relaxed">{step.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer motivacional */}
      <div className="mt-5 px-4 py-3.5 bg-[rgba(48,209,88,0.06)] border border-[rgba(48,209,88,0.16)] rounded-[12px] text-center">
        <p className="text-[13px] font-semibold text-[#1D1D1F] mb-0.5">
          ¿Ya lo tienes todo configurado? 🎉
        </p>
        <p className="text-[12px] text-[#6E6E73]">
          Ahora solo queda trabajar — y dejar que HorasPRO te diga si merece la pena.
        </p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Sección: Perfil
// ---------------------------------------------------------------------------

function ProfileSection({
  initialName, initialEmail, initialHourlyCost,
}: {
  initialName: string; initialEmail: string; initialHourlyCost: string;
}) {
  const [fullName,   setFullName]   = useState(initialName);
  const [hourlyCost, setHourlyCost] = useState(initialHourlyCost);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<ToastState>(null);

  useEffect(() => { setFullName(initialName); },        [initialName]);
  useEffect(() => { setHourlyCost(initialHourlyCost); }, [initialHourlyCost]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true); setToast(null);
    try {
      await api.patch('/v1/me', {
        fullName:   fullName.trim(),
        hourlyCost: parseFloat(hourlyCost) || 0,
      });
      setToast({ type: 'success', message: 'Perfil actualizado correctamente' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      icon={<User className="w-4 h-4" />}
      title="Perfil"
      accentColor="#30D158"
      accentBg="rgba(48,209,88,0.08)"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={initialEmail}
            disabled
            hint="El email no se puede cambiar"
          />
        </div>
        <Input
          label="Coste por hora (€/h)"
          type="number"
          value={hourlyCost}
          onChange={(e) => setHourlyCost(e.target.value)}
          min="0"
          hint="Se usa para calcular la rentabilidad de tus proyectos"
        />
        <Toast state={toast} />
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Sección: Contraseña
// ---------------------------------------------------------------------------

function PasswordSection() {
  const [form, setForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState<ToastState>(null);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function handleField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      setErrors((p) => ({ ...p, [field]: '' }));
      setToast(null);
    };
  }

  function validate() {
    const errs: Partial<typeof form> = {};
    if (!form.currentPassword)        errs.currentPassword = 'Introduce la contraseña actual';
    if (form.newPassword.length < 8)  errs.newPassword     = 'Mínimo 8 caracteres';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'No coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setToast(null);
    try {
      await api.patch('/v1/me/password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setToast({ type: 'success', message: 'Contraseña actualizada correctamente' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al cambiar contraseña' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      icon={<Lock className="w-4 h-4" />}
      title="Contraseña"
      accentColor="#FF9F0A"
      accentBg="rgba(255,159,10,0.08)"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Contraseña actual"
          type="password"
          value={form.currentPassword}
          onChange={handleField('currentPassword')}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nueva contraseña"
            type="password"
            value={form.newPassword}
            onChange={handleField('newPassword')}
            error={errors.newPassword}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={form.confirmPassword}
            onChange={handleField('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </div>
        <Toast state={toast} />
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { user: authUser, tenant: authTenant, logout } = useAuth();
  const [meData,  setMeData]  = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MeResponse>('/v1/me')
      .then(setMeData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[720px] mx-auto space-y-4">
        <div className="skeleton h-8 w-40 mb-2" />
        {[0,1,2].map((i) => <div key={i} className="skeleton h-48 rounded-[16px]" />)}
      </div>
    );
  }

  const displayName  = meData?.user.fullName  ?? authUser?.fullName  ?? '';
  const displayEmail = meData?.user.email     ?? authUser?.email     ?? '';
  const hourlyCost   = meData?.user.hourlyCost ?? 0;
  const tenantName   = meData?.tenant.name    ?? authTenant?.name    ?? '';
  const tenantSlug   = meData?.tenant.slug    ?? authTenant?.slug    ?? '';
  const tenantPlan   = meData?.tenant.plan    ?? 'STARTER';

  const PLAN_BADGE: Record<string, string> = {
    STARTER: 'bg-[rgba(0,0,0,0.06)] text-[#6E6E73]',
    GROWTH:  'bg-[rgba(10,132,255,0.10)] text-[#0A84FF]',
    EMPIRE:  'bg-[rgba(191,90,242,0.10)] text-[#9A33C7]',
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[720px] mx-auto">

      <header className="mb-6 animate-fade-up">
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F]">Ajustes</h1>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">Perfil, seguridad y guía de uso</p>
      </header>

      <div className="space-y-4">

        {/* Empresa */}
        <SectionCard
          icon={<Building2 className="w-4 h-4" />}
          title="Tu empresa"
          accentColor="#0A84FF"
          accentBg="rgba(10,132,255,0.08)"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Nombre"          value={tenantName} />
            <InfoRow label="Identificador"   value={tenantSlug} />
            <InfoRow
              label="Plan"
              value={
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_BADGE[tenantPlan] ?? PLAN_BADGE.STARTER}`}>
                  {tenantPlan}
                </span>
              }
            />
            <InfoRow label="Tu rol"          value={meData?.user.role ?? authUser?.role ?? '—'} />
          </div>
        </SectionCard>

        {/* Perfil */}
        <ProfileSection
          initialName={displayName}
          initialEmail={displayEmail}
          initialHourlyCost={String(typeof hourlyCost === 'string' ? parseFloat(hourlyCost) || 0 : hourlyCost)}
        />

        {/* Contraseña */}
        <PasswordSection />

        {/* Guía de uso */}
        <GuideSection />

        {/* Sesión */}
        <SectionCard
          icon={<User className="w-4 h-4" />}
          title="Sesión"
          accentColor="#FF453A"
          accentBg="rgba(255,69,58,0.08)"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1D1D1F]">Cerrar sesión</p>
              <p className="text-[12px] text-[#6E6E73] mt-0.5">
                Conectado como <span className="font-medium">{displayEmail}</span>
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
