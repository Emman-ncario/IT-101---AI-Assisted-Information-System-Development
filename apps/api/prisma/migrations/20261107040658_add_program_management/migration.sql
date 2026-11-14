-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "programId" TEXT;

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Program_code_key" ON "Program"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Program_name_key" ON "Program"("name");

-- CreateIndex
CREATE INDEX "Program_active_idx" ON "Program"("active");

-- CreateIndex
CREATE INDEX "Class_programId_idx" ON "Class"("programId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Program records from existing classes
INSERT INTO "Program" ("id", "code", "name", "active", "createdAt")
SELECT
    'program_' || LOWER(SPLIT_PART("block", '-', 1)),
    SPLIT_PART("block", '-', 1),
    "program",
    true,
    CURRENT_TIMESTAMP
FROM "Class"
GROUP BY
    SPLIT_PART("block", '-', 1),
    "program";

-- Link existing classes to their corresponding programs
UPDATE "Class" AS c
SET "programId" = p."id"
FROM "Program" AS p
WHERE p."code" = SPLIT_PART(c."block", '-', 1);
