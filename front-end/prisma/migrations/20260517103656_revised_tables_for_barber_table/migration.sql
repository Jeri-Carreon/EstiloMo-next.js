/*
  Warnings:

  - A unique constraint covering the columns `[appointmentCode]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `appointmentCode` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `barberId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerId` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `firstName` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastName` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOSHOW');

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_customerId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "appointmentCode" TEXT NOT NULL,
ADD COLUMN     "barberId" TEXT NOT NULL,
ADD COLUMN     "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "customerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "Barber" (
    "id" TEXT NOT NULL,
    "barberCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barber_barberCode_key" ON "Barber"("barberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_userId_key" ON "Barber"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentCode_key" ON "Appointment"("appointmentCode");

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
