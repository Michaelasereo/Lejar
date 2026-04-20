-- Naira Budget — apply once in Supabase → SQL Editor (connected to your project DB).
-- Matches prisma/schema.prisma (PostgreSQL + Prisma-style quoted table names).
-- Safe to re-run only if tables are missing; if you get "already exists", skip or drop conflicting tables first.

-- Order: Bucket before BucketAllocation / Expense (foreign keys).

CREATE TABLE IF NOT EXISTS "UserSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSettings_userId_key" UNIQUE ("userId")
);

CREATE TABLE IF NOT EXISTS "IncomeSource" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amountMonthly" DECIMAL(14, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IncomeSource_userId_idx" ON "IncomeSource" ("userId");

CREATE TABLE IF NOT EXISTS "Bucket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "allocatedAmount" DECIMAL(14, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bucket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Bucket_userId_idx" ON "Bucket" ("userId");

CREATE TABLE IF NOT EXISTS "BucketAllocation" (
  "id" TEXT NOT NULL,
  "bucketId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "platform" TEXT NOT NULL,
  "allocationType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BucketAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BucketAllocation_bucketId_fkey"
    FOREIGN KEY ("bucketId") REFERENCES "Bucket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BucketAllocation_bucketId_idx" ON "BucketAllocation" ("bucketId");

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bucketId" TEXT,
  "amount" DECIMAL(14, 2) NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_bucketId_fkey"
    FOREIGN KEY ("bucketId") REFERENCES "Bucket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Expense_userId_occurredAt_idx" ON "Expense" ("userId", "occurredAt");

CREATE TABLE IF NOT EXISTS "Investment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "investedAt" TIMESTAMP(3) NOT NULL,
  "maturityDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Investment_userId_idx" ON "Investment" ("userId");
CREATE INDEX IF NOT EXISTS "Investment_userId_maturityDate_idx" ON "Investment" ("userId", "maturityDate");

CREATE TABLE IF NOT EXISTS "RentJar" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "annualRent" DECIMAL(14, 2) NOT NULL,
  "nextDueDate" TIMESTAMP(3) NOT NULL,
  "savedAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentJar_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RentJar_userId_key" UNIQUE ("userId")
);

CREATE TABLE IF NOT EXISTS "GroceryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" TEXT,
  "estimatedPrice" DECIMAL(14, 2),
  "isPurchased" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GroceryItem_userId_isPurchased_sortOrder_idx"
  ON "GroceryItem" ("userId", "isPurchased", "sortOrder");

-- Analytics + multi-jar (matches migration add-analytics-and-savings-jars).

DO $$ BEGIN
  CREATE TYPE "JarCategory" AS ENUM (
    'RENT', 'EMERGENCY_FUND', 'GADGET', 'TRAVEL', 'EDUCATION',
    'INVESTMENT_CAPITAL', 'BUSINESS', 'CELEBRATION', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "SavingsJar" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT NOT NULL DEFAULT '🏦',
  "targetAmount" DECIMAL(14, 2) NOT NULL,
  "savedAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "monthlyTarget" DECIMAL(14, 2),
  "dueDate" TIMESTAMP(3),
  "color" TEXT NOT NULL DEFAULT '#16a34a',
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "category" "JarCategory" NOT NULL DEFAULT 'OTHER',
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavingsJar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavingsJar_userId_idx" ON "SavingsJar" ("userId");
CREATE INDEX IF NOT EXISTS "SavingsJar_userId_isPinned_idx" ON "SavingsJar" ("userId", "isPinned");
CREATE INDEX IF NOT EXISTS "SavingsJar_userId_sortOrder_idx" ON "SavingsJar" ("userId", "sortOrder");

CREATE TABLE IF NOT EXISTS "JarContribution" (
  "id" TEXT NOT NULL,
  "jarId" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "note" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JarContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JarContribution_jarId_idx" ON "JarContribution" ("jarId");

CREATE TABLE IF NOT EXISTS "MonthlySnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "totalIncome" DECIMAL(14, 2) NOT NULL,
  "totalExpenses" DECIMAL(14, 2) NOT NULL,
  "totalSaved" DECIMAL(14, 2) NOT NULL,
  "savingsRate" DECIMAL(14, 6) NOT NULL,
  "expenseByCategory" JSONB NOT NULL,
  "investmentValue" DECIMAL(14, 2) NOT NULL,
  "tbillsValue" DECIMAL(14, 2) NOT NULL,
  "risevest" DECIMAL(14, 2) NOT NULL,
  "piggyvest" DECIMAL(14, 2) NOT NULL,
  "ngx" DECIMAL(14, 2) NOT NULL,
  "jarsProgress" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlySnapshot_userId_year_month_key"
  ON "MonthlySnapshot" ("userId", "year", "month");
CREATE INDEX IF NOT EXISTS "MonthlySnapshot_userId_idx" ON "MonthlySnapshot" ("userId");

DO $$ BEGIN
  ALTER TABLE "JarContribution"
    ADD CONSTRAINT "JarContribution_jarId_fkey"
    FOREIGN KEY ("jarId") REFERENCES "SavingsJar" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
