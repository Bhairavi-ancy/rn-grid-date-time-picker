import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { buildMonthGrid } from '../monthGrid';
import {
  addHijriMonths,
  buildSystemGrid,
  GREGORIAN,
  HIJRI,
  hijriMonthLength,
  hijriMonthNames,
  hijriMonthStart,
  isHijriSupported,
  resetHijriSupportCache,
  resolveCalendarSystem,
  toHijri,
} from '../calendarSystem';

describe('Hijri (Umm al-Qura via Intl)', () => {
  it('converts Gregorian days', () => {
    expect(isHijriSupported()).toBe(true);
    expect(toHijri({ year: 2026, month: 10, day: 21 })).toEqual({
      year: 1448,
      month: 5,
      day: 10,
    });
  });

  it('finds month starts and lengths across the year range', () => {
    // 1 Ramadan 1447 = 18 Feb 2026 (Umm al-Qura).
    expect(hijriMonthStart(1447, 9)).toEqual({ year: 2026, month: 2, day: 18 });
    for (const [y, m] of [
      [1318, 1],
      [1448, 5],
      [1447, 12],
      [1620, 6],
    ]) {
      const start = hijriMonthStart(y, m);
      expect(toHijri(start)).toEqual({ year: y, month: m, day: 1 });
      expect([29, 30]).toContain(hijriMonthLength(y, m));
    }
  });

  it('adds months across a year end', () => {
    expect(addHijriMonths({ year: 1447, month: 12 }, 1)).toEqual({
      year: 1448,
      month: 1,
    });
    expect(addHijriMonths({ year: 1448, month: 1 }, -1)).toEqual({
      year: 1447,
      month: 12,
    });
  });

  it('names months in the language, English otherwise', () => {
    expect(hijriMonthNames('en-IN')[8]).toBe('Ramadan');
    expect(hijriMonthNames('ar')[0]).not.toBe('Muharram');
  });
});

describe('system grids', () => {
  it('the Gregorian system matches the existing month grid', () => {
    const a = buildSystemGrid(GREGORIAN, { year: 2026, month: 10 }, 7);
    const b = buildMonthGrid(2026, 10, 7);
    expect(a.weekCount).toBe(b.weekCount);
    expect(a.cells.map((c) => [c.date, c.inMonth])).toEqual(
      b.cells.map((c) => [c.date, c.inMonth])
    );
  });

  it('a Hijri month starts on its 1st and marks only its own days', () => {
    const g = buildSystemGrid(HIJRI, { year: 1448, month: 5 }, 7);
    const inMonth = g.cells.filter((c) => c.inMonth);
    expect(HIJRI.dayNumber(inMonth[0].date)).toBe(1);
    expect(inMonth.length).toBe(hijriMonthLength(1448, 5));
    expect(HIJRI.monthOf({ year: 2026, month: 10, day: 21 })).toEqual({
      year: 1448,
      month: 5,
    });
  });
});

describe('resolveCalendarSystem', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetHijriSupportCache();
  });

  it('defaults to Gregorian (for any locale) and keeps a requested system', () => {
    expect(resolveCalendarSystem(undefined)).toBe('gregory');
    expect(resolveCalendarSystem('hijri')).toBe('hijri');
    expect(resolveCalendarSystem('dual')).toBe('dual');
  });

  it('falls back to Gregorian when Intl has no Hijri calendar', () => {
    resetHijriSupportCache();
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((() => {
      throw new RangeError('no calendar');
    }) as never);
    expect(isHijriSupported()).toBe(false);
    expect(resolveCalendarSystem('hijri')).toBe('gregory');
    expect(toHijri({ year: 2026, month: 10, day: 21 })).toBeNull();
  });
});

describe('Hijri edge inputs', () => {
  it('keeps a locale that already has a Unicode extension', () => {
    const plain = hijriMonthNames('ar-SA');
    const extended = hijriMonthNames('ar-SA-u-nu-arab');
    expect(extended).toEqual(plain);
    expect(extended[0]).not.toBe('Muharram');
  });

  it('reads years below 100 as written, not as 19xx', () => {
    expect(toHijri({ year: 50, month: 6, day: 1 })).not.toEqual(
      toHijri({ year: 1950, month: 6, day: 1 })
    );
  });
});
