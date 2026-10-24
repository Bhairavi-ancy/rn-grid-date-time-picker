# rn-calendar-time-picker

A flexible, themeable date & time picker for React Native: single, multiple and range selection, typed or wheel time entry, limits and holidays, Hijri support. Pure JS, works with Expo Go.

## Features

- **Dates and date-times**: one value, several dates, or a range (in one field or From / To).
- **Typed or tapped**: type the date and time as segments, or pick them on the calendar and a time row (typed boxes or a scrolling wheel, 12- or 24-hour, minute steps).
- **Limits**: min / max days with edge times, disabled weekdays, holidays (marked or disabled, loaded per year), custom checks, per-day time bounds, or your own constraint engine.
- **Calendar**: day, month and year views, month swipe, a Today button, outside days, any first day of the week, years 1900–2200.
- **Hijri**: Gregorian, Gregorian with Hijri days, or a Hijri (Umm al-Qura) grid.
- **Exact commits**: `onChange` fires once per Confirm. Closing fires nothing.
- **Accessible and RTL-aware**: every control is labelled, reduce motion is respected, font scaling is capped, and chevrons mirror in RTL.
- **Yours to restyle**: theme tokens, a `styles` key for every part, every string, and render props for the sheet, field, label, days, cells and time row.
- **No native code**: one runtime dependency ([Luxon](https://moment.github.io/luxon/)).

## Install

```sh
npm i rn-calendar-time-picker
# or
yarn add rn-calendar-time-picker
```

There are no native steps. It works in Expo Go and in bare React Native apps. `react` and `react-native` are peer dependencies.

## Quick start

```tsx
import { useState } from 'react';
import DateTimePicker, { type PickerValue } from 'rn-calendar-time-picker';

export function DueDate() {
  const [value, setValue] = useState<PickerValue>('');
  return (
    <DateTimePicker
      type="date"
      label="Due date"
      value={value} // '2026-10-24'
      onChange={setValue}
    />
  );
}
```

A date-time value:

```tsx
<DateTimePicker
  type="datetime"
  value={startsAt} // '2026-10-24T10:00:00.000Z'
  onChange={setStartsAt}
  timeZone="Europe/London"
  minuteStep={15}
/>
```

A range:

```tsx
<DateTimePicker
  type="date"
  mode="range"
  range={{ layout: 'fromTo', minDays: 1, maxDays: 14 }}
  value={stay} // { from: '2026-10-24', to: '2026-10-27' }
  onChange={setStay}
/>
```

## Values

Values are strings, so they can go straight into a form, a store or an API.

| Mode | `value` accepted | `onChange` receives |
|---|---|---|
| `single` | `string` (`''` = empty) | `string` |
| `multiple` | `string[]`; a non-empty `string` counts as a one-item list | `string[]`, sorted by date |
| `range` | `{ from, to }` or `[from, to]` | `{ from, to }` |
| any, on clear (×) | – | `''` |

The string format is set by `valueFormat`:

| `valueFormat` | date | date-time |
|---|---|---|
| `'iso'` (default) | `'2026-10-24'`. Only `YYYY-MM-DD` is accepted; anything else reads as empty. | A UTC ISO instant with seconds and milliseconds zeroed: `'2026-10-24T10:00:00.000Z'`. Any ISO 8601 string with `Z` or an offset is accepted (one without an offset is read as UTC) and shown in `timeZone`. |
| `'utc-midnight'` | `'2026-10-24T00:00:00.000Z'`: the calendar day at UTC midnight, never shifted by a zone. | The same as `'iso'`. |
| a `ValueAdapter` | yours | yours |

```ts
interface ValueAdapter {
  parse(raw: string, ctx: AdapterContext): DateTimeValue | null; // null = empty or invalid
  format(value: DateTimeValue, ctx: AdapterContext): string; // '' when incomplete
  /** Confirm without a change: what to emit for the stored raw string. Default: raw as-is. */
  formatUnchanged?(raw: string, ctx: AdapterContext): string;
}
interface AdapterContext { type: 'date' | 'datetime'; timeZone: string }
interface DateTimeValue { date: CalendarDate; time: Time | null }
```

For example, an adapter that stores epoch milliseconds:

```ts
import type { ValueAdapter } from 'rn-calendar-time-picker';

const epochMs: ValueAdapter = {
  parse: (raw) => {
    const d = new Date(Number(raw));
    if (!raw || Number.isNaN(d.getTime())) return null;
    return {
      date: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() },
      time: { hour: d.getHours(), minute: d.getMinutes() },
    };
  },
  format: ({ date, time }) =>
    time
      ? String(new Date(date.year, date.month - 1, date.day, time.hour, time.minute).getTime())
      : '',
};
```

`isoAdapter` and `utcMidnightAdapter` are exported too.

**Empty and clear.** `''` (or `[]`, or `{ from: '', to: '' }`) is empty. A value the format can't read is treated as empty. The × on the field calls `onChange('')` straight away, in every mode.

**Unchanged Confirm.** If the user confirms without changing a value, the stored string comes back as it came in (`'iso'`), so a value with seconds or an offset isn't rewritten. `'utc-midnight'` re-serialises the stored instant or day as UTC (`formatUnchanged`).

**Time zones.** Date-time values are read and written in `timeZone` (an IANA name; default: the device zone). "Today" uses the same zone. Dates have no zone. A wall time skipped by a daylight-saving change moves forward, and a repeated one uses its first occurrence; the sheet shows a notice for both.

## Props

### What it picks

| Prop | Type | Default | Notes |
|---|---|---|---|
| `type` | `'date' \| 'datetime'` | required | |
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | |
| `value` | `PickerValue` | required | See [Values](#values). |
| `onChange` | `(value: PickerValue) => void` | required | Once per Confirm, or with `''` on clear. |
| `onBlur` | `() => void` | – | On Confirm only, right after `onChange`. |
| `commitMode` | `'confirm' \| 'instant'` | `'confirm'` | `'instant'` saves every complete, allowed edit. |
| `valueFormat` | `'iso' \| 'utc-midnight' \| ValueAdapter` | `'iso'` | |
| `multiple` | `{ timeMode?: 'shared' \| 'perDate'; maxSelections?: number; joinConsecutive?: boolean }` | `timeMode: 'shared'` | `joinConsecutive` draws neighbouring days as one band. |
| `range` | `{ layout?: 'singleField' \| 'fromTo'; allowSameDay?: boolean; minDays?: number; maxDays?: number; reselect?: 'newRange' \| 'moveNearestEnd' }` | `layout: 'singleField'`, `reselect: 'newRange'` | `allowSameDay` is for dates; date-time ranges may always start and end on one day. |

### Presentation

| Prop | Type | Default | Notes |
|---|---|---|---|
| `presentation` | `'sheet' \| 'inline'` | `'sheet'` | |
| `visible` | `boolean` | – | Controls the sheet; without it the picker opens itself. |
| `onOpen` / `onClose` | `() => void` | – | `onClose` fires for Close, the backdrop and Android back. |
| `onBeforeOpen` | `() => void` | – | Just before opening, e.g. to close your own dropdowns. |
| `showField` | `boolean` | `true` | Hide the on-screen field (for example with `visible`). |
| `sheet` | `SheetOptions` | – | `height`, `maxHeight`, `fixedHeader`, `fixedFooter`, `showField`, `fieldPlaceholder`. See [Sheet layout](#sheet-layout). |
| `renderSheet` | `(p: SheetRenderProps) => ReactNode` | built-in sheet | See [Presentation](#presentation). |

### Value field

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label`, `placeholder`, `helperText`, `instruction` | `string` | – | `helperText` sits with the label, `instruction` under the field. |
| `isMandatory` | `boolean` | `false` | Adds ` *` to the label. |
| `disabled`, `readOnly` | `boolean` | `false` | Neither opens; disabled also greys the field. |
| `allowTyping` | `boolean` | `false` | Type in the field inside the sheet. |
| `allowTriggerTyping` | `boolean` | `false` | Type in the on-screen field (single mode). A complete, allowed value is saved once, when focus leaves the field or its last box fills. |
| `allowClear` | `boolean` | `false` | Shows × when there is a value. |
| `errorMessage` | `string` | – | Your error, shown under the field. |
| `dateFormat` | `string` | from `locale` | `dd`, `MM` and `yyyy` with one separator, in any case: `'dd/mm/yyyy'`, `'DD.MM.YYYY'`, `'yyyy-MM-dd'`. Used for the field text, the typed segments and the placeholder. Anything else (for example `'d/m/yy'` or `'dd MMM yyyy'`) logs a warning in development and uses the locale order. |
| `renderLabel` | `(p: LabelRenderProps) => ReactNode` | built-in label | |
| `renderInstruction` | `(p: InstructionRenderProps) => ReactNode` | built-in text | |
| `icons` | `Partial<Record<IconName, ComponentType<IconRenderProps> \| null>>` | built-in icons | Your own component per icon; `null` hides it. `IconName`: `'calendar' \| 'clear' \| 'chevronLeft' \| 'chevronRight' \| 'chevronDown'`. See [Icons](#icons). |
| `iconProps` | `Partial<Record<IconName, IconOptions>>` | – | `color`, `disabledColor`, `size`, `width`, `height` per icon, for the built-in icons and yours. |

### Slots and render props

| Prop | Type | Notes |
|---|---|---|
| `header`, `bodyTop`, `bodyBottom`, `footer` | `ReactNode \| (state: PickerState) => ReactNode` | `header` replaces the title + Reset row; `footer` replaces Confirm (call `state.confirm`). |
| `title` | `string` | Sheet title (default `strings.titleDate`). |
| `onReset` | `() => void` | Shows a Reset button in the header. |
| `onConfirm` | `(value: PickerValue) => void` | After `onChange` and `onBlur`. |
| `confirmDisabled` | `boolean` | Keep Confirm disabled. |
| `renderField` | `(state: PickerState) => ReactNode` | Replaces the on-screen field with your own input: show `state.displayText`, open with `state.open`, clear with `state.clear`. See [Your own input](#your-own-input). |
| `renderDay` | `(state: DayCellState, onPress: () => void) => ReactNode` | |
| `renderWeekday` | `(weekday: Weekday, name: string) => ReactNode` | |
| `renderMonthChip` | `(month: number, state: { selected; disabled }) => ReactNode` | |
| `renderYearCell`, `renderMonthCell` | `(item: PeriodItem) => ReactNode` | |
| `renderEmptyState` | `() => ReactNode` | Shown when no day can be picked. |
| `renderTimeRow` | `(state: PickerState) => ReactNode` | |

### Calendar

| Prop | Type | Default |
|---|---|---|
| `firstDayOfWeek` | `1`–`7` (Monday = 1) | `7` (Sunday) |
| `showOutsideDays` | `boolean` | `true` |
| `yearRange` | `{ first: number; last: number }` | `DEFAULT_YEAR_RANGE` (1900–2200) |
| `initialView` | `'day' \| 'month' \| 'year'` | `'day'` |
| `enableMonthSwipe` | `boolean` | `true` |
| `showToday` | `boolean` | `false` |
| `calendarSystem` | `'gregory' \| 'dual' \| 'hijri'` | `'gregory'` |
| `locale` | BCP-47 tag | the device locale |
| `timeZone` | IANA zone | the device zone |
| `now` | `() => Date` | `() => new Date()` |

### Time

| Prop | Type | Default | Notes |
|---|---|---|---|
| `timeInput` | `'typed' \| 'wheel'` | `'typed'` | |
| `timeFormat` | `'12h' \| '24h'` | from `locale`, else `'12h'` | |
| `minuteStep` | `number` | `1` | A whole number from 1 to 60. Off-step minutes are flagged on Confirm, never rounded silently. |
| `newDayTime` | `Time` | – | Every newly picked day gets this time. It wins over a time typed before the day and over the current time. |

### Limits

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
| `getConstraints` | `(ctx: ConstraintContext) => Constraints` | – | Full control; see below. |

### Look, text and events

| Prop | Type | Notes |
|---|---|---|
| `theme` | `Partial<ThemeTokens>` | See [Theming](#theming). |
| `styles` | `PickerStyles` | A style for any part. |
| `strings` | `Partial<PickerStrings>` | See [Strings / i18n](#strings--i18n). |
| `testID` | `string` | The prefix for every part; see [Testing](#testing). |
| `onVisibleMonthChange` | `(year, month) => void` | The Gregorian month of the first day shown. |
| `onError` | `(code, value) => void` | `'NOTHING_SELECTABLE'` once per open when no day can be picked. When Confirm is pressed with a time problem: `'INCOMPLETE'`, `'INVALID'`, `'OFF_STEP'`, `'BEFORE_MIN'`, `'AFTER_MAX'` or `'TIME_NOT_ALLOWED'`, with the saved value. |
| `validate` | `(value: PickerValue) => string \| null \| undefined` | – | Your own check on Confirm, after the built-in ones. Return a message to show it inside the picker and save nothing; `null` to save. See [Your own validation](#your-own-validation). |

## Limits & greying

The limit props cover most cases:

```tsx
<DateTimePicker
  type="date"
  value={value}
  onChange={setValue}
  minDate={{ year: 2026, month: 10, day: 1 }}
  maxDate={{ year: 2026, month: 12, day: 31 }}
  disabledWeekdays={[6, 7]}
  holidays={['2026-12-25']}
  disableHolidays
  disabledDates={(d) => d.day === 13}
/>
```

Greyed days aren't pressable and are read out as "unavailable". A typed value on a greyed day keeps Confirm disabled and shows `strings.errorNotAllowed`. Greying only guides the user, so keep your own validation for what is saved.

`createConstraints` is the engine behind those props. Use it on its own, for example to check a value on the server side of a form:

```ts
import { createConstraints, toDateKey } from 'rn-calendar-time-picker';

const bookedDays = new Set(['2026-10-27']);
const c = createConstraints({
  type: 'datetime',
  timeZone: 'Europe/Berlin',
  now: new Date(),
  // A bound can carry a time on its edge day.
  min: { date: { year: 2026, month: 10, day: 24 }, time: { hour: 9, minute: 0 } },
  disabledWeekdays: [7],
  isDisabled: (d) => (bookedDays.has(toDateKey(d)) ? 'BOOKED' : false),
});
c.dayStatus({ year: 2026, month: 10, day: 25 }); // { disabled: true, reasons: ['WEEKDAY'], holiday: false }
c.isValueAllowed({ date: { year: 2026, month: 10, day: 24 }, time: { hour: 8, minute: 30 } }); // false
```

Reasons come in this order: `OUTSIDE_RANGE`, `WEEKDAY`, `HOLIDAY`, then what `isDisabled` returns (`true` → `'CUSTOM'`, or your own reason string or list), then `CUSTOM` from `isEnabled`. In range and multiple modes the picker adds `RANGE_LENGTH` and `MAX_SELECTIONS` while the user picks.

For full control, pass `getConstraints`. Its result is used as is, and the limit props arrive in `ctx.limits` so you can merge them:

```tsx
<DateTimePicker
  type="datetime"
  value={value}
  onChange={setValue}
  maxDate={lastDay}
  getConstraints={(ctx) =>
    createConstraints({
      type: ctx.type,
      timeZone: ctx.timeZone,
      now: ctx.now,
      maxDate: ctx.limits.maxDate,
      // From now on, to the minute; refreshed while the sheet is open.
      min: { date: ctx.today, time: { hour: ctx.now.getHours(), minute: ctx.now.getMinutes() } },
      dependsOnNow: true,
      holidays: ctx.holidays,
      timeBounds: () => ({ min: { hour: 9, minute: 0 }, max: { hour: 17, minute: 30 } }),
    })
  }
/>
```

`ctx` also holds `today` (in `timeZone`) and `holidays` (the prop plus every year loaded so far). This example reads `ctx.now.getHours()` in the device zone; for another `timeZone`, convert `ctx.now` first.

## Presentation

`presentation="sheet"` (the default) opens a built-in bottom sheet: an RN `Modal` with a backdrop, up to 90% of the screen (see [Sheet layout](#sheet-layout)). The body scrolls between the title and Confirm when it doesn't fit, and the sheet waits for the keyboard to close before opening. `presentation="inline"` renders the same content in place, for example inside your own sheet or a filter panel.

The built-in sheet doesn't add a safe-area inset. Add one with `styles.sheet`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
<DateTimePicker styles={{ sheet: { paddingBottom: 24 + insets.bottom } }} /* … */ />;
```

Or bring your own sheet with `renderSheet`. It is called only while the picker is open and rendered in place (no portal), so it works inside other sheets:

```tsx
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { SheetRenderProps } from 'rn-calendar-time-picker';

const renderSheet = ({ onRequestClose, body, footer }: SheetRenderProps) => (
  <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
    <View style={{ margin: 16, marginTop: 'auto', borderRadius: 16, backgroundColor: '#fff' }}>
      {body}
      {footer}
    </View>
  </Modal>
);
```

Call `onRequestClose` for Close, the backdrop and Android back. It fires `onClose` and never `onChange`.

### Sheet layout

Everything inside the sheet can be set from props:

| What | How |
|---|---|
| Title | `title="Choose a day"` (default `strings.titleDate`) |
| The whole header | `header={(state) => <MyHeader onClose={state.close} />}`; `header={null}` hides it |
| Confirm, or your own buttons | `footer={(state) => <MyButton disabled={!state.canConfirm} onPress={state.confirm} />}`; `footer={null}` hides it |
| Content above / below the calendar | `bodyTop`, `bodyBottom` |
| Styles | `styles.sheet` (panel), `sheetBackdrop`, `header`, `title`, `container`, `body`, `footer`, `confirmButton`, `confirmText` |
| Placeholders | `sheet.fieldPlaceholder` for the field above the calendar; `strings.placeholderDay` / `placeholderMonth` / `placeholderYear` / `placeholderHour` / `placeholderHour24` / `placeholderMinute` for the typed segments and time boxes (and the empty field) |
| Size and scrolling | `sheet` (below) |

`sheet` takes:

| Option | Default | |
|---|---|---|
| `height` | as tall as the content | A fixed height, in points or as a percentage of the screen (`'60%'`). The footer then sits at the bottom. |
| `maxHeight` | `'90%'` | The most the sheet grows to. Beyond it the body scrolls. |
| `fixedHeader` | `true` | The header stays put while the body scrolls. `false` scrolls it with the body. |
| `fixedFooter` | `true` | Confirm stays pinned below the body. `false` scrolls it at the end of the body. `renderSheet` then gets `footer: null`. |
| `showField` | `true` | The field above the calendar, which shows the picked date and takes typing with `allowTyping`. When it's hidden, its errors still show above the calendar. Applies inline too. |
| `fieldPlaceholder` | from `dateFormat` | Placeholder of that field when it shows text. |

```tsx
<DateTimePicker
  title="Choose a day"
  header={(state) => <MyHeader title="Choose a day" onClose={state.close} />}
  sheet={{ height: '70%', fixedHeader: true, fixedFooter: false, showField: false }}
  styles={{ sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 } }}
  strings={{ placeholderHour: 'HH', placeholderMinute: 'MM' }}
  …
/>
```

`height` and `maxHeight` size the built-in sheet only; with `renderSheet`, your sheet sets its own size. `fixedHeader` and `fixedFooter` apply to both.

## Field and typing

The on-screen field shows the saved value (never the draft) in `dateFormat`, with an optional ×, label, helper text, instruction and error. Tap it, or its calendar icon, to open the picker.

With `allowTyping`, the field inside the sheet takes the date and time as segments (day, month, year, hour, minute, AM/PM) in the locale's order. Each segment moves on when it's full, Backspace on an empty segment goes back, and leaving a segment pads it. Typing and the calendar edit the same draft. While the keyboard is up, the calendar folds away so the field and Confirm stay visible. On iOS a Done bar sits above the number pad. Errors (incomplete, invalid date, year outside `yearRange`) show once the user leaves the field. The date and the time each stay on one line; when the field is too narrow (large text, a small phone) the time moves to a second line. In 12-hour mode a typed time reads as AM until AM/PM is switched, as in the time row. A date typed with the time still empty takes the time the user already typed in the time row (or `newDayTime`, or the current time), like a tapped day. Fast input (a hardware keyboard, autofill) is handled character by character.

`allowTriggerTyping` makes the on-screen field typeable too (single mode). A complete, allowed value is saved once typing pauses: when focus leaves the field, or when its last box fills. `onChange` doesn't see values on the way (typing 09:30 never saves 09:03); correcting a box saves again when it's full or left.

## Time

Date-time pickers show a time row under the calendar:

- **Typed** (default): `[hh] : [mm] [AM | PM]`, or `[HH] : [mm]` in 24-hour. Two hour digits jump to the minutes. Empty minutes count as `00`. A time is saved when focus leaves a box, and Confirm also saves a time still being typed. The AM/PM side that can't hold an allowed time is disabled.
- **Wheel** (`timeInput="wheel"`): hour, minute (by `minuteStep`) and AM/PM columns on native scroll views, with momentum and snapping. Rows outside the day's limits are dimmed and can't be stopped on. Confirm waits until the wheel settles.

**Time checks happen on Confirm, not while typing.** Nothing is flagged as the user types, and Confirm stays enabled. Pressing it with an unfinished, impossible, off-step or out-of-limits time shows the error under the time row, calls `onError`, and saves nothing. Editing the time hides the error again until the next Confirm. With `commitMode="instant"` there's no Confirm, so errors show as they happen, and a time with a problem is never saved.

A newly picked day on an empty date-time starts at the current time, rounded up to the next minute step. `newDayTime` replaces that. An existing time is kept when another day is picked. Range mode has start and end rows. Multiple mode has one shared row, or (with `timeMode: 'perDate'`) a row for the day last tapped.

## Locale, RTL & Hijri

- **`locale`** (default: the device locale from `Intl.DateTimeFormat().resolvedOptions().locale`, else `'en-US'`) sets month and weekday names, the default `dateFormat` (from `Intl`: `MM/dd/yyyy` for `en-US`, `dd/MM/yyyy` for `en-GB`, `dd.MM.yyyy` for `de-DE`; a separator other than `/`, `-` or `.` becomes `/`; fallback `yyyy-MM-dd`) and the default `timeFormat` (the locale's hour cycle, else `'12h'`).
- **RTL**: layouts use start/end, so they flip with `I18nManager`. The chevrons point the right way, and swipe directions are mirrored. Typed dates and times keep their left-to-right digit order.
- **Hijri**: `calendarSystem="dual"` shows the Hijri day under each Gregorian day; `"hijri"` lays out Hijri (Umm al-Qura) months, years and day numbers. Values stay Gregorian either way. Hijri dates come from the platform's `Intl` (`islamic-umalqura`). Some JS engines and devices ship without that calendar, for example some Hermes / Android builds. The picker checks once, and if it isn't available it falls back to `'gregory'`. The default is always `'gregory'`, whatever the locale.

## Theming

`theme` overrides any token. A given `accent` also becomes `borderFocused`.

| Token | Default | Used for |
|---|---|---|
| `accent` | `#2563EB` | Selection, links, focused borders, Confirm |
| `onAccent` | `#FFFFFF` | Text on the accent |
| `text` | `#111827` | Values and day numbers |
| `heading` | `#111827` | Year title, time label and boxes |
| `mutedText` | `#6B7280` | Weekdays, helper text, chevrons, × |
| `placeholder` | `#9CA3AF` | Placeholders |
| `border` | `#D1D5DB` | Field border |
| `inputBorder` | `#D1D5DB` | Time box border |
| `separator` | `#E5E7EB` | Line above the time row |
| `toggleTrack` | `#F3F4F6` | Behind AM / PM |
| `borderFocused` | `#2563EB` | Focused field / box |
| `error` | `#DC2626` | Errors, mandatory mark |
| `background` | `#FFFFFF` | Field, sheet |
| `surface` | `#F9FAFB` | Done bar |
| `disabledBackground` | `#F3F4F6` | Disabled field |
| `disabledText` | `#9CA3AF` | Disabled text, greyed days |
| `rangeFill` | `#DBEAFE` | Range band |
| `holiday` | `#DC2626` | Holiday days |
| `fontFamily` | `undefined` | One family for all text, at weight 400 / 500 / 600 as each part needs. Setting it replaces the default Inter files |
| `fontRegular`, `fontMedium`, `fontSemiBold` | `'Inter-Regular'`, `'Inter-Medium'`, `'Inter-SemiBold'` | A family per weight, for fonts shipped as one file per weight; each one set wins over `fontFamily`. `SYSTEM_FONTS` clears all four for the system font |
| `fontSizeSmall` | `12` | Weekday names, helper / error text, AM / PM in the field (the Hijri day under a dual cell is 75% of it) |
| `fontSizeMedium` | `14` | Field text and label, day numbers, month chips, cells, Today, AM / PM toggle |
| `fontSizeLarge` | `16` | Sheet title, Confirm, year title, time boxes, wheel, Done |
| `radius` | `8` | Field and button corners (the sheet uses `radius * 2`) |
| `fieldHeight` | `44` | Field minimum height |
| `touchTarget` | `44` | Minimum button size |

`DEFAULT_TOKENS` is exported.

### Fonts

The default font is **Inter**, looked up under the names of its static files: `Inter-Regular` (400), `Inter-Medium` (500) and `Inter-SemiBold` (600). The package doesn't ship or load font files, so your app loads them:

```tsx
// Expo
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

const [loaded] = useFonts({
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
});
```

In a bare app, add `Inter-Regular.ttf`, `Inter-Medium.ttf` and `Inter-SemiBold.ttf` to your fonts folder (`react-native.config.js` → `assets`) and run `npx react-native-asset`.

If the app doesn't load Inter, iOS and Android quietly fall back to the system font, but every text is drawn at the regular weight. To use the system font with its weights instead, pass `SYSTEM_FONTS`:

```tsx
import { SYSTEM_FONTS } from 'rn-calendar-time-picker';
<DateTimePicker theme={{ ...SYSTEM_FONTS }} … />
```

Every text in the picker takes its family and size from these tokens, so one `theme` sets the font for all of it:

```tsx
// One font file with several weights (or the system font name):
<DateTimePicker theme={{ fontFamily: 'Inter', fontSizeMedium: 15 }} … />

// One file per weight, as loaded with expo-font or react-native assets:
<DateTimePicker
  theme={{
    fontRegular: 'Inter-Regular',
    fontMedium: 'Inter-Medium',
    fontSemiBold: 'Inter-SemiBold',
  }}
  …
/>
```

To change a single part, pass a text style through `styles` (for example `styles={{ dayText: { fontSize: 13 } }}`).

`styles` takes a style for any of these keys:

- **Containers**: `container`, `sheet`, `sheetBackdrop`, `header`, `title`, `resetButton`, `resetText`, `body`, `footer`, `confirmButton`, `confirmText`.
- **Field**: `field`, `fieldFocused`, `fieldError`, `fieldDisabled`, `fieldText`, `fieldPlaceholder`, `fieldSegment`, `fieldSegmentFocused`, `fieldSeparator`, `fieldPeriod`, `fieldPeriodSelected`, `fieldPeriodText`, `fieldIcon`, `clearIcon`, `label`, `mandatoryMark`, `helperText`, `instructionText`, `errorText`, `validationText`.
- **Calendar header**: `calendarHeader`, `navArrow`, `navArrowDisabled`, `yearButton`, `yearButtonText`, `monthChipRow`, `monthChip`, `monthChipText`, `monthChipSelected`, `monthChipDisabled`.
- **Weekdays and days**: `weekdayRow`, `weekdayText`, `day`, `dayText`, `dayPressed`, `today`, `todayText`, `selected`, `selectedText`, `rangeStart`, `rangeMiddle`, `rangeEnd`, `rangeFill`, `outside`, `outsideText`, `disabled`, `disabledText`, `holiday`, `holidayText`, `daySubLabel` (the Hijri day in a dual cell).
- **Grids**: `yearGrid`, `yearCell`, `yearCellSelected`, `yearCellDisabled`, `yearCellText`, `monthGrid`, `monthCell`, `monthCellSelected`, `monthCellDisabled`, `monthCellText`.
- **Time**: `timeRow`, `timeLabel`, `timeBox`, `timeBoxFocused`, `timeBoxError`, `timeBoxText`, `timeColon`, `ampmToggle`, `ampmOption`, `ampmOptionSelected`, `ampmOptionDisabled`, `ampmOptionText`, `wheel`, `wheelRow`, `wheelRowSelected`, `wheelRowDisabled`, `wheelText`, `wheelHighlight`.
- **Other**: `todayButton`, `todayButtonText`, `emptyState`, `emptyStateText`, `holidayNotice`, `dstNotice`, `keyboardDoneBar`, `keyboardDoneText`.

## Icons

The built-in icons are drawn with plain Views, so there's nothing native to install. Each icon gets `{ color, size, width, height }`, where `size` is the smaller of `width` and `height`. By default:

| Icon | Where | Colour | Size |
|---|---|---|---|
| `calendar` | Field | `accent`, or `disabledText` when the field is disabled | 18 |
| `clear` | Field (with `allowClear`) | `mutedText` | 12 |
| `chevronLeft`, `chevronRight` | Calendar header | `mutedText` | 24 |
| `chevronDown` | Next to the year title | `accent` | 24 |

Change the colour or size with `iconProps`, or swap the icon with `icons`. The two work together:

```tsx
// Your app's own SVG, e.g. with react-native-svg-transformer:
import CalendarSvg from './assets/icons/calendar.svg';

<DateTimePicker
  iconProps={{
    calendar: { color: '#2563EB', disabledColor: '#9CA3AF', size: 20 },
    clear: { color: '#2563EB', width: 12, height: 12 },
  }}
  icons={{
    // An SVG component that takes width / height; pass the colour on as it expects.
    calendar: ({ color, width, height }) => (
      <CalendarSvg width={width} height={height} stroke={color} />
    ),
    chevronDown: null, // hide the caret next to the year
  }}
  …
/>
```

The built-in `CalendarIcon`, `ClearIcon`, `ChevronLeftIcon`, `ChevronRightIcon` and `ChevronDownIcon` are exported, so you can use them elsewhere in your app.

**The clear (×) icon** shows only when `allowClear` is set, the field has a value, and the field is neither disabled nor read-only. `icons={{ clear: null }}` hides it even with `allowClear`. Pressing it calls `onChange('')` right away, with no Confirm, so there's no separate clear handler to pass: your `onChange` receives `''`.

## Your own validation

Every built-in message can be reworded through `strings` (`errorNotAllowed`, `errorTimeNotAllowed`, `errorIncomplete`, `errorMinuteStep(step)`, `errorRangeTooLong(n)` and the rest). For rules only your app knows, pass `validate`. It runs when Confirm is pressed, after the built-in checks pass, with the value about to be saved:

```tsx
<DateTimePicker
  type="datetime"
  value={value}
  onChange={setValue}
  validate={(v) => {
    const at = DateTime.fromISO(v as string);
    if (at < DateTime.now().plus({ minutes: 5 })) return 'Pick a time at least 5 minutes from now';
    if (at > DateTime.now().plus({ days: 31 })) return 'Pick a time within the next 31 days';
    return null;
  }}
  styles={{ validationText: { textAlign: 'center' } }}
/>
```

A message keeps the sheet open, saves nothing, calls `onError('VALIDATION', value)`, and shows above the footer (`testID` `${testID}-validation-error`). It is styled by `errorText`, then `validationText`, and disappears as soon as the selection changes. With `commitMode="instant"`, `validate` runs before each save. To stop days or times from being picked at all, use the limit props (`minDate`, `timeBounds`, `disabledDates` …); `validate` is for rules you'd rather explain than grey out.

## Your own input

`renderField` swaps the on-screen field for your own input, with your own icons. Tapping it opens the picker's sheet (or the sheet you give `renderSheet`):

```tsx
<DateTimePicker
  type="date"
  value={value}
  onChange={setValue}
  dateFormat="dd/mm/yyyy"
  renderField={(state) => (
    <MyInput
      label="Due date"
      value={state.displayText} // '21/10/2026', or '' when empty
      placeholder="DD/MM/YYYY"
      disabled={state.disabled}
      onPress={state.open}
      rightIcon={<MyCalendarIcon />}
      onClear={state.displayText ? state.clear : undefined}
    />
  )}
/>
```

`state.clear` is the same as the built-in ×: it calls your `onChange('')`. Calling `setValue('')` yourself does the same thing.

You can also hide the field and open the picker from anywhere, with `showField={false}`, `visible` and `onClose`:

```tsx
<MyInput onPress={() => setOpen(true)} value={value} />
<DateTimePicker showField={false} visible={open} onClose={() => setOpen(false)} value={value} onChange={setValue} type="date" />
```

## Strings / i18n

Every visible and spoken text is in `strings`, and the defaults are English (`DEFAULT_STRINGS`). Pass any subset; a few entries are functions:

```ts
errorYearOutOfRange: ({ first, last }) => string;
errorMinuteStep: (step) => string;
errorRangeTooShort: (days) => string;
errorRangeTooLong: (days) => string;
```

With i18next:

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker, {
  type DateTimePickerProps,
  type PickerStrings,
} from 'rn-calendar-time-picker';

function LocalizedPicker(props: Omit<DateTimePickerProps, 'strings' | 'locale'>) {
  const { t, i18n } = useTranslation();
  const strings = useMemo<Partial<PickerStrings>>(
    () => ({
      titleDate: t('picker.titleDate'),
      confirm: t('picker.confirm'),
      today: t('picker.today'),
      errorNotAllowed: t('picker.errors.notAllowed'),
      errorMinuteStep: (step) => t('picker.errors.minuteStep', { step }),
      errorYearOutOfRange: ({ first, last }) => t('picker.errors.yearRange', { first, last }),
      a11yOpen: t('picker.a11y.open'),
    }),
    [t]
  );
  return <DateTimePicker {...props} strings={strings} locale={i18n.language} />;
}
```

Memoise `strings` (and `theme`) so they aren't rebuilt on every render.

## Accessibility

- Every control has a role, a label and state. Day cells are read as full dates with "today", "selected", "unavailable", "holiday", "start of range" and "end of range". Month changes are announced.
- Day cells reach a 48 pt touch target. Text grows with the system font size up to 1.4×, then stops so fixed-size parts don't clip.
- Reduce motion is respected: scrolls and snaps jump instead of animating.
- Errors are live regions. The wheel supports increment / decrement actions.

## Testing

Every part gets a testID built from the `testID` prop (`dp` here):

| testID | Part |
|---|---|
| `dp-trigger-field` | The on-screen field (press to open) |
| `dp-trigger-clear`, `dp-trigger-icon`, `dp-trigger-label`, `dp-trigger-error`, `dp-trigger-instruction` | Its ×, calendar icon, label, error and instruction |
| `dp-trigger-segment-{day,month,year,hour,minute,period}` | Its typed segments (`allowTriggerTyping`) |
| `dp-sheet`, `dp-sheet-backdrop` | The sheet panel and its backdrop (the `testID` passed to `renderSheet`) |
| `dp-inline` | The inline container |
| `dp-scroll` | The sheet's scrolling body |
| `dp-reset`, `dp-confirm` | Reset and Confirm |
| `dp-value`, `dp-value-field`, `dp-value-segment-…`, `dp-value-clear`, `dp-value-error` | The field inside the sheet |
| `dp-from`, `dp-to`, `dp-from-wrap`, `dp-to-wrap`, `dp-from-segment-…`, `dp-range-error` | From / To range fields |
| `dp-calendar`, `dp-grid` | The calendar and its day grid |
| `dp-prev`, `dp-next`, `dp-prev-left` / `-right`, `dp-next-left` / `-right`, `dp-title` | Header arrows (the suffix tells which way the chevron points) and the year title |
| `dp-chip-{1–12}` | Month chips |
| `dp-day-{y}-{m}-{d}` | Day cells, e.g. `dp-day-2026-10-24` (no zero padding) |
| `dp-year-{y}`, `dp-month-{m}` | Year and month grid cells |
| `dp-today`, `dp-empty` | The Today button and the empty state |
| `dp-time`, `dp-time-from`, `dp-time-to` | Time rows (one row, or start / end) |
| `dp-time-hour`, `dp-time-minute`, `dp-time-am`, `dp-time-pm` | Typed time boxes and AM / PM |
| `dp-time-wheel`, `dp-time-wheel-{hour,minute,period}`, `…-scroll` | Wheel columns and their scroll views |

For Jest, no transform changes are needed: `main` points to the CommonJS build. To pin the clock and zone in tests, pass `now` and `timeZone`.

## Platform support and known limits

- **iOS and Android** are the supported targets. The package is pure JS, so it runs in Expo Go.
- **Web** is untested.
- The keyboard **Done bar** is iOS-only. It uses `InputAccessoryView`, which React Native 0.88 marks as deprecated.
- **Hijri** needs `Intl` support for `islamic-umalqura` and falls back to Gregorian without it (see above).
- The built-in sheet doesn't add a safe-area inset; use `styles.sheet.paddingBottom` or `renderSheet`.
- A `minuteStep` outside 1–60, an unknown `timeZone`, or a custom `valueFormat.parse` that throws falls back (step 1, the device zone, an empty value) with a warning in development. Errors thrown by your own callbacks (`disabledDates`, `enabledDates`, `timeBounds`, `getConstraints`) are not caught.
- Only one runtime dependency: `luxon`. Exported types don't reference Luxon, so you don't need `@types/luxon`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup, scripts and the example app, and the [code of conduct](CODE_OF_CONDUCT.md).

## License

MIT © 2026 Bhairavi M. See [LICENSE](LICENSE).
