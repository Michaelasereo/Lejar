import { NextRequest, NextResponse } from "next/server";
import { VerificationCodePurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAdminClient, createAnonServerClient } from "@/lib/supabase/admin";
import {
  hashVerificationCode,
  normalizeEmail,
  verificationPurposeFromInput,
} from "@/lib/auth/verification-code";
import { findAuthUserByEmail } from "@/lib/auth/supabase-users";
import { verifyCodeSchema } from "@/lib/validations/auth-code";
import { getClientIp, limitByKey } from "@/lib/security/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const json: unknown = await req.json();
  const parsed = verifyCodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const purpose = verificationPurposeFromInput(parsed.data.purpose);
  const ip = getClientIp(req.headers.get("x-forwarded-for"));
  const ipLimit = limitByKey({
    namespace: "auth-verify-code-ip",
    keyParts: [ip],
    max: 40,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed) {
    console.warn("[security] auth-verify-code ip rate-limit hit", { ip, purpose: parsed.data.purpose });
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const emailLimit = limitByKey({
    namespace: "auth-verify-code-email",
    keyParts: [email, purpose],
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!emailLimit.allowed) {
    console.warn("[security] auth-verify-code email rate-limit hit", { email, purpose: parsed.data.purpose });
    return NextResponse.json(
      { error: "Too many attempts. Request a new code later." },
      { status: 429 },
    );
  }

  const now = new Date();

  const verification = await prisma.verificationCode.findFirst({
    where: {
      email,
      purpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }

  const inputHash = hashVerificationCode(parsed.data.code);
  if (verification.codeHash !== inputHash) {
    const attempts = verification.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.verificationCode.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "Too many invalid attempts. Request a new code." }, { status: 429 });
    }

    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts },
    });
    return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
  }

  try {
    if (purpose === VerificationCodePurpose.SIGNUP) {
      if (!parsed.data.password) {
        return NextResponse.json({ error: "Missing password for signup." }, { status: 400 });
      }

      const admin = createAdminClient();
      const existingUser = await findAuthUserByEmail(email);
      const fullName = parsed.data.fullName?.trim() || undefined;

      if (!existingUser) {
        const createResult = await admin.auth.admin.createUser({
          email,
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: fullName ? { full_name: fullName } : undefined,
        });
        if (createResult.error) {
          return NextResponse.json({ error: createResult.error.message }, { status: 400 });
        }
      } else {
        const updateResult = await admin.auth.admin.updateUserById(existingUser.id, {
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: fullName
            ? { ...(existingUser.user_metadata ?? {}), full_name: fullName }
            : undefined,
        });
        if (updateResult.error) {
          return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
        }
      }

      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { consumedAt: now },
      });
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();
    const linkResult = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkResult.error) {
      return NextResponse.json({ error: linkResult.error.message }, { status: 400 });
    }

    const actionLink = linkResult.data.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: "Could not create login session." }, { status: 500 });
    }
    const tokenHash = new URL(actionLink).searchParams.get("token_hash");
    if (!tokenHash) {
      return NextResponse.json({ error: "Could not verify login token." }, { status: 500 });
    }

    const anon = createAnonServerClient();
    const verifyOtpResult = await anon.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (verifyOtpResult.error || !verifyOtpResult.data.session) {
      return NextResponse.json(
        { error: verifyOtpResult.error?.message ?? "Could not create login session." },
        { status: 400 },
      );
    }

    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { consumedAt: now },
    });

    return NextResponse.json({
      ok: true,
      session: {
        access_token: verifyOtpResult.data.session.access_token,
        refresh_token: verifyOtpResult.data.session.refresh_token,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify code." },
      { status: 500 },
    );
  }
}
