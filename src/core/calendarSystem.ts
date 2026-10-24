import { addDays, addMonths, daysInMonth } from './calendarDate';
import type { CalendarDate, Weekday } from './types';
import { weekdayOf } from './calendarDate';

/**
 * Calendar systems for the picker grid. Saved values are always Gregorian;
 * a system only changes how months are laid out and labelled.
 * - 'gregory': the normal grid;
 * - 'dual':    the Gregorian grid with the Hijri day under each day;
 * - 'hijri':   a Hijri (Umm al-Qura) grid showing only the Hijri day.
 *
 * Hijri dates come from the platform's Intl ('islamic-umalqura'). When Intl
 * can't do it (checked once; some JS engines ship without that calendar) the
 * picker falls back to 'gregory'. Everything Hijri goes through this file, so
 * the data source can be swapped in one place.
 */

export type CalendarSystem = 'gregory' | 'dual' | 'hijri';

export interface SystemMonth {
  year: number;
  month: number;
}

const HIJRI_LOCALE = 'en-u-ca-islamic-umalqura-nu-latn';

let hijriFormat: Intl.DateTimeFormat | null | undefined;
const getHijriFormat = (): Intl.DateTimeFormat | null => {
  if (hijriFormat !== undefined) return hijriFormat;
  try {
    const f = new Intl.DateTimeFormat(HIJRI_LOCALE, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const ok =
      f.resolvedOptions().calendar === 'islamic-umalqura' &&
      typeof f.formatToParts === 'function' &&
      readParts(f, { year: 2026, month: 10, day: 21 })?.year === 1448;
    hijriFormat = ok ? f : null;
  } catch {
    hijriFormat = null;
  }
  return hijriFormat;
};

const readParts = (
  f: Intl.DateTimeFormat,
  d: CalendarDate
): CalendarDate | null => {
  const parts = f.formatToParts(
    new Date(Date.UTC(d.year, d.month - 1, d.day, 12))
  );
  const num = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const out = { year: num('year'), month: num('month'), day: num('day') };
  return Number.isFinite(out.year) &&
    Number.isFinite(out.month) &&
    Number.isFinite(out.day)
    ? out
    : null;
};

/** Whether this device can show Hijri dates. */
export const isHijriSupported = (): boolean => getHijriFormat() !== null;

/** Test hook: forget the cached Intl check. */
export const resetHijriSupportCache = (): void => {
  hijriFormat = undefined;
};

/** Gregorian day → Hijri {year, month, day}, or null when unsupported. */
export const toHijri = (d: CalendarDate): CalendarDate | null => {
  const f = getHijriFormat();
  return f ? readParts(f, d) : null;
};

const HIJRI_EPOCH = { year: 622, month: 7, day: 19 };
const MEAN_YEAR = 354.367;
const MEAN_MONTH = 29.5306;

const cmp = (a: SystemMonth, b: SystemMonth) =>
  a.year - b.year || a.month - b.month;

/** The Gregorian day on which a Hijri month starts. */
export const hijriMonthStart = (year: number, month: number): CalendarDate => {
  const estimate = Math.round(
    (year - 1) * MEAN_YEAR + (month - 1) * MEAN_MONTH
  );
  let day = addDays(HIJRI_EPOCH, estimate);
  // The estimate is within a few days; walk to the 1st of the right month.
  for (let i = 0; i < 40; i += 1) {
    const h = toHijri(day);
    if (!h) break;
    const order = cmp(h, { year, month });
    if (order === 0 && h.day === 1) return day;
    if (order === 0) day = addDays(day, -(h.day - 1));
    else if (order < 0) day = addDays(day, 30 - h.day + 1);
    else day = addDays(day, -h.day);
  }
  return day;
};

export const addHijriMonths = (m: SystemMonth, n: number): SystemMonth => {
  const index = m.year * 12 + (m.month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const hijriMonthLength = (year: number, month: number): number => {
  const next = addHijriMonths({ year, month }, 1);
  const a = hijriMonthStart(year, month);
  const b = hijriMonthStart(next.year, next.month);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) -
      Date.UTC(a.year, a.month - 1, a.day)) /
      86400000
  );
};

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabiʻ I',
  'Rabiʻ II',
  'Jumada I',
  'Jumada II',
  'Rajab',
  'Shaʻban',
  'Ramadan',
  'Shawwal',
  'Dhuʻl-Qiʻdah',
  'Dhuʻl-Hijjah',
];

