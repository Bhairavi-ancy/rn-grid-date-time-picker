[← README](../README.md) · [All docs](README.md)

# Props

Every prop, grouped. The [README](../README.md#common-props) lists the common ones.

## What it picks

| Prop | Type | Default | Notes |
|---|---|---|---|
| `type` | `'date' \| 'datetime'` | required | |
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | |
| `value` | `PickerValue` | required | See [Values](values.md). |
| `onChange` | `(value: PickerValue, info?: ChangeInfo) => void` | required | Once per Confirm (or per edit with `commitMode="instant"`, and per finished entry with `allowFieldTyping`), or with `''` on clear. When a Hijri calendar can show, `info.calendarSystem` (`'gregory'` or `'hijri'`) says which calendar the date was picked in. |
| `onBlur` | `() => void` | – | Right after every `onChange` that saves a value (Confirm, an `'instant'` edit, typing in the on-screen field), like a form field losing focus. Not on clear. |
| `commitMode` | `'confirm' \| 'instant'` | `'confirm'` | `'instant'` saves every complete, allowed edit once (typing in the field above the calendar saves when focus leaves it or its last box fills), and × in that field clears the saved value. |
| `valueFormat` | `'iso' \| 'utc-midnight' \| ValueAdapter` | `'iso'` | |
| `multiple` | `{ timeMode?: 'shared' \| 'perDate'; maxSelections?: number; joinConsecutive?: boolean }` | `timeMode: 'shared'` | `joinConsecutive` draws neighbouring days as one band. |
| `range` | `{ layout?: 'singleField' \| 'fromTo'; allowSameDay?: boolean; minDays?: number; maxDays?: number; reselect?: 'newRange' \| 'moveNearestEnd' }` | `layout: 'singleField'`, `reselect: 'newRange'` | `allowSameDay` is for dates; date-time ranges may always start and end on one day. `minDays` / `maxDays` count calendar days with both ends included (the 1st to the 3rd is 3 days; a same-day range is 1). With `layout: 'fromTo'`, taps fill From, then To; a tap before the start while picking To moves the start. Once both are set nothing is greyed, and the next tap starts a new range (`reselect: 'moveNearestEnd'` moves the nearer end instead). Tapping the From or To field first edits that end only (after a To field tap, days before the start are greyed). |

## Presentation

| Prop | Type | Default | Notes |
|---|---|---|---|
| `presentation` | `'sheet' \| 'inline'` | `'sheet'` | |
| `visible` | `boolean` | – | Controls the sheet; without it the picker opens itself. |
| `onOpen` / `onClose` | `() => void` | – | `onClose` fires whenever the sheet closes: Close, the backdrop, Android back, and after Confirm. |
| `onBeforeOpen` | `() => void` | – | Just before opening, e.g. to close your own dropdowns. |
| `showField` | `boolean` | `true` | Hide the on-screen field (for example with `visible`). |
| `sheet` | `SheetOptions` | – | `height`, `maxHeight`, `keyboardMaxHeight`, `bottomInset`, `fixedHeader`, `fixedFooter`, `showField`, `fieldPlaceholder`, `fieldIcon`. See [Sheet layout](presentation.md#sheet-layout). |
| `renderSheet` | `(p: SheetRenderProps) => ReactNode` | built-in sheet | See [Presentation](presentation.md). |

## Value field

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label`, `placeholder`, `helperText`, `instruction` | `string` | – | `helperText` sits with the label, `instruction` under the field. |
| `isMandatory` | `boolean` | `false` | Adds ` *` to the label. |
| `disabled`, `readOnly` | `boolean` | `false` | Neither opens; disabled also greys the field. |
| `allowTyping` | `boolean` | `false` | Type in the field inside the sheet. |
| `hideCalendarOnKeyboard` | `boolean` | `true` | Hide the calendar while the keyboard is up (typing a date or a time), so the box being typed in and Confirm stay in view on small phones. Inline, only while one of the picker's own boxes has focus. `false` keeps it in view. |
| `allowFieldTyping` | `boolean` | `false` | Type in the on-screen field (single mode). A complete, allowed value is saved once, when focus leaves the field or its last box fills. |
| `allowClear` | `boolean` | `false` | Shows × when there is a value. |
| `errorMessage` | `string` | – | Your error, shown under the field. |
| `dateFormat` | `string` | from `locale` | `dd`, `MM` and `yyyy` with one separator, in any case: `'dd/mm/yyyy'`, `'DD.MM.YYYY'`, `'yyyy-MM-dd'`. Used for the field text, the typed segments and the placeholder. Anything else (for example `'d/m/yy'` or `'dd MMM yyyy'`) logs a warning in development and uses the locale order. |
| `renderLabel` | `(p: LabelRenderProps) => ReactNode` | built-in label | |
| `renderInstruction` | `(p: InstructionRenderProps) => ReactNode` | built-in text | |
| `icons` | `Partial<Record<IconName, ComponentType<IconRenderProps> \| null>>` | built-in icons | Your own component per icon; `null` hides it. `IconName`: `'calendar' \| 'clear' \| 'chevronLeft' \| 'chevronRight' \| 'chevronDown'`. See [Icons](theming.md#icons). |
| `iconProps` | `Partial<Record<IconName, IconOptions>>` | – | `color`, `disabledColor`, `size`, `width`, `height` per icon, for the built-in icons and yours. |

## Slots and render props

| Prop | Type | Notes |
|---|---|---|
| `header`, `bodyTop`, `bodyBottom`, `footer` | `ReactNode \| (state: PickerState) => ReactNode` | `header` replaces the title + Reset row; `footer` replaces Confirm (call `state.confirm`). |
| `title` | `string` | Sheet title (default `strings.titleDate`). |
| `onReset` | `() => void` | Shows a Reset button in the header. |
| `onConfirm` | `(value: PickerValue) => void` | Only when Confirm is pressed and saves, after `onChange` and `onBlur`. Not for `'instant'` edits. |
| `confirmDisabled` | `boolean` | Keep Confirm disabled. |
| `renderField` | `(state: PickerState) => ReactNode` | Replaces the on-screen field with your own input: show `state.displayText`, open with `state.open`, clear with `state.clear`. See [Your own input](presentation.md#your-own-input). |
| `renderDay` | `(state: DayCellState, onPress: () => void) => ReactNode` | |
| `renderWeekday` | `(weekday: Weekday, name: string) => ReactNode` | |
| `renderMonthChip` | `(month: number, state: { selected; disabled }) => ReactNode` | |
| `renderYearCell`, `renderMonthCell` | `(item: PeriodItem) => ReactNode` | |
| `renderEmptyState` | `() => ReactNode` | Shown when no day can be picked. |
| `renderCalendarSwitch` | `(p: CalendarSwitchRenderProps) => ReactNode` | Replaces the calendar switch: draw `p.systems`, mark `p.selected`, call `p.onSelect(system)`. |
| `renderTimeRow` | `(state: PickerState) => ReactNode` | Replaces the time row. Read `state.time` (ranges: `state.rangeTimes`) and change it with `state.setTime(time, end?)`, which works like the built-in row, including before a day is picked. |

## Calendar

| Prop | Type | Default |
|---|---|---|
| `firstDayOfWeek` | `1`–`7` (Monday = 1) | from `locale`'s region (Sunday for `en-US`, Monday for `en-GB`), else `7` (Sunday) |
| `showOutsideDays` | `boolean` | `true` |
| `yearRange` | `{ first: number; last: number }` | `DEFAULT_YEAR_RANGE` (1900–2200); days outside it are greyed, like days outside `minDate` / `maxDate` |
| `initialView` | `'day' \| 'month' \| 'year'` | `'day'` |
| `precision` | `'day' \| 'month' \| 'year'` | `'day'`: what one pick is. With `'month'` or `'year'` the month or year grid is the last step, the saved value is the period's first day, the field shows "March 2026" or "2026", and a period can be picked when any day in it can (so `minDate` 15 Oct still allows October). The current month or year is outlined. Single date pickers only (ignored for date-time, range and multiple), always Gregorian, without typing. |
| `initialVisibleDate` | `CalendarDate` | today: with no value, the calendar opens on this day's month without selecting it (e.g. `{ year: 2000, month: 1, day: 1 }` for a date of birth); a value's month always wins |
| `enableMonthSwipe` | `boolean` | `true` |
| `showToday` | `boolean` | `false` |
| `calendarSystem` | `'gregory' \| 'dual' \| 'hijri'` | `'gregory'`. `'dual'` shows Gregorian and Hijri tabs. With `calendarSwitch`, the calendar shown first. See [Hijri](localization.md#hijri). |
| `calendarSwitch` | `boolean \| CalendarSystem[]` | `false`. A Gregorian / Hijri / Dual switch above the calendar; a list picks which ones and their order, e.g. `['hijri', 'gregory']` |
| `onCalendarSystemChange` | `(system: CalendarSystem) => void` | – |
| `hijriLocale` | BCP-47 tag | `'ar-SA'`: the language a Hijri calendar is written in, whatever `locale` is (month and weekday names, the Hijri date in the field, screen-reader labels) |
| `dualDefaultTab` | `'gregory' \| 'hijri'` | `'gregory'`: the tab a dual calendar opens on, each time it opens |
| `locale` | BCP-47 tag | the device locale |
| `numerals` | `'latin' \| 'arabic' \| 'locale'` | `'arabic'` (١٢٣) for a Hijri calendar and a date picked in it, in any language; `'latin'` for a Gregorian one. `'locale'` uses the language's own digits (١٢٣ for `ar-SA`, ۱۲۳ for `fa-IR`, 123 for `en-US`). Values stay 0–9 |
| `timeZone` | IANA zone | the device zone |
| `now` | `() => Date` | `() => new Date()` |

<img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/month.png" width="240" alt="Picking a month and year" />

`precision="month"`: a month-and-year pick, e.g. a card expiry.

## Time

| Prop | Type | Default | Notes |
|---|---|---|---|
| `timeInput` | `'typed' \| 'wheel'` | `'typed'` | |
| `timeFormat` | `'12h' \| '24h'` | from `locale`, else `'12h'` | |
| `minuteStep` | `number` | `1` | A step that divides the hour: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 or 60. Off-step minutes are flagged on Confirm, never rounded silently. |
| `newDayTime` | `Time` | – | A day picked with no time yet gets this time; a time already set is kept. It wins over a time typed before the day and over the current time. |

## Limits

| Prop | Type | Default | Notes |
|---|---|---|---|
| `minDate`, `maxDate` | `CalendarDate` | – | `{ year, month, day }`, month 1–12. |
| `disabledWeekdays` | `Weekday[]` | `[]` | Reason `'WEEKDAY'`. |
| `disabledDates` | `(day) => boolean` | – | Reason `'CUSTOM'`. |
| `enabledDates` | `(day) => boolean` | – | `false` → reason `'CUSTOM'`. |
| `timeBounds` | `(day) => TimeBounds \| null` | – | Per-day `{ min?, max? }` times. |
| `holidays` | `string[]` | `[]` | `'YYYY-MM-DD'`; ISO strings are cut to the date. |
| `loadHolidays` | `(year) => Promise<string[]>` | – | Called once per year the calendar shows. |
| `showHolidays` | `boolean` | `true` | Holiday styling on day cells. |
| `disableHolidays` | `boolean` | `false` | Holidays can't be picked (reason `'HOLIDAY'`). |
| `getConstraints` | `(ctx: ConstraintContext) => Constraints` | – | Full control; see [Limits](limits.md). |

## Look, text and events

| Prop | Type | Notes |
|---|---|---|
| `theme` | `Partial<ThemeTokens>` | See [Theming](theming.md). |
| `styles` | `PickerStyles` | A style for any part. |
| `strings` | `Partial<PickerStrings>` | See [Strings / i18n](localization.md#strings--i18n). |
| `hijriStrings` | `Partial<PickerStrings>` | The texts while the Hijri tab shows (e.g. Arabic): its calendar and time rows, the error messages inside the picker, and a date picked in it. A key left out keeps AM / PM in `hijriLocale` (ص / م), then `strings`. See [Texts on the Hijri tab](localization.md#hijri-texts). |
| `testID` | `string` | The prefix for every part; see [Testing](testing.md#testing). |
| `onVisibleMonthChange` | `(year, month) => void` | The Gregorian month of the first day shown. |
| `onError` | `(code: PickerErrorCode, value) => void` | `'NOTHING_SELECTABLE'` once per open when no day can be picked. When Confirm is pressed with a time problem: `'INCOMPLETE'`, `'INVALID'`, `'OFF_STEP'`, `'BEFORE_MIN'`, `'AFTER_MAX'` or `'TIME_NOT_ALLOWED'`, with the saved value. `'VALIDATION'` when `validate` returns a message, with the value it was given. |
| `validate` | `(value: PickerValue) => string \| null \| undefined` | Your own check before each save (Confirm, an `'instant'` edit, a finished entry in the on-screen field), after the built-in ones. Return a message to show it inside the picker and save nothing; `null` to save. See [Your own validation](limits.md#your-own-validation). |
