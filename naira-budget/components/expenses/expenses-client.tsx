"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { expenseCategoryLabel } from "@/lib/expenses/constants";
import type { ExpensesPageData } from "@/lib/expenses/get-expenses-page-data";
import { formatMonthLabel } from "@/lib/utils/month";
import { formatNaira } from "@/lib/utils/currency";

interface ExpensesClientProps {
  data: ExpensesPageData;
}

export function ExpensesClient({ data }: ExpensesClientProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  const categorySummary = useMemo(() => {
    return Object.entries(data.byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [data.byCategory]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-white/30">Expenses</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Spending</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Log purchases and bills for {formatMonthLabel(data.monthKey)}. Tag optional buckets to
          see spend against your jars.
        </p>
      </header>

      <section className="rounded-none border border-white/10 bg-card p-4 md:p-6">
        <p className="text-xs uppercase tracking-widest text-white/40">This month</p>
        <p className="mt-2 text-3xl font-medium tabular-nums text-foreground">
          {formatNaira(data.totalSpent)}
        </p>
        {categorySummary.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {categorySummary.map(({ category, amount }) => (
              <li
                key={category}
                className="border border-white/10 bg-background/50 px-3 py-1.5 text-sm text-white/80"
              >
                <span className="text-white/45">{expenseCategoryLabel(category)}:</span>{" "}
                <span className="tabular-nums">{formatNaira(amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/45">No expenses in this month yet.</p>
        )}
      </section>

      <AddExpenseForm monthKey={data.monthKey} buckets={data.buckets} onCreated={refresh} />

      <section className="border border-white/10 bg-card">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Entries</p>
          <h2 className="mt-1 text-lg font-medium text-foreground">All for this month</h2>
        </div>
        <div className="px-4">
          {data.expenses.length === 0 ? (
            <p className="py-8 text-sm text-white/45">
              No expenses logged. Add one above, or switch month in the header.
            </p>
          ) : (
            data.expenses.map((row) => (
              <ExpenseRow key={row.id} row={row} buckets={data.buckets} onSaved={refresh} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
