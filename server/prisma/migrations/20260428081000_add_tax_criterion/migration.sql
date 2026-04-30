-- Criterio fiscal del autónomo: devengo (default) o caja.
-- Afecta a la composición de los modelos 303 y 130 en /v1/dashboard/tax-summary.
CREATE TYPE IF NOT EXISTS "TaxCriterion" AS ENUM ('ACCRUAL', 'CASH');

ALTER TABLE "tenants"
  ADD COLUMN "tax_criterion" "TaxCriterion" NOT NULL DEFAULT 'ACCRUAL';
