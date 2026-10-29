[← README](../README.md) · [All docs](README.md)

# Sheet, field and time

## Sheet or inline

`presentation="sheet"` (the default) opens a built-in bottom sheet: an RN `Modal` with a backdrop, up to 90% of the screen (see [Sheet layout](presentation.md#sheet-layout)). The body scrolls between the title and Confirm when it doesn't fit, and the sheet waits for the keyboard to close before opening. `presentation="inline"` renders the same content in place, for example inside your own sheet or a filter panel.

The built-in sheet doesn't add a safe-area inset. Add one with `styles.sheet`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
<DateTimePicker styles={{ sheet: { paddingBottom: 8 + insets.bottom } }} /* … */ />;
```

Or bring your own sheet with `renderSheet`. It is called only while the picker is open and rendered in place (no portal), so it works inside other sheets:

```tsx
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { SheetRenderProps } from 'rn-grid-date-time-picker';

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

## Sheet layout

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
| `keyboardMaxHeight` | `maxHeight` | The most the sheet grows to while the keyboard is up. A percentage is of the room above the keyboard, so the default `'90%'` leaves some backdrop above the sheet. |
| `fixedHeader` | `true` | The header stays put while the body scrolls. `false` scrolls it with the body. |
| `fixedFooter` | `true` | Confirm stays pinned below the body. `false` scrolls it at the end of the body. `renderSheet` then gets `footer: null`. |
| `showField` | `true` | The field above the calendar, which shows the picked date and takes typing with `allowTyping`. When it's hidden, its errors still show above the calendar. Applies inline too. |
| `fieldPlaceholder` | from `dateFormat` | Placeholder of that field when it shows text. |
| `fieldIcon` | `false` | The calendar icon at the end of that field, as on the on-screen field. |

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

With `allowTyping`, the field inside the sheet takes the date and time as segments (day, month, year, hour, minute, AM/PM) in the locale's order. Each segment moves on when it's full, Backspace on an empty segment goes back, and leaving a segment pads it. Typing and the calendar edit the same draft. With `hideCalendarOnKeyboard`, the calendar folds away while the keyboard is up so the field and Confirm stay visible. On iOS every box's number pad has a Done button that closes the keyboard; its label comes from `strings.done` on React Native 0.79 and later (earlier versions show iOS's own "Done"). Errors (incomplete, invalid date, year outside `yearRange`) show once the user leaves the field. The date and the time each stay on one line; when the field is too narrow (large text, a small phone) the time moves to a second line. In 12-hour mode a typed time reads as AM until AM/PM is switched, as in the time row. A date typed with the time still empty takes the time the user already typed in the time row (or `newDayTime`, or the current time), like a tapped day. Fast input (a hardware keyboard, autofill) is handled character by character.

`allowFieldTyping` makes the on-screen field typeable too (single mode). A complete, allowed value is saved once typing pauses: when focus leaves the field, or when its last box fills. `onChange` doesn't see values on the way (typing 09:30 never saves 09:03); correcting a box saves again when it's full or left.

## Time

Date-time pickers show a time row under the calendar:

- **Typed** (default): `[hh] : [mm] [AM | PM]`, or `[HH] : [mm]` in 24-hour. Two hour digits jump to the minutes. Empty minutes count as `00`. A time is saved when focus leaves a box, and Confirm also saves a time still being typed. The AM/PM side that can't hold an allowed time is disabled.
- **Wheel** (`timeInput="wheel"`): hour, minute (by `minuteStep`) and AM/PM columns on native scroll views, with momentum and snapping. Rows outside the day's limits are dimmed and can't be stopped on. Confirm waits until the wheel settles.

**Time checks happen on Confirm, not while typing.** Nothing is flagged as the user types, and Confirm stays enabled. Pressing it with an unfinished, impossible, off-step or out-of-limits time shows the error under the time row, calls `onError`, and saves nothing. Editing the time hides the error again until the next Confirm. With `commitMode="instant"` there's no Confirm, so errors show as they happen, and a time with a problem is never saved.

A newly picked day on an empty date-time starts at the current time, rounded up to the next minute step. `newDayTime` replaces that. An existing time is kept when another day is picked. Range mode has start and end rows; an end picked on the start's day starts an hour after the start, so the range is in order from the first tap. While the end is before the start, `strings.errorRangeOrder` shows, and it goes as soon as either time is fixed. Multiple mode has one shared row, or (with `timeMode: 'perDate'`) a row for the day last tapped.

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
