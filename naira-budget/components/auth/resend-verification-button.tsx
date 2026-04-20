"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAppOrigin } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";

interface ResendVerificationButtonProps {
  email: string;
}

export function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    if (!email.trim()) {
      setMessage("Add your email to the URL to resend (e.g. ?email=you@example.com).");
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const origin = getAppOrigin();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/app/dashboard`,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Verification email sent again.");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className={cn(
          "min-h-11 w-full border border-white/15 bg-transparent px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-foreground disabled:opacity-50",
        )}
      >
        {loading ? "Sending…" : "Resend email"}
      </button>
      {message ? (
        <p className="text-center text-xs text-white/50">{message}</p>
      ) : null}
    </div>
  );
}
