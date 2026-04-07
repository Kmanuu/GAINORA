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

const widthMap = { sm: 'lg:max-w-[400px]', md: 'lg:max-w-[480px]', lg: 'lg:max-w-[560px]' };

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
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
        />
        {/* Sheet */}
        <div
          className="relative flex flex-col bg-[#F5F5F7] rounded-t-[24px] max-h-[92dvh]"
          style={{
            animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0,0.67,0) forwards',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[rgba(0,0,0,0.15)]" />
          </div>
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-[rgba(0,0,0,0.06)]">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1D1D1F]">{title}</h2>
              {subtitle && <p className="text-[13px] text-[#6E6E73] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6E6E73] ml-3 shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {/* Footer */}
          {footer && (
            <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] bg-white">
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: Panel lateral derecho ───────────────────────────────── */}
      <div className="hidden lg:flex fixed inset-0 z-50 items-start justify-end">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={clsx(
            'relative h-full w-full flex flex-col',
            'bg-[#F5F5F7]',
            'border-l border-[rgba(0,0,0,0.08)]',
            'shadow-[-8px_0_40px_rgba(0,0,0,0.12)]',
            widthMap[width],
          )}
          style={{ animation: 'slideInRight 0.28s cubic-bezier(0.32,0,0.67,0) forwards' }}
        >
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[rgba(0,0,0,0.06)] bg-white">
            <div>
              <h2 className="text-[18px] font-semibold text-[#1D1D1F]">{title}</h2>
              {subtitle && <p className="text-[13px] text-[#6E6E73] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6E6E73] ml-4 shrink-0 hover:bg-[rgba(0,0,0,0.10)] transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.06)] bg-white">
              {footer}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>,
    document.body,
  );
}
