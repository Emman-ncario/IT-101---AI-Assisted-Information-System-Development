CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'REPRESENTATIVE', 'ADMIN');
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "fullName" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL, "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Class" (
  "id" TEXT PRIMARY KEY, "block" TEXT NOT NULL UNIQUE, "program" TEXT NOT NULL,
  "yearLevel" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ClassMembership" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "classId" TEXT NOT NULL,
  "isRep" BOOLEAN NOT NULL DEFAULT FALSE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE,
  CONSTRAINT "ClassMembership_userId_classId_key" UNIQUE ("userId", "classId")
);
CREATE INDEX "ClassMembership_classId_idx" ON "ClassMembership"("classId");
CREATE TABLE "Building" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "description" TEXT NOT NULL, "imageUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Floor" (
  "id" TEXT PRIMARY KEY, "number" INTEGER NOT NULL, "buildingId" TEXT NOT NULL,
  CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE,
  CONSTRAINT "Floor_buildingId_number_key" UNIQUE ("buildingId", "number")
);
CREATE TABLE "Room" (
  "id" TEXT PRIMARY KEY, "number" TEXT NOT NULL, "name" TEXT NOT NULL, "capacity" INTEGER NOT NULL,
  "roomType" TEXT NOT NULL, "facilities" TEXT[] NOT NULL, "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "floorId" TEXT NOT NULL, CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE,
  CONSTRAINT "Room_floorId_number_key" UNIQUE ("floorId", "number")
);
CREATE TABLE "Reservation" (
  "id" TEXT PRIMARY KEY, "roomId" TEXT NOT NULL, "classId" TEXT NOT NULL, "createdById" TEXT NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED', "cancelledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT,
  CONSTRAINT "Reservation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT,
  CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Reservation_valid_interval" CHECK ("endAt" > "startAt"),
  CONSTRAINT "Reservation_slot_boundary" CHECK (
    EXTRACT(SECOND FROM "startAt") = 0 AND EXTRACT(SECOND FROM "endAt") = 0
    AND EXTRACT(MINUTE FROM "startAt") IN (0,30) AND EXTRACT(MINUTE FROM "endAt") IN (0,30)
  )
);
CREATE INDEX "Reservation_roomId_startAt_endAt_idx" ON "Reservation"("roomId", "startAt", "endAt");
CREATE INDEX "Reservation_classId_startAt_idx" ON "Reservation"("classId", "startAt");
CREATE INDEX "Reservation_createdById_idx" ON "Reservation"("createdById");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_no_overlap"
  EXCLUDE USING gist ("roomId" WITH =, tstzrange("startAt", "endAt", '[)') WITH &&)
  WHERE ("status" = 'CONFIRMED');
CREATE TABLE "BookingQueueItem" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "roomId" TEXT NOT NULL, "classId" TEXT NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "BookingQueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE,
  CONSTRAINT "BookingQueueItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE,
  CONSTRAINT "BookingQueueItem_valid_interval" CHECK ("endAt" > "startAt")
);
CREATE INDEX "BookingQueueItem_userId_createdAt_idx" ON "BookingQueueItem"("userId", "createdAt");

CREATE OR REPLACE FUNCTION enforce_two_class_representatives() RETURNS trigger AS $$
BEGIN
  IF NEW."isRep" = TRUE AND (TG_OP = 'INSERT' OR OLD."isRep" = FALSE) THEN
    IF (SELECT COUNT(*) FROM "ClassMembership" WHERE "classId" = NEW."classId" AND "isRep" = TRUE) >= 2 THEN
      RAISE EXCEPTION 'A class may have at most two representatives' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ClassMembership_max_two_representatives"
BEFORE INSERT OR UPDATE OF "isRep", "classId" ON "ClassMembership"
FOR EACH ROW EXECUTE FUNCTION enforce_two_class_representatives();
