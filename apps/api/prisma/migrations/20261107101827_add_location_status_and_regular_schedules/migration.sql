-- AlterTable
ALTER TABLE "Building" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Floor" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RegularSchedule" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "days" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleException" (
    "id" TEXT NOT NULL,
    "regularScheduleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CANCELLED',
    "newStartTime" TEXT,
    "newEndTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegularSchedule_roomId_active_idx" ON "RegularSchedule"("roomId", "active");

-- CreateIndex
CREATE INDEX "RegularSchedule_classId_idx" ON "RegularSchedule"("classId");

-- CreateIndex
CREATE INDEX "ScheduleException_date_idx" ON "ScheduleException"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleException_regularScheduleId_date_key" ON "ScheduleException"("regularScheduleId", "date");

-- CreateIndex
CREATE INDEX "Building_active_idx" ON "Building"("active");

-- CreateIndex
CREATE INDEX "Floor_active_idx" ON "Floor"("active");

-- AddForeignKey
ALTER TABLE "RegularSchedule" ADD CONSTRAINT "RegularSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularSchedule" ADD CONSTRAINT "RegularSchedule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_regularScheduleId_fkey" FOREIGN KEY ("regularScheduleId") REFERENCES "RegularSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
