[← README](../README.md) · [All docs](README.md)

# Locale, RTL and Hijri

<img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/hijri-dual.png" width="240" alt="Gregorian and Hijri tabs, the Hijri month in Arabic" />

- **`locale`** (default: the device locale from `Intl.DateTimeFormat().resolvedOptions().locale`, else `'en-US'`) sets month and weekday names, the default `dateFormat` (from `Intl`: `MM/dd/yyyy` for `en-US`, `dd/MM/yyyy` for `en-GB`, `dd.MM.yyyy` for `de-DE`; a separator other than `/`, `-` or `.` becomes `/`; fallback `yyyy-MM-dd`) the default `timeFormat` (the locale's hour cycle, else `'12h'`) and the default `firstDayOfWeek` (the region's first day from CLDR week data: Sunday for `en-US`, Monday for `en-GB` and `de-DE`, Saturday for `ar-EG`; Sunday when the tag has no region).
- **RTL**: layouts use start/end, so they flip with `I18nManager`. The chevrons point the right way, and swipe directions are mirrored. Typed dates and times keep their left-to-right digit order.
- **Digits**: a Hijri calendar draws numbers in Arabic digits in any language: ١٤٤٨ in Arabic, English or French. A Gregorian calendar shows 0–9 in any language, so a dual calendar shows 27 in its Gregorian tab and ١٦ in its Hijri tab. The field and the time row use the digits of the calendar the date was picked in: a Gregorian pick reads 26/10/2026, a Hijri one ١٥ جمادى الأولى ١٤٤٨ هـ. `numerals` sets both calendars at once: `'latin'` for 0–9 everywhere, `'arabic'` for ١٢٣ everywhere, or `'locale'` for the language's own digits (`hijriLocale` for the Hijri calendar) as `Intl` writes them (`ar-SA` gives ١٢٣, `fa-IR` gives ۱۲۳, and a language that writes 0–9, such as `en-US` or `ar-AE`, keeps them). Values passed to `onChange` stay 0–9. Typed digits are read in any script, so ٢٥ typed on an Arabic number pad is 25 either way. Your own `renderDay`, `renderYearCell` and `renderMonthCell` get plain numbers, so they choose their digits.
- <a id="hijri"></a>**Hijri**: `calendarSystem="hijri"` lays out Hijri (Umm al-Qura) months, years and day numbers, written in Arabic whatever the app's `locale`: Arabic month and weekday names (جمادى الأولى, الأحد), Arabic digits, and the Hijri date in the field. `hijriLocale` changes that language. The switch, tab and button labels still come from `strings`. `"dual"` shows Gregorian and Hijri as two tabs, one calendar at a time; it opens on `dualDefaultTab` (Gregorian by default) and the user taps the other tab to switch. Values stay Gregorian either way.
  - **A date belongs to the calendar it was picked in.** It shows selected only there, and the field writes it in that calendar: "21/10/2026" when picked in Gregorian, "٩ جمادى الأولى ١٤٤٨ هـ" when picked in Hijri. A tap in the other calendar starts the selection over, so a range or a set of dates is always picked in one calendar. `onChange` gets the Gregorian value plus `{ calendarSystem: 'gregory' | 'hijri' }`. A value passed in from outside counts as picked in the calendar the picker opens on, so to show a stored value back the way it was picked, store `info.calendarSystem` with it and pass it as `dualDefaultTab` (dual) or `calendarSystem`. Typed segments stay Gregorian `dateFormat` in either calendar, and typing keeps the calendar a selection was picked in.
  - **The switch**: `calendarSwitch` adds a Gregorian / Hijri / Dual switch above the calendar (`true` for all three, or a list such as `['hijri', 'gregory']`). `calendarSystem` is the one it starts on, and `onCalendarSystemChange` reports each change. Labels come from `strings.calendarGregorian`, `calendarHijri` and `calendarDual` (screen readers name the group `a11yCalendarSystem`); the dual tabs use the first two. Each part has its own `styles` key, and `renderCalendarSwitch` replaces it. It isn't shown for month and year picks.

  ```tsx
  <DateTimePicker
    type="date"
    value={value}
    onChange={(v, info) => save(v, info?.calendarSystem)}
    locale="ar-SA"
    calendarSwitch
    dualDefaultTab="hijri"
    strings={{ calendarGregorian: 'ميلادي', calendarHijri: 'هجري', calendarDual: 'كلاهما' }}
    styles={{
      calendarSwitchSegmentSelected: { backgroundColor: '#8B6B2E' },
      dualTabSelected: { borderBottomColor: '#8B6B2E' },
    }}
  />
  ```

  Hijri dates come from the platform's `Intl` (`islamic-umalqura`). Some JS engines and devices ship without that calendar, for example some Hermes / Android builds. The picker checks once, and if it isn't available it falls back to `'gregory'`. The default is always `'gregory'`, whatever the locale.

## Strings / i18n

Every visible and spoken text is in `strings`, and the defaults are English (`DEFAULT_STRINGS`). Pass any subset. `rangeSeparator` (default `' – '`) joins the two ends of a range in the field text, e.g. `' ↔ '`. A few entries are functions:

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
} from 'rn-grid-date-time-picker';

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
