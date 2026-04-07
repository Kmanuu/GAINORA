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
          'bg-white border rounded-[10px]',
          'transition-all duration-150',
          error
            ? 'border-[#FF453A] ring-2 ring-[rgba(255,69,58,0.15)]'
            : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.18)] focus-within:border-[#0A84FF] focus-within:ring-2 focus-within:ring-[rgba(10,132,255,0.15)]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        )}
      >
        {/* Label fija arriba */}
        <label
          htmlFor={inputId}
          className="absolute left-3 top-1.5 text-[10px] font-medium text-[#6E6E73] pointer-events-none select-none"
        >
          {label}
        </label>

        {/* Select real */}
        <select
          id={inputId}
          {...props}
          className={clsx(
            'w-full bg-transparent outline-none appearance-none',
            'text-[14px] text-[#1D1D1F]',
            'pl-3 pr-8 pb-1 pt-5',
          )}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Icono chevron */}
        <ChevronDown
          className="absolute right-2.5 w-4 h-4 text-[#86868B] pointer-events-none"
          strokeWidth={1.8}
        />
      </div>

      {(error || hint) && (
        <p className={clsx('text-[12px] pl-1', error ? 'text-[#FF453A]' : 'text-[#6E6E73]')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
