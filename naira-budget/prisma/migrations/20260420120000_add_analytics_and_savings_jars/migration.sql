-- CreateEnum
CREATE TYPE "JarCategory" AS ENUM ('RENT', 'EMERGENCY_FUND', 'GADGET', 'TRAVEL', 'EDUCATION', 'INVESTMENT_CAPITAL', 'BUSINESS', 'CELEBRATION', 'OTHER');

-- CreateTable
CREATE TABLE "SavingsJar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏦',
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "savedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monthlyTarget" DECIMAL(14,2),
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

-- CreateTable
CREATE TABLE "JarContribution" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JarContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalIncome" DECIMAL(14,2) NOT NULL,
    "totalExpenses" DECIMAL(14,2) NOT NULL,
    "totalSaved" DECIMAL(14,2) NOT NULL,
    "savingsRate" DECIMAL(14,6) NOT NULL,
    "expenseByCategory" JSONB NOT NULL,
    "investmentValue" DECIMAL(14,2) NOT NULL,
    "tbillsValue" DECIMAL(14,2) NOT NULL,
    "risevest" DECIMAL(14,2) NOT NULL,
    "piggyvest" DECIMAL(14,2) NOT NULL,
    "ngx" DECIMAL(14,2) NOT NULL,
    "jarsProgress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsJar_userId_idx" ON "SavingsJar"("userId");

-- CreateIndex
CREATE INDEX "SavingsJar_userId_isPinned_idx" ON "SavingsJar"("userId", "isPinned");

-- CreateIndex
CREATE INDEX "SavingsJar_userId_sortOrder_idx" ON "SavingsJar"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "JarContribution_jarId_idx" ON "JarContribution"("jarId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySnapshot_userId_year_month_key" ON "MonthlySnapshot"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "MonthlySnapshot_userId_idx" ON "MonthlySnapshot"("userId");

-- AddForeignKey
ALTER TABLE "JarContribution" ADD CONSTRAINT "JarContribution_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "SavingsJar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
