import { DateTime } from 'luxon';
import type { CalendarDate, Weekday } from './types';

/**
 * Calendar-day helpers. All arithmetic runs on UTC DateTimes so the device
 * timezone can never shift a day. Only `todayIn` reads a zone, and only the
 * one it is given.
 */

const toUtc = (d: CalendarDate): DateTime =>
  DateTime.utc(d.year, d.month, d.day);

const fromDateTime = (dt: CalendarDate): CalendarDate => {
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
  };
};

export const isValidCalendarDate = (
  d: CalendarDate | null | undefined
): d is CalendarDate =>
  !!d &&
  Number.isInteger(d.year) &&
  Number.isInteger(d.month) &&
  Number.isInteger(d.day) &&
  toUtc(d).isValid &&
  toUtc(d).day === d.day;

/**
 * The calendar day of a DateTime in its own zone. Typed structurally (a
 * DateTime has year, month and day), so the published type definitions don't
 * depend on Luxon's.
 */
export const calendarDateOf = (dt: CalendarDate): CalendarDate =>
  fromDateTime(dt);

/** Today in `zone` (an IANA name). */
export const todayIn = (zone: string, now: Date = new Date()): CalendarDate =>
  fromDateTime(DateTime.fromJSDate(now).setZone(zone));

/** -1 when a is before b, 0 when the same day, 1 when after. */
export const compareCalendarDates = (
  a: CalendarDate,
  b: CalendarDate
): -1 | 0 | 1 => {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
};

export const isSameDay = (
  a: CalendarDate | null | undefined,
  b: CalendarDate | null | undefined
): boolean => !!a && !!b && compareCalendarDates(a, b) === 0;

export const addDays = (d: CalendarDate, days: number): CalendarDate =>
  fromDateTime(toUtc(d).plus({ days }));

export const addMonths = (d: CalendarDate, months: number): CalendarDate =>
  fromDateTime(toUtc(d).plus({ months }));

/** Whole days from a to b (negative when b is before a). */
export const daysBetween = (a: CalendarDate, b: CalendarDate): number =>
  Math.round(toUtc(b).diff(toUtc(a), 'days').days);

export const daysInMonth = (year: number, month: number): number =>
  DateTime.utc(year, month, 1).daysInMonth ?? 31;

/** Weekday in ISO numbering: 1 = Monday … 7 = Sunday. */
export const weekdayOf = (d: CalendarDate): Weekday =>
  toUtc(d).weekday as Weekday;

/** 'YYYY-MM-DD'. */
export const toDateKey = (d: CalendarDate): string =>
  toUtc(d).toISODate() ?? '';

/** Parses 'YYYY-MM-DD' (anything after the date, like 'T00:00:00.000Z', is ignored). */
export const fromDateKey = (
  key: string | null | undefined
): CalendarDate | null => {
  if (!key) return null;
  const dt = DateTime.fromISO(key.slice(0, 10), { zone: 'utc' });
  return dt.isValid ? fromDateTime(dt) : null;
};
