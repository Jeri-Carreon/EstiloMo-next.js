/*
  Warnings:

  - You are about to drop the `BarberDayOff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BarberDayOff" DROP CONSTRAINT "BarberDayOff_barberId_fkey";

-- DropTable
DROP TABLE "BarberDayOff";

-- CreateTable
CREATE TABLE "BarberAbsent" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarberAbsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarberAbsent_barberId_date_key" ON "BarberAbsent"("barberId", "date");

-- AddForeignKey
ALTER TABLE "BarberAbsent" ADD CONSTRAINT "BarberAbsent_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
