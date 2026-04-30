-- Criterio fiscal del autónomo: devengo (default) o caja.
-- Afecta a la composición de los modelos 303 y 130 en /v1/dashboard/tax-summary.
DO $$ BEGIN
  CREATE TYPE "TaxCriterion" AS ENUM ('ACCRUAL', 'CASH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN "tax_criterion" "TaxCriterion" NOT NULL DEFAULT 'ACCRUAL';
