/*
  Warnings:

  - You are about to drop the column `userId` on the `LoyaltyCard` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `LoyaltyCard` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LoyaltyCard" DROP CONSTRAINT "LoyaltyCard_userId_fkey";

-- AlterTable
ALTER TABLE "LoyaltyCard" DROP COLUMN "userId",
ADD COLUMN     "customerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
