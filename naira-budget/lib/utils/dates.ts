import { startOfMonth } from "date-fns";

export function parseMonthParam(
  monthParam?: string,
): { year: number; month: number; date: Date } {
  if (!monthParam) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      date: startOfMonth(now),
    };
  }
  const [year, month] = monthParam.split("-").map(Number);
  return {
    year,
    month,
    date: startOfMonth(new Date(year, month - 1, 1)),
  };
}

export function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getPreviousMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getMonthsBetween(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}
