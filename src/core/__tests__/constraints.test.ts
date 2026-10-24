import { describe, expect, it } from '@jest/globals';
import {
  createConstraints,
  type CreateConstraintsOptions,
} from '../constraints';
import type { CalendarDate } from '../types';

// "Now" = Wednesday 21 Oct 2026, 12:00 in India (06:30 UTC).
const NOW = new Date(Date.UTC(2026, 9, 21, 6, 30));
const IST = 'Asia/Kolkata';
const oct = (day: number): CalendarDate => {
  return { year: 2026, month: 10, day };
};
const base: CreateConstraintsOptions = {
  type: 'date',
  timeZone: IST,
  now: NOW,
};

/** Days of October 2026 that are selectable (1–31). */
const allowedOctDays = (input: CreateConstraintsOptions): number[] => {
  const c = createConstraints(input);
  return Array.from({ length: 31 }, (_, i) => i + 1).filter(
    (d) => !c.dayStatus(oct(d)).disabled
  );
};

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('constraints: no limits', () => {
  it('greys nothing', () => {
    expect(allowedOctDays(base)).toEqual(range(1, 31));
    expect(createConstraints(base).timeBounds(oct(21))).toBeNull();
  });
});

describe('constraints: limits from props', () => {
  it('combine min/max days, a custom check and time bounds', () => {
    const c = createConstraints({
      ...base,
      type: 'datetime',
      minDate: oct(21),
      maxDate: oct(25),
      isDisabled: (d) => d.day === 23,
      timeBounds: (d) =>
        d.day === 21 ? { min: { hour: 12, minute: 6 } } : null,
    });
    expect(c.dayStatus(oct(20)).reasons).toEqual(['OUTSIDE_RANGE']);
    expect(c.dayStatus(oct(23)).reasons).toEqual(['CUSTOM']);
    expect(c.dayStatus(oct(26)).disabled).toBe(true);
    expect(c.timeBounds(oct(21))).toEqual({ min: { hour: 12, minute: 6 } });
  });
});

describe('constraints: min / max with edge times', () => {
  const edges: CreateConstraintsOptions = {
    ...base,
    type: 'datetime',
    min: { date: oct(5), time: { hour: 9, minute: 30 } },
    max: { date: oct(15), time: { hour: 18, minute: 0 } },
  };

  it('limits the time on the first and last day only', () => {
    const c = createConstraints(edges);
    expect(allowedOctDays(edges)).toEqual(range(5, 15));
    expect(c.timeBounds(oct(5))).toEqual({ min: { hour: 9, minute: 30 } });
    expect(c.timeBounds(oct(15))).toEqual({ max: { hour: 18, minute: 0 } });
    expect(c.timeBounds(oct(10))).toBeNull();
    expect(
      c.isValueAllowed({ date: oct(5), time: { hour: 9, minute: 29 } })
    ).toBe(false);
    expect(
      c.isValueAllowed({ date: oct(5), time: { hour: 9, minute: 30 } })
    ).toBe(true);
  });

  it('combines with minDate / maxDate: the tighter one wins', () => {
    const later = createConstraints({
      ...edges,
      minDate: oct(6),
      maxDate: oct(15),
    });
    expect(later.range).toEqual({
      min: { date: oct(6) },
      max: { date: oct(15), time: { hour: 18, minute: 0 } },
    });
    const sameDay = createConstraints({ ...edges, minDate: oct(5) });
    expect(sameDay.range.min).toEqual({
      date: oct(5),
      time: { hour: 9, minute: 30 },
    });
  });

  it('has no time bounds on a date picker', () => {
    const c = createConstraints({ ...edges, type: 'date' });
    expect(c.timeBounds(oct(5))).toBeNull();
    expect(c.isValueAllowed({ date: oct(5), time: null })).toBe(true);
  });
});

describe('constraints: weekdays and holidays', () => {
  const holidays = ['2026-10-23T00:00:00.000Z', '2026-10-26'];

  it('greys disabled weekdays (Saturday 24, Sunday 25)', () => {
    const c = createConstraints({ ...base, disabledWeekdays: [6, 7] });
    expect(c.dayStatus(oct(24))).toEqual({
      disabled: true,
      reasons: ['WEEKDAY'],
      holiday: false,
    });
    expect(c.dayStatus(oct(25)).reasons).toEqual(['WEEKDAY']);
    expect(c.dayStatus(oct(23)).disabled).toBe(false);
  });

  it('marks holidays but keeps them selectable by default', () => {
    const c = createConstraints({ ...base, holidays });
    expect(c.dayStatus(oct(23))).toEqual({
      disabled: false,
      reasons: [],
      holiday: true,
    });
    expect(c.dayStatus(oct(26)).holiday).toBe(true);
    expect(c.dayStatus(oct(22)).holiday).toBe(false);
  });

  it('disables holidays with disableHolidays', () => {
    const c = createConstraints({ ...base, holidays, disableHolidays: true });
    expect(c.dayStatus(oct(23))).toEqual({
      disabled: true,
      reasons: ['HOLIDAY'],
      holiday: true,
    });
  });
});

