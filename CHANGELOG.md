# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

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
- With `allowTriggerTyping`, the on-screen field saves once typing pauses (focus leaves it or its last box fills), not on every complete value.
- A date typed into the field takes the time already entered in the time row, so Confirm works without retyping it.
- In 12-hour mode a typed time reads as AM until switched; segment boxes grow with the font size and system text size, and the time wraps to a second line instead of overlapping the icons.
- A bad `minuteStep`, an unknown `timeZone` or a throwing custom `parse` falls back with a development warning instead of crashing.
- `dateFormat` in any case (`'dd/mm/yyyy'`). A format the picker can't use warns in development and falls back to the locale order. `normalizeDateFormat` is exported.
- Accessibility labels and states, reduce-motion support, a font-scale cap and RTL mirroring. On iOS every typed box gets a Done button above the number pad, and errors are announced to VoiceOver.

[1.0.0]: https://github.com/Bhairavi-ancy/rn-calendar-time-picker/releases/tag/v1.0.0
