// ============================================================================
// Modal.tsx — Bottom sheet en móvil · Panel lateral en desktop
// ============================================================================

import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  subtitle?: string;
  children:  ReactNode;
  footer?:   ReactNode;
  width?:    'sm' | 'md' | 'lg';
}

const widthMap = { sm: 'lg:max-w-[420px]', md: 'lg:max-w-[500px]', lg: 'lg:max-w-[620px]' };

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      {/* ── MÓVIL: Bottom Sheet ──────────────────────────────────────────── */}
      <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[4px] animate-fade-in"
          onClick={onClose}
        />
        <div
          className="relative flex flex-col bg-[var(--color-bg)] rounded-t-[24px] max-h-[92dvh] border-t border-[var(--color-border)] shadow-[var(--shadow-floating)]"
          style={{
            animation: 'slideUpSheet 0.36s cubic-bezier(0.19, 1, 0.22, 1) forwards',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[rgba(0,0,0,0.15)] dark:bg-[rgba(255,255,255,0.20)]" />
          </div>
          <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight">{title}</h2>
              {subtitle && <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[var(--color-text-secondary)] ml-3 shrink-0 hover:bg-[rgba(0,0,0,0.10)] dark:hover:bg-[rgba(255,255,255,0.12)] transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: Panel lateral derecho ───────────────────────────────── */}
      <div className="hidden lg:flex fixed inset-0 z-50 items-start justify-end">
        <div
          className="absolute inset-0 bg-black/25 backdrop-blur-[4px] animate-fade-in"
          onClick={onClose}
        />
        <div
          className={clsx(
            'relative h-full w-full flex flex-col',
            'bg-[var(--color-bg)]',
            'border-l border-[var(--color-border-medium)]',
            'shadow-[-12px_0_48px_rgba(0,0,0,0.16)]',
            widthMap[width],
          )}
          style={{ animation: 'slideInRight 0.32s cubic-bezier(0.19, 1, 0.22, 1) forwards' }}
        >
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div>
              <h2 className="text-[20px] font-semibold text-[var(--color-text)] tracking-tight">{title}</h2>
              {subtitle && <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[var(--color-text-secondary)] ml-4 shrink-0 hover:bg-[rgba(0,0,0,0.10)] dark:hover:bg-[rgba(255,255,255,0.12)] transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              {footer}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.4; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0.5; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>,
    document.body,
  );
}
