// ============================================================================
// Toggle.tsx — Interruptor booleano estilo iOS
// ============================================================================

import clsx from 'clsx';

interface ToggleProps {
  checked:   boolean;
  onChange:  (val: boolean) => void;
  label?:    string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      className={clsx(
        'inline-flex items-center gap-2.5 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); !disabled && onChange(!checked); } }}
        className={clsx(
          'relative inline-flex w-[44px] h-[26px] rounded-full',
          'transition-colors duration-200',
          checked ? 'bg-[#30D158]' : 'bg-[#D1D1D6]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] focus-visible:ring-offset-1',
        )}
      >
        <span
          className={clsx(
            'absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white',
            'shadow-[0_1px_4px_rgba(0,0,0,0.20)]',
            'transition-transform duration-200',
            checked ? 'translate-x-[21px]' : 'translate-x-[3px]',
          )}
        />
      </span>
      {label && (
        <span className="text-[14px] font-medium text-[#1D1D1F]">{label}</span>
      )}
    </label>
  );
}
