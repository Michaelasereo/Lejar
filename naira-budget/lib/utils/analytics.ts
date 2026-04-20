import { Prisma, type PrismaClient } from "@prisma/client";
import { parseMonthKey } from "@/lib/dashboard/get-dashboard-data";
import { expenseCategoryLabel } from "@/lib/expenses/constants";
import { categoryDotColor } from "@/lib/utils/expense-category";

export type AnalyticsRange = "monthly" | "quarterly" | "annual" | "all" | "custom";

export interface MonthRef {
  year: number;
  month: number;
}

export interface MonthlyMetricRow {
  year: number;
  month: number;
  label: string;
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  savingsRatePercent: number;
  expenseByCategory: Record<string, number>;
  investmentValue: number;
  tbillsValue: number;
  risevest: number;
  piggyvest: number;
  ngx: number;
  usesSnapshotPortfolio: boolean;
}

export interface JarProgressSnapshot {
  jarId: string;
  name: string;
  emoji: string;
  saved: number;
  target: number;
  percent: number;
}

export interface AnalyticsResponseBody {
  range: AnalyticsRange;
  months: MonthlyMetricRow[];
  monthKeys: string[];
  heatmapDaily: Array<{ day: number; amount: number }>;
  heatmapEligible: boolean;
  aggregateExpenseByCategory: Record<string, number>;
  cumulativeSavings: Array<{ label: string; saved: number }>;
  savingsRateBars: Array<{ label: string; rate: number }>;
  portfolioStacked: Array<{
    label: string;
    tbills: number;
    risevest: number;
    piggyvest: number;
    ngx: number;
    total: number;
  }>;
  incomeVsExpenseTrend: Array<{
    label: string;
    income: number;
    expenses: number;
  }>;
  streakMonths: number;
  insights: string[];
  jarsProgress: JarProgressSnapshot[];
}

export function monthKey(ref: MonthRef): string {
  return `${ref.year}-${String(ref.month).padStart(2, "0")}`;
}

export function labelMonth(ref: MonthRef): string {
  return new Date(ref.year, ref.month - 1, 1).toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  });
}

function toNum(v: { toString(): string } | number): number {
  if (typeof v === "number") return v;
  return parseFloat(v.toString());
}

