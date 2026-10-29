# rn-grid-date-time-picker

[![npm version](https://img.shields.io/npm/v/rn-grid-date-time-picker)](https://www.npmjs.com/package/rn-grid-date-time-picker)
![Platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Expo%20Go-blue)
[![types](https://img.shields.io/npm/types/rn-grid-date-time-picker)](https://www.npmjs.com/package/rn-grid-date-time-picker)
[![license](https://img.shields.io/npm/l/rn-grid-date-time-picker)](./LICENSE)

A themeable date and time picker for React Native: one date, several dates or a range, typed or tapped, with limits, holidays and the Hijri calendar. Pure JS, so there's nothing native to install. It runs on iOS and Android and works in Expo Go.

<!-- Absolute URLs so the screenshots also show on npmjs.com. -->
<p align="center">
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/single.png" width="240" alt="A date picked in the bottom sheet" />
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/range.png" width="240" alt="A From / To date range" />
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/datetime.png" width="240" alt="A date and a typed time" />
</p>

<!--
  Live demo: after publishing, create a Snack (see CONTRIBUTING.md) and uncomment.
  The query offers only Expo Go, iOS and Android (no web) and opens on Android.

**[Try it in Expo Snack →](https://snack.expo.dev/@your-account/rn-grid-date-time-picker?supportedPlatforms=mydevice,ios,android&platform=android)**
-->

## Why this picker

- **Every kind of pick**: one date, several dates, or a range in one field or as From / To, with or without a time. Month-and-year and year-only picks too.
- **Typed or tapped**: users type the date and time, or pick them on the calendar. Time is typed boxes or a scrolling wheel, 12- or 24-hour, in minute steps.
- **Only the days you allow**: block past dates, weekends, holidays loaded from your server, booked days, or hours outside opening times.
- **Saves only on Confirm**: by default `onChange` fires once, when the user confirms, and closing the sheet never touches your value. `commitMode="instant"` saves each edit instead.
- **Gregorian, Hijri or both**: a Hijri (Umm al-Qura) calendar written in Arabic, Gregorian and Hijri tabs, or a switch between them. Layouts mirror in RTL.
- **Your design**: colours, fonts, corners and every text, a style for every part, or your own field, sheet and day cells.
- **Accessible and light**: every control is labelled for screen readers, reduce motion is respected, and the only dependency is [Luxon](https://moment.github.io/luxon/).

## Hijri and Arabic

<img align="right" src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/hijri-dual.png" width="200" alt="Gregorian and Hijri tabs, the Hijri month in Arabic" />

`calendarSystem="hijri"` lays out Hijri months, days and years in Arabic, whatever your app's language. `"dual"` shows Gregorian and Hijri as two tabs, and `calendarSwitch` lets users switch for themselves. Values stay plain Gregorian strings, so your API doesn't change.

```tsx
<DateTimePicker
  type="date"
  value={value}
  onChange={setValue}
  calendarSystem="dual"
/>
```

More in [Locale, RTL and Hijri](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/localization.md).

<br clear="right" />

## Install

```sh
npm i rn-grid-date-time-picker
# or
yarn add rn-grid-date-time-picker
```

There are no native steps. `react` (18 or later) and `react-native` (0.71 or later) are peer dependencies.

## Quick start

```tsx
import { useState } from 'react';
import DateTimePicker, { type PickerValue } from 'rn-grid-date-time-picker';

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

Values are strings, so they go straight into a form, a store or an API. See [Values](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/values.md) for other formats.

## Common props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `type` | `'date' \| 'datetime'` | required | A date, or a date and time |
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | One date, several, or a range |
| `value` / `onChange` | `PickerValue` | required | The saved value; `onChange` fires on Confirm |
| `presentation` | `'sheet' \| 'inline'` | `'sheet'` | A bottom sheet, or in place on the page |
| `label`, `placeholder` | `string` | – | The field's label and placeholder |
| `allowTyping` | `boolean` | `false` | Type the date and time in the sheet |
| `allowClear` | `boolean` | `false` | An × that clears the value |
| `minDate`, `maxDate` | `{ year, month, day }` | – | The first and last days that can be picked |
| `disabledWeekdays` | `Weekday[]` | `[]` | Weekdays that can't be picked, e.g. `[6, 7]` |
| `holidays`, `loadHolidays` | `string[]`, `(year) => Promise<string[]>` | – | Holidays to mark, or to block with `disableHolidays` |
| `timeInput` | `'typed' \| 'wheel'` | `'typed'` | Typed time boxes or a scrolling wheel |
| `timeFormat` | `'12h' \| '24h'` | from `locale` | The clock |
| `minuteStep` | `number` | `1` | Minutes in steps, e.g. `15` |
| `locale` | BCP-47 tag | the device's | Month and weekday names, date order, first day of the week |
| `calendarSystem` | `'gregory' \| 'dual' \| 'hijri'` | `'gregory'` | The calendar |
| `theme` | `Partial<ThemeTokens>` | – | Colours, fonts, corners and sizes |
| `strings` | `Partial<PickerStrings>` | English | Every visible and spoken text |

Every other prop is in [Props](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/props.md).

## How do I…

- **Grey out past days, weekends or booked days?** [Limits and validation](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/limits.md)
- **Check a value with my own rule on Confirm?** [Your own validation](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/limits.md#your-own-validation)
- **Store epoch milliseconds or UTC midnight?** [Values](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/values.md)
- **Change the sheet, or show the picker inline?** [Sheet, field and time](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/presentation.md)
- **Use my own input or my own sheet?** [Your own input](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/presentation.md#your-own-input)
- **Pick only a month and year?** `precision="month"` in [Props](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/props.md#calendar)
- **Match my app's colours, fonts and icons?** [Theming, fonts and icons](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/theming.md)
- **Translate the texts?** [Strings and i18n](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/localization.md#strings--i18n)
- **Find the testIDs for my tests?** [Accessibility and testing](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/testing.md)

All pages: [docs](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/README.md).

## Platform support

- **iOS and Android**, in Expo Go and bare React Native apps. Web is untested.
- **Hijri** needs the platform's `Intl` support for the Islamic calendar. Some Hermes builds on Android lack it, and the picker then falls back to Gregorian.
- The built-in sheet doesn't add a safe-area inset. Add one with `styles.sheet`, as shown in [Sheet, field and time](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/presentation.md).

Other known limits are listed in the [docs](https://github.com/Bhairavi-ancy/rn-grid-date-time-picker/blob/main/docs/README.md#platform-support-and-known-limits).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup, scripts and the example app.

## License

MIT © 2026 Bhairavi M. See [LICENSE](LICENSE).
