-- AlterTable
ALTER TABLE "AppointmentSetting" ADD COLUMN     "pendingCheckoutExpirationMinutes" INTEGER NOT NULL DEFAULT 15;