export async function earliestUserMonth(
  prisma: PrismaClient,
  userId: string,
): Promise<MonthRef | null> {
  const [expMin, incomeMin] = await Promise.all([
    prisma.expense.findFirst({
      where: { userId },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
    prisma.incomeSource.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  const dates = [expMin?.occurredAt, incomeMin?.createdAt].filter(Boolean) as Date[];
  if (dates.length === 0) return null;
  const t = dates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  return { year: t.getFullYear(), month: t.getMonth() + 1 };
}

export async function resolveMonthList(
  prisma: PrismaClient,
  userId: string,
  params: {
    range: AnalyticsRange;
    monthKey?: string;
    year?: number;
    quarter?: number;
    fromKey?: string;
    toKey?: string;
  },
): Promise<MonthRef[]> {
  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;

  switch (params.range) {
    case "monthly": {
      const mk = params.monthKey ?? `${yNow}-${String(mNow).padStart(2, "0")}`;
      const p = parseMonthKey(mk);
      return p ? [{ year: p.y, month: p.m }] : [{ year: yNow, month: mNow }];
    }
    case "quarterly": {
      const y = params.year ?? yNow;
      const q = params.quarter ?? Math.floor((mNow - 1) / 3) + 1;
      const startM = (q - 1) * 3 + 1;
      return [0, 1, 2].map((i) => ({
        year: y,
        month: startM + i,
      }));
    }
    case "annual": {
      const y = params.year ?? yNow;
      return Array.from({ length: 12 }, (_, i) => ({
        year: y,
        month: i + 1,
      }));
    }
    case "custom": {
      const fk = params.fromKey;
      const tk = params.toKey;
      if (!fk || !tk) return [{ year: yNow, month: mNow }];
      const a = parseMonthKey(fk);
      const b = parseMonthKey(tk);
      if (!a || !b) return [{ year: yNow, month: mNow }];
      const out: MonthRef[] = [];
      let cy = a.y;
      let cm = a.m;
      while (cy < b.y || (cy === b.y && cm <= b.m)) {
        out.push({ year: cy, month: cm });
        cm += 1;
        if (cm > 12) {
          cm = 1;
          cy += 1;
        }
      }
      return out.length > 0 ? out : [{ year: yNow, month: mNow }];
    }
    case "all": {
      const start = await earliestUserMonth(prisma, userId);
      if (!start) return [{ year: yNow, month: mNow }];
      const maxMonths = 120;
      const out: MonthRef[] = [];
      let cy = start.year;
      let cm = start.month;
      let count = 0;
      while (
        count < maxMonths &&
        (cy < yNow || (cy === yNow && cm <= mNow))
      ) {
        out.push({ year: cy, month: cm });
        cm += 1;
        if (cm > 12) {
          cm = 1;
          cy += 1;
        }
        count += 1;
      }
      return out.length > 0 ? out : [{ year: yNow, month: mNow }];
    }
    default:
      return [{ year: yNow, month: mNow }];
  }
}

async function computeCoreMonth(
  prisma: PrismaClient,
  userId: string,
  ref: MonthRef,
): Promise<{
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  savingsRatePercent: number;
  expenseByCategory: Record<string, number>;
}> {
  const start = new Date(ref.year, ref.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(ref.year, ref.month, 0, 23, 59, 59, 999);

  const [incomeSources, expenses] = await Promise.all([
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.expense.findMany({
      where: {
        userId,
        occurredAt: { gte: start, lte: end },
      },
    }),
  ]);

  const totalIncome = incomeSources.reduce((s, r) => s + toNum(r.amountMonthly), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toNum(e.amount), 0);
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expenseByCategory[e.category] =
      (expenseByCategory[e.category] ?? 0) + toNum(e.amount);
  }
  const totalSaved = Math.max(0, totalIncome - totalExpenses);
  const savingsRatePercent =
    totalIncome > 0
      ? Math.round((totalSaved / totalIncome) * 1000) / 10
      : 0;

  return {
    totalIncome,
    totalExpenses,
    totalSaved,
    savingsRatePercent,
    expenseByCategory,
  };
}

export async function liveInvestmentSplit(
  prisma: PrismaClient,
  userId: string,
): Promise<{
  investmentValue: number;
  tbillsValue: number;
  risevest: number;
  piggyvest: number;
  ngx: number;
}> {
  const investments = await prisma.investment.findMany({
    where: { userId, status: "ACTIVE" },
  });
  let tbillsValue = 0;
  let risevest = 0;
  let piggyvest = 0;
  let ngx = 0;
  for (const inv of investments) {
    const a = toNum(inv.amount);
    if (inv.type === "T_BILL") tbillsValue += a;
    else if (inv.type === "RISEVEST") risevest += a;
    else if (inv.type === "PIGGYVEST") piggyvest += a;
    else if (inv.type === "NGX") ngx += a;
  }
  const investmentValue = tbillsValue + risevest + piggyvest + ngx;
  return { investmentValue, tbillsValue, risevest, piggyvest, ngx };
}

export async function buildMonthlyRow(
  prisma: PrismaClient,
  userId: string,
  ref: MonthRef,
  snapshot: {
    investmentValue: Prisma.Decimal;
    tbillsValue: Prisma.Decimal;
    risevest: Prisma.Decimal;
    piggyvest: Prisma.Decimal;
    ngx: Prisma.Decimal;
  } | null,
): Promise<MonthlyMetricRow> {
  const core = await computeCoreMonth(prisma, userId, ref);
  let usesSnapshotPortfolio = false;
  let portfolio;
  if (snapshot) {
    usesSnapshotPortfolio = true;
    portfolio = {
      investmentValue: toNum(snapshot.investmentValue),
      tbillsValue: toNum(snapshot.tbillsValue),
      risevest: toNum(snapshot.risevest),
      piggyvest: toNum(snapshot.piggyvest),
      ngx: toNum(snapshot.ngx),
    };
  } else {
    portfolio = await liveInvestmentSplit(prisma, userId);
  }

  return {
    year: ref.year,
    month: ref.month,
    label: labelMonth(ref),
    totalIncome: core.totalIncome,
    totalExpenses: core.totalExpenses,
    totalSaved: core.totalSaved,
    savingsRatePercent: core.savingsRatePercent,
    expenseByCategory: core.expenseByCategory,
    investmentValue: portfolio.investmentValue,
    tbillsValue: portfolio.tbillsValue,
    risevest: portfolio.risevest,
    piggyvest: portfolio.piggyvest,
    ngx: portfolio.ngx,
    usesSnapshotPortfolio,
  };
}

export type PortfolioSnapshotSlice = {
  investmentValue: Prisma.Decimal;
  tbillsValue: Prisma.Decimal;
  risevest: Prisma.Decimal;
  piggyvest: Prisma.Decimal;
  ngx: Prisma.Decimal;
};

export async function loadSnapshotMap(
  prisma: PrismaClient,
  userId: string,
  refs: MonthRef[],
): Promise<Map<string, PortfolioSnapshotSlice>> {
  if (refs.length === 0) return new Map();
  const rows = await prisma.monthlySnapshot.findMany({
    where: {
      userId,
      OR: refs.map((r) => ({ year: r.year, month: r.month })),
    },
  });
  const map = new Map<string, PortfolioSnapshotSlice>();
  for (const row of rows) {
    map.set(monthKey({ year: row.year, month: row.month }), {
      investmentValue: row.investmentValue,
      tbillsValue: row.tbillsValue,
      risevest: row.risevest,
      piggyvest: row.piggyvest,
      ngx: row.ngx,
    });
  }
  return map;
}

async function dailySpendByDay(
  prisma: PrismaClient,
  userId: string,
  ref: MonthRef,
): Promise<Map<number, number>> {
  const start = new Date(ref.year, ref.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(ref.year, ref.month, 0, 23, 59, 59, 999);
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      occurredAt: { gte: start, lte: end },
    },
    select: { amount: true, occurredAt: true },
  });
  const byDay = new Map<number, number>();
  for (const e of expenses) {
    const d = e.occurredAt.getDate();
    byDay.set(d, (byDay.get(d) ?? 0) + toNum(e.amount));
  }
  return byDay;
}

export function aggregateCategories(
  months: MonthlyMetricRow[],
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const m of months) {
    for (const [k, v] of Object.entries(m.expenseByCategory)) {
      acc[k] = (acc[k] ?? 0) + v;
    }
  }
  return acc;
}

export function computeStreak(months: MonthlyMetricRow[]): number {
  let streak = 0;
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i]!;
    if (m.totalIncome <= 0) break;
    if (m.savingsRatePercent >= 5) streak += 1;
    else break;
  }
  return streak;
}

