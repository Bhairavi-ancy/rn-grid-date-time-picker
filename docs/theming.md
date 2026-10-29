[← README](../README.md) · [All docs](README.md)

# Theming, fonts and icons

`theme` overrides any token. A given `accent` also becomes `borderFocused`.

<p align="center">
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/theme-blue-sharp.png" width="200" alt="Blue accent, radius 4" />
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/theme-teal.png" width="200" alt="Teal accent, radius 8" />
  <img src="https://raw.githubusercontent.com/Bhairavi-ancy/rn-grid-date-time-picker/main/docs/theme-coral-round.png" width="200" alt="Coral accent, radius 16" />
</p>

```tsx
<DateTimePicker
  type="date"
  value={value}
  onChange={setValue}
  theme={{ accent: '#0F766E', rangeFill: '#CCFBF1', radius: 8 }} // the teal one
/>
```

| Token | Default | Used for |
|---|---|---|
| `accent` | `#2563EB` | Selection, links, focused borders, Confirm |
| `onAccent` | `#FFFFFF` | Text on the accent |
| `text` | `#111827` | Values and day numbers |
| `heading` | `#111827` | Year title, time label and boxes |
| `mutedText` | `#6B7280` | Weekdays, helper text, chevrons, × |
| `outsideText` | `mutedText` | Days of the months before and after (still pickable); darker than `disabledText` |
| `placeholder` | `#9CA3AF` | Placeholders |
| `border` | `#D1D5DB` | Field border |
| `inputBorder` | `#D1D5DB` | Time box border |
| `separator` | `#E5E7EB` | Line above the time row |
| `toggleTrack` | `#F3F4F6` | Behind AM / PM |
| `borderFocused` | `#2563EB` | Focused field / box |
| `error` | `#DC2626` | Errors, mandatory mark |
| `background` | `#FFFFFF` | Field, sheet |
| `surface` | `#F9FAFB` | Wheel highlight |
| `disabledBackground` | `#F3F4F6` | Disabled field |
| `disabledText` | `#9CA3AF` | Disabled text, greyed days |
| `rangeFill` | `#DBEAFE` | Range band |
| `holiday` | `#DC2626` | Holiday days |
| `fontFamily` | `undefined` (system font) | One family for all text, at weight 400 / 500 / 600 as each part needs |
| `fontRegular`, `fontMedium`, `fontSemiBold` | `undefined` | A family per weight, for fonts shipped as one file per weight; each one set wins over `fontFamily`. `INTER_FONTS` sets all four to Inter, `SYSTEM_FONTS` clears them |
| `fontSizeSmall` | `12` | Weekday names, helper / error text, AM / PM in the field |
| `fontSizeMedium` | `14` | Field text and label, day numbers, month chips, cells, Today, time boxes, AM / PM toggle |
| `fontSizeLarge` | `16` | Sheet title, Confirm, year title, time label, wheel |
| `radius` | `8` | Field and button corners (the sheet uses `radius * 2`) |
| `fieldHeight` | `44` | Field minimum height |
| `touchTarget` | `44` | Minimum button size |

`DEFAULT_TOKENS` is exported.

## Fonts

The picker uses the system font by default (San Francisco on iOS, Roboto on Android) at weights 400 / 500 / 600, so there's nothing to load.

The picker was designed with **Inter**. To use it, load its static files under these names and pass `INTER_FONTS`. The package doesn't ship or load font files:

```tsx
// Expo
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { INTER_FONTS } from 'rn-grid-date-time-picker';

const [loaded] = useFonts({
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
});

<DateTimePicker theme={{ ...INTER_FONTS }} … />
```

In a bare app, add `Inter-Regular.ttf`, `Inter-Medium.ttf` and `Inter-SemiBold.ttf` to your fonts folder (`react-native.config.js` → `assets`) and run `npx react-native-asset`. If a family isn't loaded, iOS and Android fall back to the system font, but every text is drawn at the regular weight.

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

## Style keys

`styles` takes a style for any of these keys:

- **Containers**: `container`, `sheet`, `sheetBackdrop`, `header`, `title`, `resetButton`, `resetText`, `body`, `footer`, `confirmButton`, `confirmText`.
- **Field**: `field`, `fieldFocused`, `fieldError`, `fieldDisabled`, `fieldText`, `fieldTextDisabled` (the value while disabled; the placeholder keeps its colour), `fieldPlaceholder`, `fieldSegment`, `fieldSegmentFocused`, `fieldSeparator`, `fieldPeriod`, `fieldPeriodSelected`, `fieldPeriodText`, `fieldIcon`, `clearIcon`, `label`, `mandatoryMark`, `helperText`, `instructionText`, `errorText`, `validationText`.
- **Calendar switch and dual tabs**: `calendarSwitch`, `calendarSwitchSegment`, `calendarSwitchSegmentSelected`, `calendarSwitchText`, `calendarSwitchTextSelected`, `dualTabs`, `dualTab`, `dualTabSelected`, `dualTabText`, `dualTabTextSelected`.
- **Calendar header**: `calendarHeader`, `navArrow`, `navArrowDisabled`, `yearButton`, `yearButtonText`, `monthChipRow`, `monthChip`, `monthChipText`, `monthChipSelected`, `monthChipDisabled`.
- **Weekdays and days**: `weekdayRow`, `weekdayText`, `day`, `dayText`, `dayPressed`, `today`, `todayText`, `selected`, `selectedText`, `rangeStart`, `rangeMiddle`, `rangeEnd`, `rangeFill`, `outside`, `outsideText`, `disabled`, `disabledText`, `holiday`, `holidayText`, `daySubLabel` (no longer drawn; kept so existing styles compile).
- **Grids**: `yearGrid`, `yearCell`, `yearCellSelected`, `yearCellDisabled`, `yearCellText`, `yearCellCurrent`, `monthGrid`, `monthCell`, `monthCellSelected`, `monthCellDisabled`, `monthCellText`, `monthCellCurrent` (the outlined current year / month in a `precision` pick).
- **Time**: `timeRow`, `timeLabel`, `timeBox`, `timeBoxFocused`, `timeBoxError`, `timeBoxText`, `timeColon`, `ampmToggle`, `ampmOption`, `ampmOptionSelected`, `ampmOptionDisabled`, `ampmOptionText`, `wheel`, `wheelRow`, `wheelRowSelected`, `wheelRowDisabled` (the row), `wheelText`, `wheelTextSelected`, `wheelTextDisabled` (its text), `wheelHighlight`.
- **Other**: `todayButton`, `todayButtonText`, `emptyState`, `emptyStateText`.

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
