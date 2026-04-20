"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useInView } from "@/hooks/useInView";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
}

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const { ref, isInView } = useInView({ threshold: 0.08, once: true });

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-[opacity,transform]",
        isInView ? "animate-fade-in" : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
