// ============================================================================
// OnboardingContext.tsx — Estado global del tutorial de bienvenida
// ============================================================================
// Gestiona el flujo actual (el tutorial principal de 5 pasos, o 
// un mini-tutorial específico de alguna página).
// ============================================================================

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';

export type FlowType = 'main' | 'fixed_costs' | 'projects' | 'time' | null;

interface OnboardingContextValue {
  activeFlow:   FlowType;
  currentStep:  number;
  open:         (flow?: FlowType) => void;
  close:        () => void;
  next:         (maxSteps?: number) => void;
  prev:         () => void;
  goTo:         (step: number) => void;
  resumeMain:   (step: number) => void;
}

const STORAGE_KEY = 'hp_onboarding_done';

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [activeFlow,  setActiveFlow]  = useState<FlowType>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Abre el tutorial principal automáticamente si es la primera visita
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => {
        setActiveFlow('main');
        setCurrentStep(0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const open = useCallback((flow: FlowType = 'main') => {
    setCurrentStep(0);
    setActiveFlow(flow);
  }, []);

  const close = useCallback(() => {
    setActiveFlow(null);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const next = useCallback((maxSteps: number = 5) => {
    setCurrentStep((prev) => {
      if (prev >= maxSteps - 1) {
        setActiveFlow(null);
        localStorage.setItem(STORAGE_KEY, 'true');
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const prev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goTo = useCallback((step: number) => {
    setCurrentStep(Math.max(0, step));
  }, []);

  const resumeMain = useCallback((step: number) => {
    setActiveFlow('main');
    setCurrentStep(step);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{ activeFlow, currentStep, open, close, next, prev, goTo, resumeMain }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding debe usarse dentro de <OnboardingProvider>');
  return ctx;
}

