-- Flag isDemo en entidades raíz para poder sembrar y borrar datos demo
-- selectivamente desde el wizard "trying" sin afectar a registros reales.
ALTER TABLE "clients"     ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects"    ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contracts"   ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fixed_costs" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
