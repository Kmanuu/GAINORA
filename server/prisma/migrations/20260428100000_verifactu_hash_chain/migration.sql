-- VeriFactu (RD 1007/2023): hash chain por serie + log inmutable de auditoría.
CREATE TYPE "InvoiceAuditAction" AS ENUM ('ISSUE', 'VOID', 'RECTIFY');

ALTER TABLE "invoices"
  ADD COLUMN "previous_hash" VARCHAR(64),
  ADD COLUMN "current_hash"  VARCHAR(64),
  ADD COLUMN "qr_payload"    TEXT;

CREATE TABLE "invoice_audit_logs" (
  "id"         UUID                NOT NULL,
  "tenant_id"  UUID                NOT NULL,
  "invoice_id" UUID                NOT NULL,
  "user_id"    UUID,
  "action"     "InvoiceAuditAction" NOT NULL,
  "payload"    JSONB               NOT NULL,
  "hash"       VARCHAR(64)         NOT NULL,
  "created_at" TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_audit_logs_invoice_id_idx"           ON "invoice_audit_logs"("invoice_id");
CREATE INDEX "invoice_audit_logs_tenant_id_created_at_idx" ON "invoice_audit_logs"("tenant_id", "created_at");

ALTER TABLE "invoice_audit_logs"
  ADD CONSTRAINT "invoice_audit_logs_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
