/** Future value of monthly contributions with monthly compounding. */
export function projectWealthBars(
  monthlySavings: number,
  annualRate: number,
  yearsList: number[],
): { year: number; value: number }[] {
  if (monthlySavings <= 0 || annualRate <= 0) {
    return yearsList.map((year) => ({ year, value: 0 }));
  }
  const monthlyRate = annualRate / 12;
  return yearsList.map((year) => {
    const months = year * 12;
    const value =
      monthlySavings *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    return { year, value: Math.round(value) };
  });
}
