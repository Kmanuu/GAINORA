// ============================================================================
// Card.tsx — Tarjeta base estilo Apple (superficie elevada con sombra suave)
// ============================================================================

import { type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children:  ReactNode;
  padding?:  CardPadding;
  hover?:    boolean;
  glass?:    boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

export default function Card({
  children,
  padding  = 'md',
  hover    = false,
  glass    = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'rounded-[16px] border border-[rgba(0,0,0,0.06)]',
        glass
          ? 'bg-[rgba(255,255,255,0.75)] backdrop-blur-[24px]'
          : 'bg-white',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.03)]',
        hover && [
          'cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_1px_rgba(0,0,0,0.03)]',
          'hover:-translate-y-[1px]',
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
