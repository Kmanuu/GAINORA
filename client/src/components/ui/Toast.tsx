// ============================================================================
// Toast.tsx — Sistema de notificaciones tipo Apple (no intrusivo)
// ============================================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id:      number;
  type:    ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Contenedor de toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[380px] w-full pointer-events-none sm:top-5 sm:right-5">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Componente visual del toast
// ---------------------------------------------------------------------------

const CONFIG: Record<ToastType, {
  icon: React.ElementType;
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
}> = {
  success: {
    icon:      CheckCircle,
    bg:        'bg-white',
    border:    'border-[rgba(48,209,88,0.25)]',
    iconColor: 'text-[#30D158]',
    textColor: 'text-[#1D1D1F]',
  },
  error: {
    icon:      AlertCircle,
    bg:        'bg-white',
    border:    'border-[rgba(255,69,58,0.25)]',
    iconColor: 'text-[#FF453A]',
    textColor: 'text-[#1D1D1F]',
  },
  info: {
    icon:      Info,
    bg:        'bg-white',
    border:    'border-[rgba(10,132,255,0.25)]',
    iconColor: 'text-[#0A84FF]',
    textColor: 'text-[#1D1D1F]',
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg = CONFIG[item.type];
  const Icon = cfg.icon;

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-[14px]',
        'border shadow-[0_4px_20px_rgba(0,0,0,0.10),0_0_1px_rgba(0,0,0,0.04)]',
        'animate-fade-up',
        cfg.bg,
        cfg.border,
      )}
      role="alert"
    >
      <Icon className={clsx('w-5 h-5 shrink-0 mt-0.5', cfg.iconColor)} strokeWidth={2} />
      <p className={clsx('flex-1 text-[13.5px] font-medium leading-snug', cfg.textColor)}>
        {item.message}
      </p>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded-[6px] text-[#C7C7CC] hover:text-[#6E6E73] hover:bg-[rgba(0,0,0,0.05)] transition-colors shrink-0"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}
