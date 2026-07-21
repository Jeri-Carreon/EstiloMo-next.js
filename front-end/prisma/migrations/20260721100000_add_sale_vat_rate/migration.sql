-- Historical VAT setting changes were not versioned before this migration.
-- Existing Sale subtotal/totalAmount/vatAmount values are preserved.
-- Legacy rows receive the current AppointmentSetting.vatRate fallback.
ALTER TABLE "Sale"
ADD COLUMN "vatRate" DECIMAL(5,4);

UPDATE "Sale"
SET "vatRate" = COALESCE(
  (
    SELECT "vatRate"
    FROM "AppointmentSetting"
    ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    LIMIT 1
  ),
  0.12
)
WHERE "vatRate" IS NULL;

ALTER TABLE "Sale"
ALTER COLUMN "vatRate" SET DEFAULT 0.12,
ALTER COLUMN "vatRate" SET NOT NULL;
