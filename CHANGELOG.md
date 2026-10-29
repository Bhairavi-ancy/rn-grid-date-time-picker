# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - Unreleased

2.0.0 reworks the Hijri calendar (Gregorian / Hijri tabs, a calendar switch, Arabic by default) and fixes issues found in real-device testing. Most apps need no changes, or only the few in "Upgrading from 1.0.0".

### Upgrading from 1.0.0

- **`calendarSystem="dual"`** shows Gregorian and Hijri as two tabs, one calendar at a time; it no longer writes the Hijri day under each Gregorian day. `styles.daySubLabel` is no longer drawn, and `renderDay` gets `subLabel: null`. Use `dualDefaultTab` to choose the tab it opens on.
- **The calendar no longer folds away while the keyboard is up.** Pass `hideCalendarOnKeyboard` to keep the 1.0.0 behaviour. A folded calendar now stays mounted but hidden, so a test that checks `dp-calendar` is gone while folded should check that it's hidden instead.
- **`calendarSystem="hijri"` is written in Arabic** (month and weekday names, Arabic digits, the Hijri date in the field), whatever the app's `locale`. Pass `hijriLocale={locale}` and `numerals="latin"` for the 1.0.0 look.
- **`onChange` gets a second argument**, `{ calendarSystem }`, when a Hijri calendar can show. Tests asserting `toHaveBeenCalledWith(value)` need `expect.anything()` added.
- **New required keys** in full `ThemeTokens` objects (`outsideText`) and full `PickerStrings` objects (`calendarGregorian`, `calendarHijri`, `calendarDual`, `a11yCalendarSystem`, `a11yClose`). `Partial<…>`, as the docs use, is unaffected.
- **Stored values must start with a full `YYYY-MM-DD` day.** Strings such as `'2026-10'`, `'2026'` or `'10:30'` now read as empty instead of being guessed.
- **Days outside `yearRange` are greyed**, like days outside `minDate` / `maxDate`.
- **Outside days** (from the months before and after) use the new `outsideText` token, which follows `mutedText`, instead of `placeholder`.
- **The built-in sheet's padding** is 8 at the bottom (was 24) and 24 above the title (was 8). If you add a safe-area inset, use `paddingBottom: 8 + insets.bottom`.
- **From / To ranges:** a tap on a full range starts a new range (or moves the nearer end with `reselect: 'moveNearestEnd'`), instead of replacing To.
- **`strings.errorRangeOrder`** now defaults to "The end date must be greater than the start date".

### Added

- `calendarSwitch`: a Gregorian / Hijri / Dual switch above the calendar, with `onCalendarSystemChange`, `renderCalendarSwitch` and style keys for each part.
- `dualDefaultTab`, `hijriLocale` and `numerals` (`'latin'`, `'arabic'` or `'locale'` digits; values stay 0–9).
- `info.calendarSystem` in `onChange`: the calendar a date was picked in.
- `hideCalendarOnKeyboard` and `sheet.keyboardMaxHeight`.
- `strings.a11yClose` for the sheet backdrop's screen-reader label, which was always English.
- Exported types: `ChangeInfo`, `CalendarSwitchRenderProps`, `CalendarSystem`, `Numerals`.

### Changed

- A range end picked on the start's day starts an hour after the start (within the day's `timeBounds`), so a same-day date-time range isn't out of order before the user touches the time.
- With `commitMode="instant"`, each value is saved once, and typing in the sheet's field saves when focus leaves it or its last box fills.
- A controlled `visible` waits for the keyboard to close before opening, like the built-in open.
- A date typed in another month brings the calendar to that month; browsing without picking leaves it on the month you browsed to, folded or not.

### Fixed

