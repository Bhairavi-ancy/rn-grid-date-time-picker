[← README](../README.md) · [All docs](README.md)

# Values

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
import type { ValueAdapter } from 'rn-grid-date-time-picker';

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

**Time zones.** Date-time values are read and written in `timeZone` (an IANA name; default: the device zone). "Today" uses the same zone. Dates have no zone. A wall time skipped by a daylight-saving change moves forward, and a repeated one uses its first occurrence.
