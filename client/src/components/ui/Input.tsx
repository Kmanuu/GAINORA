// ============================================================================
// Input.tsx — Input estilo Apple con label flotante y prefijo/sufijo opcional
// ============================================================================

import { type InputHTMLAttributes, type ReactNode, useState, useId } from 'react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label:     string;
  error?:    string;
  icon?:     ReactNode;
  prefix?:   ReactNode;
  suffix?:   ReactNode;
  hint?:     string;
}

export default function Input({
  label,
  error,
  icon,
  prefix,
  suffix,
  hint,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const autoId  = useId();
  const inputId = externalId ?? autoId;
  const [focused, setFocused] = useState(false);

  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null;
  const floatLabel = focused || hasValue || !!props.defaultValue || !!props.placeholder;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative flex items-center',
          'bg-[var(--color-surface)] border rounded-[12px]',
          'transition-all duration-150',
          error
            ? 'border-[var(--color-red)] ring-2 ring-[rgba(255,69,58,0.15)]'
            : focused
              ? 'border-[var(--color-blue)] ring-[3px] ring-[rgba(10,132,255,0.20)]'
              : 'border-[var(--color-border-medium)] hover:border-[var(--color-border-strong)]',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        {/* Prefijo (ej. “€”) */}
        {prefix && (
          <span className="pl-3 pt-5 pb-1 text-[14px] text-[var(--color-text-tertiary)] select-none">
            {prefix}
          </span>
        )}

        {/* Label flotante */}
        <label
          htmlFor={inputId}
          className={clsx(
            'absolute left-3 pointer-events-none select-none',
            'transition-all duration-150 origin-left',
            floatLabel
              ? 'top-1.5 text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase'
              : 'top-1/2 -translate-y-1/2 text-[14px] text-[var(--color-text-tertiary)]',
            prefix && floatLabel && 'left-3',
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
            'text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]',
            'transition-all duration-150',
            prefix ? 'pl-1 pb-1 pt-5' : 'pl-3 pb-1 pt-5',
            icon ? 'pr-10' : suffix ? 'pr-1' : 'pr-3',
          )}
        />

        {/* Sufijo (ej. "%") */}
        {suffix && !icon && (
          <span className="pr-3 pt-5 pb-1 text-[14px] text-[var(--color-text-tertiary)] select-none">
            {suffix}
          </span>
        )}

        {/* Icono derecho */}
        {icon && (
          <span className="absolute right-3 text-[var(--color-text-tertiary)]">
            {icon}
          </span>
        )}
      </div>

      {/* Mensaje de error o hint */}
      {(error || hint) && (
        <p
          className={clsx(
            'text-[12px] pl-1 flex items-center gap-1',
            error ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]',
          )}
        >
          {error && <span className="inline-block w-1 h-1 rounded-full bg-[var(--color-red)]" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
