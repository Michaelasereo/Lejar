import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";

export const metadata: Metadata = {
  title: "Check your email — Orjar",
  description: "Confirm your email to finish signing up.",
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "";

  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.03]">
        <Mail className="h-7 w-7 text-white/40" strokeWidth={1.25} aria-hidden />
      </div>
      <h1 className="text-2xl font-medium tracking-tight text-foreground">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/50">
        We sent a verification link to{" "}
        {email ? (
          <span className="text-white/80">{decodeURIComponent(email)}</span>
        ) : (
          <span className="text-white/40">the address you used</span>
        )}
        . Open it to activate your account.
      </p>

      <div className="mt-10 space-y-4">
        <ResendVerificationButton email={email} />
        <Link
          href="/login"
          prefetch={false}
          className="block text-sm font-medium text-white/50 underline-offset-4 transition-colors hover:text-white/75 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
