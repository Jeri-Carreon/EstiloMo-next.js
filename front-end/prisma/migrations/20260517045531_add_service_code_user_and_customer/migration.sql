/*
  Warnings:

  - A unique constraint covering the columns `[serviceCode]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serviceCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serviceCode` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceCode` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "serviceCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "serviceCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_serviceCode_key" ON "Customer"("serviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_serviceCode_key" ON "User"("serviceCode");