/** Hijri month names in the user's language (Intl), English otherwise. */
export const hijriMonthNames = (locale: string): string[] => {
  try {
    const f = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
      timeZone: 'UTC',
      month: 'long',
    });
    return HIJRI_MONTHS_EN.map((fallback, i) => {
      const start = hijriMonthStart(1448, i + 1);
      const name = f.format(
        new Date(Date.UTC(start.year, start.month - 1, start.day + 10, 12))
      );
      return name && !/^\d+$/.test(name) ? name : fallback;
    });
  } catch {
    return HIJRI_MONTHS_EN;
  }
};

/**
 * The system the picker uses: the requested one, Gregorian by default.
 * Anything Hijri falls back to Gregorian when unsupported.
 */
export const resolveCalendarSystem = (
  requested: CalendarSystem | undefined
): CalendarSystem => {
  const wanted = requested ?? 'gregory';
  return wanted !== 'gregory' && !isHijriSupported() ? 'gregory' : wanted;
};

/** Everything the calendar needs to lay out one system's months. */
export interface MonthSystem {
  kind: 'gregory' | 'hijri';
  monthOf: (d: CalendarDate) => SystemMonth;
  monthStart: (m: SystemMonth) => CalendarDate;
  monthLength: (m: SystemMonth) => number;
  addMonths: (m: SystemMonth, n: number) => SystemMonth;
  /** Number shown in a day cell. */
  dayNumber: (d: CalendarDate) => number;
}

export const GREGORIAN: MonthSystem = {
  kind: 'gregory',
  monthOf: (d) => {
    return { year: d.year, month: d.month };
  },
  monthStart: (m) => {
    return { year: m.year, month: m.month, day: 1 };
  },
  monthLength: (m) => daysInMonth(m.year, m.month),
  addMonths: (m, n) => {
    const d = addMonths({ year: m.year, month: m.month, day: 1 }, n);
    return { year: d.year, month: d.month };
  },
  dayNumber: (d) => d.day,
};

export const HIJRI: MonthSystem = {
  kind: 'hijri',
  monthOf: (d) => {
    const h = toHijri(d);
    return h
      ? { year: h.year, month: h.month }
      : { year: d.year, month: d.month };
  },
  monthStart: (m) => hijriMonthStart(m.year, m.month),
  monthLength: (m) => hijriMonthLength(m.year, m.month),
  addMonths: addHijriMonths,
  dayNumber: (d) => toHijri(d)?.day ?? d.day,
};

export const monthSystemFor = (system: CalendarSystem): MonthSystem =>
  system === 'hijri' ? HIJRI : GREGORIAN;

export interface SystemGridCell {
  date: CalendarDate;
  inMonth: boolean;
}

/** A 6-week grid for a month in any system (Gregorian days, `inMonth` per system). */
export const buildSystemGrid = (
  sys: MonthSystem,
  m: SystemMonth,
  firstDayOfWeek: Weekday
): { cells: SystemGridCell[]; weekCount: number } => {
  const start = sys.monthStart(m);
  const length = sys.monthLength(m);
  const lead = (weekdayOf(start) - firstDayOfWeek + 7) % 7;
  const first = addDays(start, -lead);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(first, i);
    return { date, inMonth: i >= lead && i < lead + length };
  });
  return { cells, weekCount: Math.ceil((lead + length) / 7) };
};

/** Days of a system month, as Gregorian dates. */
export const daysOfMonth = (
  sys: MonthSystem,
  m: SystemMonth
): CalendarDate[] => {
  const start = sys.monthStart(m);
  return Array.from({ length: sys.monthLength(m) }, (_, i) =>
    addDays(start, i)
  );
};
