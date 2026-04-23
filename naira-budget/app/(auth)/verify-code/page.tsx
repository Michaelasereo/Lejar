"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/ui/LoadingButton";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim();
  const type = searchParams.get("type") === "login" ? "login" : "signup";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const code = useMemo(() => digits.join(""), [digits]);

  async function verify(codeValue: string) {
    if (!email || codeValue.length !== CODE_LENGTH) return;
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const verifyType = type === "signup" ? "signup" : "magiclink";
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: codeValue,
      type: verifyType,
    });
    setIsSubmitting(false);
    if (verifyError) {
      setError("Invalid code. Try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      refs.current[0]?.focus();
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }

    if (type === "signup") {
      await fetch("/api/auth/welcome", { method: "POST" }).catch(() => null);
    }
    router.replace("/app/dashboard");
  }

  function setDigit(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
    const preview = [...digits];
    preview[index] = value;
    if (preview.every((d) => d.length === 1)) {
      const joined = preview.join("");
      void verify(joined);
    }
  }

  function onBackspace(index: number) {
    if (digits[index]) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    if (index > 0) {
      refs.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH)
      .fill("")
      .map((_, idx) => pasted[idx] ?? "");
    setDigits(next);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    refs.current[focusIndex]?.focus();
    if (pasted.length === CODE_LENGTH) {
      void verify(pasted);
    }
  }

  function startResendCountdown() {
    setResendIn(RESEND_SECONDS);
    const timer = window.setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function resendCode() {
    if (!email || resendIn > 0) return;
    setResendMsg(null);
    const supabase = createClient();
    const resendError =
      type === "signup"
        ? (
            await supabase.auth.resend({
              type: "signup",
              email,
            })
          ).error
        : (
            await supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: false },
            })
          ).error;
    if (resendError) {
      setResendMsg(resendError.message);
      return;
    }
    setResendMsg("Code resent.");
    startResendCountdown();
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.03]">
        <Mail className="h-7 w-7 text-white/40" />
      </div>
      <h1 className="text-2xl font-medium text-foreground">Enter your code</h1>
      <p className="mt-2 text-sm text-white/50">
        We sent a 6-digit code to{" "}
        <span className="text-white/75">{email || "your email"}</span>
      </p>

      <div className={`mt-6 flex justify-center gap-2 ${shake ? "animate-shake" : ""}`}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                onBackspace(index);
              }
            }}
            onPaste={onPaste}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="h-14 w-12 border border-white/10 bg-white/5 text-center text-xl font-medium text-white caret-transparent outline-none focus:border-white/30"
          />
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {resendMsg ? <p className="mt-3 text-sm text-white/60">{resendMsg}</p> : null}

      <LoadingButton
        type="button"
        state={isSubmitting ? "loading" : "idle"}
        loadingText="Verifying..."
        className="mt-6 w-full"
        size="lg"
        onClick={() => verify(code)}
        disabled={code.length !== CODE_LENGTH}
      >
        Verify
      </LoadingButton>

      <button
        type="button"
        onClick={() => void resendCode()}
        disabled={resendIn > 0}
        className="mt-4 text-sm text-white/55 hover:text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
      </button>

      <p className="mt-5 text-sm text-white/45">
        Wrong email?{" "}
        <Link href={type === "login" ? "/login" : "/signup"} className="text-white/70 hover:text-white">
          Go back
        </Link>
      </p>
    </div>
  );
}
