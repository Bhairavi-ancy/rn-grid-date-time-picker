import { DateTime } from 'luxon';
import type { DateTimeValue } from './types';

/**
 * The Luxon DateTime for a date-time value in `zone` (seconds and ms zeroed).
 * A time that happens twice resolves to its first occurrence: Luxon alone picks
 * by the zone's offset today, so the result would change with the season.
 */
export const toZonedDateTime = (
  value: DateTimeValue,
  zone: string
): DateTime => {
  const dt = DateTime.fromObject(
    {
      ...value.date,
      hour: value.time?.hour ?? 0,
      minute: value.time?.minute ?? 0,
      second: 0,
      millisecond: 0,
    },
    { zone }
  );
  if (!dt.isValid) return dt;
  return dt
    .getPossibleOffsets()
    .reduce((first, d) => (d.toMillis() < first.toMillis() ? d : first), dt);
};

export type DstStatus = 'ok' | 'gap' | 'overlap';

/**
 * Whether a wall-clock time exists once in `zone` on that day.
 * - 'gap': the time is skipped (clocks go forward); saving moves it forward, like Luxon.
 * - 'overlap': the time happens twice (clocks go back); saving uses the first occurrence.
 * The sheet shows a notice for both.
 */
export const dstStatus = (value: DateTimeValue, zone: string): DstStatus => {
  if (!value.time) return 'ok';
  const zoned = toZonedDateTime(value, zone);
  if (!zoned.isValid) return 'ok';
  if (zoned.hour !== value.time.hour || zoned.minute !== value.time.minute)
    return 'gap';
  return zoned.getPossibleOffsets().length > 1 ? 'overlap' : 'ok';
};
