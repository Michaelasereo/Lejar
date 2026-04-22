import { NextRequest, NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { onboardingApiSchema } from "@/lib/validations/onboarding";
import { Prisma } from "@prisma/client";

function sumIncome(sources: { amount: number }[]): number {
  return sources.reduce((a, b) => a + b.amount, 0);
}

function sumBuckets(buckets: { amount: number }[]): number {
  return buckets.reduce((a, b) => a + b.amount, 0);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (existing?.isOnboarded) {
    return NextResponse.json(
      { error: "Onboarding already completed" },
      { status: 400 },
    );
  }

  const json: unknown = await req.json();
  const parsed = onboardingApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const incomeTotal = sumIncome(body.incomeSources);
  const bucketTotal = sumBuckets(body.buckets);

  if (incomeTotal <= 0) {
    return NextResponse.json(
      { error: "Total income must be greater than zero" },
      { status: 400 },
    );
  }

  if (Math.abs(incomeTotal - bucketTotal) > 0.01) {
    return NextResponse.json(
      { error: "Bucket allocations must equal total income" },
      { status: 400 },
    );
  }

  if (!body.rentSkipped && body.rent) {
    const due = new Date(body.rent.nextDueDate);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: "Invalid rent due date" }, { status: 400 });
    }
  }

  const userId = user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userSettings.upsert({
        where: { userId },
        create: { userId, isOnboarded: true },
        update: { isOnboarded: true },
      });

      await tx.incomeSource.createMany({
        data: body.incomeSources.map((row) => ({
          userId,
          label: row.label,
          amountMonthly: new Prisma.Decimal(row.amount),
          effectiveFrom: startOfMonth(new Date()),
          effectiveTo: null,
          isActive: true,
        })),
      });

      for (let i = 0; i < body.buckets.length; i += 1) {
        const b = body.buckets[i]!;
        const bucket = await tx.bucket.create({
          data: {
            userId,
            name: b.name,
            color: b.color,
            sortOrder: i,
            percentage: b.percentage,
            allocatedAmount: new Prisma.Decimal(b.amount),
          },
        });
        await tx.bucketAllocation.create({
          data: {
            bucketId: bucket.id,
            label: `${b.name} allocation`,
            amount: new Prisma.Decimal(b.amount),
            percentage: b.percentage,
            platform: "OTHER",
            allocationType: "SPENDING",
          },
        });
      }

      if (!body.rentSkipped && body.rent && body.rent.annualAmount > 0) {
        await tx.rentJar.create({
          data: {
            userId,
            annualRent: new Prisma.Decimal(body.rent.annualAmount),
            nextDueDate: new Date(body.rent.nextDueDate),
            savedAmount: new Prisma.Decimal(0),
          },
        });
      }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save onboarding. Try again." },
      { status: 500 },
    );
  }
}
