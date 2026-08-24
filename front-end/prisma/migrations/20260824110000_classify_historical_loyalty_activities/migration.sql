-- Classify only legacy rows that still have the schema-default type.  The
-- predicates intentionally require explicit historical evidence; ambiguous rows remain OTHER.
UPDATE "LoyaltyCardActivity"
SET "type" = 'REDEEMED'
WHERE "type" = 'OTHER'
  AND (
    "rewardUsed" <> 'NONE'
    OR LOWER("message") LIKE '%reward redeemed%'
    OR LOWER("message") LIKE '%redeemed%'
  );

UPDATE "LoyaltyCardActivity"
SET "type" = 'ADJUSTED'
WHERE "type" = 'OTHER'
  AND (
    LOWER("message") LIKE '%manually removed%'
    OR LOWER("message") LIKE '%manually adjusted%'
  );

UPDATE "LoyaltyCardActivity"
SET "type" = 'EARNED'
WHERE "type" = 'OTHER'
  AND (
    LOWER("message") LIKE '%sticker%earned%'
    OR LOWER("message") LIKE '%earned from trx-%'
    OR LOWER("message") LIKE '%manually added%'
  );
