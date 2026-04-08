// ============================================================================
// ComingSoonPage.tsx — Página temporal para secciones en construcción
// ============================================================================

import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
}

export default function ComingSoonPage({ title }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-5"
        style={{ background: 'rgba(255,159,10,0.10)' }}
      >
        <Construction className="w-8 h-8 text-[#FF9F0A]" strokeWidth={1.5} />
      </div>
      <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">{title}</h1>
      <p className="text-[14px] text-[#6E6E73] max-w-[320px]">
        Esta sección está en desarrollo. Pronto estará disponible.
      </p>
    </div>
  );
}
