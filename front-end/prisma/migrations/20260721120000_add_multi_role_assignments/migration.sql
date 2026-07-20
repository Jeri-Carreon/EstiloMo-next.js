ALTER TABLE "AdminStaffRole"
ADD COLUMN IF NOT EXISTS "id" TEXT,
ADD COLUMN IF NOT EXISTS "normalizedName" TEXT,
ADD COLUMN IF NOT EXISTS "systemKey" TEXT,
ADD COLUMN IF NOT EXISTS "isSystemRole" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AdminStaffRole"
SET
  "id" = CASE
    WHEN "role" = 'OWNER' THEN 'system_owner'
    WHEN "role" = 'RECEPTIONIST' THEN 'system_receptionist'
    WHEN "role" = 'BARBER' THEN 'system_barber'
    WHEN "role" = 'CUSTOMER' THEN 'system_customer'
    WHEN "id" IS NULL OR "id" = "role" THEN 'role_' || md5(LOWER(TRIM("role")))
    ELSE "id"
  END,
  "normalizedName" = COALESCE("normalizedName", LOWER(TRIM("role"))),
  "systemKey" = CASE
    WHEN "role" IN ('OWNER', 'RECEPTIONIST', 'BARBER', 'CUSTOMER') THEN "role"
    ELSE "systemKey"
  END,
  "isSystemRole" = CASE
    WHEN "role" IN ('OWNER', 'RECEPTIONIST', 'BARBER', 'CUSTOMER') THEN true
    ELSE "isSystemRole"
  END,
  "isBuiltIn" = CASE
    WHEN "role" IN ('OWNER', 'RECEPTIONIST', 'BARBER', 'CUSTOMER') THEN true
    ELSE "isBuiltIn"
  END;

INSERT INTO "AdminStaffRole" ("id", "role", "normalizedName", "systemKey", "displayName", "isBuiltIn", "isSystemRole", "isActive", "createdAt", "updatedAt")
VALUES
  ('system_owner', 'OWNER', 'owner', 'OWNER', 'Owner', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system_receptionist', 'RECEPTIONIST', 'receptionist', 'RECEPTIONIST', 'Receptionist', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system_barber', 'BARBER', 'barber', 'BARBER', 'Barber', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system_customer', 'CUSTOMER', 'customer', 'CUSTOMER', 'Customer', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("role") DO UPDATE
SET
  "id" = CASE
    WHEN "AdminStaffRole"."id" IS NULL OR "AdminStaffRole"."id" = "AdminStaffRole"."role" THEN EXCLUDED."id"
    ELSE "AdminStaffRole"."id"
  END,
  "normalizedName" = COALESCE("AdminStaffRole"."normalizedName", EXCLUDED."normalizedName"),
  "systemKey" = EXCLUDED."systemKey",
  "displayName" = EXCLUDED."displayName",
  "isBuiltIn" = true,
  "isSystemRole" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "AdminStaffRole"
ALTER COLUMN "id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_id_key"
ON "AdminStaffRole"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_normalizedName_key"
ON "AdminStaffRole"("normalizedName");

CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_systemKey_key"
ON "AdminStaffRole"("systemKey");

CREATE TABLE IF NOT EXISTS "UserRoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" TEXT,
  "assignedRoleName" TEXT NOT NULL,
  "removedAt" TIMESTAMP(3),
  "removedBy" TEXT,
  "removedRoleName" TEXT,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserRoleAssignment_userId_removedAt_idx"
ON "UserRoleAssignment"("userId", "removedAt");

CREATE INDEX IF NOT EXISTS "UserRoleAssignment_roleId_removedAt_idx"
ON "UserRoleAssignment"("roleId", "removedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "UserRoleAssignment_userId_roleId_active_key"
ON "UserRoleAssignment"("userId", "roleId")
WHERE "removedAt" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserRoleAssignment_userId_fkey'
  ) THEN
    ALTER TABLE "UserRoleAssignment"
    ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserRoleAssignment_roleId_fkey'
  ) THEN
    ALTER TABLE "UserRoleAssignment"
    ADD CONSTRAINT "UserRoleAssignment_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "AdminStaffRole"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId", "assignedAt", "assignedRoleName")
SELECT
  "User"."id" || '-' || "AdminStaffRole"."id",
  "User"."id",
  "AdminStaffRole"."id",
  CURRENT_TIMESTAMP,
  "AdminStaffRole"."displayName"
FROM "User"
JOIN "AdminStaffRole"
  ON LOWER(TRIM("AdminStaffRole"."role")) = LOWER(TRIM("User"."role"))
WHERE "User"."role" IS NOT NULL
  AND TRIM("User"."role") <> ''
  AND UPPER(TRIM("User"."role")) <> 'CUSTOMER'
ON CONFLICT DO NOTHING;

ALTER TABLE "SecurityLog"
ADD COLUMN IF NOT EXISTS "metadata" JSONB;
