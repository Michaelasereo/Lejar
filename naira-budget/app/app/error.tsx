"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-widest text-white/30">
        Something broke
      </p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight text-foreground">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 text-sm text-white/55">
        An error occurred while preparing your dashboard. Try again in a moment.
      </p>
      {error?.digest ? (
        <p className="mt-6 text-xs text-white/30">Ref: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 min-w-32 items-center justify-center border border-white/15 px-4 text-sm font-medium text-white/80 transition-colors hover:border-white/30"
      >
        Try again
      </button>
    </div>
  );
}
