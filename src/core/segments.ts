import { isValidCalendarDate } from './calendarDate';
import type {
  CalendarDate,
  DateTimeValue,
  PickerType,
  Time,
  TimeFormat,
} from './types';

/**
 * Typed input for the value field: the date in the user's locale order
 * plus, for date-time fields, hour, minute and AM/PM (or 24-hour). The field and
 * the time row both edit the same draft, so they stay in sync.
 */

export type SegmentKey =
  'day' | 'month' | 'year' | 'hour' | 'minute' | 'period';
export type Period = 'AM' | 'PM';

export interface SegmentSpec {
  key: SegmentKey;
  maxLength: number;
  min: number;
  max: number;
}

export interface SegmentLayout {
  segments: SegmentSpec[];
  /** Character between date segments, from the locale format ('-' for 'dd-MM-yyyy'). */
  dateSeparator: string;
}

export type SegmentValues = Partial<Record<SegmentKey, string>>;

export type SegmentErrorCode =
  'REQUIRED' | 'OUT_OF_RANGE' | 'INVALID_DATE' | 'YEAR_RANGE';

export interface SegmentError {
  key: SegmentKey | 'date';
  code: SegmentErrorCode;
}

export interface ParsedSegments {
  value: DateTimeValue | null;
  errors: SegmentError[];
  /** Every segment is empty (the field was cleared). */
  isEmpty: boolean;
  /**
   * Date-time only: the date, when its segments are complete and valid but
   * the hour and minute are both still empty. The picker fills the time in.
   */
  dateOnly?: CalendarDate;
}

const DATE_TOKENS: Record<
  string,
  Omit<SegmentSpec, 'key'> & { key: 'day' | 'month' | 'year' }
> = {
  dd: { key: 'day', maxLength: 2, min: 1, max: 31 },
  MM: { key: 'month', maxLength: 2, min: 1, max: 12 },
  yyyy: { key: 'year', maxLength: 4, min: 1, max: 9999 },
};

const timeSegments = (timeFormat: TimeFormat): SegmentSpec[] =>
  timeFormat === '12h'
    ? [
        { key: 'hour', maxLength: 2, min: 1, max: 12 },
        { key: 'minute', maxLength: 2, min: 0, max: 59 },
        { key: 'period', maxLength: 2, min: 0, max: 1 },
      ]
    : [
        { key: 'hour', maxLength: 2, min: 0, max: 23 },
        { key: 'minute', maxLength: 2, min: 0, max: 59 },
      ];

/**
 * Segment order for a date format such as 'dd/MM/yyyy' (en-GB) or
 * 'MM/dd/yyyy' (en-US).
 */
export const segmentLayout = (
  dateFormat: string,
  type: PickerType,
  timeFormat: TimeFormat
): SegmentLayout => {
  const tokens = dateFormat.match(/dd|MM|yyyy/g) ?? ['dd', 'MM', 'yyyy'];
  const separator = dateFormat.replace(/dd|MM|yyyy/g, '').charAt(0) || '-';
  const dateSpecs = tokens
    .map((t) => DATE_TOKENS[t])
    .filter(Boolean) as SegmentSpec[];
  return {
    segments:
      type === 'datetime'
        ? [...dateSpecs, ...timeSegments(timeFormat)]
        : dateSpecs,
    dateSeparator: separator,
  };
};

export const to12Hour = (hour: number): { hour12: number; period: Period } => {
  return {
    hour12: hour % 12 === 0 ? 12 : hour % 12,
    period: hour < 12 ? 'AM' : 'PM',
  };
};

export const from12Hour = (hour12: number, period: Period): number =>
  (hour12 % 12) + (period === 'PM' ? 12 : 0);

const pad = (n: number, length: number): string =>
  String(n).padStart(length, '0');

/** Picker value → what each segment shows. */
export const formatSegments = (
  value: DateTimeValue | null,
  type: PickerType,
  timeFormat: TimeFormat
): SegmentValues => {
  if (!value) return {};
  const out: SegmentValues = {
    day: pad(value.date.day, 2),
    month: pad(value.date.month, 2),
    year: pad(value.date.year, 4),
  };
  if (type === 'datetime' && value.time) {
    if (timeFormat === '12h') {
      const { hour12, period } = to12Hour(value.time.hour);
      out.hour = pad(hour12, 2);
      out.period = period;
    } else {
      out.hour = pad(value.time.hour, 2);
    }
    out.minute = pad(value.time.minute, 2);
  }
  return out;
};

