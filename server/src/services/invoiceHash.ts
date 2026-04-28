// ============================================================================
// invoiceHash.ts — Cadena VeriFactu (RD 1007/2023)
// ============================================================================
// Cada factura emitida se encadena con la anterior de la misma serie mediante
// un hash SHA-256. El payload del QR sigue una estructura compatible con la
// URL de verificación pública de la AEAT (cuando se enchufe certificado y
// envío SOAP en producción).
//
// Notas:
//   · La cadena va por SERIE (no por tenant): cada serie A, R, DEMO… tiene
//     su propio génesis "0…0" y se recupera SIEMPRE el último currentHash de
//     la serie como previousHash de la siguiente.
//   · El cálculo se hace dentro de la transacción de issueInvoice para
//     garantizar atomicidad con el incremento de nextNumber.
//   · El payload del QR es URL-encoded; usamos un host placeholder (verifactu.local)
//     hasta que el equipo conecte con la sede AEAT real.
// ============================================================================

import { createHash } from "crypto";

export const GENESIS_HASH = "0".repeat(64);
export const QR_BASE_URL  = "https://verifactu.local/v";

export interface HashInput {
  emitterTaxId: string | null;
  receiverTaxId: string | null;
  seriesCode: string;
  number: number;
  issueDate: string;        // YYYY-MM-DD
  subtotalNet: number;      // 2 decimales
  totalVat: number;
  totalGross: number;
  previousHash: string;     // 64 chars hex
}

/** Hash SHA-256 hex de la cadena VeriFactu. Reproducible en cualquier
 *  máquina dados los mismos inputs y el mismo previousHash. */
export function computeInvoiceHash(input: HashInput): string {
  const parts = [
    input.emitterTaxId  ?? "",
    input.receiverTaxId ?? "",
    `${input.seriesCode}-${input.number}`,
    input.issueDate,
    input.subtotalNet.toFixed(2),
    input.totalVat.toFixed(2),
    input.totalGross.toFixed(2),
    input.previousHash,
  ];
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}

/** URL del QR. Estructura inspirada en TicketBAI/AEAT verificación pública.
 *  Mantiene los campos mínimos para que el receptor pueda comprobar la
 *  factura desde el documento impreso. */
export function buildQrPayload(args: {
  emitterTaxId: string | null;
  seriesCode:   string;
  number:       number;
  issueDate:    string;
  totalGross:   number;
  hash:         string;
}): string {
  const params = new URLSearchParams({
    nif:    args.emitterTaxId ?? "",
    num:    `${args.seriesCode}-${args.number}`,
    fecha:  args.issueDate,
    total:  args.totalGross.toFixed(2),
    hash:   args.hash.slice(0, 16),
  });
  return `${QR_BASE_URL}?${params.toString()}`;
}

/** Snapshot estable de los datos que entran en la cadena, útil para guardar
 *  como `payload` en InvoiceAuditLog. Excluye campos volátiles. */
export function auditPayload(invoice: {
  id: string; number: number | null; status: string;
  issueDate: Date; subtotalNet: unknown; totalVat: unknown;
  totalGross: unknown; clientId: string;
}, extra: Record<string, unknown> = {}) {
  return {
    invoiceId: invoice.id,
    number:    invoice.number,
    status:    invoice.status,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    subtotalNet: Number(invoice.subtotalNet),
    totalVat:    Number(invoice.totalVat),
    totalGross:  Number(invoice.totalGross),
    clientId:    invoice.clientId,
    ...extra,
  };
}
