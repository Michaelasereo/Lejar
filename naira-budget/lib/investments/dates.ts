/** Parse YYYY-MM-DD to a stable Date (noon UTC) for storage. */
export function dateInputToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Format Date for <input type="date" /> in local calendar. */
export function dateToInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
