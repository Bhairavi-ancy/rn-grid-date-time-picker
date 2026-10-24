import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  addMonths,
  compareCalendarDates,
  daysBetween,
  daysInMonth,
  fromDateKey,
  isValidCalendarDate,
  todayIn,
  toDateKey,
  weekdayOf,
} from '../calendarDate';

describe('calendarDate', () => {
  it('validates real calendar days only', () => {
    expect(isValidCalendarDate({ year: 2028, month: 2, day: 29 })).toBe(true);
    expect(isValidCalendarDate({ year: 2026, month: 2, day: 29 })).toBe(false);
    expect(isValidCalendarDate({ year: 2026, month: 13, day: 1 })).toBe(false);
    expect(isValidCalendarDate({ year: 2026, month: 4, day: 31 })).toBe(false);
  });

  it('numbers weekdays 1–7 with Sunday = 7 (web numbering)', () => {
    expect(weekdayOf({ year: 2026, month: 10, day: 19 })).toBe(1); // Monday
    expect(weekdayOf({ year: 2026, month: 10, day: 25 })).toBe(7); // Sunday
  });

  it('does day and month arithmetic without any zone shift', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 8 }, 1)).toEqual({
      year: 2026,
      month: 3,
      day: 9,
    });
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
    expect(
      daysBetween(
        { year: 2026, month: 10, day: 1 },
        { year: 2026, month: 11, day: 1 }
      )
    ).toBe(31);
    expect(daysInMonth(2028, 2)).toBe(29);
  });

  it('compares days', () => {
    expect(
      compareCalendarDates(
        { year: 2026, month: 1, day: 2 },
        { year: 2026, month: 1, day: 3 }
      )
    ).toBe(-1);
    expect(
      compareCalendarDates(
        { year: 2026, month: 1, day: 3 },
        { year: 2026, month: 1, day: 3 }
      )
    ).toBe(0);
    expect(
      compareCalendarDates(
        { year: 2027, month: 1, day: 1 },
        { year: 2026, month: 12, day: 31 }
      )
    ).toBe(1);
  });

  it('reads "today" in the zone it is given, not the device zone', () => {
    // 21 Oct 2026, 20:00 UTC = 22 Oct 01:30 in India, 21 Oct 16:00 in New York.
    const now = new Date(Date.UTC(2026, 9, 21, 20, 0));
    expect(todayIn('Asia/Kolkata', now)).toEqual({
      year: 2026,
      month: 10,
      day: 22,
    });
    expect(todayIn('America/New_York', now)).toEqual({
      year: 2026,
      month: 10,
      day: 21,
    });
  });

  it('round-trips date keys and ignores any time part', () => {
    expect(toDateKey({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05');
    expect(fromDateKey('2026-12-25T00:00:00.000Z')).toEqual({
      year: 2026,
      month: 12,
      day: 25,
    });
    expect(fromDateKey('not a date')).toBeNull();
    expect(fromDateKey('')).toBeNull();
  });
});
