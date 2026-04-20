import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { migrateRentJarToSavingsJar } from "@/lib/savings-jars/migrate-rent-jar";

export async function POST() {
  const auth = await requireUser();
  if (!auth.user) return auth.error;

  try {
    const result = await migrateRentJarToSavingsJar(prisma, auth.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
