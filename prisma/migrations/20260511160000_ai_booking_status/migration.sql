-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "createdViaAiChat" BOOLEAN NOT NULL DEFAULT false;
