import { describe, expect, it } from '@jest/globals';
import { createDraft, draftToWire, type DraftOptions } from '../../core/draft';
import { isoAdapter } from '../iso';

const oct = (day: number) => {
  return { year: 2026, month: 10, day };
};
const date = { type: 'date' as const, timeZone: 'UTC' };

describe('iso: date values', () => {
  it('round-trips a calendar day as YYYY-MM-DD in any zone', () => {
    for (const timeZone of ['UTC', 'Pacific/Auckland', 'America/Los_Angeles']) {
      const ctx = { type: 'date' as const, timeZone };
      expect(isoAdapter.format({ date: oct(24), time: null }, ctx)).toBe(
        '2026-10-24'
      );
      expect(isoAdapter.parse('2026-10-24', ctx)).toEqual({
        date: oct(24),
        time: null,
      });
    }
  });

  it('accepts exactly YYYY-MM-DD', () => {
    expect(isoAdapter.parse('2026-10-24T00:00:00Z', date)).toBeNull();
    expect(isoAdapter.parse('2026-10-24T00:00:00.000Z', date)).toBeNull();
    expect(isoAdapter.parse('2026-1-4', date)).toBeNull();
    expect(isoAdapter.parse('2026-02-30', date)).toBeNull();
    expect(isoAdapter.parse('', date)).toBeNull();
    expect(isoAdapter.parse('2028-02-29', date)).toEqual({
      date: { year: 2028, month: 2, day: 29 },
      time: null,
    });
  });

  it('formats nothing for an invalid day', () => {
    expect(
      isoAdapter.format(
        { date: { year: 2026, month: 2, day: 30 }, time: null },
        date
      )
    ).toBe('');
  });
});

describe('iso: date-time values', () => {
  const value = { date: oct(24), time: { hour: 10, minute: 0 } };

  it('saves the wall time in the zone as a UTC instant with seconds zeroed', () => {
    const cases: [string, string][] = [
      ['UTC', '2026-10-24T10:00:00.000Z'],
      ['Asia/Kolkata', '2026-10-24T04:30:00.000Z'],
      ['America/Los_Angeles', '2026-10-24T17:00:00.000Z'],
      ['Pacific/Auckland', '2026-10-23T21:00:00.000Z'],
    ];
    for (const [timeZone, wire] of cases) {
      const ctx = { type: 'datetime' as const, timeZone };
      expect(isoAdapter.format(value, ctx)).toBe(wire);
      expect(isoAdapter.parse(wire, ctx)).toEqual(value);
    }
  });

  it('reads an offset and shows it in the zone', () => {
    expect(
      isoAdapter.parse('2026-10-24T10:00:00+05:30', {
        type: 'datetime',
        timeZone: 'UTC',
      })
    ).toEqual({ date: oct(24), time: { hour: 4, minute: 30 } });
    expect(
      isoAdapter.parse('2026-10-24T23:45:10.123-07:00', {
        type: 'datetime',
        timeZone: 'Asia/Kolkata',
      })
    ).toEqual({
      date: { year: 2026, month: 10, day: 25 },
      time: { hour: 12, minute: 15 },
    });
  });

  it('saves nothing without a time, and reads garbage as no value', () => {
    const ctx = { type: 'datetime' as const, timeZone: 'UTC' };
    expect(isoAdapter.format({ date: oct(24), time: null }, ctx)).toBe('');
    expect(isoAdapter.parse('nope', ctx)).toBeNull();
  });
});

describe('iso: unchanged Confirm', () => {
  it('has no formatUnchanged, so the raw value comes back as it came in', () => {
    expect(isoAdapter.formatUnchanged).toBeUndefined();
    const opts: DraftOptions = {
      type: 'datetime',
      zone: 'Asia/Kolkata',
      adapter: isoAdapter,
    };
    const raw = '2026-10-24T10:00:12.345+05:30';
    expect(draftToWire(createDraft('single', raw, opts), opts)).toBe(raw);
  });
});

describe('isoAdapter: years it can write', () => {
  const ctx = { type: 'date' as const, timeZone: 'UTC' };
  it('round-trips years 1–9999 and saves nothing outside them', () => {
    for (const year of [1, 50, 999, 2026, 9999]) {
      const raw = isoAdapter.format(
        { date: { year, month: 6, day: 1 }, time: null },
        ctx
      );
      expect(isoAdapter.parse(raw, ctx)?.date.year).toBe(year);
    }
    expect(
      isoAdapter.format(
        { date: { year: 10000, month: 1, day: 1 }, time: null },
        ctx
      )
    ).toBe('');
  });
});
