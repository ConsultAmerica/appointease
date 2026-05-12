-- CreateEnum
CREATE TYPE "SpecialRequestStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "assignedStaffUserId" TEXT,
ADD COLUMN     "specialRequestNote" TEXT,
ADD COLUMN     "specialRequestStatus" "SpecialRequestStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedStaffUserId_fkey" FOREIGN KEY ("assignedStaffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffUserId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAvailabilityRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversationLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "userId" TEXT,
    "customerEmail" TEXT,
    "messages" JSONB NOT NULL,
    "reply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConversationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeBlock_businessId_startAt_idx" ON "TimeBlock"("businessId", "startAt");

-- CreateIndex
CREATE INDEX "StaffAvailabilityRule_businessId_staffUserId_idx" ON "StaffAvailabilityRule"("businessId", "staffUserId");

-- CreateIndex
CREATE INDEX "AgentConversationLog_businessId_createdAt_idx" ON "AgentConversationLog"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailabilityRule" ADD CONSTRAINT "StaffAvailabilityRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailabilityRule" ADD CONSTRAINT "StaffAvailabilityRule_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversationLog" ADD CONSTRAINT "AgentConversationLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversationLog" ADD CONSTRAINT "AgentConversationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
