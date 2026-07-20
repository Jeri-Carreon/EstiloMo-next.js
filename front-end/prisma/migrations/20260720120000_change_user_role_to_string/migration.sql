ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE TEXT
  USING "role"::text;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

DROP TYPE IF EXISTS "Role";

CREATE TABLE IF NOT EXISTS "AdminStaffRole" (
  "role" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminStaffRole_pkey" PRIMARY KEY ("role")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_role_lower_key"
  ON "AdminStaffRole"(LOWER("role"));

INSERT INTO "AdminStaffRole" ("role", "displayName", "isBuiltIn", "createdAt", "updatedAt")
VALUES
  ('OWNER', 'Owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST', 'Receptionist', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('BARBER', 'Barber', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("role") DO NOTHING;
