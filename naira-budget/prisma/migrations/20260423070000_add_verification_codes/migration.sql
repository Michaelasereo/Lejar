-- CreateEnum
CREATE TYPE "VerificationCodePurpose" AS ENUM ('SIGNUP', 'LOGIN');

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "VerificationCodePurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationCode_email_purpose_idx" ON "VerificationCode"("email", "purpose");

-- CreateIndex
CREATE INDEX "VerificationCode_createdAt_idx" ON "VerificationCode"("createdAt");
