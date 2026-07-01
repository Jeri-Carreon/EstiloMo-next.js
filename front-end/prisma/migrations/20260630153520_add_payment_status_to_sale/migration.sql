-- CreateEnum
CREATE TYPE "downPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "downPaymentStatus" "downPaymentStatus" NOT NULL DEFAULT 'PENDING';