-- Bienes de inversión: en el modelo 303 sus cuotas van a 30/31, no 28/29.
ALTER TABLE "fixed_costs"    ADD COLUMN "is_investment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "variable_costs" ADD COLUMN "is_investment" BOOLEAN NOT NULL DEFAULT false;
