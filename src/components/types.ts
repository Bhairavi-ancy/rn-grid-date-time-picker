import type React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import type { CalendarSystem } from '../core/calendarSystem';
import type { Constraints, TimeBounds } from '../core/constraints';
import type { Numerals } from '../core/numerals';
import type {
  CalendarDate,
  PickerType,
  PickerValue,
  SelectionMode,
  Time,
  TimeFormat,
  ValueFormat,
  Weekday,
} from '../core/types';
import type { IconComponent, IconName, IconOptions } from '../icons';
import type { DayCellState } from './calendar/DayCell';
import type { PeriodItem } from './calendar/PeriodGrid';
import type { PickerStrings } from './theme/defaultStrings';
import type { PickerStyles } from './theme/styleKeys';
import type { ThemeTokens } from './theme/tokens';

/**
 * Public props of the date & time picker. Values are strings in the
 * `valueFormat` (by default 'YYYY-MM-DD' for dates and a UTC ISO instant for
 * date-times), '' = empty.
 */

/** What render props receive. */
export interface PickerState {
  type: PickerType;
  mode: SelectionMode;
  /** The saved value (not the draft). */
  value: PickerValue;
  /** The saved value as the built-in field shows it, in `dateFormat` / `timeFormat`; '' when empty. */
  displayText: string;
  disabled: boolean;
  readOnly: boolean;
  isOpen: boolean;
  /** The keyboard is up inside the picker and `hideCalendarOnKeyboard` hid the calendar. */
  folded: boolean;
  /**
   * Confirm can be pressed: the dates are complete and allowed. A time with a
   * problem doesn't block it; pressing Confirm then shows the time's error.
   */
  canConfirm: boolean;
  open: () => void;
  close: () => void;
  confirm: () => void;
  /** Clears the saved value: calls `onChange('')` right away, as the built-in × does. */
  clear: () => void;
  /**
   * Date-time: the time being edited, for a custom `renderTimeRow`. Single:
   * the draft's time (or one set before a day is picked); multiple: the shared
   * time, or the active day's with `timeMode: 'perDate'`. Ranges use
   * `rangeTimes`. Null when there's none yet.
   */
  time: Time | null;
  /** Date-time ranges: the start and end times; null otherwise. */
  rangeTimes: { from: Time | null; to: Time | null } | null;
  /**
   * Sets the draft's time, as the built-in time row does (before a day is
   * picked, it's kept for that day). Ranges pass the end; the default is the
   * end being edited.
   */
  setTime: (time: Time, end?: 'from' | 'to') => void;
  tokens: ThemeTokens;
  strings: PickerStrings;
}

/** A slot's content: a node, or a function of the picker's state. */
export type Slot = React.ReactNode | ((state: PickerState) => React.ReactNode);

/**
 * What `onError` reports: `'VALIDATION'` (your `validate` returned a message),
 * `'NOTHING_SELECTABLE'` (no day can be picked), or a time problem found on
 * Confirm (`'INCOMPLETE'`, `'INVALID'`, `'OFF_STEP'`, `'BEFORE_MIN'`,
 * `'AFTER_MAX'`, `'TIME_NOT_ALLOWED'`).
 */
export type PickerErrorCode =
  | 'VALIDATION'
  | 'NOTHING_SELECTABLE'
  | 'INCOMPLETE'
  | 'INVALID'
  | 'OFF_STEP'
  | 'BEFORE_MIN'
  | 'AFTER_MAX'
  | 'TIME_NOT_ALLOWED';

/** What `renderSheet` receives. Render `body` above `footer`. */
export interface SheetRenderProps {
  onRequestClose: () => void;
  body: React.ReactNode;
  footer: React.ReactNode;
  testID?: string;
}

/** A size in points, or a percentage of the screen height ('60%'). */
export type SheetSize = number | `${number}%`;

