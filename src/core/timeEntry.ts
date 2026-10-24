import type { TimeBounds } from './constraints';
import {
  from12Hour,
  inputDigit,
  padSegment,
  to12Hour,
  type Period,
  type SegmentSpec,
} from './segments';
import type { Time, TimeFormat } from './types';

/**
 * The time row's typed boxes: `[hh] : [mm] [AM | PM]`, or `[HH] : [mm]` in
 * 24-hour. Pure, like the segment editor: the row only forwards key presses and
 * renders `state`. The value field and this row edit the same draft.
 */

export type TimeKey = 'hour' | 'minute';

export interface TimeEntryValues {
  hour?: string;
  minute?: string;
  period?: Period;
}

export interface TimeEntryState {
  values: TimeEntryValues;
  focused: TimeKey | null;
}

export type TimeEntryAction =
  | { type: 'focus'; key: TimeKey }
  | { type: 'digit'; digit: string }
  | { type: 'backspace' }
  | { type: 'period'; period: Period }
  | { type: 'blur' }
  | { type: 'reset'; time: Time | null };

export type TimeEntryIssue =
  'INCOMPLETE' | 'INVALID' | 'OFF_STEP' | 'BEFORE_MIN' | 'AFTER_MAX';

export interface ParsedTime {
  time: Time | null;
  /** Hour and minute are both empty. */
  isEmpty: boolean;
  /** Why `time` is null: an unfinished or impossible entry. */
  issue: 'INCOMPLETE' | 'INVALID' | null;
}

export const timeSpecs = (
  timeFormat: TimeFormat
): Record<TimeKey, SegmentSpec> => {
  return {
    hour:
      timeFormat === '12h'
        ? { key: 'hour', maxLength: 2, min: 1, max: 12 }
        : { key: 'hour', maxLength: 2, min: 0, max: 23 },
    minute: { key: 'minute', maxLength: 2, min: 0, max: 59 },
  };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Time → what the boxes show. An empty 12-hour row starts on AM (12:00 AM is the fallback time). */
export const formatTimeEntry = (
  time: Time | null,
  timeFormat: TimeFormat
): TimeEntryValues => {
  if (!time) return timeFormat === '12h' ? { period: 'AM' } : {};
  if (timeFormat === '24h')
    return { hour: pad2(time.hour), minute: pad2(time.minute) };
  const { hour12, period } = to12Hour(time.hour);
  return { hour: pad2(hour12), minute: pad2(time.minute), period };
};

export const createTimeEntry = (
  time: Time | null,
  timeFormat: TimeFormat
): TimeEntryState => {
  return { values: formatTimeEntry(time, timeFormat), focused: null };
};

const leave = (
  state: TimeEntryState,
  to: TimeKey | null,
  timeFormat: TimeFormat
): TimeEntryState => {
  const from = state.focused;
  if (!from) return { ...state, focused: to };
  const text = state.values[from] ?? '';
  return {
    values: {
      ...state.values,
      [from]: padSegment(text, timeSpecs(timeFormat)[from]),
    },
    focused: to,
  };
};

export const timeEntryReducer = (
  state: TimeEntryState,
  action: TimeEntryAction,
  timeFormat: TimeFormat
): TimeEntryState => {
  switch (action.type) {
    case 'focus':
      return leave(state, action.key, timeFormat);
    case 'blur':
      return leave(state, null, timeFormat);
    case 'digit': {
      const key = state.focused;
      if (!key) return state;
      const { next, advance } = inputDigit(
        state.values[key] ?? '',
        action.digit,
        timeSpecs(timeFormat)[key]
      );
      const typed = { ...state, values: { ...state.values, [key]: next } };
      // Two hour digits jump to the minutes; a full minute box stays put.
      if (!advance) return typed;
      return leave(typed, key === 'hour' ? 'minute' : null, timeFormat);
    }
    case 'backspace': {
      const key = state.focused;
      if (!key) return state;
      const current = state.values[key] ?? '';
      if (current)
        return {
          ...state,
          values: { ...state.values, [key]: current.slice(0, -1) },
        };
      if (key === 'minute') {
        return {
          values: {
            ...state.values,
            hour: (state.values.hour ?? '').slice(0, -1),
          },
          focused: 'hour',
        };
      }
      return state;
    }
    case 'period':
      return { ...state, values: { ...state.values, period: action.period } };
    case 'reset':
      return {
        values: formatTimeEntry(action.time, timeFormat),
        focused: state.focused,
      };
    default:
      return state;
  }
};

const readNumber = (text?: string): number | null =>
  text && /^\d+$/.test(text) ? Number(text) : null;

export const parseTimeEntry = (
  values: TimeEntryValues,
  timeFormat: TimeFormat
): ParsedTime => {
  if (!values.hour && !values.minute)
    return { time: null, isEmpty: true, issue: null };
  const specs = timeSpecs(timeFormat);
  const hour = readNumber(values.hour);
  const minute = readNumber(values.minute);
  if (
    hour === null ||
    minute === null ||
    (timeFormat === '12h' && !values.period)
  ) {
    return { time: null, isEmpty: false, issue: 'INCOMPLETE' };
  }
  if (
    hour < specs.hour.min ||
    hour > specs.hour.max ||
    minute > specs.minute.max
  ) {
    return { time: null, isEmpty: false, issue: 'INVALID' };
  }
  const h24 =
    timeFormat === '12h' ? from12Hour(hour, values.period as Period) : hour;
  return { time: { hour: h24, minute }, isEmpty: false, issue: null };
};

const minutesOf = (t: Time) => t.hour * 60 + t.minute;

/**
 * Why a complete time can't be confirmed: off the minute step (never rounded
 * silently), or outside the day's limits (`Constraints.timeBounds`).
 */
export const checkTime = (
  time: Time,
  options: { minuteStep?: number; bounds?: TimeBounds | null }
): TimeEntryIssue | null => {
  const step = options.minuteStep ?? 1;
  if (step > 1 && time.minute % step !== 0) return 'OFF_STEP';
  const { min, max } = options.bounds ?? {};
  if (min && minutesOf(time) < minutesOf(min)) return 'BEFORE_MIN';
  if (max && minutesOf(time) > minutesOf(max)) return 'AFTER_MAX';
  return null;
};

/** Whether any time in that half of the day (AM 00:00–11:59, PM 12:00–23:59) fits the limits. */
export const isPeriodAllowed = (
  period: Period,
  bounds?: TimeBounds | null
): boolean => {
  const start = period === 'AM' ? 0 : 12 * 60;
  const end = start + 12 * 60 - 1;
  if (bounds?.min && minutesOf(bounds.min) > end) return false;
  if (bounds?.max && minutesOf(bounds.max) < start) return false;
  return true;
};

/** Digits only, at most two (what a time box accepts while typing). */
export const cleanBoxText = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, 2);

/**
 * The boxes as they are saved when focus leaves them: a one-digit entry gets a
 * leading zero ('9' → '09'), and empty minutes count as '00' once an hour is in.
 * With no hour nothing is filled in (the time stays incomplete).
 */
export const completeTimeEntry = (
  values: TimeEntryValues,
  timeFormat: TimeFormat
): { values: TimeEntryValues; parsed: ParsedTime } => {
  const pad = (text?: string) =>
    text && text.length === 1 ? `0${text}` : (text ?? '');
  const hour = pad(values.hour);
  const done: TimeEntryValues = hour
    ? { ...values, hour, minute: pad(values.minute) || '00' }
    : { ...values, minute: pad(values.minute) };
  return { values: done, parsed: parseTimeEntry(done, timeFormat) };
};
