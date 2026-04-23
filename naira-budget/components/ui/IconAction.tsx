"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface IconActionProps {
  onClick: () => Promise<void>;
  icon: React.ReactNode;
  successIcon?: React.ReactNode;
  className?: string;
}

export function IconAction({ onClick, icon, successIcon, className }: IconActionProps) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  async function handle() {
    if (state !== "idle") return;
    setState("loading");
    try {
      await onClick();
      setState("success");
      setTimeout(() => setState("idle"), 1000);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={() => void handle()}
      disabled={state === "loading"}
      className={cn("inline-flex items-center justify-center transition-all disabled:cursor-wait", className)}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
          >
            {icon}
          </motion.span>
        )}
        {state === "loading" && (
          <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
          </motion.span>
        )}
        {state === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {successIcon ?? icon}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
