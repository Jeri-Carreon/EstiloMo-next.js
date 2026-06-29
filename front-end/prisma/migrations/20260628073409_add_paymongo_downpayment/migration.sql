<<<<<<< HEAD
/*
  Warnings:

  - You are about to drop the column `gcashRefNo` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `screenshotUrl` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "gcashRefNo",
DROP COLUMN "screenshotUrl";
=======
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
>>>>>>> 8e60a78150f8f7ef74e83230ca7585656ce4bd5b
