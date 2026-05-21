/*
  Warnings:

  - You are about to drop the column `serviceCode` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `serviceCode` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customerCode]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerCode` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userCode` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Customer_serviceCode_key";

-- DropIndex
DROP INDEX "User_serviceCode_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "serviceCode",
ADD COLUMN     "customerCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "serviceCode",
ADD COLUMN     "userCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");
