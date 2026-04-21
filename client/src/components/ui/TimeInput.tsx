// ============================================================================
// TimeInput.tsx — Input de hora (HH:MM) con label flotante y estilo Apple
// ============================================================================

import { useId, useState, type InputHTMLAttributes } from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?:  string;
}

export default function TimeInput({ label, error, hint, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative flex items-center',
          'bg-[var(--color-surface)] border rounded-[12px]',
          'transition-all duration-150 h-[54px]',
          error
            ? 'border-[var(--color-red)] ring-2 ring-[rgba(255,69,58,0.15)]'
            : focused
              ? 'border-[var(--color-blue)] ring-[3px] ring-[rgba(10,132,255,0.20)]'
              : 'border-[var(--color-border-medium)] hover:border-[var(--color-border-strong)]',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        <label
          htmlFor={inputId}
          className="absolute left-3 top-1.5 text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase pointer-events-none select-none"
        >
          {label}
        </label>
        <input
          id={inputId}
          type="time"
          step={60}
          {...props}
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
          className={clsx(
            'w-full bg-transparent outline-none',
            'text-[14px] text-[var(--color-text)] tabular-nums',
            'pl-3 pr-10 pb-1.5 pt-5',
          )}
        />
        <Clock className="absolute right-3 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" strokeWidth={1.8} />
      </div>
      {(error || hint) && (
        <p className={clsx('text-[12px] pl-1', error ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
