"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { getAppOrigin } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicStatus, setMagicStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setAuthError(null);
    setMagicStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError("Invalid email or password");
      return;
    }

    // Full navigation avoids React Flight "Connection closed" on Netlify after
    // client-side router transitions from /login (RSC stream + edge timing).
    window.location.assign("/app/dashboard");
  }

  async function handleForgotPassword() {
    setAuthError(null);
    const email = getValues("email")?.trim();
    if (!email) {
      setAuthError("Enter your email above, then try again.");
      return;
    }
    const supabase = createClient();
    const origin = getAppOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login`,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setMagicStatus("Check your email for a password reset link.");
  }

  async function handleMagicLink() {
    setAuthError(null);
    setMagicStatus(null);
    const email = getValues("email")?.trim();
    if (!email) {
      setAuthError("Enter your email above first.");
      return;
    }
    const supabase = createClient();
    const origin = getAppOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/app/dashboard`,
      },
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setMagicStatus("Check your email for a login link.");
  }

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight text-foreground">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-white/50">
        Sign in to continue to your budget.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 space-y-6"
        noValidate
      >
        {authError ? (
          <div
            className="border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400"
            role="alert"
          >
            {authError}
          </div>
        ) : null}

        {magicStatus ? (
          <div className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
            {magicStatus}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/40"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={cn(
              "h-11 w-full border bg-white/5 px-3 text-sm text-foreground placeholder:text-white/30 outline-none ring-0 transition-colors focus:border-white/30",
              errors.email ? "border-red-500/50" : "border-white/10",
            )}
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="text-xs font-medium uppercase tracking-widest text-white/40"
            >
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-white/40 transition-colors hover:text-white/60"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={cn(
                "h-11 w-full border bg-white/5 px-3 pr-12 text-sm text-foreground placeholder:text-white/30 outline-none ring-0 transition-colors focus:border-white/30",
                errors.password ? "border-red-500/50" : "border-white/10",
              )}
              placeholder="••••••••"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center text-white/40 transition-colors hover:text-white/70"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-11 w-full items-center justify-center border border-transparent bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleMagicLink}
        className="mt-6 w-full text-center text-sm font-medium text-white/50 underline-offset-4 transition-colors hover:text-white/75 hover:underline"
      >
        Send me a login link instead
      </button>

      <p className="mt-8 text-center text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          prefetch={false}
          className="font-medium text-white/80 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
