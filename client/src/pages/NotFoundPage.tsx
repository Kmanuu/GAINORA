// ============================================================================
// NotFoundPage.tsx — Página 404 dinámica y estilo Apple
// ============================================================================

import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12 relative overflow-hidden">
      
      {/* Elementos decorativos de fondo flotantes para dar "dinamismo" */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.03] animate-pulse"
          style={{ background: 'radial-gradient(circle, var(--color-text) 0%, transparent 70%)', animationDuration: '6s' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, #0A84FF 0%, transparent 70%)', animationDuration: '8s', animationDelay: '2s' }}
        />
      </div>

      <div className="relative text-center max-w-md w-full animate-scale-in">
        <div className="w-20 h-20 mx-auto bg-[rgba(10,132,255,0.1)] rounded-full flex items-center justify-center mb-6">
          <Compass className="w-10 h-10 text-[#0A84FF]" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-[120px] font-bold text-[var(--color-text)] leading-none tracking-tighter opacity-10 select-none absolute top-[-60px] left-1/2 -translate-x-1/2 -z-10">
          404
        </h1>
        
        <h2 className="text-[28px] font-semibold text-[var(--color-text)] leading-tight mb-3">
          Parece que te has perdido
        </h2>
        
        <p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed mb-8">
          La página que intentas buscar no existe o ha sido movida. Puedes volver al inicio y seguir controlando tu rentabilidad sin problemas.
        </p>

        <div className="flex justify-center">
          <Link to="/dashboard">
            <Button
              variant="primary"
              size="lg"
              className="gap-2 px-8 shadow-[0_4px_16px_rgba(10,132,255,0.25)]"
            >
              <Home className="w-4 h-4" strokeWidth={2} />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
