// ============================================================================
// ConfirmDialog.tsx — Diálogo de confirmación estilo Apple
// ============================================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ConfirmOptions {
  title:       string;
  message:     string;
  confirmText?: string;
  cancelText?:  string;
  variant?:    'danger' | 'primary';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function handleAction(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in"
            onClick={() => handleAction(false)}
          />
          {/* Dialog */}
          <div
            className="relative bg-white rounded-[20px] w-full max-w-[340px] p-6 text-center animate-scale-in"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 0 1px rgba(0,0,0,0.04)' }}
          >
            <div className="w-12 h-12 rounded-full bg-[rgba(255,159,10,0.10)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[#FF9F0A]" strokeWidth={1.8} />
            </div>
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-1.5">
              {state.options.title}
            </h3>
            <p className="text-[14px] text-[#6E6E73] mb-5 leading-relaxed whitespace-pre-line text-left">
              {state.options.message}
            </p>
            <div className="flex gap-2.5">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => handleAction(false)}
              >
                {state.options.cancelText ?? 'Cancelar'}
              </Button>
              <Button
                variant={state.options.variant ?? 'danger'}
                size="md"
                fullWidth
                onClick={() => handleAction(true)}
              >
                {state.options.confirmText ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ConfirmContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
