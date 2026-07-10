-- CreateTable
CREATE TABLE "AIReportLog" (
    "id" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "reportType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "inputCostUSD" DECIMAL(12,4) NOT NULL,
    "outputCostUSD" DECIMAL(12,4) NOT NULL,
    "totalCostUSD" DECIMAL(12,4) NOT NULL,
    "exchangeRatePHP" DECIMAL(10,4) NOT NULL,
    "totalCostPHP" DECIMAL(12,4) NOT NULL,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIReportLog_generatedAt_idx" ON "AIReportLog"("generatedAt");

-- CreateIndex
CREATE INDEX "AIReportLog_generatedBy_idx" ON "AIReportLog"("generatedBy");

-- CreateIndex
CREATE INDEX "AIReportLog_reportType_idx" ON "AIReportLog"("reportType");
