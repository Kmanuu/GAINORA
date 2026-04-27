// ============================================================================
// paymentMath.ts — Funciones puras para desglose IVA y estado de pagos
// ============================================================================
// Sin imports de Prisma, sin acceso a BD. Reutilizable en cualquier capa.
// ============================================================================

export type PaymentStatusValue = "PENDING" | "PARTIAL" | "PAID";

export interface BreakdownInput {
  amountGross?: number;
  amountNet?: number;
  vatRate: number;
}

export interface BreakdownOutput {
  amountNet: number;
  amountGross: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Devuelve { amountNet, amountGross } a partir de cualquiera de los dos.
 * Si vienen ambos, se respetan tal cual (el cliente sabe lo que hace).
 * Si no viene ninguno, devuelve ceros.
 */
export function breakdownPayment(input: BreakdownInput): BreakdownOutput {
  const vat = input.vatRate ?? 21;
  const factor = 1 + vat / 100;

  if (input.amountGross !== undefined && input.amountNet !== undefined) {
    return { amountNet: round2(input.amountNet), amountGross: round2(input.amountGross) };
  }
  if (input.amountGross !== undefined) {
    return { amountGross: round2(input.amountGross), amountNet: round2(input.amountGross / factor) };
  }
  if (input.amountNet !== undefined) {
    return { amountNet: round2(input.amountNet), amountGross: round2(input.amountNet * factor) };
  }
  return { amountNet: 0, amountGross: 0 };
}

/**
 * A partir del `price` de un contrato y su flag `priceIncludesVat`,
 * resuelve cuál es Gross y cuál es Net. Para crear pagos automáticamente.
 */
export function breakdownFromContractPrice(
  price: number,
  vatRate: number,
  priceIncludesVat: boolean,
): BreakdownOutput {
  return priceIncludesVat
    ? breakdownPayment({ amountGross: price, vatRate })
    : breakdownPayment({ amountNet:   price, vatRate });
}

/**
 * Estado del pago en función de cuánto se ha cobrado vs cuánto se debía.
 */
export function deriveStatus(amountPaid: number, amountDue: number): PaymentStatusValue {
  if (amountPaid <= 0)         return "PENDING";
  if (amountPaid + 0.001 >= amountDue) return "PAID";
  return "PARTIAL";
}
