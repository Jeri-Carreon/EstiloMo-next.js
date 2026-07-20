CREATE TABLE "UserRoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_key"
  ON "UserRoleAssignment"("userId", "role");

CREATE INDEX "UserRoleAssignment_role_idx"
  ON "UserRoleAssignment"("role");

ALTER TABLE "UserRoleAssignment"
  ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserRoleAssignment" ("id", "userId", "role", "createdAt", "updatedAt")
SELECT
  "User"."id" || '-' || "User"."role"::text,
  "User"."id",
  "User"."role",
  NOW(),
  NOW()
FROM "User"
ON CONFLICT ("userId", "role") DO NOTHING;
