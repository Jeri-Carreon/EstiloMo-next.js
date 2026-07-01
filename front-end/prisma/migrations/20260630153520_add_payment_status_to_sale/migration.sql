<<<<<<< HEAD
-- CreateEnum
CREATE TYPE "downPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "downPaymentStatus" "downPaymentStatus" NOT NULL DEFAULT 'PENDING';
=======
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "dPaymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
>>>>>>> 186d696ac5187383278551397f2078d76e973815
