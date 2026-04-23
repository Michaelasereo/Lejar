import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/income/money";
import { safelySendEmail, sendTBillMaturityAlert } from "@/lib/email";

export interface InvestmentRecord {
  id: string;
  type: string;
  label: string;
  amount: number;
  expectedProfit: number | null;
  actualProfit: number | null;
  profitConfirmed: boolean;
  profitConfirmedAt: Date | null;
  investedAt: Date;
  maturityDate: Date | null;
  status: string;
}

export interface InvestmentsPageData {
  investments: InvestmentRecord[];
  portfolioTotalActive: number;
  confirmedReturnsTotal: number;
  grandTotal: number;
  byTypeActive: Record<string, number>;
  maturingSoon: Array<{
    id: string;
    label: string;
    amount: number;
    maturityDate: Date;
  }>;
}

const MS_DAY = 24 * 60 * 60 * 1000;

export async function getInvestmentsPageData(
  userId: string,
  userEmail?: string,
  userName?: string,
): Promise<InvestmentsPageData> {
  try {
    const maturedCandidates = await prisma.investment.findMany({
      where: {
        userId,
        type: "T_BILL",
        status: "ACTIVE",
        maturityDate: { lte: new Date() },
      },
      select: {
        id: true,
        label: true,
        amount: true,
        expectedProfit: true,
        maturityDate: true,
        maturityEmailSent: true,
      },
    });

    if (maturedCandidates.length > 0) {
      await prisma.investment.updateMany({
        where: {
          id: { in: maturedCandidates.map((item) => item.id) },
          status: "ACTIVE",
        },
        data: { status: "MATURED" },
      });

      if (userEmail) {
        await Promise.allSettled(
          maturedCandidates
            .filter((item) => item.maturityDate && !item.maturityEmailSent)
            .map((item) =>
              safelySendEmail(async () => {
                await sendTBillMaturityAlert({
                  toEmail: userEmail,
                  name: userName ?? "there",
                  tbillLabel: item.label,
                  amountInvested: toNumber(item.amount),
                  expectedReturn: toNumber(item.expectedProfit ?? 0),
                  maturityDate: item.maturityDate!,
                  investmentId: item.id,
                });
                await prisma.investment.update({
                  where: { id: item.id },
                  data: { maturityEmailSent: true },
                });
              }),
            ),
        );
      }
    }
  } catch {
    // Ignore to keep page resilient if enum/status transitions are not yet available.
  }

  const rows = await prisma.investment.findMany({
    where: { userId },
    // Keep this query compatible with pre-migration production schema.
    select: {
      id: true,
      type: true,
      label: true,
      amount: true,
      investedAt: true,
      maturityDate: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ investedAt: "desc" }, { createdAt: "desc" }],
  });

  const investments: InvestmentRecord[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    amount: toNumber(r.amount),
    expectedProfit: null,
    actualProfit: null,
    profitConfirmed: false,
    profitConfirmedAt: null,
    investedAt: r.investedAt,
    maturityDate: r.maturityDate,
    status: r.status,
  }));

  const active = rows.filter((r) => r.status === "ACTIVE" || r.status === "MATURED");
  const portfolioTotalActive = active.reduce((s, r) => s + toNumber(r.amount), 0);
  const confirmedReturnsTotal = rows
    .filter((r) => r.status === "MATURED_CONFIRMED")
    .reduce((s) => s, 0);
  const grandTotal = portfolioTotalActive + confirmedReturnsTotal;

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
    confirmedReturnsTotal,
    grandTotal,
    byTypeActive,
    maturingSoon,
  };
}
