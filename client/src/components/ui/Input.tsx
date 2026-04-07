// ============================================================================
// Input.tsx — Input estilo Apple con label flotante y manejo de errores
// ============================================================================

import { type InputHTMLAttributes, type ReactNode, useState, useId } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label:     string;
  error?:    string;
  icon?:     ReactNode;
  hint?:     string;
}

export default function Input({
  label,
  error,
  icon,
  hint,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const autoId  = useId();
  const inputId = externalId ?? autoId;
  const [focused, setFocused] = useState(false);

  const hasValue = !!props.value || !!props.defaultValue;
  const floatLabel = focused || hasValue || !!props.placeholder;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative flex items-center',
          'bg-white border rounded-[10px]',
          'transition-all duration-150',
          error
            ? 'border-[#FF453A] ring-2 ring-[rgba(255,69,58,0.15)]'
            : focused
              ? 'border-[#0A84FF] ring-2 ring-[rgba(10,132,255,0.15)]'
              : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.18)]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        )}
      >
        {/* Label flotante */}
        <label
          htmlFor={inputId}
          className={clsx(
            'absolute left-3 pointer-events-none select-none',
            'transition-all duration-150 origin-left',
            floatLabel
              ? 'top-1.5 text-[10px] font-medium text-[#6E6E73]'
              : 'top-1/2 -translate-y-1/2 text-[14px] text-[#86868B]',
          )}
        >
          {label}
        </label>

        {/* Input real */}
        <input
          id={inputId}
          {...props}
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
          className={clsx(
            'w-full bg-transparent outline-none',
            'text-[14px] text-[#1D1D1F] placeholder:text-[#86868B]',
            'transition-all duration-150',
            icon ? 'pl-3 pr-10 pb-1 pt-5' : 'pl-3 pr-3 pb-1 pt-5',
          )}
        />

        {/* Icono derecho */}
        {icon && (
          <span className="absolute right-3 text-[#86868B]">
            {icon}
          </span>
        )}
      </div>

      {/* Mensaje de error o hint */}
      {(error || hint) && (
        <p
          className={clsx(
            'text-[12px] pl-1',
            error ? 'text-[#FF453A]' : 'text-[#6E6E73]',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
