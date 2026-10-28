import type { SegmentError } from '../../core/segments';
import type { DateTimeValue, PickerType, TimeFormat } from '../../core/types';
import { DEFAULT_STRINGS, type PickerStrings } from '../theme/defaultStrings';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** '21-10-2026' for 'dd-MM-yyyy', '10-21-2026' for 'MM-dd-yyyy'. */
export const formatDateText = (
  value: DateTimeValue,
  dateFormat: string
): string =>
  dateFormat
    .replace('yyyy', String(value.date.year).padStart(4, '0'))
    .replace('MM', pad2(value.date.month))
    .replace('dd', pad2(value.date.day));

/** '03:45 PM' (12-hour) or '15:45' (24-hour). Always shows AM/PM in 12-hour mode. */
export const formatTimeText = (
  value: DateTimeValue,
  timeFormat: TimeFormat
): string => {
  if (!value.time) return '';
  const { hour, minute } = value.time;
  if (timeFormat === '24h') return `${pad2(hour)}:${pad2(minute)}`;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${pad2(hour12)}:${pad2(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
};

/** Writes a value's date some other way, e.g. as a Hijri date. */
export type DateTextFormatter = (value: DateTimeValue) => string;

export const formatValueText = (
  value: DateTimeValue | null,
  type: PickerType,
  dateFormat: string,
  timeFormat: TimeFormat,
  dateText?: DateTextFormatter
): string => {
  if (!value) return '';
  const date = dateText ? dateText(value) : formatDateText(value, dateFormat);
  return type === 'datetime' && value.time
    ? `${date} ${formatTimeText(value, timeFormat)}`
    : date;
};

/** '21-10-2026 – 25-10-2026'; just the start (with the dash) while the end is open. */
export const formatRangeText = (
  from: DateTimeValue | null,
  to: DateTimeValue | null,
  type: PickerType,
  dateFormat: string,
  timeFormat: TimeFormat,
  separator: string = ' – ',
  dateText?: DateTextFormatter
): string => {
  if (!from && !to) return '';
  const a = formatValueText(from, type, dateFormat, timeFormat, dateText);
  const b = formatValueText(to, type, dateFormat, timeFormat, dateText);
  return `${a}${separator}${b}`.trim();
};

/** '21-10-2026, 23-10-2026' (the field shows one line and truncates). */
export const formatMultipleText = (
  values: (DateTimeValue | null)[],
  type: PickerType,
  dateFormat: string,
  timeFormat: TimeFormat,
  dateText?: DateTextFormatter
): string =>
  values
    .filter((v): v is DateTimeValue => !!v)
    .map((v) => formatValueText(v, type, dateFormat, timeFormat, dateText))
    .join(', ');

/** 'DD-MM-YYYY' or 'DD-MM-YYYY hh:mm AM', from the placeholder strings. */
export const placeholderText = (
  type: PickerType,
  dateFormat: string,
  timeFormat: TimeFormat,
  strings: PickerStrings = DEFAULT_STRINGS
): string => {
  const parts: Record<string, string> = {
    dd: strings.placeholderDay,
    MM: strings.placeholderMonth,
    yyyy: strings.placeholderYear,
  };
  const date = dateFormat.replace(/yyyy|MM|dd/g, (t) => parts[t] ?? t);
  if (type !== 'datetime') return date;
  const time =
    timeFormat === '24h'
      ? `${strings.placeholderHour24}:${strings.placeholderMinute}`
      : `${strings.placeholderHour}:${strings.placeholderMinute} ${strings.am}`;
  return `${date} ${time}`;
};

const TIME_KEYS = ['hour', 'minute', 'period'];

/** The message shown below the field for the first typed-input problem. */
export const segmentErrorText = (
  errors: SegmentError[],
  strings: PickerStrings,
  yearRange?: { first: number; last: number }
): string => {
  const first = errors[0];
  if (!first) return '';
  const isTime = TIME_KEYS.includes(first.key);
  switch (first.code) {
    case 'REQUIRED':
      return isTime ? strings.errorIncompleteTime : strings.errorIncomplete;
    case 'OUT_OF_RANGE':
      return isTime ? strings.errorInvalidTime : strings.errorInvalidDate;
    case 'YEAR_RANGE':
      return yearRange
        ? strings.errorYearOutOfRange(yearRange)
        : strings.errorInvalidDate;
    default:
      return strings.errorInvalidDate;
  }
};
