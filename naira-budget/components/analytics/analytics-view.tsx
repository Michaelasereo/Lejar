"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { AnalyticsResponseBody, AnalyticsRange } from "@/lib/utils/analytics";
import { expenseCategoryLabel } from "@/lib/expenses/constants";
import { categoryColorForAnalytics } from "@/lib/utils/analytics";
import { formatNaira } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const CHART_BG = "#0a0a0a";
const GRID = "rgba(255,255,255,0.05)";
const TICK = "rgba(255,255,255,0.35)";

function tooltipNaira(value: unknown): string {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? formatNaira(n) : "";
}

function tooltipPercent(value: unknown): string {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? `${n}%` : "";
}

function buildQueryFromState(s: {
  range: AnalyticsRange;
  month: string;
  year: number;
  quarter: number;
  from: string;
  to: string;
}): string {
  const p = new URLSearchParams();
  p.set("range", s.range);
  if (s.range === "monthly") p.set("month", s.month);
  if (s.range === "quarterly") {
    p.set("year", String(s.year));
    p.set("quarter", String(s.quarter));
  }
  if (s.range === "annual") p.set("year", String(s.year));
  if (s.range === "custom") {
    p.set("from", s.from);
    p.set("to", s.to);
  }
  return p.toString();
}

export function AnalyticsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialRange = (searchParams.get("range") as AnalyticsRange | null) ?? "monthly";
  const range = RANGE_OPTIONS.some((r) => r.value === initialRange)
    ? initialRange
    : "monthly";

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [data, setData] = useState<AnalyticsResponseBody | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const qMonth = searchParams.get("month") ?? defaultMonth;
  const qYear = Number(searchParams.get("year")) || now.getFullYear();
  const qQuarter = Number(searchParams.get("quarter")) || Math.floor(now.getMonth() / 3) + 1;
  const qFrom = searchParams.get("from") ?? defaultMonth;
  const qTo = searchParams.get("to") ?? defaultMonth;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const qs = searchParams.toString();
    try {
      const res = await fetch(`/api/analytics?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as AnalyticsResponseBody;
      setData(json);
    } catch {
      toast.error("Could not load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  function pushParams(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  function setRange(nextRange: AnalyticsRange) {
    const base = {
      range: nextRange,
      month: qMonth,
      year: qYear,
      quarter: qQuarter,
      from: qFrom,
      to: qTo,
    };
    router.push(`${pathname}?${buildQueryFromState(base)}`);
  }

  const donutData = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.aggregateExpenseByCategory).filter(
      ([, v]) => v > 0,
    );
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);
    const rest = entries.slice(8).reduce((s, [, v]) => s + v, 0);
    const rows = top.map(([name, value]) => ({
      name: expenseCategoryLabel(name),
      value,
      key: name,
    }));
    if (rest > 0) rows.push({ name: "Other categories", value: rest, key: "OTHER_MERGED" });
    return rows;
  }, [data]);

  async function saveSnapshot() {
    if (!data?.months.length) return;
    const last = data.months[data.months.length - 1]!;
    setSnapshotBusy(true);
    try {
      const res = await fetch("/api/analytics/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: last.year, month: last.month }),
      });
      if (!res.ok) throw new Error("fail");
      toast.success("Snapshot saved for analytics history");
      void fetchAnalytics();
    } catch {
      toast.error("Could not save snapshot");
    } finally {
      setSnapshotBusy(false);
    }
  }

  const csvHref = `/api/analytics?${searchParams.toString()}&format=csv`;

  return (
    <div className="space-y-10 pb-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Insights</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Analytics</h1>
        <p className="mt-2 max-w-xl text-sm text-white/45">
          Trends, categories, portfolio mix, and savings streaks — tuned for dark charts.
        </p>
      </header>

      <section className="border border-white/10 bg-[#0a0a0a] p-4">
        <p className="text-xs uppercase tracking-widest text-white/30">Time range</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={cn(
                "min-h-11 border px-4 py-2 text-sm transition-colors",
                range === opt.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {range === "monthly" ? (
            <label className="flex flex-col gap-2 text-sm text-white/60">
              Month
              <input
                type="month"
                value={qMonth}
                onChange={(e) => pushParams({ month: e.target.value })}
                className="min-h-11 border border-white/15 bg-black px-3 text-foreground"
              />
            </label>
          ) : null}
          {range === "quarterly" || range === "annual" ? (
            <label className="flex flex-col gap-2 text-sm text-white/60">
              Year
              <input
                type="number"
                value={qYear}
                onChange={(e) =>
                  pushParams({ year: e.target.value === "" ? undefined : e.target.value })
                }
                className="min-h-11 border border-white/15 bg-black px-3 text-foreground tabular-nums"
              />
            </label>
          ) : null}
          {range === "quarterly" ? (
            <label className="flex flex-col gap-2 text-sm text-white/60">
              Quarter
              <select
                value={qQuarter}
                onChange={(e) => pushParams({ quarter: e.target.value })}
                className="min-h-11 border border-white/15 bg-black px-3 text-foreground"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {range === "custom" ? (
            <>
              <label className="flex flex-col gap-2 text-sm text-white/60">
                From
                <input
                  type="month"
                  value={qFrom.length >= 7 ? qFrom.slice(0, 7) : qFrom}
                  onChange={(e) => pushParams({ from: e.target.value })}
                  className="min-h-11 border border-white/15 bg-black px-3 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white/60">
                To
                <input
                  type="month"
                  value={qTo.length >= 7 ? qTo.slice(0, 7) : qTo}
                  onChange={(e) => pushParams({ to: e.target.value })}
                  className="min-h-11 border border-white/15 bg-black px-3 text-foreground"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={csvHref}
            className="inline-flex min-h-11 items-center border border-white/15 px-4 text-sm text-white/70 hover:border-white/25 hover:text-white"
          >
            Export CSV
          </a>
          {range === "monthly" ? (
            <button
              type="button"
              disabled={snapshotBusy || loading}
              onClick={() => void saveSnapshot()}
              className="inline-flex min-h-11 items-center border border-accent/40 bg-accent/10 px-4 text-sm text-accent hover:bg-accent/15 disabled:opacity-40"
            >
              {snapshotBusy ? "Saving…" : "Save monthly snapshot"}
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-white/40">Loading analytics…</p>
      ) : !data ? (
        <p className="text-sm text-white/40">No data.</p>
      ) : (
        <>
          <section className="border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-xs uppercase tracking-widest text-white/30">
              Income vs expenses
            </p>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.incomeVsExpenseTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }}
                    formatter={(value) => tooltipNaira(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border border-white/10 bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-widest text-white/30">
                Spending by category
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell
                          key={`${entry.key}-${index}`}
                          fill={categoryColorForAnalytics(
                            entry.key === "OTHER_MERGED" ? "OTHER" : entry.key,
                          )}
                          stroke={CHART_BG}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => tooltipNaira(value)}
                      contentStyle={{
                        background: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
                {donutData.slice(0, 6).map((d, i) => (
                  <li key={d.key} className="flex justify-between text-sm">
                    <span className="text-white/60">{i + 1}. {d.name}</span>
                    <span className="tabular-nums text-white/90">{formatNaira(d.value)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-white/10 bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-widest text-white/30">
                Savings accumulation
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.cumulativeSavings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip
                      formatter={(value) => tooltipNaira(value)}
                      contentStyle={{
                        background: "#111",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="saved" stroke="#16a34a" fill="url(#cumGreen)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="border border-white/10 bg-[#0a0a0a] p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/30">
                  Savings rate
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Streak (months ≥5% savings rate):{" "}
                  <span className="font-medium text-accent">{data.streakMonths}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.savingsRateBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value) => tooltipPercent(value)}
                    contentStyle={{
                      background: "#111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="rate" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-xs uppercase tracking-widest text-white/30">
              Portfolio mix (tracked types)
            </p>
            <p className="mt-1 text-xs text-white/35">
              Values use monthly snapshots when saved; otherwise current holdings apply across the range.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.portfolioStacked} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip
                    formatter={(value) => tooltipNaira(value)}
                    contentStyle={{
                      background: "#111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tbills" stackId="a" fill="#16a34a" name="T-bills" />
                  <Bar dataKey="risevest" stackId="a" fill="#3b82f6" name="Risevest" />
                  <Bar dataKey="piggyvest" stackId="a" fill="#a855f7" name="PiggyVest" />
                  <Bar dataKey="ngx" stackId="a" fill="#e879f9" name="NGX" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {data.heatmapEligible && data.monthKeys[0] ? (
            <section className="border border-white/10 bg-[#0a0a0a] p-4">
              <p className="text-xs uppercase tracking-widest text-white/30">
                Daily spend heatmap
              </p>
              <Heatmap monthKey={data.monthKeys[0]} cells={data.heatmapDaily} />
            </section>
          ) : null}

          <section className="border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-xs uppercase tracking-widest text-white/30">
              Target savings progress
            </p>
            {data.jarsProgress.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">
                No jars yet —{" "}
                <Link href="/app/jars" className="text-accent hover:underline">
                  create one
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.jarsProgress.map((j) => (
                  <div
                    key={j.jarId}
                    className="border border-white/10 bg-black/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white/80">
                        <span className="mr-2">{j.emoji}</span>
                        {j.name}
                      </span>
                      <span className="text-xs tabular-nums text-white/50">{j.percent}%</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-white/10">
                      <div
                        className="h-1 bg-accent transition-all"
                        style={{ width: `${j.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-[#0a0a0a] p-4">
            <p className="text-xs uppercase tracking-widest text-white/30">Insights</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/65">
              {data.insights.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Heatmap({
  monthKey,
  cells,
}: {
  monthKey: string;
  cells: Array<{ day: number; amount: number }>;
}) {
  const max = Math.max(1, ...cells.map((c) => c.amount));
  const [ys, ms] = monthKey.split("-").map(Number);
  const pad =
    ys && ms
      ? new Date(ys, ms - 1, 1).getDay()
      : 0;

  return (
    <div className="mt-6 overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        }}
      >
        {Array.from({ length: pad }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {cells.map((c) => {
          const intensity = c.amount / max;
          return (
            <div
              key={c.day}
              title={`Day ${c.day}: ${formatNaira(c.amount)}`}
              className="aspect-square min-h-[2rem] border border-white/5 text-[10px] text-white/40"
              style={{
                backgroundColor: `rgba(22,163,74,${0.15 + intensity * 0.65})`,
              }}
            >
              <span className="flex h-full items-center justify-center tabular-nums">
                {c.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
