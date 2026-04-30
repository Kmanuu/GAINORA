-- Tablas y enums que faltaban en el historial de migraciones.

-- Enums
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CARD', 'CASH', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- plans
CREATE TABLE IF NOT EXISTS "plans" (
    "id"                    UUID            NOT NULL,
    "tenant_id"             UUID            NOT NULL,
    "name"                  TEXT            NOT NULL,
    "tier"                  "ContractTier"  NOT NULL DEFAULT 'FREE',
    "description"           TEXT,
    "billing_mode"          "BillingMode"   NOT NULL DEFAULT 'SUBSCRIPTION',
    "price"                 DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "setup_fee"             DECIMAL(12,2),
    "hourly_rate"           DECIMAL(10,2),
    "parts_markup_pct"      DECIMAL(5,2),
    "maintenance_mode"      "MaintenanceMode" NOT NULL DEFAULT 'NONE',
    "maintenance_extra_pct" DECIMAL(5,2),
    "vat_rate"              DECIMAL(5,2)    NOT NULL DEFAULT 21,
    "price_includes_vat"    BOOLEAN         NOT NULL DEFAULT false,
    "features"              JSONB           NOT NULL DEFAULT '[]',
    "limits"                JSONB           NOT NULL DEFAULT '{}',
    "is_active"             BOOLEAN         NOT NULL DEFAULT true,
    "created_at"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "plans_tenant_id_name_key" ON "plans"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "plans_tenant_id_is_active_idx" ON "plans"("tenant_id", "is_active");
DO $$ BEGIN
  ALTER TABLE "plans" ADD CONSTRAINT "plans_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Columnas que faltaban en contracts
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "plan_id"   UUID          REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "irpf_rate" DECIMAL(5,2);

-- Columnas que faltaban en payments (renombrar amount→amount_net, paid_amount→amount_paid y añadir resto)
DO $$ BEGIN
  ALTER TABLE "payments" RENAME COLUMN "amount" TO "amount_net";
EXCEPTION WHEN undefined_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "payments" RENAME COLUMN "paid_amount" TO "amount_paid";
EXCEPTION WHEN undefined_column THEN null;
END $$;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_gross" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_due"   DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "irpf_amount"  DECIMAL(12,2) NOT NULL DEFAULT 0;

-- payment_transactions
CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id"         UUID            NOT NULL,
    "tenant_id"  UUID            NOT NULL,
    "payment_id" UUID            NOT NULL,
    "amount"     DECIMAL(12,2)   NOT NULL,
    "paid_at"    TIMESTAMP(3)    NOT NULL,
    "method"     "PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "reference"  TEXT,
    "notes"      TEXT,
    "created_at" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_transactions_payment_id_idx" ON "payment_transactions"("payment_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_tenant_id_paid_at_idx" ON "payment_transactions"("tenant_id", "paid_at");
DO $$ BEGIN
  ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- invoice_series
CREATE TABLE IF NOT EXISTS "invoice_series" (
    "id"          UUID         NOT NULL,
    "tenant_id"   UUID         NOT NULL,
    "code"        TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "next_number" INTEGER      NOT NULL DEFAULT 1,
    "is_default"  BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_series_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_series_tenant_id_code_key" ON "invoice_series"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "invoice_series_tenant_id_idx" ON "invoice_series"("tenant_id");
DO $$ BEGIN
  ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- invoices (incluye todas las columnas que migraciones posteriores añadirían)
CREATE TABLE IF NOT EXISTS "invoices" (
    "id"                   UUID            NOT NULL,
    "tenant_id"            UUID            NOT NULL,
    "series_id"            UUID            NOT NULL,
    "number"               INTEGER,
    "status"               "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date"           DATE            NOT NULL,
    "due_date"             DATE,
    "contract_id"          UUID,
    "client_id"            UUID            NOT NULL,
    "payment_id"           UUID,
    "rectifies_invoice_id" UUID,
    "subtotal_net"         DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "total_vat"            DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "total_irpf"           DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "total_surcharge"      DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "total_gross"          DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "notes"                TEXT,
    "previous_hash"        VARCHAR(64),
    "current_hash"         VARCHAR(64),
    "qr_payload"           TEXT,
    "created_at"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_id_series_id_number_key" ON "invoices"("tenant_id", "series_id", "number");
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX IF NOT EXISTS "invoices_contract_id_idx" ON "invoices"("contract_id");
CREATE INDEX IF NOT EXISTS "invoices_payment_id_idx" ON "invoices"("payment_id");
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "invoice_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rectifies_invoice_id_fkey"
    FOREIGN KEY ("rectifies_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- invoice_lines (incluye surcharge_rate y line_surcharge que migraciones posteriores añadirían)
CREATE TABLE IF NOT EXISTS "invoice_lines" (
    "id"            UUID          NOT NULL,
    "invoice_id"    UUID          NOT NULL,
    "description"   TEXT          NOT NULL,
    "quantity"      DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price"    DECIMAL(12,4) NOT NULL,
    "vat_rate"      DECIMAL(5,2)  NOT NULL DEFAULT 21,
    "irpf_rate"     DECIMAL(5,2)  NOT NULL DEFAULT 0,
    "surcharge_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount"      DECIMAL(5,2)  NOT NULL DEFAULT 0,
    "line_net"      DECIMAL(12,2) NOT NULL,
    "line_surcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_gross"    DECIMAL(12,2) NOT NULL,
    "position"      INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");
DO $$ BEGIN
  ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
