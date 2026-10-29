/**
 * Every label, button text and screen-reader text the picker shows. Screens
 * override any of them with the `strings` prop; the defaults are English.
 */
export interface PickerStrings {
  titleDate: string;
  confirm: string;
  reset: string;
  clear: string;
  today: string;
  done: string;
  time: string;
  startTime: string;
  endTime: string;
  from: string;
  to: string;
  am: string;
  /** Between the two ends of a range in the field text. */
  rangeSeparator: string;
  pm: string;
  /** Placeholders of the typed date segments and time boxes, and of the empty field. */
  placeholderDay: string;
  placeholderMonth: string;
  placeholderYear: string;
  /** 12-hour clock. */
  placeholderHour: string;
  /** 24-hour clock. */
  placeholderHour24: string;
  placeholderMinute: string;
  errorIncomplete: string;
  errorIncompleteTime: string;
  errorInvalidDate: string;
  errorInvalidTime: string;
  errorYearOutOfRange: (range: { first: number; last: number }) => string;
  errorNotAllowed: string;
  errorTimeNotAllowed: string;
  errorMinuteStep: (step: number) => string;
  errorRangeOrder: string;
  errorRangeTooShort: (days: number) => string;
  errorRangeTooLong: (days: number) => string;
  nothingSelectable: string;
  /** The calendar switch and the dual tabs. */
  calendarGregorian: string;
  calendarHijri: string;
  calendarDual: string;
  a11yCalendarSystem: string;
  a11yClear: string;
  a11yOpen: string;
  a11yDay: string;
  a11yMonth: string;
  a11yYear: string;
  a11yHour: string;
  a11yMinute: string;
  a11yPeriod: string;
  a11yPreviousYear: string;
  a11yNextYear: string;
  a11yChooseYear: string;
  a11yChooseMonth: string;
  a11yToday: string;
  a11yHoliday: string;
  a11yRangeStart: string;
  a11yRangeEnd: string;
}

export const DEFAULT_STRINGS: PickerStrings = {
  titleDate: 'Select date',
  confirm: 'Confirm',
  reset: 'Reset',
  clear: 'Clear',
  today: 'Today',
  done: 'Done',
  time: 'Time',
  startTime: 'Start time',
  endTime: 'End time',
  from: 'From',
  to: 'To',
  am: 'AM',
  rangeSeparator: ' – ',
  pm: 'PM',
  placeholderDay: 'DD',
  placeholderMonth: 'MM',
  placeholderYear: 'YYYY',
  placeholderHour: 'hh',
  placeholderHour24: 'HH',
  placeholderMinute: 'mm',
  errorIncomplete: 'Enter a complete date',
  errorIncompleteTime: 'Enter a complete time',
  errorInvalidDate: 'Enter a valid date',
  errorInvalidTime: 'Enter a valid time',
  errorYearOutOfRange: ({ first, last }) =>
    `Enter a year between ${first} and ${last}`,
  errorNotAllowed: "This date isn't available",
  errorTimeNotAllowed: "This time isn't available",
  errorMinuteStep: (step) => `Choose a minute in steps of ${step}`,
  errorRangeOrder: 'The end date must be greater than the start date',
  errorRangeTooShort: (n) => `Choose a range of at least ${n} days`,
  errorRangeTooLong: (n) => `Choose a range of at most ${n} days`,
  nothingSelectable: 'No dates are available',
  calendarGregorian: 'Gregorian',
  calendarHijri: 'Hijri',
  calendarDual: 'Dual',
  a11yCalendarSystem: 'Calendar',
  a11yClear: 'Clear date',
  a11yOpen: 'Open date picker',
  a11yDay: 'Day',
  a11yMonth: 'Month',
  a11yYear: 'Year',
  a11yHour: 'Hour',
  a11yMinute: 'Minute',
  a11yPeriod: 'AM or PM',
  a11yPreviousYear: 'Previous year',
  a11yNextYear: 'Next year',
  a11yChooseYear: 'Choose a year',
  a11yChooseMonth: 'Choose a month',
  a11yToday: 'today',
  a11yHoliday: 'holiday',
  a11yRangeStart: 'start of range',
  a11yRangeEnd: 'end of range',
};

/** The English defaults with the caller's overrides on top. */
export const resolveStrings = (
  overrides?: Partial<PickerStrings>
): PickerStrings => {
  return { ...DEFAULT_STRINGS, ...overrides };
};
