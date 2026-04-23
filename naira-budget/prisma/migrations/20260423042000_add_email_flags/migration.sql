-- AlterTable
ALTER TABLE "Investment"
ADD COLUMN "maturityEmailSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSettings"
ADD COLUMN "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
