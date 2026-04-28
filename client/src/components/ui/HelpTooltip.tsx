// ============================================================================
// HelpTooltip.tsx — "?" inline con burbuja de ayuda contextual
// ============================================================================
// Usar junto a labels o títulos para explicar conceptos sin saturar la UI.
// Apple-style: aparece al hover/focus, accesible por teclado, autoposicionable.
// ============================================================================

import { type ReactNode, useEffect, useRef, useState, useId } from 'react';
import { HelpCircle } from 'lucide-react';
import clsx from 'clsx';

interface HelpTooltipProps {
  /** Texto principal — frase humana, sin tecnicismos */
  text:        ReactNode;
  /** Etiqueta accesible para el botón "?" */
  label?:      string;
  /** Tamaño del icono */
  size?:       'xs' | 'sm';
  /** Posición preferida (auto-flip si no cabe) */
  side?:       'top' | 'bottom';
  /** Ancho máximo del tooltip en px */
  maxWidth?:   number;
  className?:  string;
}

export default function HelpTooltip({
  text,
  label = 'Más información',
  size  = 'sm',
  side  = 'top',
  maxWidth = 260,
  className,
}: HelpTooltipProps) {
  const [open, setOpen]       = useState(false);
  const [actualSide, setSide] = useState<'top' | 'bottom'>(side);
  const btnRef    = useRef<HTMLButtonElement>(null);
  const popRef    = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Flip si no cabe arriba/abajo
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const space = side === 'top' ? rect.top : window.innerHeight - rect.bottom;
    if (space < 120) setSide(side === 'top' ? 'bottom' : 'top');
    else setSide(side);
  }, [open, side]);

  // Cerrar con Esc o click fuera
  useEffect(() => {
    if (!open) return;
    const onKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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

  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const btnSize  = size === 'xs' ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  return (
    <span className={clsx('relative inline-flex align-middle', className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={clsx(
          btnSize,
          'rounded-full inline-flex items-center justify-center',
          'text-[var(--color-text-tertiary)] hover:text-[var(--color-blue)]',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] focus-visible:ring-offset-1',
        )}
      >
        <HelpCircle className={iconSize} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          ref={popRef}
          id={tooltipId}
          role="tooltip"
          className={clsx(
            'absolute z-[60] left-1/2 -translate-x-1/2',
            actualSide === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2',
            'px-3 py-2 rounded-[10px]',
            'bg-[var(--color-text)] text-[var(--color-bg)]',
            'shadow-[0_8px_24px_rgba(0,0,0,0.18)]',
            'text-[12.5px] leading-snug',
            'animate-fade-in pointer-events-auto',
          )}
          style={{ maxWidth, minWidth: 200 }}
        >
          {text}
          <span
            className={clsx(
              'absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45',
              'bg-[var(--color-text)]',
              actualSide === 'top' ? '-bottom-1' : '-top-1',
            )}
          />
        </div>
      )}
    </span>
  );
}
