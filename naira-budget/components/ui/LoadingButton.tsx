"use client";

import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ButtonState = "idle" | "loading" | "success" | "error";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: string;
  successText?: string;
  errorText?: string;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  state?: ButtonState;
  onSuccess?: () => void;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loadingText,
      successText = "Done",
      errorText = "Failed - try again",
      variant = "primary",
      size = "md",
      state: controlledState,
      onSuccess,
      className,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [internalState, setInternalState] = useState<ButtonState>("idle");
    const state = controlledState ?? internalState;

    const baseClasses = cn(
      "relative inline-flex items-center justify-center overflow-hidden rounded-none font-medium transition-all duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
      "disabled:cursor-not-allowed",
      size === "sm" && "h-8 min-w-[80px] px-3 text-xs",
      size === "md" && "h-10 min-w-[120px] px-4 text-sm",
      size === "lg" && "h-12 min-w-[140px] px-6 text-sm",
      variant === "primary" &&
        state === "idle" &&
        "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98]",
      variant === "primary" && state === "loading" && "cursor-wait bg-accent/70 text-accent-foreground",
      variant === "primary" && state === "success" && "bg-accent text-accent-foreground",
      variant === "primary" && state === "error" && "bg-red-600/80 text-white",
      variant === "ghost" &&
        state === "idle" &&
        "border border-white/15 text-white/70 hover:bg-white/5 hover:text-white",
      variant === "ghost" && state === "loading" && "cursor-wait border border-white/10 text-white/40",
      variant === "ghost" && state === "success" && "border border-accent/40 text-accent",
      variant === "ghost" && state === "error" && "border border-red-500/30 text-red-400",
      variant === "danger" &&
        state === "idle" &&
        "border border-red-500/30 text-red-400 hover:bg-red-500/10",
      variant === "danger" && state === "loading" && "cursor-wait border border-red-500/20 text-red-400/40",
      className,
    );

    const canManageInternal = controlledState === undefined;

    async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      if (state !== "idle" || !onClick) return;
      if (!canManageInternal) {
        await Promise.resolve(onClick(e));
        return;
      }
      setInternalState("loading");
      try {
        await Promise.resolve(onClick(e));
        setInternalState("success");
        setTimeout(() => {
          setInternalState("idle");
          onSuccess?.();
        }, 1200);
      } catch {
        setInternalState("error");
        setTimeout(() => setInternalState("idle"), 2000);
      }
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled || state === "loading"}
        onClick={(e) => void handleClick(e)}
        {...props}
      >
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {children}
            </motion.span>
          )}
          {state === "loading" && (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {loadingText ?? "Saving..."}
            </motion.span>
          )}
          {state === "success" && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
              className="flex items-center gap-2"
            >
              <Check className="h-3.5 w-3.5" />
              {successText}
            </motion.span>
          )}
          {state === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <X className="h-3.5 w-3.5" />
              {errorText}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  },
);

LoadingButton.displayName = "LoadingButton";
