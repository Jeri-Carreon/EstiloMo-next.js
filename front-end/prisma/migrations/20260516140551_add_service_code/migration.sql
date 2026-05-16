/*
  Warnings:

  - A unique constraint covering the columns `[serviceCode]` on the table `Service` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serviceCode` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "serviceCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Service_serviceCode_key" ON "Service"("serviceCode");
