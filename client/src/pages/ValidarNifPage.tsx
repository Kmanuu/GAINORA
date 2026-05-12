// ============================================================================
// ValidarNifPage.tsx — Utilidad de validación de NIF/CIF intracomunitario via VIES
// ============================================================================
// Consume la API REST oficial de la Comisión Europea a través del backend.
// Acceso directo en /validar-nif.
// ============================================================================

import { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import Card   from '@/components/ui/Card';
import Input  from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge  from '@/components/ui/Badge';

interface ViesResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name: string | null;
  address: string | null;
  source: 'vies' | 'fallback';
  strictMode: boolean;
}

export default function ValidarNifPage() {
  const [taxId,   setTaxId]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ViesResult | null>(null);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (taxId.trim().length < 5) {
      setError('Introduce un NIF/CIF intracomunitario (mín. 5 caracteres, ej. ESA28015865)');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.post<ViesResult>('/v1/vies/validate', { taxId: taxId.trim() });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error consultando VIES');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[760px] mx-auto space-y-5">
      <header className="space-y-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Validar NIF/CIF intracomunitario
        </h1>
        <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
          Consulta el censo VIES de la Comisión Europea para verificar un número de
          IVA intracomunitario. Esta utilidad consume la{' '}
          <a
            href="https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            API pública de VIES
            <ExternalLink size={12} />
          </a>{' '}
          en tiempo real.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            label="NIF/CIF (con código de país: ES, FR, DE...)"
            hint="Las 2 primeras letras son el país (ES, FR, DE, IT...), el resto el número."
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.toUpperCase())}
            placeholder="Ej. ESA28015865"
            maxLength={20}
            disabled={loading}
            autoFocus
          />

          {error && (
            <div className="flex items-start gap-2 text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-[10px] px-3 py-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Consultando VIES…
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Validar
              </>
            )}
          </Button>
        </form>
      </Card>

      {result && (
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">
                Resultado
              </h2>
              {result.source === 'vies' ? (
                <Badge variant={result.valid ? 'green' : 'red'}>
                  {result.valid ? 'Válido' : 'No válido'}
                </Badge>
              ) : (
                <Badge variant="orange">VIES no disponible</Badge>
              )}
              <span className="ml-auto text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Modo {result.strictMode ? 'estricto' : 'blando'}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div>
                <dt className="text-[var(--color-text-tertiary)]">País</dt>
                <dd className="text-[var(--color-text)] font-medium">{result.countryCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-tertiary)]">Número</dt>
                <dd className="text-[var(--color-text)] font-medium">{result.vatNumber || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--color-text-tertiary)]">Razón social</dt>
                <dd className="text-[var(--color-text)] font-medium">{result.name ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--color-text-tertiary)]">Dirección</dt>
                <dd className="text-[var(--color-text)] font-medium">{result.address ?? '—'}</dd>
              </div>
            </dl>

            {result.source === 'fallback' && (
              <p className="text-[12px] leading-[1.6] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-3">
                La API de VIES no respondió a tiempo o devolvió un error. En modo blando
                (desarrollo) la operación continúa; en modo estricto (producción) se
                bloquearía hasta obtener una respuesta válida.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
