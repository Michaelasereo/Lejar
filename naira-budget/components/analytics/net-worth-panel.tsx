"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle, PiggyBank, Target, TrendingDown, TrendingUp } from "lucide-react";
import { formatNaira } from "@/lib/utils/currency";
import type { MilestoneType } from "@prisma/client";
import { toast } from "sonner";

interface NetWorthPanelProps {
  asOfLabel: string;
  previousMonthNetWorth: number | null;
  netWorthData: {
    cumulativeSavings: number;
    investmentPortfolio: number;
    jarsTotal: number;
    confirmedReturns: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  netWorthHistory: Array<{ month: string; netWorth: number; assets: number }>;
  unspentCarryover: number;
  monthlyChange: {
    monthlySavings: number;
    unspentCarryover: number;
    investmentGrowth: number;
    jarContributions: number;
    confirmedReturns: number;
    newLiabilities: number;
    netChange: number;
  };
  newMilestones?: Array<{ id: string; type: MilestoneType; value: number }>;
}

type HistoricalMonthRow = {
  monthKey: string;
  monthLabel: string;
  incomeOverride: number | null;
  spentBackfill: number | null;
  netChange: number;
};

export function NetWorthPanel({
  asOfLabel,
  previousMonthNetWorth,
  netWorthData,
  netWorthHistory,
  unspentCarryover,
  monthlyChange,
  newMilestones = [],
}: NetWorthPanelProps) {
  const router = useRouter();
  const [editingLiability, setEditingLiability] = useState(false);
  const [liabilityAmount, setLiabilityAmount] = useState(String(Math.round(netWorthData.totalLiabilities)));
  const [savingLiability, setSavingLiability] = useState(false);
  const [liabilitySaved, setLiabilitySaved] = useState(netWorthData.totalLiabilities);
  const [rebuilding, setRebuilding] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historicalMonths, setHistoricalMonths] = useState<HistoricalMonthRow[]>([]);
  const [savingMonthKey, setSavingMonthKey] = useState<string | null>(null);
  const [inputState, setInputState] = useState<
    Record<string, { incomeOverride: string; spentBackfill: string }>
  >({});
  const celebratedRef = useRef(false);
  const delta = previousMonthNetWorth == null ? null : netWorthData.netWorth - previousMonthNetWorth;
  const savingsRate = netWorthData.totalAssets > 0
    ? Math.max(0, Math.round((monthlyChange.monthlySavings / Math.max(1, netWorthData.totalAssets)) * 100))
    : 0;

  const milestones = useMemo(() => {
    const targets = [1_000_000, 5_000_000, 10_000_000];
    return targets
      .map((target) => {
        const hit = netWorthHistory.find((point) => point.netWorth >= target);
        return hit ? { value: target, month: hit.month, netWorth: hit.netWorth } : null;
      })
      .filter((x): x is { value: number; month: string; netWorth: number } => x !== null);
  }, [netWorthHistory]);

