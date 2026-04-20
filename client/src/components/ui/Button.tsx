// ============================================================================
// Button.tsx — Botón estilo Apple (primary, secondary, ghost, danger, glass)
// ============================================================================

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'success';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  icon?:      ReactNode;
  iconRight?: ReactNode;
  children?:  ReactNode;
  fullWidth?: boolean;
  glow?:      boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'text-white bg-[linear-gradient(180deg,#1E96FF_0%,#0A84FF_100%)] ' +
    'hover:bg-[linear-gradient(180deg,#2AA1FF_0%,#0F8EFF_100%)] active:bg-[#0060C0] ' +
    'shadow-[0_1px_2px_rgba(10,132,255,0.20),0_4px_14px_rgba(10,132,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ' +
    'hover:shadow-[0_2px_4px_rgba(10,132,255,0.28),0_8px_24px_rgba(10,132,255,0.45),inset_0_1px_0_rgba(255,255,255,0.30)]',
  secondary:
    'text-[var(--color-text)] bg-[var(--color-surface)] ' +
    'border border-[var(--color-border-medium)] ' +
    'hover:bg-[var(--color-surface-alt)] active:bg-[var(--color-bg)] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)]',
  ghost:
    'bg-transparent text-[var(--color-blue)] hover:bg-[var(--color-blue-subtle)] active:bg-[var(--color-blue-subtle-hover)]',
  danger:
    'text-white bg-[linear-gradient(180deg,#FF5E54_0%,#FF453A_100%)] ' +
    'hover:bg-[linear-gradient(180deg,#FF6E64_0%,#F13B30_100%)] active:bg-[#CC3329] ' +
    'shadow-[0_1px_2px_rgba(255,69,58,0.20),0_4px_14px_rgba(255,69,58,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]',
  success:
    'text-white bg-[linear-gradient(180deg,#4AE072_0%,#30D158_100%)] ' +
    'hover:bg-[linear-gradient(180deg,#55E87D_0%,#38DA60_100%)] active:bg-[#28B84C] ' +
    'shadow-[0_1px_2px_rgba(48,209,88,0.20),0_4px_14px_rgba(48,209,88,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]',
  glass:
    'text-[var(--color-text)] backdrop-blur-xl bg-[rgba(255,255,255,0.65)] ' +
    'border border-[rgba(0,0,0,0.07)] hover:bg-[rgba(255,255,255,0.85)] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8  px-3 text-[13px] font-medium rounded-[9px]  gap-1.5',
  md: 'h-10 px-4 text-[14px] font-medium rounded-[11px] gap-2',
  lg: 'h-12 px-6 text-[15px] font-semibold rounded-[13px] gap-2',
};

export default function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  icon,
  iconRight,
  children,
  fullWidth = false,
  glow      = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(
        'relative inline-flex items-center justify-center select-none',
        'transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(10,132,255,0.35)] focus-visible:ring-offset-0',
        'active:scale-[0.97]',
        'overflow-hidden',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        glow && variant === 'primary' && 'animate-pulse-glow',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {icon      && <span className="shrink-0 -ml-0.5">{icon}</span>}
          {children  && <span className="leading-none">{children}</span>}
          {iconRight && <span className="shrink-0 -mr-0.5">{iconRight}</span>}
        </>
      )}
    </button>
  );
}

function Spinner({ size }: { size: Size }) {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 18 : 15;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
