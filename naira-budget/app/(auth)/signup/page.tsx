"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { signupSchema, type SignupFormValues } from "@/lib/validations/auth";
import { cn } from "@/lib/utils/cn";
import { LoadingButton } from "@/components/ui/LoadingButton";

const PENDING_SIGNUP_KEY = "pending-signup";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignupFormValues) {
    setSubmitError(null);
    const response = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        purpose: "signup",
        fullName: data.fullName,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setSubmitError(payload.error ?? "Could not send verification code.");
      return;
    }

    if (typeof window !== "undefined") {
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      };
      window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(payload));
    }

    router.push(`/verify-code?email=${encodeURIComponent(data.email)}&type=signup`);
  }

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-white/50">
        Start budgeting your naira in minutes
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 space-y-6"
        noValidate
      >
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/40"
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            className={cn(
              "h-11 w-full border bg-white/5 px-3 text-sm text-foreground placeholder:text-white/30 outline-none ring-0 transition-colors focus:border-white/30",
              errors.fullName
                ? "border-red-500/50"
                : "border-white/10",
            )}
            placeholder="Ada Okonkwo"
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p className="mt-1.5 text-xs text-red-400">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/40"
          >
            Email address
          </label>
          <input
            id="email"
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
          <label
            htmlFor="password"
            className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/40"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={cn(
                "h-11 w-full border bg-white/5 px-3 pr-12 text-sm text-foreground placeholder:text-white/30 outline-none ring-0 transition-colors focus:border-white/30",
                errors.password
                  ? "border-red-500/50"
                  : "border-white/10",
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

        {submitError ? (
          <p className="text-sm text-red-400" role="alert">
            {submitError}
          </p>
        ) : null}

        <LoadingButton
          type="submit"
          state={isSubmitting ? "loading" : "idle"}
          loadingText="Creating account..."
          size="lg"
          className="w-full"
        >
          Create account
        </LoadingButton>
      </form>

      <p className="mt-8 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link
          href="/login"
          prefetch={false}
          className="font-medium text-white/80 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
