ALTER TABLE "LoyaltyCardSetting"
ADD COLUMN "fiftyPercentStickerThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "freeStickerThreshold" INTEGER NOT NULL DEFAULT 10;