export function generateInsights(
  months: MonthlyMetricRow[],
  aggregateExpense: Record<string, number>,
  streak: number,
): string[] {
  const insights: string[] = [];
  if (months.length === 0) return insights;

  const last = months[months.length - 1]!;
  if (last.totalIncome > 0 && last.savingsRatePercent >= 15) {
    insights.push(
      `You saved ${last.savingsRatePercent}% of income in ${last.label} — strong discipline.`,
    );
  } else if (last.totalIncome > 0 && last.savingsRatePercent < 5) {
    insights.push(
      `Savings rate was ${last.savingsRatePercent}% in ${last.label}. Consider trimming discretionary categories.`,
    );
  }

  const topCat = Object.entries(aggregateExpense).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > 0) {
    insights.push(
      `Largest spend category in this range: ${expenseCategoryLabel(topCat[0])}.`,
    );
  }

  if (streak >= 3) {
    insights.push(`You're on a ${streak}-month streak of saving at least 5% of income.`);
  }

  const avgSaved =
    months.reduce((s, m) => s + m.totalSaved, 0) /
    Math.max(1, months.length);
  insights.push(
    `Average monthly surplus across this range: ₦${Math.round(avgSaved).toLocaleString("en-NG")}.`,
  );

  return insights.slice(0, 8);
}

