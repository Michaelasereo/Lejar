import { notFound } from "next/navigation";
import { render } from "@react-email/render";
import { GroupJarInviteEmail } from "@/emails/GroupJarInviteEmail";
import { MonthlySummaryEmail } from "@/emails/MonthlySummaryEmail";
import { StreakAtRiskEmail } from "@/emails/StreakAtRiskEmail";
import { TBillMaturityEmail } from "@/emails/TBillMaturityEmail";
import { VerificationCodeEmail } from "@/emails/VerificationCodeEmail";
import { WelcomeEmail } from "@/emails/WelcomeEmail";

export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const previews = await Promise.all([
    render(VerificationCodeEmail({ code: "482 917", expiresInMinutes: 10, name: "Opeyemi" })),
    render(WelcomeEmail({ name: "Opeyemi" })),
    render(
      GroupJarInviteEmail({
        inviterName: "Asere",
        jarName: "Q4 Family Trip",
        jarEmoji: "✈️",
        targetAmount: "₦800,000",
        dueDate: "December 2026",
        memberCount: 4,
        notes: "Let us lock this in early.",
        inviteUrl: "https://orjar.app/app/jars/invite/test",
      }),
    ),
    render(
      TBillMaturityEmail({
        name: "Opeyemi",
        tbillLabel: "FGN 364-day",
        amountInvested: "₦250,000",
        expectedReturn: "₦36,000",
        totalExpected: "₦286,000",
        maturityDate: "April 23, 2026",
        confirmUrl: "https://orjar.app/app/investments",
      }),
    ),
    render(
      MonthlySummaryEmail({
        name: "Opeyemi",
        month: "April 2026",
        totalIncome: "₦800,000",
        totalSaved: "₦448,000",
        totalSpent: "₦187,000",
        savingsRate: "56%",
        netWorth: "₦2,340,000",
        netWorthChange: "₦448,000",
        netWorthChangePositive: true,
        topSpendCategory: "Food",
        topSpendAmount: "₦120,000",
        streakCount: 4,
        streakType: "savings",
        dashboardUrl: "https://orjar.app/app/analytics",
      }),
    ),
    render(
      StreakAtRiskEmail({
        name: "Opeyemi",
        streakCount: 4,
        streakType: "savings",
        daysLeft: 2,
        actionUrl: "https://orjar.app/app/expenses",
      }),
    ),
  ]);

  const names = [
    "Verification code",
    "Welcome",
    "Group jar invite",
    "T-bill maturity",
    "Monthly summary",
    "Streak at risk",
  ];

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-medium">Email Preview</h1>
      {previews.map((html, idx) => (
        <section key={names[idx]} className="space-y-2">
          <h2 className="text-sm text-white/70">{names[idx]}</h2>
          <iframe
            title={names[idx]}
            className="h-[760px] w-full border border-white/10 bg-white"
            srcDoc={html}
          />
        </section>
      ))}
    </div>
  );
}