  useEffect(() => {
    if (celebratedRef.current || newMilestones.length === 0) return;
    celebratedRef.current = true;
    const text = newMilestones.length === 1
      ? "New net-worth milestone unlocked"
      : `${newMilestones.length} new net-worth milestones unlocked`;
    toast.success(text);
    void import("canvas-confetti").then((mod) => {
      mod.default({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
    });
  }, [newMilestones]);

  useEffect(() => {
    if (!historyOpen || historicalMonths.length > 0 || historyLoading) return;
    void loadHistoricalMonths();
  }, [historyOpen, historicalMonths.length, historyLoading]);

  async function saveLiability() {
    setSavingLiability(true);
    try {
      const amount = Number(liabilityAmount.replace(/,/g, ""));
      const res = await fetch("/api/net-worth/liabilities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAmount: Number.isFinite(amount) ? amount : 0 }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { totalAmount: number };
      setLiabilitySaved(json.totalAmount);
      setEditingLiability(false);
    } finally {
      setSavingLiability(false);
    }
  }

  async function rebuildHistory() {
    setRebuilding(true);
    try {
      const res = await fetch("/api/net-worth/rebuild-history", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { rebuiltCount?: number };
      toast.success(`Rebuilt ${json.rebuiltCount ?? 0} month snapshots`);
      router.refresh();
    } catch {
      toast.error("Could not rebuild history");
    } finally {
      setRebuilding(false);
    }
  }

  async function loadHistoricalMonths() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/net-worth/historical-months");
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { months: HistoricalMonthRow[] };
      setHistoricalMonths(json.months);
      setInputState(
        Object.fromEntries(
          json.months.map((row) => [
            row.monthKey,
            {
              incomeOverride:
                row.incomeOverride === null ? "" : String(Math.round(row.incomeOverride)),
              spentBackfill:
                row.spentBackfill === null ? "" : String(Math.round(row.spentBackfill)),
            },
          ]),
        ),
      );
    } catch {
      toast.error("Could not load previous months");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveHistoricalMonth(
    monthKey: string,
    field: "incomeOverride" | "spentBackfill",
  ) {
    const value = Number(inputState[monthKey]?.[field] ?? "");
    const payload: { monthKey: string; incomeOverride?: number | null; spentBackfill?: number | null } =
      { monthKey };
    if (field === "incomeOverride") {
      payload.incomeOverride = Number.isFinite(value) && value > 0 ? value : null;
    } else {
      payload.spentBackfill = Number.isFinite(value) && value > 0 ? value : null;
    }
    setSavingMonthKey(monthKey);
    try {
      const res = await fetch("/api/net-worth/historical-months", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { months: HistoricalMonthRow[] };
      setHistoricalMonths(json.months);
      setInputState(
        Object.fromEntries(
          json.months.map((row) => [
            row.monthKey,
            {
              incomeOverride:
                row.incomeOverride === null ? "" : String(Math.round(row.incomeOverride)),
              spentBackfill:
                row.spentBackfill === null ? "" : String(Math.round(row.spentBackfill)),
            },
          ]),
        ),
      );
      toast.success("Previous month updated");
      router.refresh();
    } catch {
      toast.error("Could not update month");
    } finally {
      setSavingMonthKey(null);
    }
  }

  const displayedLiability = editingLiability ? Number(liabilityAmount || 0) : liabilitySaved;
  const displayedNetWorth = netWorthData.totalAssets - displayedLiability;

  return (
    <div className="space-y-6">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/30">Your net worth</p>
        <p className={`mt-2 text-5xl font-medium md:text-6xl ${displayedNetWorth >= 0 ? "text-white" : "text-red-400"}`}>
          {formatNaira(displayedNetWorth)}
        </p>
        <p className="mt-2 text-sm">
          {delta == null ? (
            <span className="text-white/50">First month - keep going!</span>
          ) : (
            <span className={delta >= 0 ? "text-accent" : "text-red-400"}>
              {delta >= 0 ? <TrendingUp className="mr-1 inline h-4 w-4" /> : <TrendingDown className="mr-1 inline h-4 w-4" />}
              {formatNaira(Math.abs(delta))} {delta >= 0 ? "from last month" : "down from last month"}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-white/30">As of {asOfLabel}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <BreakdownCard label="Cumulative savings" value={netWorthData.cumulativeSavings} sub="Across previous months" icon={<PiggyBank className="h-4 w-4 text-white/30" />} />
        <BreakdownCard label="Investment portfolio" value={netWorthData.investmentPortfolio} sub="T-bills · Risevest · NGX · PiggyVest" icon={<TrendingUp className="h-4 w-4 text-white/30" />} />
        <BreakdownCard label="Savings jars" value={netWorthData.jarsTotal} sub="Individual and group jars" icon={<Target className="h-4 w-4 text-white/30" />} />
        <BreakdownCard label="Confirmed returns" value={netWorthData.confirmedReturns} sub="Matured confirmed profits" icon={<CheckCircle className="h-4 w-4 text-accent/80" />} valueClass="text-accent" />
      </section>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-white/50">TOTAL ASSETS</span>
        <span className="font-medium text-white">{formatNaira(netWorthData.totalAssets)}</span>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-white/30">Liabilities</p>
          <button
            type="button"
            onClick={() => setEditingLiability((v) => !v)}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Edit
          </button>
        </div>
        {displayedLiability <= 0 ? (
          <div className="border border-accent/30 bg-accent/10 p-4">
            <p className="text-sm text-accent">Debt free 🎉</p>
            <p className="text-xs text-white/40">You have no logged liabilities</p>
          </div>
        ) : (
          <div className="border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xl font-medium text-red-400">{formatNaira(displayedLiability)}</p>
            <p className="text-xs text-white/40">Total liabilities</p>
          </div>
        )}
        {editingLiability ? (
          <div className="mt-3 border border-white/10 bg-white/[0.03] p-3">
            <label className="text-xs text-white/50">Total debt amount</label>
            <input
              inputMode="decimal"
              value={liabilityAmount}
              onChange={(e) => setLiabilityAmount(e.target.value)}
              className="mt-1 min-h-11 w-full border border-white/15 bg-black px-3 text-sm text-foreground"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void saveLiability()}
                disabled={savingLiability}
                className="min-h-10 border border-accent bg-accent px-3 text-xs text-accent-foreground disabled:opacity-50"
              >
                {savingLiability ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-white/30">NET WORTH</p>
          <p className={`text-2xl font-medium ${displayedNetWorth >= 0 ? "text-accent" : "text-red-400"}`}>
            {formatNaira(displayedNetWorth)}
          </p>
        </div>
      </section>

      <section className="border border-white/10 bg-[#0a0a0a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-white/30">Net worth over time</p>
          <button
            type="button"
            onClick={() => void rebuildHistory()}
            disabled={rebuilding}
            className="border border-white/15 px-2 py-1 text-xs text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {rebuilding ? "Rebuilding..." : "Rebuild history from earliest data"}
          </button>
        </div>
        <div className="mt-3 h-56 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthHistory}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatNaira(Number(v))} />
              <Area dataKey="netWorth" stroke="#7C63FD" fill="rgba(124,99,253,0.15)" strokeWidth={2} />
              {milestones.map((m) => (
                <ReferenceDot
                  key={`${m.value}-${m.month}`}
                  x={m.month}
                  y={m.netWorth}
                  r={4}
                  fill="#7C63FD"
                  stroke="#fff"
                  label={{ value: `Hit ₦${Math.round(m.value / 1_000_000)}M`, fill: "rgba(255,255,255,0.35)", fontSize: 10, position: "top" }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {netWorthHistory.length <= 1 ? (
          <p className="mt-2 text-xs text-white/30">
            Keep using the app - your net worth chart will grow here.
          </p>
        ) : null}
      </section>

      <section className="border border-white/10 bg-[#0a0a0a] p-4">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full text-left text-xs uppercase tracking-widest text-white/50 hover:text-white"
        >
          {historyOpen ? "Hide previous months" : "Add previous months"}
        </button>
        {historyOpen ? (
          <div className="mt-3 space-y-2">
            {historyLoading ? (
              <p className="text-xs text-white/40">Loading previous months...</p>
            ) : historicalMonths.length === 0 ? (
              <p className="text-xs text-white/40">No previous months available yet.</p>
            ) : (
              historicalMonths.map((row) => (
                <div
                  key={row.monthKey}
                  className="grid grid-cols-1 gap-2 border border-white/10 bg-black/40 p-3 md:grid-cols-[150px_1fr_1fr_auto]"
                >
                  <p className="text-xs text-white/60">{row.monthLabel}</p>
                  <input
                    inputMode="decimal"
                    value={inputState[row.monthKey]?.incomeOverride ?? ""}
                    onChange={(e) =>
                      setInputState((prev) => ({
                        ...prev,
                        [row.monthKey]: {
                          incomeOverride: e.target.value,
                          spentBackfill: prev[row.monthKey]?.spentBackfill ?? "",
                        },
                      }))
                    }
                    onBlur={() => void saveHistoricalMonth(row.monthKey, "incomeOverride")}
                    placeholder="Income override"
                    className="min-h-10 border border-white/15 bg-black px-2 text-xs text-white"
                  />
                  <input
                    inputMode="decimal"
                    value={inputState[row.monthKey]?.spentBackfill ?? ""}
                    onChange={(e) =>
                      setInputState((prev) => ({
                        ...prev,
                        [row.monthKey]: {
                          incomeOverride: prev[row.monthKey]?.incomeOverride ?? "",
                          spentBackfill: e.target.value,
                        },
                      }))
                    }
                    onBlur={() => void saveHistoricalMonth(row.monthKey, "spentBackfill")}
                    placeholder="Spent (backfill)"
                    className="min-h-10 border border-white/15 bg-black px-2 text-xs text-white"
                  />
                  <p className="text-xs text-white/70">
                    {savingMonthKey === row.monthKey ? "Saving..." : formatNaira(row.netChange)}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="border border-white/10 bg-[#0a0a0a] p-4">
        <p className="text-xs uppercase tracking-widest text-white/30">This month&apos;s change</p>
        <p className="mt-1 text-xs text-white/40">What moved your net worth this month</p>
        <ChangeRow label="Monthly savings" value={monthlyChange.monthlySavings} />
        <ChangeRow
          label="Unspent carryover (included in monthly savings)"
          value={monthlyChange.unspentCarryover}
        />
        <ChangeRow label="Investment growth" value={monthlyChange.investmentGrowth} />
        <ChangeRow label="Jar contributions" value={monthlyChange.jarContributions} />
        <ChangeRow label="Confirmed returns" value={monthlyChange.confirmedReturns} />
        <ChangeRow label="New liabilities" value={-monthlyChange.newLiabilities} />
        <div className="mt-2 border-t border-white/10 pt-2">
          <ChangeRow label="Net change this month" value={monthlyChange.netChange} strong />
        </div>
      </section>

      <section className="border border-white/8 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-widest text-white/30">Your savings rate vs Nigeria</p>
        <div className="mt-3 space-y-3 text-xs">
          <RateRow label="You" value={savingsRate} barClass="bg-accent" />
          <RateRow label="Good saver" value={20} barClass="bg-white/30" />
          <RateRow label="Nigerian average" value={5} barClass="bg-white/10" />
        </div>
        <p className="mt-3 text-xs italic text-white/40">
          You&apos;re saving {Math.max(1, Math.round(savingsRate / 5))}x more than the average Nigerian saver.
        </p>
      </section>

      {unspentCarryover > 0 ? (
        <div className="border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-white/70">
          You have {formatNaira(unspentCarryover)} unspent from your spending budget this month.
        </div>
      ) : null}
    </div>
  );
}

function BreakdownCard({
  label,
  value,
  sub,
  icon,
  valueClass = "text-white",
}: {
  label: string;
  value: number;
  sub: string;
  icon: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="border border-white/8 bg-[#111111] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-white/30">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-xl font-medium ${valueClass}`}>{formatNaira(value)}</p>
      <p className="mt-1 text-[11px] text-white/35">{sub}</p>
    </div>
  );
}

function ChangeRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  const tone = value === 0 ? "text-white/25" : value > 0 ? "text-accent" : "text-red-400";
  return (
    <div className={`mt-2 flex justify-between text-sm ${strong ? "font-medium" : ""}`}>
      <span className={value === 0 ? "text-white/30" : "text-white/60"}>{label}</span>
      <span className={tone}>
        {value > 0 ? "+" : ""}
        {formatNaira(value)}
      </span>
    </div>
  );
}

function RateRow({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div className="grid grid-cols-[110px_40px_1fr] items-center gap-2">
      <span className="text-white/55">{label}</span>
      <span className="text-white/70">{value}%</span>
      <div className="h-2 bg-white/10">
        <div className={`h-2 ${barClass}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
