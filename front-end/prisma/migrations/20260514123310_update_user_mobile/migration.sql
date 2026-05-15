/*
  Warnings:

  - You are about to alter the column `mobileNumber` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(11)`.
  - Made the column `firstName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mobileNumber` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "mobileNumber" SET NOT NULL,
ALTER COLUMN "mobileNumber" SET DATA TYPE VARCHAR(11);
