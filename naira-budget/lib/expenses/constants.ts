export const EXPENSE_CATEGORIES = [
  { value: "FOOD", label: "Food & dining" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "HOUSING", label: "Housing & rent" },
  { value: "HEALTH", label: "Health" },
  { value: "GIFT", label: "Gift" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "TRANSFERS", label: "Transfers & fees" },
  { value: "OTHER", label: "Other" },
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];

export function expenseCategoryLabel(value: string): string {
  const row = EXPENSE_CATEGORIES.find((c) => c.value === value);
  return row?.label ?? value;
}
