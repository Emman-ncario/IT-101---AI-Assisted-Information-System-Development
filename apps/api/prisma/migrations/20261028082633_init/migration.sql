-- DropForeignKey
ALTER TABLE "BookingQueueItem" DROP CONSTRAINT "BookingQueueItem_classId_fkey";

-- DropForeignKey
ALTER TABLE "BookingQueueItem" DROP CONSTRAINT "BookingQueueItem_roomId_fkey";

-- DropForeignKey
ALTER TABLE "BookingQueueItem" DROP CONSTRAINT "BookingQueueItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "ClassMembership" DROP CONSTRAINT "ClassMembership_classId_fkey";

-- DropForeignKey
ALTER TABLE "ClassMembership" DROP CONSTRAINT "ClassMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Floor" DROP CONSTRAINT "Floor_buildingId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_classId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_floorId_fkey";

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "cancelledAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "_ClassRepresentatives" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassRepresentatives_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ClassRepresentatives_B_index" ON "_ClassRepresentatives"("B");

-- CreateIndex
CREATE INDEX "Room_floorId_active_idx" ON "Room"("floorId", "active");

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQueueItem" ADD CONSTRAINT "BookingQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQueueItem" ADD CONSTRAINT "BookingQueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQueueItem" ADD CONSTRAINT "BookingQueueItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassRepresentatives" ADD CONSTRAINT "_ClassRepresentatives_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassRepresentatives" ADD CONSTRAINT "_ClassRepresentatives_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
