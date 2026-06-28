ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "paymongoCheckoutSessionId" TEXT,
ADD COLUMN IF NOT EXISTS "paymongoPaymentId" TEXT,
ADD COLUMN IF NOT EXISTS "paymongoCheckoutUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paymongoCheckoutSessionId_key"
ON "Payment"("paymongoCheckoutSessionId");
