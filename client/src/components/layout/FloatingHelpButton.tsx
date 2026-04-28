// ============================================================================
// FloatingHelpButton.tsx — Botón flotante de ayuda contextual
// ============================================================================
// Aparece abajo a la derecha en todas las pantallas. Al pulsar abre un
// mini-popover con: artículo más relevante a la pantalla actual + acceso al
// tutorial + acceso al centro de ayuda completo.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HelpCircle, X, BookOpen, PlayCircle, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useOnboarding } from '@/context/OnboardingContext';
import { articleForRoute, HELP_CATEGORIES } from '@/lib/helpArticles';

export default function FloatingHelpButton() {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();
  const location        = useLocation();
  const { open: openOnboarding } = useOnboarding();
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const article = articleForRoute(location.pathname);
  const cat     = HELP_CATEGORIES.find((c) => c.id === article.category)!;

  // Cerrar al cambiar de ruta
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Cerrar con Esc o click fuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  function goToArticle() {
    setOpen(false);
    navigate(`/ayuda?a=${article.id}`);
  }

  function goToCenter() {
    setOpen(false);
    navigate('/ayuda');
  }

  function startTour() {
    setOpen(false);
    openOnboarding('main');
  }

  return (
    <div className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] lg:right-8 lg:bottom-8 print:hidden">
      {/* Popover */}
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Ayuda contextual"
          className={clsx(
            'absolute right-0 bottom-[60px] w-[320px]',
            'bg-[var(--color-bg)] border border-[var(--color-border-medium)]',
            'rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.18)]',
            'overflow-hidden',
            'animate-fade-up',
          )}
          style={{ animationDuration: '180ms' }}
        >
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-purple)]" strokeWidth={1.9} />
              <span className="text-[13px] font-semibold text-[var(--color-text)]">¿En qué te ayudo?</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)] transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          <div className="p-3 space-y-2">
            {/* Artículo recomendado para esta ruta */}
            <button
              onClick={goToArticle}
              className="w-full text-left rounded-[12px] border border-[var(--color-border)] hover:border-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] p-3 transition-all group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
                  style={{ background: `${cat.color}18`, color: cat.color }}
                >
                  {cat.emoji} Recomendado aquí
                </span>
              </div>
              <p className="text-[13.5px] font-semibold text-[var(--color-text)] leading-tight">
                {article.title}
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-blue)]">
                Leer artículo
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.2} />
              </div>
            </button>

            <button
              onClick={startTour}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-[var(--color-blue)]" strokeWidth={1.9} />
              Repetir tutorial inicial
            </button>

            <button
              onClick={goToCenter}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[var(--color-purple)]" strokeWidth={1.9} />
              Ver todos los artículos
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar ayuda' : 'Abrir ayuda'}
        aria-expanded={open}
        className={clsx(
          'w-12 h-12 rounded-full',
          'flex items-center justify-center',
          'text-white',
          'shadow-[0_8px_24px_rgba(10,132,255,0.40)]',
          'hover:shadow-[0_10px_32px_rgba(10,132,255,0.55)]',
          'hover:scale-[1.06] active:scale-[0.96]',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(10,132,255,0.30)]',
        )}
        style={{
          background: open
            ? 'linear-gradient(180deg, #5E5CE6 0%, #4F46D2 100%)'
            : 'linear-gradient(180deg, #0A84FF 0%, #0060C0 100%)',
        }}
      >
        {open
          ? <X          className="w-5 h-5" strokeWidth={2.2} />
          : <HelpCircle className="w-5 h-5" strokeWidth={2}   />
        }
      </button>
    </div>
  );
}
