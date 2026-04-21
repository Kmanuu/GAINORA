// ============================================================================
// RegisterPage.tsx — Registro de nueva empresa + propietario
// ============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Building2, User, Mail, Lock, Hash, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAuth }   from '@/context/AuthContext';
import { useToast }  from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';

interface FormState {
  tenantName: string;
  tenantSlug: string;
  fullName:   string;
  email:      string;
  password:   string;
  confirm:    string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function RegisterPage() {
  const navigate     = useNavigate();
  const { register } = useAuth();
  const { toast }    = useToast();

  const [form, setForm] = useState<FormState>({
    tenantName: '',
    tenantSlug: '',
    fullName:   '',
    email:      '',
    password:   '',
    confirm:    '',
  });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [errors,    setErrors]    = useState<FieldErrors>({});

  // Auto-generar slug al escribir el nombre de la empresa
  function handleTenantName(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      tenantName: name,
      tenantSlug: slugify(name),
    }));
    clearError('tenantName');
    clearError('tenantSlug');
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      clearError(field);
      if (apiError) setApiError('');
    };
  }

  function clearError(field: keyof FormState) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!form.tenantName.trim()) errs.tenantName = 'Nombre de empresa requerido';
    if (!form.tenantSlug.trim()) errs.tenantSlug = 'Identificador requerido';
    if (!form.fullName.trim())   errs.fullName   = 'Nombre requerido';
    if (!form.email.includes('@')) errs.email    = 'Email no válido';
    if (form.password.length < 8)  errs.password = 'Mínimo 8 caracteres';
    if (form.password !== form.confirm) errs.confirm = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await register({
        tenantName: form.tenantName,
        tenantSlug: form.tenantSlug,
        fullName:   form.fullName,
        email:      form.email,
        password:   form.password,
      });
      toast('success', 'Cuenta creada correctamente. Bienvenido a HorasPRO.');
      navigate('/dashboard');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12 relative">

      {/* Aurora background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full opacity-55 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.14) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(48,209,88,0.14) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-[440px] animate-scale-in" style={{ animationFillMode: 'both' }}>
        <div
          className="rounded-[24px] border"
          style={{
            background:  'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow:   'var(--shadow-floating, 0 8px 40px rgba(0,0,0,0.10))',
          }}
        >
          <div className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-7">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(180deg, #0A84FF 0%, #0060C0 100%)',
                  boxShadow:  '0 8px 24px rgba(10,132,255,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                <Zap className="w-7 h-7 text-white" strokeWidth={2.5} fill="white" />
              </div>
              <h1 className="text-[24px] font-semibold text-[var(--color-text)] tracking-[-0.02em]">Crear cuenta</h1>
              <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">Configura tu empresa en HorasPRO</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">

              {/* Sección empresa */}
              <SectionDivider label="Tu empresa" icon={Building2} />

              <Input
                label="Nombre de la empresa"
                type="text"
                value={form.tenantName}
                onChange={handleTenantName}
                error={errors.tenantName}
                autoComplete="organization"
              />
              <Input
                label="Identificador (slug)"
                type="text"
                value={form.tenantSlug}
                onChange={handleChange('tenantSlug')}
                error={errors.tenantSlug}
                hint="Solo letras, números y guiones. Ej: mi-agencia"
                icon={<Hash className="w-4 h-4" strokeWidth={1.8} />}
                spellCheck={false}
              />

              {/* Sección usuario */}
              <div className="pt-2">
                <SectionDivider label="Tu cuenta" icon={User} />
              </div>

              <Input
                label="Nombre completo"
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                error={errors.fullName}
                autoComplete="name"
                icon={<User className="w-4 h-4" strokeWidth={1.8} />}
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                icon={<Mail className="w-4 h-4" strokeWidth={1.8} />}
              />
              <Input
                label="Contraseña"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                error={errors.password}
                autoComplete="new-password"
                icon={
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    className="flex items-center"
                  >
                    {showPass
                      ? <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                      : <Eye    className="w-4 h-4" strokeWidth={1.8} />
                    }
                  </button>
                }
              />
              {form.password.length > 0 && <PasswordStrength password={form.password} />}

              <Input
                label="Confirmar contraseña"
                type={showPass ? 'text' : 'password'}
                value={form.confirm}
                onChange={handleChange('confirm')}
                error={errors.confirm}
                autoComplete="new-password"
                icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
              />

              {apiError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] border"
                  style={{
                    background:  'var(--color-red-subtle)',
                    borderColor: 'rgba(255,69,58,0.18)',
                  }}
                  role="alert"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] shrink-0" />
                  <p className="text-[13px] text-[var(--color-red)]">{apiError}</p>
                </div>
              )}

              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth glow>
                  Crear empresa
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-[13px] text-[var(--color-text-secondary)]">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-[var(--color-blue)] font-semibold hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-[12px] text-[var(--color-text-tertiary)] relative">HorasPRO © {new Date().getFullYear()}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: divisor de sección
// ---------------------------------------------------------------------------

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula',     ok: /[A-Z]/.test(password) },
    { label: 'Número',        ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const barColors = ['var(--color-red)', 'var(--color-orange)', 'var(--color-green)'];

  return (
    <div className="px-1 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < strength ? barColors[strength - 1] : 'var(--color-border)' }}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={clsx(
              'flex items-center gap-1 text-[10px] font-medium transition-colors',
              c.ok ? 'text-[var(--color-green)]' : 'text-[var(--color-text-tertiary)]',
            )}
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionDivider({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Icon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" strokeWidth={1.8} />
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  );
}
