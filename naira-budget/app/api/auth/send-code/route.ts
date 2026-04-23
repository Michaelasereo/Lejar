import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail } from "@/lib/email";
import {
  generateVerificationCode,
  hashVerificationCode,
  normalizeEmail,
  verificationPurposeFromInput,
} from "@/lib/auth/verification-code";
import { findAuthUserByEmail } from "@/lib/auth/supabase-users";
import { sendCodeSchema } from "@/lib/validations/auth-code";

const MIN_RESEND_SECONDS = 30;
const MAX_PER_HOUR = 5;
const CODE_EXPIRY_MINUTES = 10;

export async function POST(req: NextRequest) {
  const json: unknown = await req.json();
  const parsed = sendCodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const purpose = verificationPurposeFromInput(parsed.data.purpose);
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - MIN_RESEND_SECONDS * 1000);
  const hourlyThreshold = new Date(now.getTime() - 60 * 60 * 1000);

  const [recentCount, hourlyCount] = await Promise.all([
    prisma.verificationCode.count({
      where: {
        email,
        purpose,
        createdAt: { gte: recentThreshold },
      },
    }),
    prisma.verificationCode.count({
      where: {
        email,
        purpose,
        createdAt: { gte: hourlyThreshold },
      },
    }),
  ]);

  if (recentCount > 0) {
    return NextResponse.json(
      { error: `Please wait ${MIN_RESEND_SECONDS} seconds before requesting another code.` },
      { status: 429 },
    );
  }

  if (hourlyCount >= MAX_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in an hour." },
      { status: 429 },
    );
  }

  const authUser = await findAuthUserByEmail(email);
  if (parsed.data.purpose === "signup" && authUser?.email_confirmed_at) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (parsed.data.purpose === "login" && !authUser) {
    return NextResponse.json({ error: "No account found for this email." }, { status: 404 });
  }

  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.verificationCode.deleteMany({
      where: {
        email,
        purpose,
        consumedAt: null,
      },
    });
    await tx.verificationCode.create({
      data: {
        email,
        purpose,
        codeHash,
        expiresAt,
      },
    });
  });

  try {
    await sendVerificationCodeEmail({
      toEmail: email,
      code,
      name: parsed.data.fullName,
    });
  } catch (error) {
    // Roll back the just-created code so users are never blocked by a failed send.
    await prisma.verificationCode.deleteMany({
      where: {
        email,
        purpose,
        codeHash,
        consumedAt: null,
      },
    });

    const message = error instanceof Error ? error.message : "Could not send verification code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
