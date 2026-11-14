-- DropForeignKey
ALTER TABLE "ClassInvitationCode" DROP CONSTRAINT "ClassInvitationCode_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_createdById_fkey";

-- AlterTable
ALTER TABLE "ClassInvitationCode" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassInvitationCode" ADD CONSTRAINT "ClassInvitationCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
