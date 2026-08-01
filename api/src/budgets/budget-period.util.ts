import { BudgetPeriod } from '../entities/budget.entity';

export interface PeriodRange {
  start: string;
  end: string;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Calendar-aligned, not anchored to the budget's own startDate: weekly is
// Mon–Sun, monthly is 1st–last day, yearly is Jan 1–Dec 31. Simpler and more
// intuitive than a "recurs every N days/months from startDate" scheme, which
// runs into gnarly variable month-length edge cases for no real benefit.
export function getCurrentPeriodRange(
  period: BudgetPeriod,
  now: Date = new Date(),
): PeriodRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  switch (period) {
    case BudgetPeriod.WEEKLY: {
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const start = new Date(Date.UTC(year, month, day - daysSinceMonday));
      const end = new Date(Date.UTC(year, month, day - daysSinceMonday + 6));
      return { start: toDateString(start), end: toDateString(end) };
    }
    case BudgetPeriod.MONTHLY: {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0)); // day 0 of next month = last day of this month
      return { start: toDateString(start), end: toDateString(end) };
    }
    case BudgetPeriod.YEARLY: {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31));
      return { start: toDateString(start), end: toDateString(end) };
    }
  }
}
