import { monthRange } from "@/lib/dashboard/get-dashboard-data";
import { dateToInputValue } from "@/lib/investments/dates";

/** Sensible default date for a new expense when browsing a month. */
export function defaultOccurrenceDateForMonth(monthKey: string): string {
  const range = monthRange(monthKey);
  if (!range) return dateToInputValue(new Date());
  const now = new Date();
  if (now.getTime() >= range.start.getTime() && now.getTime() <= range.end.getTime()) {
    return dateToInputValue(now);
  }
  return dateToInputValue(range.start);
}
