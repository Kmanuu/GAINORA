// ============================================================================
// LoginPage.tsx — Inicio de sesión estilo Apple
// ============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth }   from '@/context/AuthContext';
import { useToast }  from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tenantSlug: '',
    email:      '',
    password:   '',
  });
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (error) setError('');
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.tenantSlug || !form.email || !form.password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(form);
      toast('success', 'Sesión iniciada correctamente');
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] px-4 py-12">

      {/* Fondo decorativo */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #0A84FF 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #30D158 0%, transparent 70%)' }}
        />
      </div>

      {/* Tarjeta */}
      <div
        className="relative w-full max-w-[400px] animate-scale-in"
        style={{ animationFillMode: 'both' }}
      >
        <div
          className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)]"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <div className="px-8 pt-8 pb-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
                style={{ background: '#0A84FF', boxShadow: '0 4px 16px rgba(10,132,255,0.35)' }}
              >
                <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] font-semibold text-[#1D1D1F] leading-tight">
                Iniciar sesión
              </h1>
              <p className="text-[14px] text-[#6E6E73] mt-1">
                Accede a HorasPRO
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <Input
                label="Slug de empresa"
                type="text"
                value={form.tenantSlug}
                onChange={handleChange('tenantSlug')}
                autoComplete="organization"
                spellCheck={false}
                placeholder="mi-agencia"
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
                inputMode="email"
              />
              <Input
                label="Contraseña"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                autoComplete="current-password"
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

              {/* Mensaje de error */}
              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[rgba(255,69,58,0.08)] border border-[rgba(255,69,58,0.15)]"
                  role="alert"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] shrink-0" />
                  <p className="text-[13px] text-[#D93025]">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  fullWidth
                >
                  Entrar
                </Button>
              </div>
            </form>

            {/* Enlace a registro */}
            <p className="mt-6 text-center text-[13px] text-[#6E6E73]">
              ¿Sin cuenta?{' '}
              <Link
                to="/register"
                className="text-[#0A84FF] font-medium hover:underline"
              >
                Crear empresa
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-[12px] text-[#86868B]">
        HorasPRO © {new Date().getFullYear()}
      </p>
    </div>
  );
}
