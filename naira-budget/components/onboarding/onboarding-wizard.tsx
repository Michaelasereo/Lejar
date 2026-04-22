"use client";

import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  amountToPercentage,
  formatNaira,
  percentageToAmount,
} from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "nb-onboarding-v1";
const STEPS = 4;

const BUCKET_COLORS = [
  "#7C63FD",
  "#2563eb",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#64748b",
] as const;

function newId(): string {
  return crypto.randomUUID();
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

type IncomeRow = { id: string; label: string; amount: string };
type BucketMode = "percent" | "naira";
type BucketRow = {
  id: string;
  name: string;
  color: string;
  amount: string;
  mode: BucketMode;
};

interface WizardState {
  step: number;
  income: IncomeRow[];
  rentAnnual: string;
  rentDueDate: string;
  rentSkipped: boolean;
  buckets: BucketRow[];
}

type Action =
  | { type: "hydrate"; payload: WizardState }
  | { type: "next" }
  | { type: "back" }
  | { type: "income/update"; id: string; field: "label" | "amount"; value: string }
  | { type: "income/add" }
  | { type: "income/remove"; id: string }
  | { type: "rent/field"; field: "annual" | "dueDate"; value: string }
  | { type: "rent/skip" }
  | { type: "bucket/update"; id: string; field: "name" | "amount"; value: string }
  | { type: "bucket/toggleMode"; id: string }
  | { type: "bucket/add" }
  | { type: "bucket/remove"; id: string }
  | { type: "bucket/color"; id: string; color: string };

function defaultState(): WizardState {
  return {
    step: 0,
    income: [
      { id: newId(), label: "Company salary", amount: "" },
      { id: newId(), label: "Company salary", amount: "" },
    ],
    rentAnnual: "",
    rentDueDate: "",
    rentSkipped: false,
    buckets: [
      {
        id: newId(),
        name: "Pay yourself",
        color: BUCKET_COLORS[0]!,
        amount: "50",
        mode: "percent",
      },
      {
        id: newId(),
        name: "Lifestyle",
        color: BUCKET_COLORS[1]!,
        amount: "32",
        mode: "percent",
      },
      {
        id: newId(),
        name: "Misc",
        color: BUCKET_COLORS[2]!,
        amount: "18",
        mode: "percent",
      },
    ],
  };
}

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "next":
      return { ...state, step: Math.min(state.step + 1, STEPS - 1) };
    case "back":
      return { ...state, step: Math.max(state.step - 1, 0) };
    case "income/update":
      return {
        ...state,
        income: state.income.map((row) =>
          row.id === action.id ? { ...row, [action.field]: action.value } : row,
        ),
      };
    case "income/add":
      return {
        ...state,
        income: [...state.income, { id: newId(), label: "", amount: "" }],
      };
    case "income/remove":
      if (state.income.length <= 1) return state;
      return {
        ...state,
        income: state.income.filter((r) => r.id !== action.id),
      };
    case "rent/field":
      return {
        ...state,
        rentSkipped: false,
        ...(action.field === "annual"
          ? { rentAnnual: action.value }
          : { rentDueDate: action.value }),
      };
    case "rent/skip":
      return {
        ...state,
        rentSkipped: true,
        rentAnnual: "",
        rentDueDate: "",
      };
    case "bucket/update":
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === action.id ? { ...b, [action.field]: action.value } : b,
        ),
      };
    case "bucket/toggleMode": {
      const totalIncome = sumIncomeNaira(state.income);
      return {
        ...state,
        buckets: state.buckets.map((b) => {
          if (b.id !== action.id) return b;
          if (b.mode === "percent") {
            const naira = Math.round((parseAmount(b.amount) / 100) * totalIncome);
            return { ...b, mode: "naira", amount: String(naira) };
          }
          const pct =
            totalIncome > 0
              ? Math.round((parseAmount(b.amount) / totalIncome) * 100)
              : 0;
          return { ...b, mode: "percent", amount: String(pct) };
        }),
      };
    }
    case "bucket/add":
      return {
        ...state,
        buckets: [
          ...state.buckets,
          {
            id: newId(),
            name: "New bucket",
            color: BUCKET_COLORS[state.buckets.length % BUCKET_COLORS.length]!,
            amount: "0",
            mode: "naira",
          },
        ],
      };
    case "bucket/remove":
      if (state.buckets.length <= 1) return state;
      return {
        ...state,
        buckets: state.buckets.filter((b) => b.id !== action.id),
      };
    case "bucket/color":
      return {
        ...state,
        buckets: state.buckets.map((b) =>
          b.id === action.id ? { ...b, color: action.color } : b,
        ),
      };
    default:
      return state;
  }
}

