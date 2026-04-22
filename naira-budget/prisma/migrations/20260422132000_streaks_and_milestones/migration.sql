ALTER TABLE "UserSettings"
ADD COLUMN "targetSavingsRate" DOUBLE PRECISION NOT NULL DEFAULT 20;

CREATE TYPE "StreakType" AS ENUM (
  'MONTHLY_SAVINGS',
  'MONTHLY_BUDGET',
  'WEEKLY_LOGGING',
  'MONTHLY_INVESTING'
);

CREATE TYPE "MilestoneType" AS ENUM (
  'NET_WORTH_500K',
  'NET_WORTH_1M',
  'NET_WORTH_5M',
  'NET_WORTH_10M',
  'NET_WORTH_50M',
  'NET_WORTH_100M',
  'FIRST_INVESTMENT',
  'FIRST_TBILL',
  'FIRST_TBILL_ROLLOVER',
  'SAVINGS_STREAK_3',
  'SAVINGS_STREAK_6',
  'SAVINGS_STREAK_12',
  'FIRST_JAR_COMPLETE',
  'FIRST_EXPENSE_LOGGED',
  'FIRST_GROCERY_LOGGED',
  'BUDGET_RESPECTED_3'
);

CREATE TABLE "UserStreak" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "StreakType" NOT NULL,
  "currentCount" INTEGER NOT NULL DEFAULT 0,
  "longestCount" INTEGER NOT NULL DEFAULT 0,
  "lastRecordedPeriod" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3),
  "lastExtendedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserStreak_userId_type_key" ON "UserStreak"("userId", "type");
CREATE INDEX "UserStreak_userId_idx" ON "UserStreak"("userId");

CREATE TABLE "UserMilestone" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MilestoneType" NOT NULL,
  "value" DOUBLE PRECISION,
  "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isNew" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserMilestone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMilestone_userId_type_value_key" ON "UserMilestone"("userId", "type", "value");
CREATE INDEX "UserMilestone_userId_achievedAt_idx" ON "UserMilestone"("userId", "achievedAt");

CREATE TABLE "StreakWarning" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "streakType" "StreakType" NOT NULL,
  "message" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isDismissed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreakWarning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StreakWarning_userId_expiresAt_idx" ON "StreakWarning"("userId", "expiresAt");
