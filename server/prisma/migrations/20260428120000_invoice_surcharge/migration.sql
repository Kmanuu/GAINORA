-- Recargo de equivalencia en factura (comerciantes minoristas).
ALTER TABLE "invoices"
  ADD COLUMN "total_surcharge" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "invoice_lines"
  ADD COLUMN "surcharge_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "line_surcharge" DECIMAL(12, 2) NOT NULL DEFAULT 0;
