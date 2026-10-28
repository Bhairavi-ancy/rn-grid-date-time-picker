import { weekdayOf } from '../../core/calendarDate';
import { withCalendar } from '../../core/locale';
import type { CalendarDate, Weekday } from '../../core/types';

/**
 * Month and weekday names from the platform's Intl, cached per locale. Each
 * name is formatted on its own (not read from formatToParts: iOS labels every
 * part of some locales, such as 'de-DE' and 'ar-SA', as plain text), in the
 * Gregorian calendar. Falls back to 'en-US' when the device's Intl can't name
 * the locale, and to built-in English names after that.
 */
interface Names {
  monthsShort: string[];
  monthsLong: string[];
  /** Monday … Sunday, as the weekday row shows them. */
  weekdays: string[];
  /** Monday … Sunday, for screen readers. */
  weekdaysLong: string[];
}

const cache = new Map<string, Names>();

const FALLBACK: Names = {
  monthsShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  monthsLong: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  weekdaysLong: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ],
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const readNames = (locale: string): Names | null => {
  try {
    const tag = withCalendar(locale, 'gregory');
    const namer = (options: Intl.DateTimeFormatOptions) => {
      const f = new Intl.DateTimeFormat(tag, { timeZone: 'UTC', ...options });
      return (d: Date) => f.format(d);
    };
    // Mid-month, at noon UTC, so no zone moves the day.
    const months = range(12).map((i) => new Date(Date.UTC(2021, i, 15, 12)));
    // 1 February 2021 was a Monday.
    const days = range(7).map((i) => new Date(Date.UTC(2021, 1, 1 + i, 12)));
    const short = days.map(namer({ weekday: 'short' }));
    // The language Intl actually uses: an unknown tag falls back to the device's.
    const english = new Intl.DateTimeFormat(tag)
      .resolvedOptions()
      .locale.startsWith('en');
    const names: Names = {
      monthsShort: months.map(namer({ month: 'short' })),
      monthsLong: months.map(namer({ month: 'long' })),
      // Two letters for English ("Su", "Mo"); other locales keep their short form.
      weekdays: english ? short.map((w) => w.slice(0, 2)) : short,
      weekdaysLong: days.map(namer({ weekday: 'long' })),
    };
    // Every name present and different (an engine that ignores the options
    // writes whole dates, or the same text, instead).
    const complete = (list: string[], length: number) =>
      list.length === length &&
      list.every(Boolean) &&
      new Set(list).size === length;
    return complete(names.monthsShort, 12) &&
      complete(names.monthsLong, 12) &&
      complete(names.weekdays, 7) &&
      complete(names.weekdaysLong, 7)
      ? names
      : null;
  } catch {
    return null;
  }
};

export const localeNames = (locale: string): Names => {
  const hit = cache.get(locale);
  if (hit) return hit;
  const names = readNames(locale) ?? readNames('en-US') ?? FALLBACK;
  cache.set(locale, names);
  return names;
};

/** Weekday name for 1 = Monday … 7 = Sunday. */
export const weekdayName = (locale: string, weekday: Weekday): string =>
  localeNames(locale).weekdays[weekday - 1] ?? '';

/** Full date for screen readers, e.g. "Wednesday, 21 October 2026". */
export const fullDateLabel = (locale: string, day: CalendarDate): string => {
  const names = localeNames(locale);
  const weekday = names.weekdaysLong[weekdayOf(day) - 1];
  return `${weekday}, ${day.day} ${names.monthsLong[day.month - 1]} ${day.year}`;
};
