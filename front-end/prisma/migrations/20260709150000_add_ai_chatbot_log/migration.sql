-- CreateTable
CREATE TABLE "AIChatbotLog" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "inputCostUSD" DECIMAL(12,4) NOT NULL,
    "outputCostUSD" DECIMAL(12,4) NOT NULL,
    "totalCostUSD" DECIMAL(12,4) NOT NULL,
    "exchangeRatePHP" DECIMAL(10,4) NOT NULL,
    "totalCostPHP" DECIMAL(12,4) NOT NULL,
    "userId" TEXT,
    "messagePreview" TEXT,
    "responsePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIChatbotLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIChatbotLog_createdAt_idx" ON "AIChatbotLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIChatbotLog_model_idx" ON "AIChatbotLog"("model");

-- CreateIndex
CREATE INDEX "AIChatbotLog_userId_idx" ON "AIChatbotLog"("userId");
