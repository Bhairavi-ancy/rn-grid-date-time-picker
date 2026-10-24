import { DateTime, Info } from 'luxon';
import type { CalendarDate, Weekday } from '../../core/types';

/**
 * Month and weekday names from Luxon (Intl), cached per locale. Falls back to
 * 'en-US' when the device's Intl can't format the locale (some engines return
 * empty names instead of failing), and to built-in English names after that.
 */
interface Names {
  monthsShort: string[];
  monthsLong: string[];
  weekdays: string[];
}

const cache = new Map<string, Names>();

const FALLBACK = {
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
  // Luxon order: Monday … Sunday.
  weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

const readNames = (locale: string): Names | null => {
  try {
    const short = Info.weekdays('short', { locale });
    const names = {
      monthsShort: Info.months('short', { locale }),
      monthsLong: Info.months('long', { locale }),
      // Two letters for English ("Su", "Mo"); other locales keep their short form.
      weekdays: locale.startsWith('en')
        ? short.map((w) => w?.slice(0, 2))
        : short,
    };
    const complete = (list: string[] | undefined, length: number) =>
      list?.length === length && list.every(Boolean);
    return complete(names.monthsShort, 12) &&
      complete(names.monthsLong, 12) &&
      complete(names.weekdays, 7)
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
  const dt = DateTime.utc(day.year, day.month, day.day);
  try {
    return dt.setLocale(locale).toFormat('cccc, d LLLL yyyy');
  } catch {
    return dt.toFormat('cccc, d LLLL yyyy');
  }
};
