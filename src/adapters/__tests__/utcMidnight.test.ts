import { describe, expect, it } from '@jest/globals';
import type { DateTimeValue, PickerType } from '../../core/types';
import { utcMidnightAdapter } from '../utcMidnight';

// The source helpers, called through the adapter.
const fromWire = (raw: string, type: PickerType, timeZone: string) =>
  utcMidnightAdapter.parse(raw, { type, timeZone });
// The adapter also tolerates a missing value ('' out).
const toWire = (
  value: DateTimeValue | null,
  type: PickerType,
  timeZone: string
) => utcMidnightAdapter.format(value as DateTimeValue, { type, timeZone });
const unchangedWire = (raw: string, type: PickerType) =>
  utcMidnightAdapter.formatUnchanged?.(raw, { type, timeZone: 'UTC' });

const ZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Pacific/Auckland',
];

describe('utc-midnight: date fields', () => {
  it('saves the calendar day as UTC midnight, in any zone', () => {
    ZONES.forEach((zone) => {
      expect(
        toWire(
          { date: { year: 2026, month: 10, day: 21 }, time: null },
          'date',
          zone
        )
      ).toBe('2026-10-21T00:00:00.000Z');
    });
  });

  it('reads the stored UTC day, never shifting it (also west of UTC)', () => {
    ZONES.forEach((zone) => {
      expect(fromWire('2026-10-21T00:00:00.000Z', 'date', zone)).toEqual({
        date: { year: 2026, month: 10, day: 21 },
        time: null,
      });
    });
  });

  it('round-trips every day of 2026 and 29 Feb 2028', () => {
    const days = [];
    for (
      let d = new Date(Date.UTC(2026, 0, 1));
      d.getUTCFullYear() === 2026;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      days.push(d.toISOString());
    }
    days.push('2028-02-29T00:00:00.000Z');
    days.forEach((wire) => {
      expect(
        toWire(
          fromWire(wire, 'date', 'America/Los_Angeles'),
          'date',
          'America/Los_Angeles'
        )
      ).toBe(wire);
    });
  });
});

describe('utc-midnight: date-time fields', () => {
  it('saves the wall time in the zone as a UTC instant with seconds zeroed', () => {
    const value = {
      date: { year: 2026, month: 10, day: 21 },
      time: { hour: 10, minute: 30 },
    };
    expect(toWire(value, 'datetime', 'Asia/Kolkata')).toBe(
      '2026-10-21T05:00:00.000Z'
    );
    expect(toWire(value, 'datetime', 'America/New_York')).toBe(
      '2026-10-21T14:30:00.000Z'
    );
    expect(toWire(value, 'datetime', 'Pacific/Auckland')).toBe(
      '2026-10-20T21:30:00.000Z'
    );
  });

  it('reads a stored instant in the zone', () => {
    expect(
      fromWire('2026-10-21T20:00:00.000Z', 'datetime', 'Asia/Kolkata')
    ).toEqual({
      date: { year: 2026, month: 10, day: 22 },
      time: { hour: 1, minute: 30 },
    });
  });

  it('round-trips through every zone, including the 2026 daylight-saving days', () => {
    const days = [
      { year: 2026, month: 3, day: 8 },
      { year: 2026, month: 11, day: 1 }, // US
      { year: 2026, month: 3, day: 29 },
      { year: 2026, month: 10, day: 25 }, // EU
      { year: 2026, month: 4, day: 5 },
      { year: 2026, month: 9, day: 27 }, // NZ
      { year: 2026, month: 10, day: 21 },
    ];
    const times = [
      { hour: 0, minute: 0 },
      { hour: 9, minute: 15 },
      { hour: 12, minute: 0 },
      { hour: 23, minute: 59 },
    ];
    ZONES.forEach((zone) =>
      days.forEach((date) =>
        times.forEach((time) => {
          const wire = toWire({ date, time }, 'datetime', zone);
          expect(wire).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
          expect(fromWire(wire, 'datetime', zone)).toEqual({ date, time });
        })
      )
    );
  });

  it('moves a skipped time forward and takes the first of a repeated time', () => {
    const gap = {
      date: { year: 2026, month: 3, day: 8 },
      time: { hour: 2, minute: 30 },
    };
    const overlap = {
      date: { year: 2026, month: 11, day: 1 },
      time: { hour: 1, minute: 30 },
    };
    expect(toWire(gap, 'datetime', 'America/New_York')).toBe(
      '2026-03-08T07:30:00.000Z'
    );
    expect(toWire(overlap, 'datetime', 'America/New_York')).toBe(
      '2026-11-01T05:30:00.000Z'
    );
  });
});

describe('utc-midnight: empty and invalid values', () => {
  it('treats empty or broken strings as no value', () => {
    expect(fromWire('', 'date', 'UTC')).toBeNull();
    expect(fromWire('garbage', 'datetime', 'UTC')).toBeNull();
    expect(toWire(null, 'date', 'UTC')).toBe('');
  });

  it('saves nothing for an incomplete date-time', () => {
    expect(
      toWire(
        { date: { year: 2026, month: 10, day: 21 }, time: null },
        'datetime',
        'UTC'
      )
    ).toBe('');
    expect(
      toWire(
        { date: { year: 2026, month: 2, day: 30 }, time: null },
        'date',
        'UTC'
      )
    ).toBe('');
  });
});

describe('formatUnchanged (what an untouched Confirm emits)', () => {
  it('keeps the stored seconds and milliseconds of a date-time', () => {
    expect(unchangedWire('2026-10-21T05:00:12.345Z', 'datetime')).toBe(
      '2026-10-21T05:00:12.345Z'
    );
    expect(unchangedWire('2026-10-21T10:30:00+05:30', 'datetime')).toBe(
      '2026-10-21T05:00:00.000Z'
    );
  });

  it('re-serialises the stored UTC day of a date', () => {
    expect(unchangedWire('2026-10-21T00:00:00Z', 'date')).toBe(
      '2026-10-21T00:00:00.000Z'
    );
    // A legacy value that isn't midnight keeps its UTC day.
    expect(unchangedWire('2026-10-20T18:30:00.000Z', 'date')).toBe(
      '2026-10-20T00:00:00.000Z'
    );
  });

  it('returns an empty string for broken input', () => {
    expect(unchangedWire('', 'date')).toBe('');
    expect(unchangedWire('nope', 'datetime')).toBe('');
  });
});

describe('utcMidnightAdapter: dates written with an offset', () => {
  const ctx = { type: 'date' as const, timeZone: 'America/Los_Angeles' };
  it.each([
    '2026-10-24T00:00:00.000Z',
    '2026-10-24T00:00:00+05:30',
    '2026-10-24T23:00:00-05:00',
    '2026-10-24',
  ])('%s reads as 24 Oct', (raw) => {
    expect(utcMidnightAdapter.parse(raw, ctx)).toEqual({
      date: { year: 2026, month: 10, day: 24 },
      time: null,
    });
  });

  it('an unchanged Confirm keeps the written day', () => {
    expect(
      utcMidnightAdapter.formatUnchanged?.('2026-10-24T00:00:00+05:30', ctx)
    ).toBe('2026-10-24T00:00:00.000Z');
  });
});

describe('utcMidnightAdapter: years it can write', () => {
  it('saves nothing for a year outside 1–9999', () => {
    const ctx = { type: 'date' as const, timeZone: 'UTC' };
    expect(
      utcMidnightAdapter.format(
        { date: { year: 10000, month: 1, day: 1 }, time: null },
        ctx
      )
    ).toBe('');
  });
});
