export const CATEGORY_DOT_COLORS: Record<string, string> = {
  FOOD: "#16a34a",
  TRANSPORT: "#3b82f6",
  DATA: "#8b5cf6",
  TREATS: "#ec4899",
  SHOPPING: "#f97316",
  HEALTH: "#14b8a6",
  GIFT: "#f59e0b",
  UTILITIES: "#64748b",
  PERSONAL: "#eab308",
  MISC: "#94a3b8",
  HOUSING: "#c084fc",
  ENTERTAINMENT: "#f472b6",
  SUBSCRIPTIONS: "#a78bfa",
  TRANSFERS: "#64748b",
  OTHER: "#94a3b8",
};

export function categoryDotColor(category: string): string {
  return CATEGORY_DOT_COLORS[category] ?? "#94a3b8";
}
