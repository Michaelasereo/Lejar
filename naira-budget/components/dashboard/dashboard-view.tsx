import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatNaira } from "@/lib/utils/currency";
import { categoryDotColor } from "@/lib/utils/expense-category";
import { cn } from "@/lib/utils/cn";
import { TbMaturityBanner } from "@/components/dashboard/tb-maturity-banner";
import { WealthProjectionChart } from "@/components/dashboard/wealth-projection-chart";
import { StreakWarningBanner } from "@/components/dashboard/streak-warning-banner";
import { IncomeOverrideControls } from "@/components/dashboard/income-override-controls";

const INVESTMENT_LABELS: Record<string, string> = {
  T_BILL: "T-bills",
  PIGGYVEST: "PiggyVest",
  RISEVEST: "Risevest",
  NGX: "NGX",
  COWRYWISE: "Cowrywise",
  OTHER: "Other",
};

const STREAK_NAMES: Record<string, string> = {
  MONTHLY_SAVINGS: "Savings streak",
  MONTHLY_BUDGET: "Budget streak",
  WEEKLY_LOGGING: "Logging streak",
  MONTHLY_INVESTING: "Investing streak",
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return formatNaira(n);
}

function spentTone(
  spent: number,
  budget: number,
): "green" | "amber" | "red" {
  if (budget <= 0) return "green";
  const r = spent / budget;
  if (r < 0.7) return "green";
  if (r < 0.9) return "amber";
  return "red";
}

function toneClass(t: "green" | "amber" | "red"): string {
  if (t === "green") return "text-accent";
  if (t === "amber") return "text-amber-400";
  return "text-red-400";
}

interface DashboardViewProps {
  data: DashboardData;
}