export async function buildAnalyticsPayload(
  prisma: PrismaClient,
  userId: string,
  opts: {
    range: AnalyticsRange;
    refs: MonthRef[];
  },
): Promise<AnalyticsResponseBody> {
  const { range, refs } = opts;
  const snapMap = await loadSnapshotMap(prisma, userId, refs);

  const months: MonthlyMetricRow[] = [];
  for (const ref of refs) {
    const mk = monthKey(ref);
    const slice = snapMap.get(mk) ?? null;
    months.push(await buildMonthlyRow(prisma, userId, ref, slice));
  }

  const aggregateExpenseByCategory = aggregateCategories(months);
  let cum = 0;
  const cumulativeSavings = months.map((m) => {
    cum += m.totalSaved;
    return { label: m.label, saved: cum };
  });

  const savingsRateBars = months.map((m) => ({
    label: m.label,
    rate: m.savingsRatePercent,
  }));

  const portfolioStacked = months.map((m) => ({
    label: m.label,
    tbills: m.tbillsValue,
    risevest: m.risevest,
    piggyvest: m.piggyvest,
    ngx: m.ngx,
    total: m.investmentValue,
  }));

  const incomeVsExpenseTrend = months.map((m) => ({
    label: m.label,
    income: m.totalIncome,
    expenses: m.totalExpenses,
  }));

  const streakMonths = computeStreak(months);
  const insights = generateInsights(months, aggregateExpenseByCategory, streakMonths);

  const heatmapEligible = range === "monthly" && refs.length === 1;
  let heatmapDaily: Array<{ day: number; amount: number }> = [];
  if (heatmapEligible && refs[0]) {
    const byDay = await dailySpendByDay(prisma, userId, refs[0]);
    const dim = new Date(refs[0].year, refs[0].month, 0).getDate();
    heatmapDaily = Array.from({ length: dim }, (_, i) => ({
      day: i + 1,
      amount: byDay.get(i + 1) ?? 0,
    }));
  }

  const jars = await prisma.savingsJar.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }],
  });
  const jarsProgress: JarProgressSnapshot[] = jars.map((j) => {
    const saved = toNum(j.savedAmount);
    const target = toNum(j.targetAmount);
    const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    return {
      jarId: j.id,
      name: j.name,
      emoji: j.emoji,
      saved,
      target,
      percent,
    };
  });

  return {
    range,
    months,
    monthKeys: refs.map(monthKey),
    heatmapDaily,
    heatmapEligible,
    aggregateExpenseByCategory,
    cumulativeSavings,
    savingsRateBars,
    portfolioStacked,
    incomeVsExpenseTrend,
    streakMonths,
    insights,
    jarsProgress,
  };
}

export function categoryColorForAnalytics(cat: string): string {
  return categoryDotColor(cat);
}

export function analyticsToCsv(payload: AnalyticsResponseBody): string {
  const header = [
    "month",
    "income",
    "expenses",
    "saved",
    "savings_rate_pct",
    "portfolio_total",
  ].join(",");
  const lines = payload.months.map((m) =>
    [
      monthKey({ year: m.year, month: m.month }),
      m.totalIncome,
      m.totalExpenses,
      m.totalSaved,
      m.savingsRatePercent,
      m.investmentValue,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export async function upsertMonthlySnapshotForMonth(
  prisma: PrismaClient,
  userId: string,
  ref: MonthRef,
): Promise<void> {
  const core = await computeCoreMonth(prisma, userId, ref);
  const split = await liveInvestmentSplit(prisma, userId);
  const jars = await prisma.savingsJar.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  const jp: JarProgressSnapshot[] = jars.map((j) => {
    const saved = toNum(j.savedAmount);
    const target = toNum(j.targetAmount);
    const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    return {
      jarId: j.id,
      name: j.name,
      emoji: j.emoji,
      saved,
      target,
      percent,
    };
  });

  const savingsRate =
    core.totalIncome > 0 ? core.totalSaved / core.totalIncome : 0;

  await prisma.monthlySnapshot.upsert({
    where: {
      userId_year_month: {
        userId,
        year: ref.year,
        month: ref.month,
      },
    },
    create: {
      userId,
      year: ref.year,
      month: ref.month,
      totalIncome: new Prisma.Decimal(core.totalIncome),
      totalExpenses: new Prisma.Decimal(core.totalExpenses),
      totalSaved: new Prisma.Decimal(core.totalSaved),
      savingsRate: new Prisma.Decimal(savingsRate),
      expenseByCategory: core.expenseByCategory as Prisma.InputJsonValue,
      investmentValue: new Prisma.Decimal(split.investmentValue),
      tbillsValue: new Prisma.Decimal(split.tbillsValue),
      risevest: new Prisma.Decimal(split.risevest),
      piggyvest: new Prisma.Decimal(split.piggyvest),
      ngx: new Prisma.Decimal(split.ngx),
      jarsProgress:
        jp.length > 0 ? (jp as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
    update: {
      totalIncome: new Prisma.Decimal(core.totalIncome),
      totalExpenses: new Prisma.Decimal(core.totalExpenses),
      totalSaved: new Prisma.Decimal(core.totalSaved),
      savingsRate: new Prisma.Decimal(savingsRate),
      expenseByCategory: core.expenseByCategory as Prisma.InputJsonValue,
      investmentValue: new Prisma.Decimal(split.investmentValue),
      tbillsValue: new Prisma.Decimal(split.tbillsValue),
      risevest: new Prisma.Decimal(split.risevest),
      piggyvest: new Prisma.Decimal(split.piggyvest),
      ngx: new Prisma.Decimal(split.ngx),
      jarsProgress:
        jp.length > 0 ? (jp as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}
