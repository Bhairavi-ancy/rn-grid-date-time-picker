[← README](../README.md) · [All docs](README.md)

# Limits and validation

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

Greyed days are drawn in the `disabledText` colour (no strike-through), aren't pressable and are read out as "unavailable". A typed value on a greyed day keeps Confirm disabled and shows `strings.errorNotAllowed`. Greying only guides the user, so keep your own validation for what is saved.

`createConstraints` is the engine behind those props. Use it on its own, for example to check a value on the server side of a form:

```ts
import { createConstraints, toDateKey } from 'rn-grid-date-time-picker';

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

For full control, pass `getConstraints`. Its result is used as is, and the limit props arrive in `ctx.limits` so you can merge them: `ctx.limits.minDate` / `maxDate` already include `yearRange`.

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
      min: { date: ctx.today, time: ctx.nowTime },
      dependsOnNow: true,
      holidays: ctx.holidays,
      timeBounds: () => ({ min: { hour: 9, minute: 0 }, max: { hour: 17, minute: 30 } }),
    })
  }
/>
```

`ctx` also holds `today` and `nowTime` (the current day and time in `timeZone`) and `holidays` (the prop plus every year loaded so far).

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