/** Layout of the picker's sheet: its size, what scrolls, and the field above the calendar. */
export interface SheetOptions {
  /** A fixed height. Default: as tall as the content, up to `maxHeight`. Built-in sheet only. */
  height?: SheetSize;
  /** Default '90%'. Built-in sheet only. */
  maxHeight?: SheetSize;
  /**
   * The most the sheet grows to while the keyboard is up; a percentage is of
   * the room above the keyboard. Default: `maxHeight`. Built-in sheet only.
   */
  keyboardMaxHeight?: SheetSize;
  /**
   * Space kept free below Confirm while the keyboard is down: the home
   * indicator, or Android's navigation bar in an edge-to-edge app. Default:
   * the bottom inset from react-native-safe-area-context's SafeAreaProvider
   * when the app has one, else 0. Built-in sheet only.
   */
  bottomInset?: number;
  /** The header stays put while the body scrolls. false: it scrolls with the body. Default true. */
  fixedHeader?: boolean;
  /** The footer (Confirm) stays pinned below the body. false: it scrolls at the end of the body. Default true. */
  fixedFooter?: boolean;
  /**
   * The field above the calendar, which shows the picked date (and takes typing
   * with `allowTyping`). Its errors still show when it's hidden. Default true;
   * applies inline too.
   */
  showField?: boolean;
  /** Placeholder of that field when it shows text. Default: from `dateFormat`, e.g. 'DD/MM/YYYY'. */
  fieldPlaceholder?: string;
  /** The calendar icon at the end of that field, as on the on-screen field. Default false. */
  fieldIcon?: boolean;
}

/**
 * The second argument of `onChange` when the picker can show a Hijri calendar:
 * the calendar the date was picked in. The value itself is always Gregorian.
 * The picker remembers it while mounted; to show a stored value back the same
 * way later, store this too and pass it as `dualDefaultTab` (dual) or
 * `calendarSystem`.
 */
export interface ChangeInfo {
  calendarSystem: 'gregory' | 'hijri';
}

/** What `renderCalendarSwitch` receives. */
export interface CalendarSwitchRenderProps {
  /** The choices, in order. */
  systems: CalendarSystem[];
  selected: CalendarSystem;
  onSelect: (system: CalendarSystem) => void;
  tokens: ThemeTokens;
  strings: PickerStrings;
}

/** What `renderLabel` receives. */
export interface LabelRenderProps {
  label?: string;
  isMandatory?: boolean;
  helperText?: string;
  style?: StyleProp<TextStyle>;
  /** `${testID}-label` */
  testID?: string;
  /** The picker's testID. */
  fieldTestID?: string;
}

/** What `renderInstruction` receives. */
export interface InstructionRenderProps {
  instruction: string;
  /** The picker's testID. */
  fieldTestID?: string;
}

/** What `getConstraints` receives. */
export interface ConstraintContext {
  type: PickerType;
  timeZone: string;
  now: Date;
  today: CalendarDate;
  /** The current time in `timeZone`, e.g. for "no earlier than now" limits. */
  nowTime: Time;
  /** The `holidays` prop plus every year loaded so far. */
  holidays: string[];
  /** The limit props, to merge into your own constraints. */
  limits: {
    minDate?: CalendarDate;
    maxDate?: CalendarDate;
    disabledDates?: (d: CalendarDate) => boolean;
    enabledDates?: (d: CalendarDate) => boolean;
    timeBounds?: (d: CalendarDate) => TimeBounds | null;
    disabledWeekdays?: Weekday[];
    disableHolidays?: boolean;
  };
}

export interface DateTimePickerProps {
  // what it picks
  type: PickerType;
  mode?: SelectionMode;
  value: PickerValue;
  /**
   * A value was saved: on Confirm; as it's edited with commitMode 'instant';
   * when typing in the on-screen field pauses; or '' on clear. Never on close.
   * When the picker can show a Hijri calendar, `info` says which calendar the
   * date was picked in.
   */
  onChange: (value: PickerValue, info?: ChangeInfo) => void;
  /**
   * Right after every onChange that saves a value (Confirm, an 'instant' edit,
   * on-screen typing), like a form field losing focus. Not on clear.
   */
  onBlur?: () => void;
  commitMode?: 'confirm' | 'instant';
  /** How values are stored. Default 'iso'. */
  valueFormat?: ValueFormat;
  multiple?: {
    timeMode?: 'shared' | 'perDate';
    maxSelections?: number;
    joinConsecutive?: boolean;
  };
  range?: {
    layout?: 'singleField' | 'fromTo';
    allowSameDay?: boolean;
    minDays?: number;
    maxDays?: number;
    reselect?: 'newRange' | 'moveNearestEnd';
  };

