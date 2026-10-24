/**
 * Shared types for the date/time picker core. Pure TypeScript: no React Native,
 * no store, no network.
 */

/** Whether the picker edits a day, or a day and a time. */
export type PickerType = 'date' | 'datetime';

export type SelectionMode = 'single' | 'multiple' | 'range';

/** A calendar day with no time and no zone. `month` is 1–12. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** A wall-clock time. `hour` is 0–23. */
export interface Time {
  hour: number;
  minute: number;
}

/** What the picker edits: a day plus, for date-time fields, a time. */
export interface DateTimeValue {
  date: CalendarDate;
  time: Time | null;
}

/** ISO numbering: 1 = Monday … 7 = Sunday (same as Luxon `weekday`). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TimeFormat = '12h' | '24h';

export interface RangeValue {
  from: string;
  to: string;
}

/** The value a screen stores, as strings in the `valueFormat` ('' = empty). */
export type PickerValue = string | string[] | RangeValue;

export interface AdapterContext {
  type: PickerType;
  /** IANA zone date-time values are read and written in. */
  timeZone: string;
}

/** Turns stored strings into picker values and back. */
export interface ValueAdapter {
  /** Stored string → picker value; null = empty or invalid. */
  parse(raw: string, ctx: AdapterContext): DateTimeValue | null;
  /** Picker value → stored string; '' when the value is incomplete. */
  format(value: DateTimeValue, ctx: AdapterContext): string;
  /** Confirm without a change: what to emit for the stored raw string. Default: raw as-is. */
  formatUnchanged?(raw: string, ctx: AdapterContext): string;
}

/** How values are stored: a built-in format or your own adapter. */
export type ValueFormat = 'iso' | 'utc-midnight' | ValueAdapter;
