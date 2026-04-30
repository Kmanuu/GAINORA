-- Régimen fiscal del cliente y recargo de equivalencia.
-- NATIONAL es el default seguro (no rompe clientes existentes).
CREATE TYPE IF NOT EXISTS "TaxRegime" AS ENUM ('NATIONAL', 'EU_INTRA', 'NON_EU');

ALTER TABLE "clients"
  ADD COLUMN "tax_regime"    "TaxRegime" NOT NULL DEFAULT 'NATIONAL',
  ADD COLUMN "has_surcharge" BOOLEAN     NOT NULL DEFAULT false;
