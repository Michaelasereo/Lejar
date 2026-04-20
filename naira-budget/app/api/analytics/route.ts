import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { analyticsQuerySchema } from "@/lib/validations/analytics-api";
import {
  analyticsToCsv,
  buildAnalyticsPayload,
  resolveMonthList,
  type AnalyticsRange,
} from "@/lib/utils/analytics";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = analyticsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const q = parsed.data;
  const range = q.range as AnalyticsRange;

  try {
    const refs = await resolveMonthList(prisma, auth.user.id, {
      range,
      monthKey: q.month,
      year: q.year,
      quarter: q.quarter,
      fromKey: q.from,
      toKey: q.to,
    });

    const payload = await buildAnalyticsPayload(prisma, auth.user.id, {
      range,
      refs,
    });

    if (q.format === "csv") {
      const csv = analyticsToCsv(payload);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="naira-budget-analytics.csv"',
        },
      });
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }
}
