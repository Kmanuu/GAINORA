// ============================================================================
// RegisterPage.tsx — Registro de nueva empresa + propietario estilo Gainora
// ============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Target, Building2, User, Mail, Lock, Hash, Check } from 'lucide-react';
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
      toast('success', 'Cuenta creada correctamente. Bienvenido a Gainora.');
      navigate('/dashboard');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A14] px-4 py-12 relative overflow-hidden font-['Inter',sans-serif]">

      {/* Aurora background - Consistent with Landing */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full opacity-30 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #0066FF 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] height-[400px] opacity-10 blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, #00D4FF 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-[460px] animate-fade-up" style={{ animationFillMode: 'both' }}>
        <div
          className="rounded-[32px] border border-white/10 backdrop-blur-[32px] overflow-hidden"
          style={{
            background: 'rgba(6, 11, 22, 0.85)',
            boxShadow:  '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent opacity-50" />

          <div className="px-10 pt-10 pb-10">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-5"
                style={{
                  background: 'linear-gradient(180deg, #00D4FF 0%, #0066FF 100%)',
                  boxShadow:  '0 10px 30px rgba(0, 212, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <Target className="w-8 h-8 text-[#050A14]" strokeWidth={2.5} />
              </div>
              <h1 className="text-[28px] font-black text-white tracking-[-0.03em]">Empezar gratis</h1>
              <p className="text-[14px] text-[#6B7280] mt-2 font-medium text-center">Configura tu espacio de trabajo en segundos</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Sección empresa */}
              <SectionDivider label="Tu empresa" icon={Building2} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  type="text"
                  value={form.tenantName}
                  onChange={handleTenantName}
                  error={errors.tenantName}
                  autoComplete="organization"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  label="Slug"
                  type="text"
                  value={form.tenantSlug}
                  onChange={handleChange('tenantSlug')}
                  error={errors.tenantSlug}
                  className="bg-white/5 border-white/10 text-white"
                  icon={<Hash className="w-4 h-4 text-[#4B5563]" strokeWidth={1.8} />}
                  spellCheck={false}
                />
              </div>

              {/* Sección usuario */}
              <div className="pt-2">
                <SectionDivider label="Tu cuenta de administrador" icon={User} />
              </div>

              <Input
                label="Nombre completo"
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                error={errors.fullName}
                autoComplete="name"
                className="bg-white/5 border-white/10 text-white"
                icon={<User className="w-4 h-4 text-[#4B5563]" strokeWidth={1.8} />}
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                className="bg-white/5 border-white/10 text-white"
                icon={<Mail className="w-4 h-4 text-[#4B5563]" strokeWidth={1.8} />}
              />
              <div className="space-y-3">
                <Input
                  label="Contraseña"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  error={errors.password}
                  autoComplete="new-password"
                  className="bg-white/5 border-white/10 text-white"
                  icon={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                      className="flex items-center text-[#4B5563] hover:text-white"
                    >
                      {showPass
                        ? <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} />
                        : <Eye    className="w-4.5 h-4.5" strokeWidth={1.8} />
                      }
                    </button>
                  }
                />
                {form.password.length > 0 && <PasswordStrength password={form.password} />}
              </div>

              <Input
                label="Confirmar contraseña"
                type={showPass ? 'text' : 'password'}
                value={form.confirm}
                onChange={handleChange('confirm')}
                error={errors.confirm}
                autoComplete="new-password"
                className="bg-white/5 border-white/10 text-white"
                icon={<Lock className="w-4 h-4 text-[#4B5563]" strokeWidth={1.8} />}
              />

              {apiError && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-500/10 border border-red-500/20"
                  role="alert"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[13.5px] text-red-400 font-medium">{apiError}</p>
                </div>
              )}

              <div className="pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  loading={loading} 
                  fullWidth 
                  className="bg-gradient-to-r from-[#00D4FF] to-[#0066FF] text-[#050A14] font-bold text-[16px] h-[54px] rounded-[14px] hover:shadow-[0_8px_30px_rgba(0,212,255,0.4)] transition-all active:scale-[0.98]"
                >
                  Crear mi empresa en Gainora
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-[14px] text-[#4B5563]">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-[#00D4FF] font-bold hover:text-white transition-colors underline underline-offset-4 decoration-[#00D4FF]/30">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-6 text-[12px] text-[#1F2937] font-medium relative">
        <span>© {new Date().getFullYear()} Gainora.io</span>
        <div className="w-1 h-1 rounded-full bg-[#1F2937]" />
        <a href="#" className="hover:text-[#4B5563] transition-colors">Privacidad</a>
        <a href="#" className="hover:text-[#4B5563] transition-colors">Términos</a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ carac.', ok: password.length >= 8 },
    { label: 'Mayús.',     ok: /[A-Z]/.test(password) },
    { label: 'Número',        ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const barColors = ['#FF453A', '#FF9F0A', '#30D158'];

  return (
    <div className="px-1 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-500"
            style={{ background: i < strength ? barColors[strength - 1] : 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
      <div className="flex gap-4">
        {checks.map((c) => (
          <span
            key={c.label}
            className={clsx(
              'flex items-center gap-1.5 text-[10.5px] font-bold transition-colors uppercase tracking-wider',
              c.ok ? 'text-[#30D158]' : 'text-[#374151]',
            )}
          >
            <Check className="w-3 h-3" strokeWidth={3} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionDivider({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-[#374151]" strokeWidth={2} />
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#374151]">
        {label}
      </span>
      <div className="flex-1 h-[1px] bg-white/5" />
    </div>
  );
}
