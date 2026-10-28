import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

/**
 * Every part of the picker that can be styled through the `styles` prop.
 * This list is public: adding a key is fine, renaming or removing one breaks callers.
 */
export const STYLE_KEYS = [
  // containers
  'container',
  'sheet',
  'sheetBackdrop',
  'header',
  'title',
  'resetButton',
  'resetText',
  'body',
  'footer',
  'confirmButton',
  'confirmText',
  // field
  'field',
  'fieldFocused',
  'fieldError',
  'fieldDisabled',
  'fieldText',
  /** The value's text while the field is disabled (the placeholder keeps its own colour). */
  'fieldTextDisabled',
  'fieldPlaceholder',
  'fieldSegment',
  'fieldSegmentFocused',
  'fieldSeparator',
  'fieldPeriod',
  'fieldPeriodSelected',
  'fieldPeriodText',
  'fieldIcon',
  'clearIcon',
  'label',
  'mandatoryMark',
  'helperText',
  'instructionText',
  'errorText',
  /** The `validate` message inside the picker (on top of `errorText`). */
  'validationText',
  // calendar header
  'calendarHeader',
  'navArrow',
  'navArrowDisabled',
  'yearButton',
  'yearButtonText',
  'monthChipRow',
  'monthChip',
  'monthChipText',
  'monthChipSelected',
  'monthChipDisabled',
  // calendar switch (calendarSwitch prop)
  'calendarSwitch',
  'calendarSwitchSegment',
  'calendarSwitchSegmentSelected',
  'calendarSwitchText',
  'calendarSwitchTextSelected',
  /** The Gregorian / Hijri tabs of a dual calendar. */
  'dualTabs',
  'dualTab',
  'dualTabSelected',
  'dualTabText',
  'dualTabTextSelected',
  // weekdays
  'weekdayRow',
  'weekdayText',
  // day cells
  'day',
  'dayText',
  'dayPressed',
  'today',
  'todayText',
  'selected',
  'selectedText',
  'rangeStart',
  'rangeMiddle',
  'rangeEnd',
  'rangeFill',
  'outside',
  'outsideText',
  'disabled',
  'disabledText',
  'holiday',
  'holidayText',
  /** A second line under the day number. Not drawn by the picker any more; kept so styles that set it still compile. */
  'daySubLabel',
  // grids
  'yearGrid',
  'yearCell',
  'yearCellSelected',
  'yearCellDisabled',
  'yearCellText',
  /** The current year (outlined) in a year pick. */
  'yearCellCurrent',
  'monthGrid',
  'monthCell',
  'monthCellSelected',
  'monthCellDisabled',
  'monthCellText',
  /** The current month (outlined) in a month pick. */
  'monthCellCurrent',
  // time
  'timeRow',
  'timeLabel',
  'timeBox',
  'timeBoxFocused',
  'timeBoxError',
  'timeBoxText',
  'timeColon',
  'ampmToggle',
  'ampmOption',
  'ampmOptionSelected',
  'ampmOptionDisabled',
  'ampmOptionText',
  'wheel',
  'wheelRow',
  'wheelRowSelected',
  'wheelRowDisabled',
  'wheelText',
  'wheelTextSelected',
  'wheelTextDisabled',
  'wheelHighlight',
  // other
  'todayButton',
  'todayButtonText',
  'emptyState',
  'emptyStateText',
] as const;

export type StyleKey = (typeof STYLE_KEYS)[number];

export type PickerStyleValue = StyleProp<ViewStyle | TextStyle | ImageStyle>;

/** The `styles` prop: any key from STYLE_KEYS. */
export type PickerStyles = Partial<Record<StyleKey, PickerStyleValue>>;
