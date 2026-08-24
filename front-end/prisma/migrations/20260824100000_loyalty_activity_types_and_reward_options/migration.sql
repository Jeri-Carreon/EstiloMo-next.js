ALTER TABLE "LoyaltyCardActivity"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'OTHER';

CREATE TABLE "LoyaltyRewardOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyRewardOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyRewardOption_name_key" ON "LoyaltyRewardOption"("name");
CREATE UNIQUE INDEX "LoyaltyRewardOption_value_key" ON "LoyaltyRewardOption"("value");

INSERT INTO "LoyaltyRewardOption" ("id", "name", "value", "createdAt", "updatedAt")
VALUES
  ('loyalty-reward-50', '50% Off', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('loyalty-reward-100', '100% Off', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("value") DO NOTHING;
