// ============================================================================
// Textarea.tsx — Textarea estilo Apple con label flotante
// ============================================================================

import { type TextareaHTMLAttributes, useState, useId } from 'react';
import clsx from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label:   string;
  error?:  string;
  hint?:   string;
}

export default function Textarea({
  label,
  error,
  hint,
  className,
  id: externalId,
  rows = 3,
  ...props
}: TextareaProps) {
  const autoId  = useId();
  const inputId = externalId ?? autoId;
  const [focused, setFocused] = useState(false);

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'relative',
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
        <label
          htmlFor={inputId}
          className="absolute left-3 top-1.5 text-[10.5px] font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase pointer-events-none select-none"
        >
          {label}
        </label>

        <textarea
          id={inputId}
          rows={rows}
          {...props}
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
          className={clsx(
            'w-full bg-transparent outline-none resize-none',
            'text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]',
            'px-3 pb-2.5 pt-5',
            'transition-all duration-150',
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
