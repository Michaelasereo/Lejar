"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface PercentageStepperProps {
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function PercentageStepper({
  value,
  originalValue,
  onChange,
  min = 1,
  max = 99,
}: PercentageStepperProps) {
  const delta = value - originalValue;
  const hasChanged = delta !== 0;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-6 w-6 items-center justify-center text-sm text-white/40 transition-all hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
      >
        -
      </button>
      <motion.span
        key={value}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.1 }}
        className="w-10 text-center text-sm font-medium text-white"
      >
        {value}%
      </motion.span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-6 w-6 items-center justify-center text-sm text-white/40 transition-all hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
      >
        +
      </button>
      <AnimatePresence>
        {hasChanged ? (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className={cn("ml-0.5 text-xs", delta < 0 ? "text-accent" : "text-amber-400")}
          >
            {delta > 0 ? "+" : ""}
            {delta}%
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