/**
 * One digit typed into a numeric segment. Returns the new text and whether focus
 * should move to the next segment: when the segment is full, or when no valid
 * two-digit value can start with this digit (e.g. month "4" → "04").
 */
export const inputDigit = (
  current: string,
  digit: string,
  spec: SegmentSpec
): { next: string; advance: boolean } => {
  if (!/^\d$/.test(digit) || spec.key === 'period')
    return { next: current, advance: false };
  const next = current.length >= spec.maxLength ? digit : current + digit;
  if (next.length >= spec.maxLength) return { next, advance: true };
  const cannotGrow =
    spec.maxLength === 2 && next.length === 1 && Number(next) * 10 > spec.max;
  return { next, advance: cannotGrow };
};

/** Pads a one-digit entry when leaving the segment ("7" → "07"); the year is never padded. */
export const padSegment = (text: string, spec: SegmentSpec): string => {
  if (
    !text ||
    spec.key === 'period' ||
    spec.key === 'year' ||
    !/^\d+$/.test(text)
  )
    return text;
  return text.padStart(spec.maxLength, '0');
};

const readNumber = (text: string | undefined): number | null =>
  text && /^\d+$/.test(text) ? Number(text) : null;

/**
 * All segments → picker value, with every problem found. `value` is null unless
 * the input is complete and valid; the picker then keeps Confirm disabled and
 * shows the error below the field.
 */
export const parseSegments = (
  values: SegmentValues,
  options: {
    type: PickerType;
    timeFormat: TimeFormat;
    yearRange?: { first: number; last: number };
  }
): ParsedSegments => {
  const layout = segmentLayout('dd-MM-yyyy', options.type, options.timeFormat);
  // AM/PM alone isn't content: a field with every digit deleted is empty.
  const isEmpty = layout.segments.every(
    (s) => s.key === 'period' || !values[s.key]
  );
  if (isEmpty) return { value: null, errors: [], isEmpty: true };

  const errors: SegmentError[] = [];
  const numbers: Partial<Record<SegmentKey, number>> = {};

  layout.segments.forEach((spec) => {
    // An unchosen AM/PM reads as AM, as in the time row.
    if (spec.key === 'period') return;
    const raw = values[spec.key];
    const n = readNumber(raw);
    if (n === null) {
      errors.push({ key: spec.key, code: 'REQUIRED' });
    } else if (
      n < spec.min ||
      n > spec.max ||
      (spec.key === 'year' && (raw ?? '').length !== 4)
    ) {
      errors.push({ key: spec.key, code: 'OUT_OF_RANGE' });
    } else {
      numbers[spec.key] = n;
    }
  });

  const date = {
    year: numbers.year ?? NaN,
    month: numbers.month ?? NaN,
    day: numbers.day ?? NaN,
  };
  const hasDateParts =
    numbers.year !== undefined &&
    numbers.month !== undefined &&
    numbers.day !== undefined;
  if (hasDateParts && !isValidCalendarDate(date))
    errors.push({ key: 'date', code: 'INVALID_DATE' });
  const range = options.yearRange;
  if (
    hasDateParts &&
    range &&
    (date.year < range.first || date.year > range.last)
  ) {
    errors.push({ key: 'year', code: 'YEAR_RANGE' });
  }

  if (errors.length) {
    const dateOk =
      hasDateParts &&
      errors.every(
        (e) => e.key === 'hour' || e.key === 'minute' || e.key === 'period'
      );
    const timeEmpty = !values.hour && !values.minute;
    return options.type === 'datetime' && dateOk && timeEmpty
      ? { value: null, errors, isEmpty: false, dateOnly: date }
      : { value: null, errors, isEmpty: false };
  }

  let time: Time | null = null;
  if (options.type === 'datetime') {
    const hour =
      options.timeFormat === '12h'
        ? from12Hour(numbers.hour as number, (values.period ?? 'AM') as Period)
        : (numbers.hour as number);
    time = { hour, minute: numbers.minute as number };
  }
  return { value: { date, time }, errors: [], isEmpty: false };
};
