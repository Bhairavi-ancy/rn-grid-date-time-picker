import {
  addDays,
  compareCalendarDates,
  daysInMonth,
  fromDateKey,
  isSameDay,
  toDateKey,
  weekdayOf,
} from './calendarDate';
import type {
  CalendarDate,
  DateTimeValue,
  PickerType,
  Time,
  Weekday,
} from './types';

/**
 * Turns the picker's limits (a min/max range, weekdays, holidays and custom
 * checks) into what it greys out. Pure TypeScript: the caller passes every
 * input, including "now" and the zone. Greying only guides the user; the
 * caller's own validation after Confirm stays the final check.
 */

export type DisabledReason =
  | 'OUTSIDE_RANGE'
  | 'WEEKDAY'
  | 'HOLIDAY'
  | 'CUSTOM'
  /** Range: too close to or too far from the start (`minDays` / `maxDays`), or before it. */
  | 'RANGE_LENGTH'
  /** Multiple: `maxSelections` reached; only selected days can be tapped (to remove them). */
  | 'MAX_SELECTIONS'
  /** Any reason a custom `isDisabled` returns. */
  | (string & {});

export interface DayStatus {
  disabled: boolean;
  reasons: DisabledReason[];
  /** The day is a holiday (shown with the holiday style even when selectable). */
  holiday: boolean;
}

export interface TimeBounds {
  min?: Time;
  max?: Time;
}

/** One end of the allowed range: a day, plus a time when the limit is down to the minute. */
export interface RangeBound {
  date: CalendarDate;
  time?: Time;
}

export interface Constraints {
  range: { min?: RangeBound; max?: RangeBound };
  /** The limits use "today" or "now", so the sheet should refresh them while it's open. */
  dependsOnNow: boolean;
  dayStatus(day: CalendarDate): DayStatus;
  timeBounds(day: CalendarDate): TimeBounds | null;
  isValueAllowed(value: DateTimeValue | null): boolean;
  isMonthSelectable(year: number, month: number): boolean;
  isYearSelectable(year: number): boolean;
  /** The first selectable day on or after `from` (then before it), or null when nothing is selectable. */
  firstSelectable(from: CalendarDate): CalendarDate | null;
}

