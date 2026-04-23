"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/ui/LoadingButton";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const PENDING_SIGNUP_KEY = "pending-signup";

export default function VerifyCodePage() {
  return (
    <Suspense fallback={<VerifyCodeFallback />}>
      <VerifyCodeClient />
    </Suspense>
  );
}

function VerifyCodeFallback() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-medium text-foreground">Enter your code</h1>
      <p className="mt-2 text-sm text-white/50">Loading verification...</p>
    </div>
  );
}

function VerifyCodeClient() {
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
    let pendingSignup:
      | {
          email?: string;
          password?: string;
          fullName?: string;
        }
      | undefined;
    if (type === "signup" && typeof window !== "undefined") {
      const rawPending = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
      if (rawPending) {
        try {
          pendingSignup = JSON.parse(rawPending) as {
            email?: string;
            password?: string;
            fullName?: string;
          };
        } catch {
          window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
        }
      }
    }

    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: codeValue,
        purpose: type,
        password:
          type === "signup" &&
          pendingSignup?.email?.toLowerCase() === email.toLowerCase()
            ? pendingSignup.password
            : undefined,
        fullName:
          type === "signup" &&
          pendingSignup?.email?.toLowerCase() === email.toLowerCase()
            ? pendingSignup.fullName
            : undefined,
      }),
    });
    const verifyPayload = (await response.json().catch(() => ({}))) as {
      error?: string;
      session?: { access_token: string; refresh_token: string };
    };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(verifyPayload.error ?? "Invalid code. Try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      refs.current[0]?.focus();
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }

    if (type === "signup") {
      const signupPassword =
        pendingSignup?.email?.toLowerCase() === email.toLowerCase() ? pendingSignup.password : undefined;
      if (!signupPassword) {
        setError("Session expired. Please sign up again.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: signupPassword,
      });
      if (signInError) {
        setError("Code is valid, but login failed. Try again.");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      }
      await fetch("/api/auth/welcome", { method: "POST" }).catch(() => null);
    } else {
      const session = verifyPayload.session;
      if (!session) {
        setError("Code is valid, but login session could not be created.");
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (sessionError) {
        setError("Code is valid, but login failed. Try again.");
        return;
      }
    }
    router.replace("/app/dashboard");
  }

  async function resendCode() {
    if (!email || resendIn > 0) return;
    setResendMsg(null);
    let fullName: string | undefined;
    if (type === "signup" && typeof window !== "undefined") {
      const rawPending = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
      if (rawPending) {
        try {
          const pending = JSON.parse(rawPending) as { email?: string; fullName?: string };
          if (pending.email?.toLowerCase() === email.toLowerCase()) {
            fullName = pending.fullName;
          }
        } catch {
          window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
        }
      }
    }
    const response = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        purpose: type,
        fullName,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setResendMsg(payload.error ?? "Could not resend code.");
      return;
    }
    setResendMsg("Code resent.");
    startResendCountdown();
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
