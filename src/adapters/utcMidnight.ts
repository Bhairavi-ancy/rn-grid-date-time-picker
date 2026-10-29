import { DateTime } from 'luxon';
import { calendarDateOf, isValidCalendarDate } from '../core/calendarDate';
import { toZonedDateTime } from '../core/zoned';
import type {
  DateTimeValue,
  PickerType,
  Time,
  ValueAdapter,
} from '../core/types';

/**
 * `valueFormat: 'utc-midnight'`:
 * - date:      'YYYY-MM-DDT00:00:00.000Z', the calendar day (never shifted by a zone);
 * - date-time: a UTC ISO string with seconds and milliseconds zeroed.
 *
 * `zone` is passed in by the caller; this module never reads the device zone.
 */

const isValidTime = (t: Time | null | undefined): t is Time =>
  !!t &&
  Number.isInteger(t.hour) &&
  Number.isInteger(t.minute) &&
  t.hour >= 0 &&
  t.hour <= 23 &&
  t.minute >= 0 &&
  t.minute <= 59;

/** Years that ISO strings write with four digits, so they read back the same. */
export const isWritableYear = (year: number): boolean =>
  year >= 1 && year <= 9999;

/**
 * A stored value must start with a full day: Luxon also reads '10:30' (today),
 * '2026' or week and ordinal dates, which aren't dates the picker saved.
 */
const STARTS_WITH_DAY = /^\d{4}-\d{2}-\d{2}(?:T|$)/;

/**
 * A stored instant → its day and wall-clock time in `zone`, or null when it
 * can't be parsed. Shared by every built-in format for date-time values.
 */
export const parseInstant = (
  value: string | null | undefined,
  zone: string
): DateTimeValue | null => {
  if (!value || !STARTS_WITH_DAY.test(value)) return null;
  const utc = DateTime.fromISO(value, { zone: 'utc' });
  if (!utc.isValid) return null;
  const local = utc.setZone(zone);
  if (!local.isValid || !isWritableYear(local.year)) return null;
  return {
    date: calendarDateOf(local),
    time: { hour: local.hour, minute: local.minute },
  };
};

/**
 * A date-time value → a UTC ISO instant (seconds and ms zeroed), or '' when it
 * is incomplete. Shared by every built-in format for date-time values.
 */
export const formatInstant = (
  value: DateTimeValue | null | undefined,
  zone: string
): string => {
  if (!value || !isValidCalendarDate(value.date)) return '';
  if (!isValidTime(value.time)) return '';
  const utc = toZonedDateTime(value, zone).toUTC();
  // A day near year 1 or 9999 can fall in year 0 or 10000 in UTC.
  return utc.isValid && isWritableYear(utc.year) ? (utc.toISO() ?? '') : '';
};

/** Saved string → picker value. Returns null for '' or an unparsable string. */
const fromWire = (
  value: string | null | undefined,
  type: PickerType,
  zone: string
): DateTimeValue | null => {
  if (!value) return null;
  if (type !== 'date') return parseInstant(value, zone);
  if (!STARTS_WITH_DAY.test(value)) return null;
  // The calendar day as written: an offset in the string ('+05:30') is kept,
  // not converted to UTC, so the day never moves.
  const written = DateTime.fromISO(value, { setZone: true });
  if (!written.isValid || !isWritableYear(written.year)) return null;
  return { date: calendarDateOf(written), time: null };
};

/**
 * Picker value → saved string. Returns '' when the value is incomplete
 * (no valid day, or a date-time without a valid time).
 */
const toWire = (
  value: DateTimeValue | null | undefined,
  type: PickerType,
  zone: string
): string => {
  if (!value || !isValidCalendarDate(value.date)) return '';
  if (!isWritableYear(value.date.year)) return '';
  if (type === 'date') {
    return (
      DateTime.utc(value.date.year, value.date.month, value.date.day).toISO() ??
      ''
    );
  }
  return formatInstant(value, zone);
};

/**
 * What to emit when the user confirms without changing anything.
 * - date-time keeps the stored instant, including seconds/ms (re-serialised as UTC ISO);
 * - date re-serialises the stored day, as written, as UTC midnight.
 * Returns '' for an unparsable value.
 */
const unchangedWire = (
  value: string | null | undefined,
  type: PickerType
): string => {
  if (!value) return '';
  if (type === 'datetime') {
    if (!STARTS_WITH_DAY.test(value)) return '';
    const dt = DateTime.fromISO(value, { zone: 'utc' });
    return dt.isValid ? (dt.toUTC().toISO() ?? '') : '';
  }
  return toWire(fromWire(value, 'date', 'utc'), 'date', 'utc');
};

export const utcMidnightAdapter: ValueAdapter = {
  parse: (raw, { type, timeZone }) => fromWire(raw, type, timeZone),
  format: (value, { type, timeZone }) => toWire(value, type, timeZone),
  formatUnchanged: (raw, { type }) => unchangedWire(raw, type),
};
