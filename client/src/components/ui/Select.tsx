// ============================================================================
// Select.tsx — Select nativo estilizado al estilo Apple
// ============================================================================

import { type SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label:    string;
  options:  SelectOption[];
  error?:   string;
  hint?:    string;
  placeholder?: string;
}

export default function Select({
  label,
  options,
  error,
  hint,
  placeholder,
  className,
  id: externalId,
  ...props
}: SelectProps) {
  const autoId  = useId();
  const inputId = externalId ?? autoId;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative flex items-center',
          'bg-[var(--color-surface)] border rounded-[12px]',
          'transition-all duration-150',
          error
            ? 'border-[var(--color-red)] ring-2 ring-[rgba(255,69,58,0.15)]'
            : 'border-[var(--color-border-medium)] hover:border-[var(--color-border-strong)] ' +
              'focus-within:border-[var(--color-blue)] focus-within:ring-[3px] focus-within:ring-[rgba(10,132,255,0.20)]',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        <label
          htmlFor={inputId}
          className="absolute left-3 top-1.5 text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase pointer-events-none select-none"
        >
          {label}
        </label>

        <select
          id={inputId}
          {...props}
          className={clsx(
            'w-full bg-transparent outline-none appearance-none',
            'text-[14px] text-[var(--color-text)]',
            'pl-3 pr-9 pb-1.5 pt-5',
            'cursor-pointer',
          )}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <ChevronDown
          className="absolute right-3 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none"
          strokeWidth={2}
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
