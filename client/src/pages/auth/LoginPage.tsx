// ============================================================================
// LoginPage.tsx — Inicio de sesión estilo Gainora (Premium Dark)
// ============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GainoraMark } from '@/components/brand/GainoraLogo';
import { useAuth }   from '@/context/AuthContext';
import { useToast }  from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (error) setError('');
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Leer del DOM via FormData en vez de sólo del state. El autocomplete
    // del navegador rellena el input pero no siempre dispara onChange,
    // dejando el state vacío al primer submit. FormData siempre tiene el
    // valor visible.
    const data = new FormData(e.currentTarget);
    const email    = (data.get('email')    as string ?? form.email).trim();
    const password = (data.get('password') as string ?? form.password);

    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      toast('success', 'Sesión iniciada correctamente');
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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

      {/* Back to landing */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all z-10"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Volver
      </Link>

      {/* Login Card */}
      <div
        className="relative w-full max-w-[420px] animate-fade-up"
        style={{ animationFillMode: 'both' }}
      >
        <div
          className="rounded-[28px] border border-white/10 backdrop-blur-[32px] overflow-hidden"
          style={{
            background: 'rgba(6, 11, 22, 0.85)',
            boxShadow:  '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent opacity-50" />

          <div className="px-10 pt-10 pb-10">
            {/* Brand Logo */}
            <div className="flex flex-col items-center mb-10">
              <div className="mb-3">
                <GainoraMark size={72} />
              </div>
              <h1 className="text-[28px] font-black text-white leading-tight tracking-[-0.03em]">
                Bienvenido de nuevo
              </h1>
              <p className="text-[14px] text-[#6B7280] mt-2 font-medium">
                Accede a tu panel de rentabilidad
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1">
                <Input
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>

              <div className="space-y-1">
                <Input
                  label="Contraseña"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete="current-password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  icon={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                      className="flex items-center text-[#4B5563] hover:text-white transition-colors"
                      aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPass
                        ? <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} />
                        : <Eye    className="w-4.5 h-4.5" strokeWidth={1.8} />
                      }
                    </button>
                  }
                />
              </div>

              {error && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-500/10 border border-red-500/20"
                  role="alert"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[13.5px] text-red-400 font-medium">{error}</p>
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
                  Entrar a Gainora
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-[14px] text-[#4B5563]">
              ¿Aún no tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-[#00D4FF] font-bold hover:text-white transition-colors underline underline-offset-4 decoration-[#00D4FF]/30"
              >
                Crea tu empresa ahora
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-6 text-[12px] text-[#1F2937] font-medium relative">
        <span>© {new Date().getFullYear()} Gainora</span>
        <div className="w-1 h-1 rounded-full bg-[#1F2937]" />
        <Link to="/privacy" className="hover:text-[#4B5563] transition-colors">Privacidad</Link>
        <Link to="/terms" className="hover:text-[#4B5563] transition-colors">Términos</Link>
      </div>
    </div>
  );
}
