[← README](../README.md) · [All docs](README.md)

# Accessibility and testing

## Accessibility

- Every control has a role, a label and state. Day cells are read as full dates (in the Hijri calendar, as Hijri dates in `hijriLocale`) with "today", "holiday", "start of range" or "end of range"; selected and unavailable come from their state, so they aren't said twice. Typed segments include the field's label ("From, Day"). AM/PM in the time row and the calendar switch are radio buttons; the dual tabs are tabs. Month changes are announced.
- Day cells reach a 48 pt touch target. Text grows with the system font size up to 1.4×, then stops so fixed-size parts don't clip.
- Reduce motion is respected: scrolls and snaps jump instead of animating.
- Errors are announced: a live region on Android, an announcement on iOS. The wheel supports increment / decrement actions.

## Testing

Every part gets a testID built from the `testID` prop (`dp` here):

| testID | Part |
|---|---|
| `dp-trigger-field` | The on-screen field (press to open) |
| `dp-trigger-clear`, `dp-trigger-icon`, `dp-trigger-label`, `dp-trigger-error`, `dp-trigger-instruction` | Its ×, calendar icon, label, error and instruction |
| `dp-trigger-segment-{day,month,year,hour,minute,period}` | Its typed segments (`allowFieldTyping`) |
| `dp-sheet`, `dp-sheet-backdrop` | The sheet panel and its backdrop (the `testID` passed to `renderSheet`) |
| `dp-inline` | The inline container |
| `dp-scroll` | The sheet's scrolling body |
| `dp-reset`, `dp-confirm` | Reset and Confirm |
| `dp-value`, `dp-value-field`, `dp-value-segment-…`, `dp-value-clear`, `dp-value-error` | The field inside the sheet |
| `dp-from`, `dp-to`, `dp-from-wrap`, `dp-to-wrap`, `dp-from-segment-…`, `dp-range-error` | From / To range fields |
| `dp-calendar`, `dp-grid` | The calendar and its day grid |
| `dp-prev`, `dp-next`, `dp-prev-left` / `-right`, `dp-next-left` / `-right`, `dp-title` | Header arrows (the suffix tells which way the chevron points) and the year title |
| `dp-calendar-switch`, `dp-calendar-switch-{gregory,hijri,dual}` | The calendar switch and its segments |
| `dp-dual-tabs`, `dp-dual-tabs-{gregory,hijri}` | A dual calendar's tabs |
| `dp-chip-{1–12}` | Month chips |
| `dp-day-{y}-{m}-{d}` | Day cells, e.g. `dp-day-2026-10-24` (no zero padding) |
| `dp-year-{y}`, `dp-month-{m}` | Year and month grid cells |
| `dp-today`, `dp-empty` | The Today button and the empty state |
| `dp-time`, `dp-time-from`, `dp-time-to` | Time rows (one row, or start / end) |
| `dp-time-hour`, `dp-time-minute`, `dp-time-am`, `dp-time-pm` | Typed time boxes and AM / PM |
| `dp-time-wheel`, `dp-time-wheel-{hour,minute,period}`, `…-scroll` | Wheel columns and their scroll views |

For Jest, no transform changes are needed: `main` points to the CommonJS build. To pin the clock and zone in tests, pass `now` and `timeZone`.
