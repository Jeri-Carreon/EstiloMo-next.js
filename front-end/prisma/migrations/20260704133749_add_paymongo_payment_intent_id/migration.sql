/*
  Warnings:

  - A unique constraint covering the columns `[paymongoPaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymongoPaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymongoPaymentIntentId_key" ON "Payment"("paymongoPaymentIntentId");
