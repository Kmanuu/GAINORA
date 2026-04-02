// ============================================================================
// vies.ts — Validación de NIF/CIF europeo via API VIES
// ============================================================================
// Mock por ahora. Cuando se conecte la API real, solo hay que cambiar
// la implementación interna. La interfaz pública no cambia.
// ============================================================================

export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name: string | null;
  address: string | null;
}

/**
 * Valida un NIF/CIF europeo.
 * Extrae las 2 primeras letras como countryCode, el resto como número.
 *
 * MOCK: Devuelve valid=true si el taxId tiene ≥5 caracteres.
 * REAL: Llamar a https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number
 */
export async function validateVatNumber(taxId: string): Promise<ViesValidationResult> {
  const countryCode = taxId.slice(0, 2).toUpperCase();
  const vatNumber = taxId.slice(2);

  // --- MOCK: simula la respuesta de VIES ---
  // TODO: sustituir por fetch real a la API VIES cuando estemos listos
  const valid = taxId.length >= 5;

  return {
    valid,
    countryCode,
    vatNumber,
    name: valid ? "Empresa de prueba S.L." : null,
    address: valid ? "Calle Ficticia 123, Madrid" : null,
  };
}
