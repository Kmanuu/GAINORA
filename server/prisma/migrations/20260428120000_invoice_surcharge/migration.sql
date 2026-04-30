-- Recargo de equivalencia en factura (comerciantes minoristas).
-- Columnas ya creadas en migración 20260428095000; IF NOT EXISTS por seguridad.
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "total_surcharge" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "invoice_lines"
  ADD COLUMN IF NOT EXISTS "surcharge_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "line_surcharge" DECIMAL(12, 2) NOT NULL DEFAULT 0;