export function DashboardView({ data }: DashboardViewProps) {
  const budget = data.budgetTotal > 0 ? data.budgetTotal : data.totalIncome;
  const spentToneKey = spentTone(data.spentThisMonth, budget);

  const investmentOrder = ["T_BILL", "RISEVEST", "PIGGYVEST", "NGX"] as const;

  return (
    <div>
      <TbMaturityBanner items={data.tbillsMaturingSoon} />
      {data.streakWarning ? <StreakWarningBanner warning={data.streakWarning} /> : null}
      {data.unspentCarryover > 0 &&
      new Date().getDate() >= 28 &&
      new Date().getDate() <= 31 ? (
        <div className="mt-4 border border-green-500/20 bg-green-500/5 p-3 text-sm text-white/70">
          <p>
            You have {formatNaira(data.unspentCarryover)} unspent from your spending budget this
            month. It will be added to your net worth at month end.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Monthly income"
          value={formatNaira(data.totalIncome)}
          valueClass="text-foreground"
          subNode={
            <IncomeOverrideControls
              monthKey={data.monthKey}
              currentIncome={data.totalIncome}
              isOverridden={data.incomeIsOverridden}
            />
          }
        />
        <MetricCard
          label="Saved this month"
          value={formatNaira(data.savedThisMonth)}
          valueClass="text-accent"
        />
        <MetricCard
          label="Spent this month"
          value={formatNaira(data.spentThisMonth)}
          sub={`of ${formatNaira(budget)} budget this month`}
          valueClass={toneClass(spentToneKey)}
        />
        <MetricCard
          label="Savings rate"
          value={`${data.savingsRatePercent}%`}
          sub="vs 5% avg"
          valueClass="text-accent"
        />
      </div>
      {data.bestStreak ? (
        <section className="mt-6 border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-widest text-white/30">Current momentum</p>
          <p className="mt-2 text-sm text-white">
            {STREAK_NAMES[data.bestStreak.type] ?? data.bestStreak.type}:{" "}
            <span className="font-medium text-accent">{data.bestStreak.currentCount}</span>
          </p>
          <Link href="/app/analytics?tab=streaks" className="mt-2 inline-block text-xs text-white/50 hover:text-white/80">
            View all streaks →
          </Link>
        </section>
      ) : null}

      <section className="mt-12">
        <p className="text-xs uppercase tracking-widest text-white/30">Buckets</p>
        <div className="mt-4 space-y-4">
          {data.buckets.length === 0 ? (
            <p className="text-sm text-white/40">
              No buckets yet — add them in Buckets.
            </p>
          ) : (
            data.buckets.map((b) => {
              const ratio = b.allocated > 0 ? b.spent / b.allocated : 0;
              const t = spentTone(b.spent, b.allocated);
              if (b.allocated <= 0) {
                return (
                  <div
                    key={b.id}
                    className="border border-white/8 bg-[#111111] p-4"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">{b.name}</span>
                      <span className="tabular-nums text-white/50">
                        {formatNaira(0)} allocated
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={b.id}
                  className="border border-white/8 bg-[#111111] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-white/90">
                      {b.name}
                    </span>
                    <span className="text-sm tabular-nums text-white/80">
                      {b.percentage.toFixed(2)}% · {formatNaira(b.allocated)}
                    </span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/5">
                    <div
                      className={cn(
                        "h-1 transition-all",
                        t === "green" && "bg-accent",
                        t === "amber" && "bg-amber-500",
                        t === "red" && "bg-red-500",
                      )}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-white/30">
                    <span>{Math.round(ratio * 100)}% spent</span>
                    <span>
                      {formatNaira(b.spent)} spent ·{" "}
                      {formatNaira(Math.max(0, b.allocated - b.spent))} remaining
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 text-right">
          <Link
            href="/app/income"
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            Manage buckets →
          </Link>
        </div>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <p className="text-xs uppercase tracking-widest text-white/30">
            Target savings
          </p>
          {data.pinnedJars.length > 0 ? (
            <div className="mt-4 space-y-4">
              {data.pinnedJars.map((jar) => (
                <PinnedJarSummary key={jar.id} jar={jar} />
              ))}
              <Link
                href="/app/jars"
                className="inline-block text-sm text-white/40 transition-colors hover:text-white/70"
              >
                Manage jars →
              </Link>
            </div>
          ) : data.rentJar ? (
            <RentJarPanel rent={data.rentJar} />
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-white/40">
                Pin savings jars on the Jars page, or add a rent jar in Settings.
              </p>
              <Link
                href="/app/jars"
                className="inline-block text-sm font-medium text-accent"
              >
                Create a jar →
              </Link>
            </div>
          )}
        </section>

        <section>
          <p className="text-xs uppercase tracking-widest text-white/30">
            Investments
          </p>
          <p className="mt-4 text-3xl font-medium tabular-nums text-foreground">
            {formatNaira(data.portfolioTotal)}
          </p>
          <p className="mt-1 text-xs text-white/40">Total portfolio value</p>
          <div className="mt-6 space-y-3 border-t border-white/5 pt-4">
            {investmentOrder.map((key) => {
              const amt = data.investmentsByType[key] ?? 0;
              const colors: Record<string, string> = {
                T_BILL: "bg-accent",
                RISEVEST: "bg-blue-500",
                PIGGYVEST: "bg-purple-500",
                NGX: "bg-violet-500",
              };
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-white/50">
                    <span
                      className={cn("h-2 w-2 rounded-full", colors[key])}
                      aria-hidden
                    />
                    {INVESTMENT_LABELS[key] ?? key}
                  </span>
                  <span className="tabular-nums text-white/90">
                    {formatNaira(amt)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-right">
            <Link
              href="/app/investments"
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              View all →
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-12">
        <p className="text-xs uppercase tracking-widest text-white/30">
          Recent expenses
        </p>
        {data.recentExpenses.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">
            No expenses logged yet · Tap + to log your first.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 border-t border-white/5 pt-4">
            {data.recentExpenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryDotColor(e.category) }}
                    aria-hidden
                  />
                  <span className="truncate text-white/90">
                    {e.label ?? e.category}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block tabular-nums text-foreground">
                    {formatNaira(e.amount)}
                  </span>
                  <span className="text-xs text-white/30">
                    {e.occurredAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-right">
          <Link
            href="/app/expenses"
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            View all expenses →
          </Link>
        </div>
      </section>

      <section className="mt-12 border border-white/8 bg-[#111111] p-6">
        <p className="text-xs uppercase tracking-widest text-white/30">
          Wealth projection
        </p>
        <p className="mt-2 text-sm text-white/50">
          Based on your current savings rate and a 20% blended return
        </p>
        <div className="mt-6">
          <WealthProjectionChart data={data.wealthBars} />
        </div>
        <p className="mt-4 text-center text-sm text-white/60">
          {data.wealthFinalLine}
        </p>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  subNode,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  subNode?: ReactNode;
  valueClass: string;
}) {
  return (
    <div className="border border-white/8 bg-[#111111] p-4">
      <p className="text-xs uppercase tracking-widest text-white/30">{label}</p>
      <p className={cn("mt-3 text-2xl font-medium tabular-nums md:text-3xl", valueClass)}>
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-white/30">{sub}</p> : null}
      {subNode}
    </div>
  );
}

function PinnedJarSummary({
  jar,
}: {
  jar: DashboardData["pinnedJars"][number];
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const dash = (jar.progressPercent / 100) * c;
  const stroke = jar.color || "#16a34a";

  return (
    <Link
      href={`/app/jars/${jar.id}`}
      className="flex flex-col items-center border border-white/8 bg-[#111111] p-6 transition-colors hover:border-white/15"
    >
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl" aria-hidden>
            {jar.emoji}
          </span>
          <span className="mt-1 text-xs font-medium tabular-nums text-foreground">
            {Math.round(jar.progressPercent)}%
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-white/90">{jar.name}</p>
      <p className="mt-1 text-center text-xs text-white/40">
        {formatCompact(jar.savedAmount)} / {formatCompact(jar.targetAmount)}
      </p>
      <p className="mt-2 text-center text-xs text-white/50">
        {jar.monthlyTarget > 0
          ? `Target ${formatNaira(jar.monthlyTarget)}/mo`
          : "Set a monthly target in Jars"}
      </p>
      <span
        className={cn(
          "mt-3 inline-block border px-3 py-1 text-xs font-medium uppercase tracking-wider",
          jar.isCompleted
            ? "border-green-500/40 bg-green-500/10 text-green-400"
            : jar.onTrack
              ? "border-green-500/40 bg-green-500/10 text-green-400"
              : "border-amber-500/40 bg-amber-500/10 text-amber-400",
        )}
      >
        {jar.isCompleted ? "Complete" : jar.onTrack ? "On track" : "Behind"}
      </span>
    </Link>
  );
}

function RentJarPanel({
  rent,
}: {
  rent: NonNullable<DashboardData["rentJar"]>;
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const dash = (rent.progressPercent / 100) * c;

  return (
    <div className="mt-6 flex flex-col items-center border border-white/8 bg-[#111111] p-6">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="#16a34a"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-medium tabular-nums text-foreground">
            {formatCompact(rent.savedAmount)} / {formatCompact(rent.annualRent)}
          </span>
          <span className="text-xs text-white/40">saved / annual</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-white/50">
        {Math.round(rent.progressPercent)}% · {rent.monthsToDue} months to go
      </p>
      <p className="mt-2 text-sm text-white/60">
        Set aside {formatNaira(rent.monthlyTarget)} this month
      </p>
      <span
        className={cn(
          "mt-3 inline-block border px-3 py-1 text-xs font-medium uppercase tracking-wider",
          rent.onTrack
            ? "border-green-500/40 bg-green-500/10 text-green-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-400",
        )}
      >
        {rent.onTrack ? "On track" : "Behind"}
      </span>
      <Link
        href="/app/settings"
        className="mt-4 text-sm text-white/40 hover:text-white/70"
      >
        Update jar →
      </Link>
    </div>
  );
}
