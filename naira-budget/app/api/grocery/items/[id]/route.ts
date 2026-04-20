import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { updateGroceryItemSchema } from "@/lib/validations/grocery";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const json: unknown = await req.json();
  const parsed = updateGroceryItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.groceryItem.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updateData: {
    label?: string;
    quantity?: string | null;
    estimatedPrice?: Prisma.Decimal | null;
    isPurchased?: boolean;
    sortOrder?: number;
  } = {};

  if (data.label !== undefined) updateData.label = data.label.trim();
  if (data.quantity !== undefined) {
    if (data.quantity === null) {
      updateData.quantity = null;
    } else {
      const t = data.quantity.trim();
      updateData.quantity = t.length > 0 ? t : null;
    }
  }
  if (data.estimatedPrice !== undefined) {
    updateData.estimatedPrice =
      data.estimatedPrice === null ? null : new Prisma.Decimal(data.estimatedPrice);
  }
  if (data.isPurchased !== undefined) updateData.isPurchased = data.isPurchased;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  try {
    const row = await prisma.groceryItem.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({
      id: row.id,
      label: row.label,
      quantity: row.quantity,
      estimatedPrice: row.estimatedPrice?.toString() ?? null,
      isPurchased: row.isPurchased,
      sortOrder: row.sortOrder,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update item" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  const { id } = context.params;

  const existing = await prisma.groceryItem.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.groceryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete item" }, { status: 500 });
  }
}
