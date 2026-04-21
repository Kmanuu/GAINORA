// ============================================================================
// Card.tsx — Tarjeta base estilo Apple (superficie elevada multicapa)
// ============================================================================

import { type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardTone    = 'plain' | 'glass' | 'raised' | 'gradient';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children:  ReactNode;
  padding?:  CardPadding;
  hover?:    boolean;
  tone?:     CardTone;
  /** @deprecated use tone="glass" */
  glass?:    boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

const toneStyles: Record<CardTone, string> = {
  plain:
    'bg-[var(--color-surface)] border border-[var(--color-border)] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.05)]',
  glass:
    'glass border border-[var(--color-border)] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
  raised:
    'bg-[var(--color-surface-raised)] border border-[var(--color-border)] ' +
    'shadow-[0_2px_4px_rgba(0,0,0,0.05),0_12px_32px_rgba(0,0,0,0.08)]',
  gradient:
    'bg-[linear-gradient(135deg,var(--color-surface)_0%,var(--color-bg-elevated)_100%)] ' +
    'border border-[var(--color-border)] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.05)]',
};

export default function Card({
  children,
  padding  = 'md',
  hover    = false,
  tone,
  glass    = false,
  className,
  ...props
}: CardProps) {
  const actualTone: CardTone = tone ?? (glass ? 'glass' : 'plain');

  return (
    <div
      {...props}
      className={clsx(
        'rounded-[16px]',
        toneStyles[actualTone],
        hover && [
          'cursor-pointer',
          'transition-all duration-[220ms] ease-[cubic-bezier(0.19,1,0.22,1)]',
          'hover:-translate-y-[2px]',
          'hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.12)]',
          'active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        ],
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
