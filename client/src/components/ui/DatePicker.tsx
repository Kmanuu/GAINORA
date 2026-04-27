// ============================================================================
// DatePicker.tsx — Input de fecha nativo con estilo Apple
// ============================================================================

import { useId, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  error?: string;
  hint?: string;
}

export default function DatePicker({ label, value, onChange, min, max, error, hint, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative flex items-center',
          'bg-[var(--color-surface)] border rounded-[12px]',
          'transition-all duration-150 h-[54px]',
          error
            ? 'border-[var(--color-red)] ring-2 ring-[rgba(255,69,58,0.15)]'
            : 'border-[var(--color-border-medium)] focus-within:border-[var(--color-blue)] focus-within:ring-[3px] focus-within:ring-[rgba(10,132,255,0.20)] hover:border-[var(--color-border-strong)]',
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
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          {...props}
          className={clsx(
            'w-full bg-transparent outline-none',
            'text-[14px] text-[var(--color-text)]',
            'pl-3 pr-3 pb-1.5 pt-5',
            'cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100'
          )}
        />
      </div>
      {(error || hint) && (
        <p className={clsx('text-[12px] pl-1', error ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
