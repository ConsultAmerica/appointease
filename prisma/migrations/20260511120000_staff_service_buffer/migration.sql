-- Buffer after each service ends before another booking can start (same calendar).
ALTER TABLE "Service" ADD COLUMN "bufferMinutesAfter" INTEGER NOT NULL DEFAULT 0;

-- Which staff members can perform which services (empty = not used; app treats no rows as "all staff").
CREATE TABLE "StaffService" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffService_staffUserId_serviceId_key" ON "StaffService"("staffUserId", "serviceId");

CREATE INDEX "StaffService_serviceId_idx" ON "StaffService"("serviceId");

ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
