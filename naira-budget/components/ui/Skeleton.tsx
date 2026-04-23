"use client";

import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none bg-white/[0.06]",
        shimmer && "before:absolute before:inset-0",
        shimmer && "before:bg-gradient-to-r",
        shimmer && "before:from-transparent before:via-white/[0.08] before:to-transparent",
        shimmer && "before:-translate-x-full before:animate-shimmer",
        !shimmer && "animate-pulse",
        className,
      )}
    />
  );
}
