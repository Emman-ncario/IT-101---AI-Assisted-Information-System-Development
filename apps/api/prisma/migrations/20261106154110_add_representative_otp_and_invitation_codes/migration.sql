-- CreateTable
CREATE TABLE "ClassInvitationCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 2,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassInvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRepresentativeRegistration" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "otpExpiresAt" TIMESTAMP(3) NOT NULL,
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastOtpSentAt" TIMESTAMP(3) NOT NULL,
    "invitationCodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingRepresentativeRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassInvitationCode_codeHash_key" ON "ClassInvitationCode"("codeHash");

-- CreateIndex
CREATE INDEX "ClassInvitationCode_classId_active_idx" ON "ClassInvitationCode"("classId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRepresentativeRegistration_email_key" ON "PendingRepresentativeRegistration"("email");

-- CreateIndex
CREATE INDEX "PendingRepresentativeRegistration_otpExpiresAt_idx" ON "PendingRepresentativeRegistration"("otpExpiresAt");

-- AddForeignKey
ALTER TABLE "ClassInvitationCode" ADD CONSTRAINT "ClassInvitationCode_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassInvitationCode" ADD CONSTRAINT "ClassInvitationCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingRepresentativeRegistration" ADD CONSTRAINT "PendingRepresentativeRegistration_invitationCodeId_fkey" FOREIGN KEY ("invitationCodeId") REFERENCES "ClassInvitationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
