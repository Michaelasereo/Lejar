"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface PercentageStepperProps {
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowInput?: boolean;
}

export function PercentageStepper({
  value,
  originalValue,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  precision = 0,
  allowInput = false,
}: PercentageStepperProps) {
  const roundedValue = Number(value.toFixed(precision));
  const roundedOriginal = Number(originalValue.toFixed(precision));
  const delta = Number((roundedValue - roundedOriginal).toFixed(precision));
  const hasChanged = Math.abs(delta) > 10 ** -(precision + 1);

  function clampAndRound(nextValue: number) {
    const clamped = Math.max(min, Math.min(max, nextValue));
    return Number(clamped.toFixed(precision));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(clampAndRound(roundedValue - step))}
        disabled={roundedValue <= min}
        className="flex h-6 w-6 items-center justify-center text-sm text-white/40 transition-all hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
      >
        -
      </button>
      {allowInput ? (
        <input
          inputMode="decimal"
          value={roundedValue.toFixed(precision)}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) return;
            onChange(clampAndRound(parsed));
          }}
          className="h-7 w-16 border border-white/15 bg-transparent px-1 text-center text-sm font-medium text-white outline-none focus:border-accent"
          aria-label="Percentage value"
        />
      ) : (
        <motion.span
          key={roundedValue}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
          className="w-12 text-center text-sm font-medium text-white"
        >
          {roundedValue.toFixed(precision)}%
        </motion.span>
      )}
      <button
        type="button"
        onClick={() => onChange(clampAndRound(roundedValue + step))}
        disabled={roundedValue >= max}
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
            {delta.toFixed(precision)}%
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