function sumIncomeNaira(income: IncomeRow[]): number {
  return income.reduce((s, r) => s + parseAmount(r.amount), 0);
}

function bucketNaira(b: BucketRow, totalIncome: number): number {
  if (b.mode === "percent") {
    return percentageToAmount(parseAmount(b.amount), totalIncome);
  }
  return parseAmount(b.amount);
}

function bucketPercentage(b: BucketRow, totalIncome: number): number {
  if (b.mode === "percent") return parseAmount(b.amount);
  return amountToPercentage(parseAmount(b.amount), totalIncome);
}

function sumBucketsNaira(buckets: BucketRow[], totalIncome: number): number {
  return buckets.reduce((s, b) => s + bucketNaira(b, totalIncome), 0);
}

function monthlyRent(annual: string): number {
  const a = parseAmount(annual);
  return a / 12;
}

export function OnboardingWizard() {
  const router = useRouter();
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);
  const [state, dispatch] = useReducer(reducer, undefined, defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [colorOpenId, setColorOpenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WizardState;
        if (parsed && typeof parsed.step === "number") {
          dispatch({ type: "hydrate", payload: parsed });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const totalIncome = sumIncomeNaira(state.income);
  const allocated = sumBucketsNaira(state.buckets, totalIncome);
  const totalBucketPercentage = state.buckets.reduce(
    (sum, bucket) => sum + bucketPercentage(bucket, totalIncome),
    0,
  );
  const balanced = totalIncome > 0 && Math.abs(totalBucketPercentage - 100) < 0.01;

  const canNextStep0 = (() => {
    const valid = state.income.filter(
      (r) => r.label.trim() !== "" && parseAmount(r.amount) > 0,
    );
    if (valid.length < 1) return false;
    const partial = state.income.some(
      (r) =>
        (r.label.trim() !== "" && parseAmount(r.amount) <= 0) ||
        (parseAmount(r.amount) > 0 && r.label.trim() === ""),
    );
    return !partial;
  })();

  const canNextStep1 = (() => {
    if (state.rentSkipped) return true;
    return (
      parseAmount(state.rentAnnual) > 0 && state.rentDueDate.trim() !== ""
    );
  })();

  const canNextStep2 = balanced && state.buckets.length >= 1;

  function goNext() {
    if (state.step === 0 && !canNextStep0) return;
    if (state.step === 1 && !canNextStep1) return;
    if (state.step === 2 && !canNextStep2) return;
    dispatch({ type: "next" });
  }

  async function finish() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        incomeSources: state.income
          .filter((r) => r.label.trim() !== "" && parseAmount(r.amount) > 0)
          .map((r) => ({
            label: r.label.trim(),
            amount: parseAmount(r.amount),
          })),
        rentSkipped: state.rentSkipped,
        rent:
          state.rentSkipped || parseAmount(state.rentAnnual) <= 0
            ? null
            : {
                annualAmount: parseAmount(state.rentAnnual),
                nextDueDate: new Date(state.rentDueDate).toISOString(),
              },
        buckets: state.buckets.map((b) => ({
          name: b.name.trim(),
          color: b.color,
          percentage: bucketPercentage(b, totalIncome),
          amount: bucketNaira(b, totalIncome),
        })),
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem(STORAGE_KEY);
      setIsOnboarded(true);
      router.push("/app/dashboard");
      router.refresh();
    } catch {
      setSubmitError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  const progress = ((state.step + 1) / STEPS) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {submitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-sm text-white/60">Saving your budget…</p>
        </div>
      ) : null}

      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-white/5">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto max-w-xl px-4 pb-24 pt-12 md:pt-16">
        <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-white/30">
          {String(state.step + 1).padStart(2, "0")} / {String(STEPS).padStart(2, "0")}
        </p>

        <div className="mt-8 overflow-hidden">
          <div
            className="flex w-[400%] transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${state.step * 25}%)` }}
          >
            {/* Step 1 */}
            <section className="w-1/4 shrink-0 px-1">
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                How much do you earn each month?
              </h2>
              <p className="mt-3 text-sm text-white/50">
                Add all your income sources. You can always update these later.
              </p>
              <div className="mt-8 space-y-4">
                {state.income.map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs uppercase tracking-widest text-white/40">
                        Label
                      </span>
                      <input
                        value={row.label}
                        onChange={(e) =>
                          dispatch({
                            type: "income/update",
                            id: row.id,
                            field: "label",
                            value: e.target.value,
                          })
                        }
                        className="h-11 w-full border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none focus:border-white/30"
                      />
                    </label>
                    <label className="sm:w-40">
                      <span className="mb-1 block text-xs uppercase tracking-widest text-white/40">
                        Amount (₦)
                      </span>
                      <input
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) =>
                          dispatch({
                            type: "income/update",
                            id: row.id,
                            field: "amount",
                            value: e.target.value,
                          })
                        }
                        className="h-11 w-full border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none focus:border-white/30"
                        placeholder="0"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "income/remove", id: row.id })
                      }
                      className="flex min-h-11 min-w-11 items-center justify-center text-white/30 hover:text-red-400"
                      aria-label="Remove income"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "income/add" })}
                  className="w-full border border-dashed border-white/20 py-3 text-sm text-white/50 transition-colors hover:border-white/35 hover:text-white/70"
                >
                  + Add income source
                </button>
              </div>
              <p className="mt-8 text-2xl font-medium tabular-nums text-accent">
                Total: {formatNaira(totalIncome)}
              </p>
            </section>

            {/* Step 2 */}
            <section className="w-1/4 shrink-0 px-1">
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                What&apos;s your annual rent?
              </h2>
              <p className="mt-3 text-sm text-white/50">
                In Nigeria, rent is paid yearly. We&apos;ll help you save for it
                monthly.
              </p>
              <div className="mt-8 space-y-4">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-widest text-white/40">
                    Annual rent (₦)
                  </span>
                  <input
                    inputMode="decimal"
                    disabled={state.rentSkipped}
                    value={state.rentAnnual}
                    onChange={(e) =>
                      dispatch({
                        type: "rent/field",
                        field: "annual",
                        value: e.target.value,
                      })
                    }
                    className="h-11 w-full border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none focus:border-white/30 disabled:opacity-40"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-widest text-white/40">
                    Next due date
                  </span>
                  <input
                    type="date"
                    disabled={state.rentSkipped}
                    value={state.rentDueDate}
                    onChange={(e) =>
                      dispatch({
                        type: "rent/field",
                        field: "dueDate",
                        value: e.target.value,
                      })
                    }
                    className="h-11 w-full border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none focus:border-white/30 disabled:opacity-40"
                  />
                </label>
                {!state.rentSkipped && parseAmount(state.rentAnnual) > 0 ? (
                  <div className="border border-white/8 bg-white/[0.03] p-4 text-sm text-white/60">
                    That&apos;s{" "}
                    <span className="font-medium text-foreground">
                      {formatNaira(monthlyRent(state.rentAnnual))}
                    </span>{" "}
                    / month to set aside
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "rent/skip" })}
                  className="text-sm text-white/40 underline-offset-4 hover:text-white/60 hover:underline"
                >
                  I don&apos;t pay rent / not sure yet — skip for now
                </button>
              </div>
            </section>

            {/* Step 3 */}
            <section className="w-1/4 shrink-0 px-1">
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                Split your income into buckets
              </h2>
              <p className="mt-3 text-sm text-white/50">
                Think of buckets like envelopes. Every naira needs a job.
              </p>
              <div className="mt-8 space-y-4">
                {state.buckets.map((b) => (
                  <div
                    key={b.id}
                    className="border border-white/8 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setColorOpenId((id) =>
                              id === b.id ? null : b.id,
                            )
                          }
                          className="mt-6 h-4 w-4 rounded-full border border-white/20"
                          style={{ backgroundColor: b.color }}
                          aria-label="Pick bucket color"
                        />
                        {colorOpenId === b.id ? (
                          <div className="absolute left-0 top-10 z-10 flex flex-wrap gap-2 rounded border border-white/10 bg-background p-2 shadow-lg">
                            {BUCKET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className="h-6 w-6 rounded-full border border-white/10"
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                  dispatch({
                                    type: "bucket/color",
                                    id: b.id,
                                    color: c,
                                  });
                                  setColorOpenId(null);
                                }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={b.name}
                          onChange={(e) =>
                            dispatch({
                              type: "bucket/update",
                              id: b.id,
                              field: "name",
                              value: e.target.value,
                            })
                          }
                          className="h-10 w-full border border-white/10 bg-white/5 px-2 text-sm text-foreground outline-none focus:border-white/30"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            inputMode="decimal"
                            value={b.amount}
                            onChange={(e) =>
                              dispatch({
                                type: "bucket/update",
                                id: b.id,
                                field: "amount",
                                value: e.target.value,
                              })
                            }
                            className="h-10 w-32 border border-white/10 bg-white/5 px-2 text-sm text-foreground outline-none focus:border-white/30"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: "bucket/toggleMode", id: b.id })
                            }
                            className="border border-white/15 px-3 py-2 text-xs uppercase tracking-wider text-white/60"
                          >
                            {b.mode === "percent" ? "%" : "₦"}
                          </button>
                          {b.mode === "percent" ? (
                            <span className="text-xs text-white/40">
                              = {formatNaira(bucketNaira(b, totalIncome))}
                            </span>
                          ) : (
                            <span className="text-xs text-white/40">
                              = {bucketPercentage(b, totalIncome).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({ type: "bucket/remove", id: b.id })
                        }
                        className="text-white/30 hover:text-red-400"
                        aria-label="Remove bucket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "bucket/add" })}
                  className="w-full border border-dashed border-white/20 py-3 text-sm text-white/50"
                >
                  + Add bucket
                </button>
              </div>

              <div className="sticky bottom-0 mt-8 border border-white/8 bg-background/95 p-4 backdrop-blur-sm">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-white/50">
                    {formatNaira(allocated)} allocated of {formatNaira(totalIncome)}{" "}
                    total
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      balanced
                        ? "text-accent"
                        : totalBucketPercentage < 100
                          ? "text-amber-400"
                          : "text-red-400",
                    )}
                  >
                    {balanced
                      ? "100% allocated ✓"
                      : totalBucketPercentage > 100
                        ? `${totalBucketPercentage.toFixed(2)}% allocated`
                        : `${totalBucketPercentage.toFixed(2)}% allocated`}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, totalBucketPercentage))}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Step 4 */}
            <section className="w-1/4 shrink-0 px-1">
              <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                Your budget is set up
              </h2>
              <p className="mt-3 text-sm text-white/50">
                Here&apos;s what we&apos;ll track for you.
              </p>
              <div className="mt-8 space-y-4">
                <div className="border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-widest text-white/30">
                    Total income
                  </p>
                  <p className="mt-1 text-xl font-medium tabular-nums text-foreground">
                    {formatNaira(totalIncome)}
                  </p>
                </div>
                <div className="border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-widest text-white/30">
                    Buckets
                  </p>
                  <p className="mt-1 text-xl font-medium text-foreground">
                    {state.buckets.length} buckets
                  </p>
                </div>
                <div className="border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-widest text-white/30">
                    Rent jar
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {state.rentSkipped
                      ? "Skipped — you can add this later"
                      : `${formatNaira(monthlyRent(state.rentAnnual))} / month target`}
                  </p>
                </div>
              </div>
              {submitError ? (
                <p className="mt-4 text-sm text-red-400">{submitError}</p>
              ) : null}
              <button
                type="button"
                disabled={submitting}
                onClick={finish}
                className="mt-8 flex min-h-12 w-full items-center justify-center bg-accent text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Go to my dashboard
              </button>
            </section>
          </div>
        </div>

        {state.step < 3 ? (
          <div className="mt-10 flex justify-between gap-4">
            <button
              type="button"
              onClick={() => dispatch({ type: "back" })}
              disabled={state.step === 0}
              className="min-h-11 border border-white/20 px-6 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/35 disabled:opacity-30"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={
                (state.step === 0 && !canNextStep0) ||
                (state.step === 1 && !canNextStep1) ||
                (state.step === 2 && !canNextStep2)
              }
              className="min-h-11 border border-transparent bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
