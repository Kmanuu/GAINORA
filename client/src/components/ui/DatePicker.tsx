// ============================================================================
// DatePicker.tsx — Selector de fecha custom estilo iOS/macOS
// ============================================================================
// Funciona como reemplazo visual de <input type="date">.
// Valor/onChange son strings en formato ISO "YYYY-MM-DD" (o '' para vacío).
// ============================================================================

import { useEffect, useRef, useState, useId } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  label:    string;
  value:    string;                 // YYYY-MM-DD
  onChange: (val: string) => void;
  min?:     string;
  max?:     string;
  error?:   string;
  hint?:    string;
  clearable?: boolean;
  className?: string;
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = parseISO(s);
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const yest     = new Date(today); yest.setDate(yest.getDate() - 1);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  if (dd.getTime() === today.getTime())    return 'Hoy';
  if (dd.getTime() === tomorrow.getTime()) return 'Mañana';
  if (dd.getTime() === yest.getTime())     return 'Ayer';
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Lunes=0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function DatePicker({
  label, value, onChange, min, max, error, hint, clearable = true, className,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseISO(value) ?? new Date());
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const d = parseISO(value);
      if (d) setViewDate(d);

      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const POPUP_W = 320;
        const POPUP_H = 320;
        setFlipX(rect.left + POPUP_W > window.innerWidth - 8);
        setFlipY(rect.bottom + POPUP_H > window.innerHeight - 8);
      }
    }
  }, [open, value]);

  // Cerrar al hacer clic fuera o Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = parseISO(value);
  const today = new Date(); today.setHours(0,0,0,0);
  const minD  = parseISO(min ?? '');
  const maxD  = parseISO(max ?? '');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid  = getMonthGrid(year, month);

  function selectDay(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  function disabledDay(d: Date) {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  }

  return (
    <div ref={rootRef} className={clsx('relative flex flex-col gap-1', className)}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'relative flex items-center w-full text-left',
          'bg-[var(--color-surface)] border rounded-[12px]',
          'transition-all duration-150',
          'h-[54px] pl-3 pr-10 pt-5 pb-1.5',
          error
            ? 'border-[var(--color-red)] ring-2 ring-[rgba(255,69,58,0.15)]'
            : open
              ? 'border-[var(--color-blue)] ring-[3px] ring-[rgba(10,132,255,0.20)]'
              : 'border-[var(--color-border-medium)] hover:border-[var(--color-border-strong)]',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        <label
          htmlFor={id}
          className="absolute left-3 top-1.5 text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase pointer-events-none select-none"
        >
          {label}
        </label>

        <span className={clsx(
          'text-[14px] flex-1 truncate',
          value ? 'text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)]',
        )}>
          {value ? formatDisplay(value) : 'Seleccionar fecha'}
        </span>

        <span className="absolute right-3 flex items-center gap-1">
          {clearable && value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[rgba(0,0,0,0.06)]"
            >
              <X className="w-3 h-3" strokeWidth={2.2} />
            </span>
          )}
          <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)]" strokeWidth={1.8} />
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className={clsx(
            'absolute z-50 w-[320px]',
            flipY  ? 'bottom-full mb-2' : 'top-full mt-2',
            flipX  ? 'right-0'          : 'left-0',
            'rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border-medium)]',
            'shadow-[var(--shadow-floating)] p-3 animate-scale-in',
            flipY && flipX  ? 'origin-bottom-right' :
            flipY           ? 'origin-bottom-left'  :
            flipX           ? 'origin-top-right'    : 'origin-top-left',
          )}
        >
          {/* Header: mes/año + nav */}
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <p className="text-[14px] font-semibold text-[var(--color-text)] capitalize">
              {MONTHS[month]} {year}
            </p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DOW.map((d) => (
              <span key={d} className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                {d}
              </span>
            ))}
          </div>

          {/* Rejilla */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              if (!d) return <span key={i} />;
              const isSel   = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              const dis     = disabledDay(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => selectDay(d)}
                  className={clsx(
                    'aspect-square w-full rounded-[10px]',
                    'text-[13px] font-medium',
                    'transition-colors duration-120',
                    dis && 'opacity-30 cursor-not-allowed',
                    !dis && !isSel && 'text-[var(--color-text)] hover:bg-[rgba(10,132,255,0.08)]',
                    isSel && 'bg-[var(--color-blue)] text-white shadow-[0_2px_8px_rgba(10,132,255,0.35)]',
                    !isSel && isToday && 'text-[var(--color-blue)] font-semibold',
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => selectDay(new Date())}
              className="flex-1 h-8 rounded-[8px] text-[12.5px] font-medium text-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)]"
            >
              Hoy
            </button>
            {clearable && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="flex-1 h-8 rounded-[8px] text-[12.5px] font-medium text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {(error || hint) && (
        <p className={clsx('text-[12px] pl-1', error ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
