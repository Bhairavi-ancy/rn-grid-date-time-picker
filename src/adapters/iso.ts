import {
  fromDateKey,
  isValidCalendarDate,
  toDateKey,
} from '../core/calendarDate';
import type { ValueAdapter } from '../core/types';
import { formatInstant, parseInstant } from './utcMidnight';

/**
 * `valueFormat: 'iso'` (the default):
 * - date:      'YYYY-MM-DD'; anything else is invalid;
 * - date-time: the same as 'utc-midnight', a UTC ISO instant with seconds and
 *   milliseconds zeroed, read and written in `timeZone`.
 *
 * There is no `formatUnchanged`: an untouched Confirm emits the stored string as it came in.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const isoAdapter: ValueAdapter = {
  parse: (raw, { type, timeZone }) => {
    if (type === 'datetime') return parseInstant(raw, timeZone);
    if (!raw || !DATE_ONLY.test(raw)) return null;
    const date = fromDateKey(raw);
    return date && isValidCalendarDate(date) ? { date, time: null } : null;
  },
  format: (value, { type, timeZone }) => {
    if (type === 'datetime') return formatInstant(value, timeZone);
    return value && isValidCalendarDate(value.date)
      ? toDateKey(value.date)
      : '';
  },
};
