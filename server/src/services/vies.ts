// ============================================================================
// vies.ts — Validación de NIF/CIF intracomunitario via API VIES de la Comisión Europea
// ============================================================================
// API pública: https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number
// Modo controlado por VIES_STRICT en .env:
//   - strict=true  → rechaza NIFs inválidos al crear cliente (producción)
//   - strict=false → validación blanda; permite pasar pero devuelve valid=false (dev/demo)
// ============================================================================

export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name: string | null;
  address: string | null;
  source: "vies" | "fallback";
}

const VIES_URL =
  process.env.VIES_URL ??
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

export function isViesStrict(): boolean {
  return (process.env.VIES_STRICT ?? "false").toLowerCase() === "true";
}

/**
 * Valida un NIF/CIF intracomunitario consultando la API REST de VIES.
 * Las 2 primeras letras son el código de país (ES, FR, DE…), el resto el número.
 *
 * Si la API responde mal o tarda, devuelve un resultado fallback con valid=false
 * y source="fallback" para que el llamador decida si bloquear o no según VIES_STRICT.
 */
export async function validateVatNumber(
  taxId: string
): Promise<ViesValidationResult> {
  const clean = taxId.replace(/[\s-]/g, "").toUpperCase();
  const countryCode = clean.slice(0, 2);
  const vatNumber = clean.slice(2);

  if (countryCode.length !== 2 || vatNumber.length < 3) {
    return {
      valid: false,
      countryCode,
      vatNumber,
      name: null,
      address: null,
      source: "fallback",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        valid: false,
        countryCode,
        vatNumber,
        name: null,
        address: null,
        source: "fallback",
      };
    }

    const data = (await response.json()) as {
      valid?: boolean;
      isValid?: boolean;
      name?: string | null;
      address?: string | null;
      traderName?: string | null;
      traderAddress?: string | null;
    };

    const valid = Boolean(data.valid ?? data.isValid);
    const name = data.name ?? data.traderName ?? null;
    const address = data.address ?? data.traderAddress ?? null;

    return {
      valid,
      countryCode,
      vatNumber,
      name: name && name !== "---" ? name : null,
      address: address && address !== "---" ? address : null,
      source: "vies",
    };
  } catch {
    return {
      valid: false,
      countryCode,
      vatNumber,
      name: null,
      address: null,
      source: "fallback",
    };
  }
}
