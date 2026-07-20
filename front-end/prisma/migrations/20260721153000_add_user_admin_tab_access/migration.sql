CREATE TABLE IF NOT EXISTS "UserAdminTabAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tabKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAdminTabAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAdminTabAccess_userId_tabKey_key"
ON "UserAdminTabAccess"("userId", "tabKey");

CREATE INDEX IF NOT EXISTS "UserAdminTabAccess_userId_idx"
ON "UserAdminTabAccess"("userId");

CREATE INDEX IF NOT EXISTS "UserAdminTabAccess_tabKey_idx"
ON "UserAdminTabAccess"("tabKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserAdminTabAccess_userId_fkey'
  ) THEN
    ALTER TABLE "UserAdminTabAccess"
    ADD CONSTRAINT "UserAdminTabAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
