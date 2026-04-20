import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { createGroceryItemSchema } from "@/lib/validations/grocery";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const json: unknown = await req.json();
  const parsed = createGroceryItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const qty = body.quantity?.trim();
  const quantity = qty && qty.length > 0 ? qty : null;

  let estimatedPrice: Prisma.Decimal | null = null;
  if (body.estimatedPrice !== undefined && body.estimatedPrice !== null) {
    estimatedPrice = new Prisma.Decimal(body.estimatedPrice);
  }

  try {
    const agg = await prisma.groceryItem.aggregate({
      where: { userId: auth.user.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const row = await prisma.groceryItem.create({
      data: {
        userId: auth.user.id,
        label: body.label.trim(),
        quantity,
        estimatedPrice,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        label: row.label,
        quantity: row.quantity,
        estimatedPrice: row.estimatedPrice?.toString() ?? null,
        isPurchased: row.isPurchased,
        sortOrder: row.sortOrder,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not add item" }, { status: 500 });
  }
}
