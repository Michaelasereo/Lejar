import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../lib/prisma";
import { safelySendEmail, sendTBillMaturityAlert } from "../../lib/email";

export default async function handler() {
  const now = new Date();
  const matured = await prisma.investment.findMany({
    where: {
      type: "T_BILL",
      status: "ACTIVE",
      maturityDate: { lte: now },
    },
    select: {
      id: true,
      userId: true,
      label: true,
      amount: true,
      expectedProfit: true,
      maturityDate: true,
      maturityEmailSent: true,
    },
  });

  if (matured.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing Supabase env vars" }),
      { status: 500 },
    );
  }
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  await prisma.investment.updateMany({
    where: { id: { in: matured.map((item) => item.id) }, status: "ACTIVE" },
    data: { status: "MATURED" },
  });

  await Promise.allSettled(
    matured
      .filter((item) => item.maturityDate && !item.maturityEmailSent)
      .map((item) =>
        safelySendEmail(async () => {
          const { data } = await admin.auth.admin.getUserById(item.userId);
          const user = data.user;
          const email = user?.email;
          if (!email) return;
          const name =
            (user.user_metadata?.full_name as string | undefined) ?? "there";
          await sendTBillMaturityAlert({
            toEmail: email,
            name,
            tbillLabel: item.label,
            amountInvested: Number(item.amount),
            expectedReturn: Number(item.expectedProfit ?? 0),
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

  return new Response(JSON.stringify({ ok: true, processed: matured.length }), {
    status: 200,
  });
}