describe('constraints: custom checks', () => {
  it('isDisabled: true, a reason, a list of reasons, or nothing', () => {
    const reasonsFor = (result: boolean | string | string[]) =>
      createConstraints({ ...base, isDisabled: () => result }).dayStatus(
        oct(21)
      );
    expect(reasonsFor(true)).toEqual({
      disabled: true,
      reasons: ['CUSTOM'],
      holiday: false,
    });
    expect(reasonsFor('BOOKED').reasons).toEqual(['BOOKED']);
    expect(reasonsFor(['BOOKED', 'CUSTOM', 'BOOKED']).reasons).toEqual([
      'BOOKED',
      'CUSTOM',
    ]);
    expect(reasonsFor([]).disabled).toBe(false);
    expect(reasonsFor(false).disabled).toBe(false);
  });

  it('keeps the reason order: range, weekday, holiday, isDisabled, isEnabled', () => {
    const c = createConstraints({
      ...base,
      maxDate: oct(20),
      disabledWeekdays: [6],
      holidays: ['2026-10-24'],
      disableHolidays: true,
      isDisabled: () => 'BOOKED',
      isEnabled: () => false,
    });
    expect(c.dayStatus(oct(24)).reasons).toEqual([
      'OUTSIDE_RANGE',
      'WEEKDAY',
      'HOLIDAY',
      'BOOKED',
      'CUSTOM',
    ]);
  });

  it('isEnabled: false greys the day as CUSTOM', () => {
    const c = createConstraints({
      ...base,
      isEnabled: (d) => d.day % 2 === 0,
      isDisabled: (d) => d.day === 21,
    });
    expect(c.dayStatus(oct(21)).reasons).toEqual(['CUSTOM']);
    expect(c.dayStatus(oct(22)).disabled).toBe(false);
  });

  it('timeBounds tightens the edge times, never loosens them', () => {
    const c = createConstraints({
      ...base,
      type: 'datetime',
      min: { date: oct(5), time: { hour: 9, minute: 30 } },
      timeBounds: (d) =>
        d.day === 5
          ? { min: { hour: 8, minute: 0 }, max: { hour: 17, minute: 0 } }
          : { min: { hour: 10, minute: 0 } },
    });
    expect(c.timeBounds(oct(5))).toEqual({
      min: { hour: 9, minute: 30 },
      max: { hour: 17, minute: 0 },
    });
    expect(c.timeBounds(oct(6))).toEqual({ min: { hour: 10, minute: 0 } });
  });
});

describe('constraints: months, years, first selectable day, nothing selectable', () => {
  it('finds the first selectable day from today', () => {
    const c = createConstraints({
      ...base,
      minDate: { year: 2026, month: 12, day: 6 },
    });
    expect(c.firstSelectable(oct(21))).toEqual({
      year: 2026,
      month: 12,
      day: 6,
    });
    expect(c.isMonthSelectable(2026, 10)).toBe(false);
    expect(c.isYearSelectable(2025)).toBe(false);
    expect(c.isYearSelectable(2027)).toBe(true);
  });

  it('returns null when no day can ever be picked (empty state)', () => {
    const c = createConstraints({
      ...base,
      minDate: { year: 2026, month: 1, day: 1 },
      maxDate: { year: 2026, month: 6, day: 30 },
      isEnabled: (d) => d.month === 12,
    });
    expect(c.firstSelectable(oct(21))).toBeNull();
    expect(
      createConstraints({ ...base, isEnabled: () => false }).firstSelectable(
        oct(21)
      )
    ).toBeNull();
  });

  it('checks month and year selectability against every limit', () => {
    const c = createConstraints({
      ...base,
      maxDate: { year: 2027, month: 3, day: 31 },
      isEnabled: (d) => d.month !== 11,
    });
    expect(c.isMonthSelectable(2026, 11)).toBe(false);
    expect(c.isMonthSelectable(2026, 12)).toBe(true);
    expect(c.isMonthSelectable(2027, 4)).toBe(false);
    expect(c.isYearSelectable(2027)).toBe(true);
    expect(c.isYearSelectable(2028)).toBe(false);
    const allWeekdays = createConstraints({
      ...base,
      disabledWeekdays: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(allWeekdays.isMonthSelectable(2026, 10)).toBe(false);
  });

  it('checks a whole value, including its time', () => {
    const c = createConstraints({
      ...base,
      type: 'datetime',
      timeBounds: () => {
        return { max: { hour: 17, minute: 0 } };
      },
    });
    expect(
      c.isValueAllowed({ date: oct(21), time: { hour: 17, minute: 0 } })
    ).toBe(true);
    expect(
      c.isValueAllowed({ date: oct(21), time: { hour: 17, minute: 1 } })
    ).toBe(false);
    expect(c.isValueAllowed(null)).toBe(false);
  });

  it('depends on "now" only when told so', () => {
    expect(createConstraints(base).dependsOnNow).toBe(false);
    expect(
      createConstraints({ ...base, dependsOnNow: true }).dependsOnNow
    ).toBe(true);
  });
});

describe('firstSelectable with a maxDate long ago', () => {
  it('finds the latest allowed day even 18 years back (a date-of-birth limit)', () => {
    const c = createConstraints({
      type: 'date',
      timeZone: 'UTC',
      now: new Date(Date.UTC(2026, 9, 25)),
      maxDate: { year: 2008, month: 10, day: 25 },
    });
    expect(c.firstSelectable({ year: 2026, month: 10, day: 25 })).toEqual({
      year: 2008,
      month: 10,
      day: 25,
    });
  });

  it('skips back past disabled days before the maxDate', () => {
    const c = createConstraints({
      type: 'date',
      timeZone: 'UTC',
      now: new Date(Date.UTC(2026, 9, 25)),
      maxDate: { year: 2000, month: 1, day: 2 }, // a Sunday
      disabledWeekdays: [6, 7],
    });
    expect(c.firstSelectable({ year: 2026, month: 10, day: 25 })).toEqual({
      year: 1999,
      month: 12,
      day: 31,
    });
  });
});
