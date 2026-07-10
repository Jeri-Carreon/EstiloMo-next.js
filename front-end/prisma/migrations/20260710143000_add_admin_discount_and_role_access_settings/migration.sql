CREATE TABLE "DiscountButtonSetting" (
  "id" TEXT NOT NULL,
  "percent" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscountButtonSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountButtonSetting_percent_key"
  ON "DiscountButtonSetting"("percent");

CREATE TABLE "AdminRoleTabAccess" (
  "id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "tabKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminRoleTabAccess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminRoleTabAccess_role_idx"
  ON "AdminRoleTabAccess"("role");

CREATE UNIQUE INDEX "AdminRoleTabAccess_role_tabKey_key"
  ON "AdminRoleTabAccess"("role", "tabKey");

INSERT INTO "AdminRoleTabAccess" ("id", "role", "tabKey", "createdAt", "updatedAt")
VALUES
  ('RECEPTIONIST-dashboard', 'RECEPTIONIST', 'dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST-customers', 'RECEPTIONIST', 'customers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST-barbers', 'RECEPTIONIST', 'barbers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST-appointments', 'RECEPTIONIST', 'appointments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST-sales', 'RECEPTIONIST', 'sales', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RECEPTIONIST-loyaltyCard', 'RECEPTIONIST', 'loyaltyCard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('BARBER-barbers', 'BARBER', 'barbers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