  // presentation
  presentation?: 'sheet' | 'inline';
  visible?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  showField?: boolean;
  /** Height, scrolling and the field above the calendar. See `SheetOptions`. */
  sheet?: SheetOptions;
  /** Replaces the built-in sheet. Called only while open, rendered in place (no portal). */
  renderSheet?: (p: SheetRenderProps) => React.ReactNode;
  /** Called just before opening, e.g. to close the app's own dropdowns. */
  onBeforeOpen?: () => void;

  // value field
  label?: string;
  placeholder?: string;
  helperText?: string;
  instruction?: string;
  isMandatory?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Type date and time as segments in the field inside the sheet. */
  allowTyping?: boolean;
  /**
   * Hide the calendar while the keyboard is up (typing a date or a time), so
   * the box being typed in and Confirm stay in view on small phones. Default
   * true; `false` keeps the calendar in view.
   */
  hideCalendarOnKeyboard?: boolean;
  /**
   * The on-screen field is typeable too. A complete, allowed value is saved
   * once, when focus leaves the field or its last box fills. Default false.
   */
  allowFieldTyping?: boolean;
  allowClear?: boolean;
  errorMessage?: string;
  /** Order of the typed segments and the display: 'dd', 'MM', 'yyyy' with one separator. Default: from `locale`. */
  dateFormat?: string;
  /** Replaces the built-in label (and helper text). */
  renderLabel?: (p: LabelRenderProps) => React.ReactNode;
  /** Replaces the built-in instruction text. */
  renderInstruction?: (p: InstructionRenderProps) => React.ReactNode;
  /**
   * Replaces any of the built-in icons with a component that takes
   * `{ color, size, width, height }`; null hides that icon.
   */
  icons?: Partial<Record<IconName, IconComponent | null>>;
  /** Colour and size per icon, for the built-in icons and the replacements alike. */
  iconProps?: Partial<Record<IconName, IconOptions>>;

  // slots and overrides
  header?: Slot;
  title?: string;
  onReset?: () => void;
  bodyTop?: Slot;
  bodyBottom?: Slot;
  footer?: Slot;
  /** After a Confirm press saves a value, following onChange and onBlur. Never with commitMode 'instant' edits. */
  onConfirm?: (value: PickerValue) => void;
  confirmDisabled?: boolean;
  renderField?: (state: PickerState) => React.ReactNode;
  renderDay?: (state: DayCellState, onPress: () => void) => React.ReactNode;
  renderWeekday?: (weekday: Weekday, name: string) => React.ReactNode;
  renderMonthChip?: (
    month: number,
    state: { selected: boolean; disabled: boolean }
  ) => React.ReactNode;
  renderYearCell?: (item: PeriodItem) => React.ReactNode;
  renderMonthCell?: (item: PeriodItem) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  renderTimeRow?: (state: PickerState) => React.ReactNode;

