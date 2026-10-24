import { addDays, weekdayOf } from './calendarDate';
import type { CalendarDate, Weekday } from './types';

/** One cell of the month grid. */
export interface MonthGridCell {
  date: CalendarDate;
  inMonth: boolean;
  weekday: Weekday;
}

export interface MonthGrid {
  year: number;
  month: number;
  /** Always 42 cells (6 weeks), in display order. */
  cells: MonthGridCell[];
  /** Weeks that contain at least one day of the month (4–6). */
  weekCount: number;
}

const CACHE_LIMIT = 36;
const cache = new Map<string, MonthGrid>();

/** The 7 weekdays in display order for a given first day of the week. */
export const weekdayOrder = (firstDayOfWeek: Weekday): Weekday[] =>
  Array.from(
    { length: 7 },
    (_, i) => (((firstDayOfWeek - 1 + i) % 7) + 1) as Weekday
  );

/**
 * The 6×7 grid for a month, starting on `firstDayOfWeek` (1 = Monday … 7 = Sunday,
 * any day allowed). Cells outside the month have `inMonth: false`.
 */
export const buildMonthGrid = (
  year: number,
  month: number,
  firstDayOfWeek: Weekday
): MonthGrid => {
  const key = `${year}-${month}-${firstDayOfWeek}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const first: CalendarDate = { year, month, day: 1 };
  const leading = (weekdayOf(first) - firstDayOfWeek + 7) % 7;
  const start = addDays(first, -leading);

  const cells: MonthGridCell[] = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      inMonth: date.month === month && date.year === year,
      weekday: weekdayOf(date),
    };
  });

  const lastInMonth = cells.reduce(
    (last, cell, i) => (cell.inMonth ? i : last),
    0
  );
  const grid: MonthGrid = {
    year,
    month,
    cells,
    weekCount: Math.floor(lastInMonth / 7) + 1,
  };

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, grid);
  return grid;
};
