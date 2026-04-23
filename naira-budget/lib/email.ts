import { render } from "@react-email/render";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GroupJarInviteEmail } from "@/emails/GroupJarInviteEmail";
import { MonthlySummaryEmail } from "@/emails/MonthlySummaryEmail";
import { StreakAtRiskEmail } from "@/emails/StreakAtRiskEmail";
import { TBillMaturityEmail } from "@/emails/TBillMaturityEmail";
import { VerificationCodeEmail } from "@/emails/VerificationCodeEmail";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { formatNaira } from "@/lib/utils/currency";
import { APP_URL, FROM, getResendClient } from "@/lib/resend";

function formatOtp(code: string): string {
  return code.replace(/(\d{3})(\d{3})/, "$1 $2");
}

async function sendEmail(input: { to: string; subject: string; html: string }) {
  const resend = getResendClient();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}

export async function safelySendEmail(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error("Email send failed:", error);
  }
}

export async function sendVerificationCodeEmail(params: {
  toEmail: string;
  code: string;
  name?: string;
}): Promise<void> {
  const formatted = formatOtp(params.code);
  const html = await render(
    VerificationCodeEmail({
      code: formatted,
      name: params.name,
      expiresInMinutes: 10,
    }),
  );
  await sendEmail({
    to: params.toEmail,
    subject: `${formatted} - your Orjar verification code`,
    html,
  });
}

export async function sendWelcomeEmail(params: {
  toEmail: string;
  name: string;
}): Promise<void> {
  const html = await render(WelcomeEmail({ name: params.name }));
  await sendEmail({
    to: params.toEmail,
    subject: `Welcome to Orjar, ${params.name}`,
    html,
  });
}

export async function sendGroupJarInvite(params: {
  toEmail: string;
  inviterName: string;
  jarName: string;
  jarEmoji: string;
  targetAmount: number;
  dueDate?: Date;
  memberCount: number;
  notes?: string;
  inviteToken: string;
}): Promise<void> {
  const inviteUrl = `${APP_URL}/app/jars/invite/${params.inviteToken}`;
  const html = await render(
    GroupJarInviteEmail({
      inviterName: params.inviterName,
      jarName: params.jarName,
      jarEmoji: params.jarEmoji,
      targetAmount: formatNaira(params.targetAmount),
      dueDate: params.dueDate ? format(params.dueDate, "MMMM yyyy") : undefined,
      memberCount: params.memberCount,
      notes: params.notes,
      inviteUrl,
    }),
  );
  await sendEmail({
    to: params.toEmail,
    subject: `${params.inviterName} invited you to save together on Orjar`,
    html,
  });
}

export async function sendTBillMaturityAlert(params: {
  toEmail: string;
  name: string;
  tbillLabel: string;
  amountInvested: number;
  expectedReturn: number;
  maturityDate: Date;
  investmentId: string;
}): Promise<void> {
  const confirmUrl = `${APP_URL}/app/investments?confirm=${params.investmentId}`;
  const totalExpected = params.amountInvested + params.expectedReturn;
  const html = await render(
    TBillMaturityEmail({
      name: params.name,
      tbillLabel: params.tbillLabel,
      amountInvested: formatNaira(params.amountInvested),
      expectedReturn: formatNaira(params.expectedReturn),
      totalExpected: formatNaira(totalExpected),
      maturityDate: format(params.maturityDate, "MMMM d, yyyy"),
      confirmUrl,
    }),
  );
  await sendEmail({
    to: params.toEmail,
    subject: `Your ${params.tbillLabel} matured - ${formatNaira(totalExpected)} expected`,
    html,
  });
}

export async function sendMonthlySummary(params: {
  toEmail: string;
  name: string;
  year: number;
  month: number;
  totalIncome: number;
  totalSaved: number;
  totalSpent: number;
  netWorth: number;
  previousNetWorth: number;
  topSpendCategory: string;
  topSpendAmount: number;
  streakCount?: number;
}): Promise<void> {
  const savingsRate =
    params.totalIncome > 0
      ? `${Math.round((params.totalSaved / params.totalIncome) * 100)}%`
      : "0%";
  const netWorthChange = Math.abs(params.netWorth - params.previousNetWorth);
  const monthLabel = format(new Date(params.year, params.month - 1), "MMMM yyyy");
  const html = await render(
    MonthlySummaryEmail({
      name: params.name,
      month: monthLabel,
      totalIncome: formatNaira(params.totalIncome),
      totalSaved: formatNaira(params.totalSaved),
      totalSpent: formatNaira(params.totalSpent),
      savingsRate,
      netWorth: formatNaira(params.netWorth),
      netWorthChange: formatNaira(netWorthChange),
      netWorthChangePositive: params.netWorth >= params.previousNetWorth,
      topSpendCategory: params.topSpendCategory,
      topSpendAmount: formatNaira(params.topSpendAmount),
      streakCount: params.streakCount,
      streakType: "savings",
      dashboardUrl: `${APP_URL}/app/analytics`,
    }),
  );
  await sendEmail({
    to: params.toEmail,
    subject: `Your ${monthLabel} summary - saved ${savingsRate}`,
    html,
  });
}

export async function sendStreakAtRiskAlert(params: {
  toEmail: string;
  name: string;
  streakCount: number;
  streakType: string;
  daysLeft: number;
}): Promise<void> {
  const html = await render(
    StreakAtRiskEmail({
      name: params.name,
      streakCount: params.streakCount,
      streakType: params.streakType,
      daysLeft: params.daysLeft,
      actionUrl: `${APP_URL}/app/expenses`,
    }),
  );
  await sendEmail({
    to: params.toEmail,
    subject: `Your ${params.streakCount}-month streak ends in ${params.daysLeft} days`,
    html,
  });
}

export async function sendWelcomeEmailIfFirstLogin(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  const existing = await prisma.userSettings.findUnique({
    where: { userId: params.userId },
    select: { welcomeEmailSent: true },
  });
  if (existing?.welcomeEmailSent) return;

  await sendWelcomeEmail({ toEmail: params.email, name: params.name });
  await prisma.userSettings.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      welcomeEmailSent: true,
    },
    update: { welcomeEmailSent: true },
  });
}
