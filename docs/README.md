[← README](../README.md) · [All docs](README.md)

# Documentation

| Page | What's in it |
|---|---|
| [Props](props.md) | Every prop, grouped: what it picks, presentation, field, slots, calendar, time, limits, look and events |
| [Values](values.md) | Value shapes per mode, `valueFormat`, your own `ValueAdapter`, empty values, time zones |
| [Limits and validation](limits.md) | Greying days and times, `createConstraints`, `getConstraints`, `validate` |
| [Sheet, field and time](presentation.md) | The bottom sheet and its layout, inline use, your own sheet, typing, the time row, your own input |
| [Locale, RTL and Hijri](localization.md) | Locale defaults, RTL, digits, the Hijri and dual calendars, the calendar switch, strings and i18n |
| [Theming, fonts and icons](theming.md) | Theme tokens, fonts, every `styles` key, icons |
| [Accessibility and testing](testing.md) | Screen readers, touch targets, reduce motion, every testID, Jest |

## Platform support and known limits

- **iOS and Android** are the supported targets. The package is pure JS, so it runs in Expo Go.
- **Web** is untested.
- The keyboard's **Done button** is iOS-only: React Native adds it above each box's number pad (`returnKeyType="done"`). Android's number pad has its own.
- **Hijri** needs `Intl` support for `islamic-umalqura` and falls back to Gregorian without it (see [Hijri](localization.md#hijri)).
- The built-in sheet doesn't add a safe-area inset; use `styles.sheet.paddingBottom` or `renderSheet`.
- A `minuteStep` that doesn't divide 60, an unknown `timeZone`, or a custom `valueFormat.parse` that throws falls back (step 1, the device zone, an empty value) with a warning in development. Errors thrown by your own callbacks (`disabledDates`, `enabledDates`, `timeBounds`, `getConstraints`) are not caught.
- Only one runtime dependency: `luxon`. Exported types don't reference Luxon, so you don't need `@types/luxon`.