- Multiple dates saved with different times keep them on Confirm; before, every date took the first date's time. A day listed twice counts once.
- Instant mode no longer saves twice on a tap, again on parent re-renders while `value` catches up, or values half-way through typing.
- A controlled `calendarSystem` fed from `onCalendarSystemChange` keeps each selection in one calendar, and typing in the on-screen field keeps the saved date's calendar.
- Limits built with `dependsOnNow` refresh every minute while the picker is open.
- Holidays load for the next or previous year when the grid shows its days (a Hijri month running into January, December's outside days).
- From / To: tapping the start again deselects it instead of leaving the range stuck.
- A folded calendar comes back on the month and view it showed.
- The sheet keeps some room under a keyboard as tall as the window, knows a keyboard that's already up, and reads it as down once it has hidden on iOS.
- RTL chevrons and the selected month chip, digits typed in Arabic and Persian, the date order on Hermes for Android and iOS `ar-SA`, iOS month and weekday names, and scrolling the sheet from the calendar grid.

### Performance

- A tap redraws only the day cells that changed, not all 42, and Hijri dates are worked out once.

## [1.0.0] - 2026-10-27

Initial release.

### Added

- `DateTimePicker` for dates and date-times, in `single`, `multiple` and `range` modes (one field or From / To), as a bottom sheet or inline. Range lengths (`minDays` / `maxDays`) count calendar days, both ends included.
- String values in `'iso'` (default) or `'utc-midnight'` format, or through your own `ValueAdapter`.
- Typed segments in the field, typed time boxes or a wheel, 12- / 24-hour, minute steps that divide the hour.
- Limits: `minDate` / `maxDate`, `disabledWeekdays`, `disabledDates` / `enabledDates`, `timeBounds`, `holidays` / `loadHolidays` / `disableHolidays`, and `getConstraints` for full control. `createConstraints` is exported.
- Gregorian, dual and Hijri (Umm al-Qura) calendars, with a Gregorian fallback.
- Locale-based defaults for the date order and the clock (through `Intl`) and for the first day of the week (from the locale's region).
- Theme tokens, `styles` keys for every part, `strings` for every text, and render props for the sheet, field, label, instruction, days, cells and time row.
- The system font by default, so there's nothing to load. `INTER_FONTS` switches to Inter (`Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`, loaded by the app); `SYSTEM_FONTS` switches back.
- A `fontFamily` token that sets the font for all text, next to the per-weight `fontRegular` / `fontMedium` / `fontSemiBold`.
- `icons` replaces any icon with your own component or hides it, and `iconProps` sets each icon's colour, disabled colour, size, width and height.
- `renderField` receives `displayText` and `clear`, so your own input can show the value and clear it. `renderTimeRow` receives `time`, `rangeTimes` and `setTime`, so your own time row can change the time.
- `initialVisibleDate` opens an empty calendar on a chosen month (e.g. for a date of birth).
- `sheet` sets the sheet's `height` and `maxHeight`, whether the header and footer stay fixed or scroll with the body, and whether the field above the calendar shows (`showField`, `fieldPlaceholder`), and whether that field shows the calendar icon (`fieldIcon`).
- Placeholder strings for the typed segments and time boxes (`placeholderDay`, `placeholderMonth`, `placeholderYear`, `placeholderHour`, `placeholderHour24`, `placeholderMinute`).
- `precision: 'month' | 'year'` picks a whole month or year: the month or year grid is the last step, the saved value is the period's first day, the field shows "March 2026" / "2026", and a period can be picked when any day in it can. The current month or year is outlined (`monthCellCurrent`, `yearCellCurrent`).
- `strings.rangeSeparator` (default `' – '`) joins the two ends of a range in the field text.
- `fieldTextDisabled` style key for the value's text while the field is disabled.
- With `commitMode="instant"`, × in the field above the calendar clears the saved value (`onChange('')`), not just the selection.
- Text style keys for every text: `yearCellText`, `monthCellText`, `daySubLabel`, `timeBoxText`, `ampmOptionText`, `wheelText`, `todayButtonText`, `fieldPeriodText`.
- `validate` runs your own check before a value is saved (on Confirm, with `commitMode="instant"`, and when typing in the on-screen field) and shows its message (`styles.validationText`).
- Times are checked when Confirm is pressed, not while typing; `onError` reports the time problem.
- Typed segments handle fast input (hardware keyboards, autofill) without dropping or doubling digits, and a full last box can still be corrected.
- With `allowFieldTyping`, the on-screen field saves once typing pauses (focus leaves it or its last box fills), not on every complete value.
- A date typed into the field takes the time already entered in the time row, so Confirm works without retyping it.
- In 12-hour mode a typed time reads as AM until switched; segment boxes grow with the font size and system text size, and the time wraps to a second line instead of overlapping the icons.
- A bad `minuteStep`, an unknown `timeZone` or a throwing custom `parse` falls back with a development warning instead of crashing.
- `dateFormat` in any case (`'dd/mm/yyyy'`). A format the picker can't use warns in development and falls back to the locale order.
- Accessibility labels and states, reduce-motion support, a font-scale cap and RTL mirroring. On iOS every typed box gets a Done button above the number pad, and errors are announced to VoiceOver.

[2.0.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/releases/tag/v1.0.0