  // calendar
  /** 1 = Monday … 7 = Sunday. Default: from `locale`'s region, else Sunday. */
  firstDayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  showOutsideDays?: boolean;
  yearRange?: { first: number; last: number };
  initialView?: 'day' | 'month' | 'year';
  /**
   * What one pick is. 'month' and 'year' make the month or year grid the last
   * step: the saved value is the first day of the period, the field shows
   * "March 2026" or "2026", and a period can be picked when any day in it can.
   * Single date pickers only (ignored for date-time, range and multiple), always
   * in the Gregorian calendar, without typing. Default 'day'.
   */
  precision?: 'day' | 'month' | 'year';
  /**
   * With no value, the calendar opens on this day's month (e.g. 2000 for a
   * date of birth) without selecting anything. Default: today.
   */
  initialVisibleDate?: CalendarDate;
  enableMonthSwipe?: boolean;
  showToday?: boolean;
  /**
   * The calendar the grid uses: 'gregory', 'hijri' (Umm al-Qura), or 'dual':
   * Gregorian and Hijri tabs, one calendar at a time. A day is shown selected
   * only in the calendar it was picked in, and the field writes it in that
   * calendar. With `calendarSwitch`, this is the one shown first. Default
   * 'gregory'; anything Hijri falls back to 'gregory' when the platform has no
   * Hijri calendar.
   */
  calendarSystem?: CalendarSystem;
  /**
   * A Gregorian / Hijri / Dual switch above the calendar. true shows all three;
   * a list shows those, in that order (e.g. ['hijri', 'gregory']). Not shown for
   * month and year picks, or when the platform has no Hijri calendar. Default false.
   */
  calendarSwitch?: boolean | CalendarSystem[];
  /** The user picked another calendar in the switch. */
  onCalendarSystemChange?: (system: CalendarSystem) => void;
  /**
   * The language a Hijri calendar is written in, whatever `locale` is: its
   * month and weekday names, the Hijri date in the field, and what screen
   * readers say. Default 'ar-SA' (Arabic).
   */
  hijriLocale?: string;
  /** The tab a dual calendar opens on, each time it opens. Default 'gregory'. */
  dualDefaultTab?: 'gregory' | 'hijri';
  /** Replaces the built-in calendar switch. */
  renderCalendarSwitch?: (p: CalendarSwitchRenderProps) => React.ReactNode;
  /** Any BCP-47 tag; decides names, the date order and the clock. Default: the device locale. */
  locale?: string;
  /**
   * The digits every number is drawn in: 'latin' (0–9), 'arabic' (١٢٣ in any
   * language) or 'locale' (the language's own: ١٢٣ for 'ar-SA', ۱۲۳ for
   * 'fa-IR', 123 for 'en-US'). Values stay 0–9. Default: 'arabic' for a Hijri
   * calendar and a date picked in it, 'latin' for a Gregorian one.
   */
  numerals?: Numerals;
  /** IANA zone for date-time values and "today". Default: the device zone. */
  timeZone?: string;
  /** The current time, for "today" and a new day's time. Default `() => new Date()`. */
  now?: () => Date;

  // time
  timeInput?: 'typed' | 'wheel';
  /** Default: from `locale`, else '12h'. */
  timeFormat?: TimeFormat;
  minuteStep?: number;
  /** A newly picked day always gets this time (over a time typed first and over the current time). */
  newDayTime?: Time;

  // limits → greyed days and errors
  showHolidays?: boolean;
  /** Holidays as 'YYYY-MM-DD' (ISO strings are cut to the date). Marked, not disabled, unless `disableHolidays`. */
  holidays?: string[];
  /** Loads a year's holidays lazily, once per year. */
  loadHolidays?: (year: number) => Promise<string[]>;
  /** Holidays can't be picked (reason 'HOLIDAY'). Default false. */
  disableHolidays?: boolean;
  /** Weekdays that can't be picked (1 = Monday … 7 = Sunday; reason 'WEEKDAY'). */
  disabledWeekdays?: Weekday[];
  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  disabledDates?: (day: CalendarDate) => boolean;
  enabledDates?: (day: CalendarDate) => boolean;
  timeBounds?: (day: CalendarDate) => TimeBounds | null;
  /** Full control over greying: the result is used as is (the limit props arrive in `ctx.limits`). */
  getConstraints?: (ctx: ConstraintContext) => Constraints;

  // look and text
  theme?: Partial<ThemeTokens>;
  styles?: PickerStyles;
  strings?: Partial<PickerStrings>;
  /**
   * The texts while the Hijri tab shows (e.g. Arabic), for its calendar and
   * time rows, the error messages inside the picker, and a date picked in it
   * (the on-screen field's errors keep `strings`). A key left out (or `undefined`)
   * keeps AM / PM in `hijriLocale` (ص / م), then `strings`.
   */
  hijriStrings?: Partial<PickerStrings>;
  testID?: string;

  // events
  onVisibleMonthChange?: (year: number, month: number) => void;
  onError?: (code: PickerErrorCode, value: PickerValue) => void;
  /**
   * Your own check, run when Confirm is pressed (or, with commitMode 'instant',
   * before each save) once the built-in checks pass. It gets the value about to
   * be saved. Return a message to show it inside the picker and save nothing
   * (`onError('VALIDATION', value)` is called too); return null, undefined or
   * '' to save. The message clears when the user changes the selection.
   */
  validate?: (value: PickerValue) => string | null | undefined;
}

export const DEFAULT_YEAR_RANGE = { first: 1900, last: 2200 };
