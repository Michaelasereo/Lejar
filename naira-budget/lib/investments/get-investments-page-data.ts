import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";

export interface InvestmentRecord {
  id: string;
  type: string;
  label: string;
  amount: number;
  investedAt: Date;
  maturityDate: Date | null;
  status: string;
}

export interface InvestmentsPageData {
  investments: InvestmentRecord[];
  portfolioTotalActive: number;
  byTypeActive: Record<string, number>;
  maturingSoon: Array<{
    id: string;
    label: string;
    amount: number;
    maturityDate: Date;
  }>;
}

const MS_DAY = 24 * 60 * 60 * 1000;

export async function getInvestmentsPageData(userId: string): Promise<InvestmentsPageData> {
  const rows = await prisma.investment.findMany({
    where: { userId },
    orderBy: [{ investedAt: "desc" }, { createdAt: "desc" }],
  });

  const investments: InvestmentRecord[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    amount: toNumber(r.amount),
    investedAt: r.investedAt,
    maturityDate: r.maturityDate,
    status: r.status,
  }));

  const active = rows.filter((r) => r.status === "ACTIVE");
  const portfolioTotalActive = active.reduce((s, r) => s + toNumber(r.amount), 0);

  const byTypeActive: Record<string, number> = {};
  for (const r of active) {
    const t = r.type;
    byTypeActive[t] = (byTypeActive[t] ?? 0) + toNumber(r.amount);
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * MS_DAY);

  const maturingSoon = active
    .filter(
      (r) =>
        r.type === "T_BILL" &&
        r.maturityDate !== null &&
        r.maturityDate > now &&
        r.maturityDate <= horizon,
    )
    .map((r) => ({
      id: r.id,
      label: r.label,
      amount: toNumber(r.amount),
      maturityDate: r.maturityDate as Date,
    }))
    .sort((a, b) => a.maturityDate.getTime() - b.maturityDate.getTime());

  return {
    investments,
    portfolioTotalActive,
    byTypeActive,
    maturingSoon,
  };
}
