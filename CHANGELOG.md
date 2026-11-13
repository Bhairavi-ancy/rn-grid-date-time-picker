# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.3.2] - 2026-11-13

### Added

- `renderMonthChipFade(side, color)`: drawn over the left or right edge of the month chip row while months are scrolled past that edge, a fade for example. It is pinned to the edge, takes no touches and sets its own width; `color` is the calendar background. Without it the row looks as before.

### Fixed

- The year grid's previous / next arrows now stop at the selectable years, not just the year range: an arrow pages only while a page further on has a year with a selectable day. With `precision: 'year'` the grid's title has no caret and isn't tappable, since there's no other view to open.
- A typed time is saved as soon as the minutes get their second digit, so with `commitMode: 'instant'` it no longer waits for focus to leave the box. Jumping from the hour to the minutes no longer saves `HH:00` early, and Confirm stays off while only the hour is typed. An hour left with empty minutes (focus moves elsewhere) still counts as `:00`.
- While the keyboard is up, the time rows drop the line above them. When the sheet hides its field (`sheet.showField: false`) and the keyboard folds the calendar away, the first time row sits right under the title.

## [1.3.1] - 2026-11-13

### Added

- `sheet.showNotAllowedError` (default `true`): `false` hides "This date isn't available" above the calendar when the picked date (or a range's end) is a disabled day, such as a saved value the rules no longer allow. Confirm stays off for that day either way.

### Fixed

- A greyed (disabled) today no longer keeps the full accent ring. Its ring keeps the accent colour at 40% opacity, like the other greyed controls, and the day number stays as grey as the other greyed days. A custom `styles.today` (its border colour or width, for example) and the corner radius from `styles.day` still apply to that ring.
- With a `fieldDateText` style, the empty date-time field's placeholder now sets its date apart from its time, like the value does, so `{ minWidth: '50%' }` starts the placeholder's time at the middle of the field too. A `placeholder` passed in is cut at the first `strings.dateTimeSeparator` when what follows is a time (`'DD/MM/YYYY HH:MM'`); wording such as `'Pick a time'` stays whole.

### Changed

- **A dual calendar's selection shows in both tabs.** A day picked on the Gregorian tab is highlighted on the Hijri tab too, and the other way round, and a tap on either tab edits the same selection instead of starting over, so a range can start on one tab and end on the other. The selection is saved with the tab on screen: Confirm on the Hijri tab saves a Gregorian pick as Hijri (`info.calendarSystem: 'hijri'`), and the field writes it that way. With `commitMode="instant"`, a tab (or a calendar in the switch) the user picks saves the selection again with that calendar; the tab the picker opens on doesn't. The field inside the sheet now follows the tab too. A new `calendarSystem` prop no longer clears a selection in progress. Values stay Gregorian.
- **A dual calendar reopens on the tab its value was saved with.** A date saved from the Hijri tab opens the picker on the Hijri tab next time, while the picker stays mounted. With no value it still opens on `dualDefaultTab`, and so does a value passed in from outside: to keep the tab after a remount, store `info.calendarSystem` and pass it as `dualDefaultTab`.

## [1.3.0] - 2026-11-12

### Added

- `fieldCalendar` (`'picked'` | `'gregory'`, default `'picked'`): how the on-screen field writes the saved value. `'gregory'` keeps it in `dateFormat`, with `strings` AM / PM and Gregorian digits, even when the date was picked on the Hijri tab. The field inside the sheet and the time rows still follow the tab, and `onChange` still reports the calendar the date was picked in.
- `sheet.scrollProps`: props for the sheet body's ScrollView, over the picker's own defaults, in the built-in sheet and with `renderSheet`. For example `{ showsVerticalScrollIndicator: true, persistentScrollbar: true }` keeps the scrollbar showing on Android; iOS shows it only while scrolling. Its type is exported as `SheetScrollProps`.
- `newDayTime: 'empty'`: a newly picked day gets no time. The time boxes stay empty (both ends of a range, the shared time of multiple dates) and Confirm stays disabled, and `commitMode: 'instant'` saves nothing, until the user enters a time. An hour alone counts, as it already did (empty minutes are 00). A saved time is kept when another day is picked. `newDayTime: 'now'` is the default and keeps the current-time behaviour; a `Time` still fixes the time.
- `sheet.scrollToTime` (`true` | `'end'` | `false`, default `true`): in a date-time sheet whose body scrolls, a calendar tap that picks the date now scrolls the time section into view when it's below the fold, so the time boxes show before they're tapped. Single mode scrolls on every tap, range mode once the end is picked, and multiple mode for the first date only, so more dates can be picked. `true` scrolls just far enough to show the time, `'end'` to the end of the body, `false` turns it off. Nothing moves when the time already shows in full. Built-in sheet and `renderSheet`.
- `scrollToTimeRef`: the same scroll for an inline date-time picker. Pass the ScrollView the picker sits in, and a calendar tap that picks the date scrolls it just far enough to show the time section. Without it an inline picker doesn't scroll, as before.

### Fixed

- Android: a drag that starts on a time box now scrolls the sheet (or the screen around an inline picker). A TextInput keeps any drag that starts on it, so the body only scrolled from the calendar. The boxes ignore touches and a wrapper takes them; a tap still focuses the box, and a tap on the box being edited brings the keyboard back. Nothing about this changes when a box gains focus, because a change at that moment made Android move focus from box to box. iOS is unchanged.

## [1.2.2] - 2026-11-05

### Fixed

- iOS: the see-through Done bar above the number pad is replaced by an empty solid bar (`surface` background, `border` line, `touchTarget` tall). React Native's own bar is see-through on newer iOS, so a sheet resting on the keyboard showed the screen behind it. Each typed box has its own bar. The keyboard closes by tapping outside the box; `strings.done` is no longer shown. This uses `InputAccessoryView`, which React Native 0.88 marks as deprecated.

## [1.2.1] - 2026-11-04

### Added

- `timeRowDate`: each time row shows its picked day under its label (Start time / 10-03-2026), as the field writes it (Hijri text for a Hijri pick). Off by default. With `timeMode: 'perDate'` the day moves from after the label to under it.
- `renderTimeLabel`: replaces a time row's label with your own, and gets the row (`'single' | 'from' | 'to' | 'shared' | 'day'`), its day, the day's text and its time. The `TimeLabelRenderProps` type is exported.
- The `timeLabelWrap` and `timeLabelDate` style keys, for the label with its date.

### Changed

- The colon between the time boxes no longer has a fixed 46 pt height, so a shorter `timeBox` makes the row shorter. The default look is unchanged.

### Fixed

- A repeated wall-clock time (the hour clocks fall back over) now always saves as its first occurrence. It used to depend on the zone's offset on the day the code ran, so the same value could save as a different instant depending on the date.
- With `commitMode: 'instant'`, tapping a day no longer flashes "Enter a complete time" under its time row for one frame.

## [1.2.0] - 2026-11-01

1.2.0 lays out the Hijri tab right to left, gives it its own texts (`hijriStrings`), and lets a long field value scroll instead of ending in "…". No props or types were removed, but some defaults change what users see: check the Changed list if you use the Hijri or dual calendar (its layout, and AM / PM written ص / م), a right-to-left app (the time boxes mirror), or tests that match the field text or the layout.

### Added

- `hijriStrings`: the texts while the Hijri tab shows (e.g. Arabic), for its calendar and time rows, the error messages inside the picker (under its field, the calendar and the time rows), and a date picked in it. The on-screen field's errors keep `strings`, and so do the title, Confirm, Reset and the tabs. A key left out keeps AM / PM in `hijriLocale` (ص / م), then `strings`.
- `hijriPeriods(locale)`: AM / PM as the Hijri tab writes them, so an app's own text (filter chips, summaries) matches the field. Its return type is exported as `Periods`.
- The `fieldDateText` style key sets the date of a single date-time value apart from its time in the field, e.g. `{ minWidth: '50%' }` starts the time at the middle of the field.

### Changed

- **A string set to `undefined` (or `null`) keeps its default**, in `strings` and `hijriStrings`, instead of showing nothing. An app can pass every key and leave the ones it has no text for undefined.
- **The Hijri tab reads right to left.** While a Hijri calendar shows, the calendar (header, month chips, weekdays, days, the year and month grids) and the time rows are laid out right to left, with the arrows and the month swipe mirrored, whatever the app's direction. The Gregorian / Hijri tabs, the field and the buttons keep the app's direction.
- **AM / PM on the Hijri tab are written in `hijriLocale`** (ص / م for Arabic), in the time rows, and in the field when the date was picked in Hijri. The time rows' digits now follow the tab that shows, not the calendar the date was picked in.
- **In a right-to-left layout the time boxes mirror**: the hour sits on the right, then the minutes, with AM / PM on the left (the wheels too). In a left-to-right app that's the Hijri tab only.
- **A value too long for the field scrolls sideways** instead of being cut off with "…"; a tap still opens the picker. Right-to-left text (a Hijri date) opens scrolled to its start.
- **In a typed date-time field the time sits in the middle** of the space between the date and the icons, instead of right after the date.
- **The year and month grids have no top padding**; the header's margin already spaces the first row.

### Fixed

- **On Android the field no longer swaps the last word of its value for "…"** when the line is measured a pixel short (most often right-to-left text, such as the end of a Hijri range).

## [1.1.0] - 2026-10-30

1.1.0 reworks the Hijri calendar (Gregorian / Hijri tabs, a calendar switch, Arabic by default) and fixes issues found in real-device testing. It changes some 1.0.0 behaviour, listed below: most apps need no changes, but check this list if you use the Hijri or dual calendar, full `PickerStrings` / `ThemeTokens` objects, or tests that match `onChange` calls exactly.

### Changes from 1.0.0 to check

- **`calendarSystem="dual"`** shows Gregorian and Hijri as two tabs, one calendar at a time; it no longer writes the Hijri day under each Gregorian day. `styles.daySubLabel` is no longer drawn, and `renderDay` gets `subLabel: null`. Use `dualDefaultTab` to choose the tab it opens on. A date shows selected only in the tab it was picked in, and a tap in the other tab starts the selection over.
- **A folded calendar stays mounted but hidden** while the keyboard is up, so it comes back on the month it showed. A test that checks `dp-calendar` is gone while folded should check that it's hidden instead.
- **`calendarSystem="hijri"` is written in Arabic** (month and weekday names, Arabic digits), whatever the app's `locale`, and **the field shows the Hijri date** (e.g. "١٥ جمادى الأولى ١٤٤٨ هـ") instead of the Gregorian date in `dateFormat`. `hijriLocale={locale}` and `numerals="latin"` bring back 1.0.0's language and digits; the field still writes the date in Hijri. Values passed to `onChange` stay Gregorian.
- **`onChange` gets a second argument**, `{ calendarSystem }`, when a Hijri calendar can show. Tests asserting `toHaveBeenCalledWith(value)` need `expect.anything()` added.
- **Stored values must start with a full `YYYY-MM-DD` day.** Strings such as `'2026-10'`, `'2026'` or `'10:30'` now read as empty instead of being guessed, and so do a leading space, a lowercase `t` and six-digit years (`+002026-…`).
- **Days outside `yearRange` are greyed**, like days outside `minDate` / `maxDate`.
- **Outside days** (from the months before and after) use the new `outsideText` token, which follows `mutedText`, instead of `placeholder`.
- **The built-in sheet's padding** is 8 at the bottom (was 24) and 24 above the title (was 8), plus the bottom safe-area inset, which the sheet now adds itself (see Added). If you added `insets.bottom` to `styles.sheet.paddingBottom` yourself, that still wins; you can drop it.
- **From / To ranges:** a tap on a full range starts a new range (or moves the nearer end with `reselect: 'moveNearestEnd'`), instead of replacing To.
- **`strings.errorRangeOrder`** now defaults to "The end date must be greater than the start date".

### Added

- `sheet.bottomInset`: the built-in sheet keeps the bottom safe-area inset (home indicator, Android's navigation bar) free below Confirm. By default it's read from `react-native-safe-area-context` when the app has a `SafeAreaProvider` (an optional peer dependency).
- `calendarSwitch`: a Gregorian / Hijri / Dual switch above the calendar, with `onCalendarSystemChange`, `renderCalendarSwitch` and style keys for each part.
- `dualDefaultTab`, `hijriLocale` and `numerals` (`'latin'`, `'arabic'` or `'locale'` digits; values stay 0–9).
- `info.calendarSystem` in `onChange`: the calendar a date was picked in.
- `hideCalendarOnKeyboard` (on by default, as the calendar folded in 1.0.0; `false` keeps it in view) and `sheet.keyboardMaxHeight`.
- `strings.a11yClose` for the sheet backdrop's screen-reader label, which was always English.
- `strings.dateTimeSeparator` (default `' '`): what goes between the date and the time in the field text and its placeholder.
- `hijriDateText` and `arabicDigits`, the helpers the field uses to write a Hijri date and Arabic digits, so an app's own text (filter chips, summaries) matches the field.
- New optional keys: `ThemeTokens.outsideText` and the `PickerStrings` keys `calendarGregorian`, `calendarHijri`, `calendarDual`, `a11yCalendarSystem` and `a11yClose`. A full 1.0.0 `ThemeTokens` or `PickerStrings` object still compiles.
- Exported types: `ChangeInfo`, `CalendarSwitchRenderProps`, `CalendarSystem`, `Numerals`, `RangeRole`, `StyleKey`, `PickerStyleValue`.

### Changed

- A range end picked on the start's day starts an hour after the start (within the day's `timeBounds`), so a same-day date-time range isn't out of order before the user touches the time.
- With `commitMode="instant"`, each value is saved once, and typing in the sheet's field saves when focus leaves it or its last box fills.
- A controlled `visible` waits for the keyboard to close before opening, like the built-in open.
- The sheet's body scrolls without a scroll bar, and day cells are read out from the platform's own month and weekday names.
- `getConstraints` gets `yearRange` in `ctx.limits.minDate` / `maxDate`.
- Time boxes and wheel columns are read out with their row's label ("Start time, Hour"), and a custom `renderMonthChip` keeps the chip's role, name and state.
- A date typed in another month brings the calendar to that month; browsing without picking leaves it on the month you browsed to, folded or not.

### Fixed

- Android, edge-to-edge apps (the default from Android 15 / recent Expo): the sheet now sits above the keyboard instead of behind it, and Confirm no longer sits under the navigation bar's Back / Home buttons.
- A date typed or pasted with separators and no padding (`1/12/2025`) reads as 1 December, not 11 February.
- The field writes AM / PM with `strings.am` / `strings.pm`, like the time row.
- A minute off the wheel's step shows at the nearest row, not 00.
- Multiple dates saved with different times keep them on Confirm; before, every date took the first date's time. A day listed twice counts once.
- Instant mode no longer saves twice on a tap, again on parent re-renders while `value` catches up, or values half-way through typing; a date still being typed is saved when the sheet closes.
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

[Unreleased]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/releases/tag/v1.0.0