export interface CreateConstraintsOptions {
  type: PickerType;
  /** IANA zone the limits are read in. */
  timeZone: string;
  now: Date;
  /** First allowed day, with an optional earliest time on that day. */
  min?: RangeBound;
  /** Last allowed day, with an optional latest time on that day. */
  max?: RangeBound;
  /** Shorthand for `min` / `max` without a time; combined with them (the tighter one wins). */
  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  disabledWeekdays?: Weekday[];
  /** Holidays as 'YYYY-MM-DD' (an ISO string is cut to its date). Marked, and disabled only with `disableHolidays`. */
  holidays?: string[];
  disableHolidays?: boolean;
  /** `true` → 'CUSTOM'; a reason or a list of reasons is used as given, in order; `false` or `[]` = allowed. */
  isDisabled?: (
    day: CalendarDate
  ) => boolean | DisabledReason | DisabledReason[];
  /** `false` → 'CUSTOM'. */
  isEnabled?: (day: CalendarDate) => boolean;
  /** Extra time limits per day, tightening the min / max times. */
  timeBounds?: (day: CalendarDate) => TimeBounds | null;
  /** Set when any limit uses "today" or "now", so an open sheet refreshes them. Default false. */
  dependsOnNow?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const laterBound = (a?: RangeBound, b?: RangeBound): RangeBound | undefined => {
  if (!a || !b) return a ?? b;
  const order = compareCalendarDates(a.date, b.date);
  if (order !== 0) return order > 0 ? a : b;
  const at = (a.time?.hour ?? 0) * 60 + (a.time?.minute ?? 0);
  const bt = (b.time?.hour ?? 0) * 60 + (b.time?.minute ?? 0);
  return at >= bt ? a : b;
};

const earlierBound = (
  a?: RangeBound,
  b?: RangeBound
): RangeBound | undefined => {
  if (!a || !b) return a ?? b;
  const order = compareCalendarDates(a.date, b.date);
  if (order !== 0) return order < 0 ? a : b;
  const at = a.time ? a.time.hour * 60 + a.time.minute : 24 * 60;
  const bt = b.time ? b.time.hour * 60 + b.time.minute : 24 * 60;
  return at <= bt ? a : b;
};

const minutesOf = (t: Time): number => t.hour * 60 + t.minute;

/** What `isDisabled` returned, as reasons. */
const customReasons = (
  result: boolean | DisabledReason | DisabledReason[] | undefined
): DisabledReason[] => {
  if (result === true) return ['CUSTOM'];
  if (typeof result === 'string') return result ? [result] : [];
  if (Array.isArray(result)) return result;
  return [];
};

// ─── Engine ────────────────────────────────────────────────────────────────

const SEARCH_LIMIT_DAYS = 3660;

export const createConstraints = (o: CreateConstraintsOptions): Constraints => {
  const holidaySet = new Set(
    (o.holidays ?? [])
      .map((h) => fromDateKey(h))
      .filter((d): d is CalendarDate => !!d)
      .map(toDateKey)
  );
  const disabledWeekdays = o.disabledWeekdays ?? [];

  const range: Constraints['range'] = {
    min: laterBound(o.min, o.minDate && { date: o.minDate }),
    max: earlierBound(o.max, o.maxDate && { date: o.maxDate }),
  };

  const dayStatus = (day: CalendarDate): DayStatus => {
    const reasons: DisabledReason[] = [];
    const holiday = holidaySet.has(toDateKey(day));

    if (range.min && compareCalendarDates(day, range.min.date) < 0)
      reasons.push('OUTSIDE_RANGE');
    if (range.max && compareCalendarDates(day, range.max.date) > 0)
      reasons.push('OUTSIDE_RANGE');
    if (disabledWeekdays.includes(weekdayOf(day))) reasons.push('WEEKDAY');
    if (o.disableHolidays && holiday) reasons.push('HOLIDAY');
    reasons.push(...customReasons(o.isDisabled?.(day)));
    if (o.isEnabled && !o.isEnabled(day)) reasons.push('CUSTOM');

    const unique = Array.from(new Set(reasons));
    return { disabled: unique.length > 0, reasons: unique, holiday };
  };

  const timeBounds = (day: CalendarDate): TimeBounds | null => {
    if (o.type !== 'datetime') return null;
    let min: Time | undefined;
    let max: Time | undefined;
    const tighten = (b: TimeBounds | null | undefined) => {
      if (!b) return;
      if (b.min && (!min || minutesOf(b.min) > minutesOf(min))) min = b.min;
      if (b.max && (!max || minutesOf(b.max) < minutesOf(max))) max = b.max;
    };
    if (range.min?.time && isSameDay(day, range.min.date))
      tighten({ min: range.min.time });
    if (range.max?.time && isSameDay(day, range.max.date))
      tighten({ max: range.max.time });
    tighten(o.timeBounds?.(day));
    return min || max ? { min, max } : null;
  };

  const isValueAllowed = (value: DateTimeValue | null): boolean => {
    if (!value || dayStatus(value.date).disabled) return false;
    if (o.type !== 'datetime' || !value.time) return true;
    const bounds = timeBounds(value.date);
    const t = minutesOf(value.time);
    if (bounds?.min && t < minutesOf(bounds.min)) return false;
    if (bounds?.max && t > minutesOf(bounds.max)) return false;
    return true;
  };

  const isMonthSelectable = (year: number, month: number): boolean => {
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      if (!dayStatus({ year, month, day }).disabled) return true;
    }
    return false;
  };

  const isYearSelectable = (year: number): boolean => {
    if (range.min && year < range.min.date.year) return false;
    if (range.max && year > range.max.date.year) return false;
    for (let month = 1; month <= 12; month += 1) {
      if (isMonthSelectable(year, month)) return true;
    }
    return false;
  };

  const firstSelectable = (from: CalendarDate): CalendarDate | null => {
    const start =
      range.min && compareCalendarDates(from, range.min.date) < 0
        ? range.min.date
        : from;
    for (let i = 0; i < SEARCH_LIMIT_DAYS; i += 1) {
      const day = addDays(start, i);
      if (range.max && compareCalendarDates(day, range.max.date) > 0) break;
      if (!dayStatus(day).disabled) return day;
    }
    // Backwards from `from`, or from `max` when it lies before `from` (a
    // date-of-birth limit years ago), so the search never runs out early.
    const pastMax = range.max && compareCalendarDates(from, range.max.date) > 0;
    const origin = pastMax && range.max ? range.max.date : from;
    for (let i = pastMax ? 0 : 1; i < SEARCH_LIMIT_DAYS; i += 1) {
      const day = addDays(origin, -i);
      if (range.min && compareCalendarDates(day, range.min.date) < 0) break;
      if (!dayStatus(day).disabled) return day;
    }
    return null;
  };

  return {
    range,
    dependsOnNow: o.dependsOnNow ?? false,
    dayStatus,
    timeBounds,
    isValueAllowed,
    isMonthSelectable,
    isYearSelectable,
    firstSelectable,
  };
};
