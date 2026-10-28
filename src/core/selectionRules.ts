import { compareCalendarDates, daysBetween } from './calendarDate';
import type { Constraints, DayStatus } from './constraints';
import type { CalendarDate } from './types';

/**
 * Greying that depends on what is already picked, on top of the picker's limits:
 * - range: once a start is picked and the end is being chosen, days closer than
 *   `minDays` or further than `maxDays` are greyed (lengths count calendar
 *   days with both ends included, so a same-day range is 1 day); in the From/To layout, days
 *   before the start are greyed too once the To field is tapped (otherwise a tap
 *   there moves the start);
 * - multiple: once `maxSelections` is reached, only selected days can be tapped.
 * Validation on Confirm (validateDraft) still checks the same rules.
 */
export interface SelectionRules {
  /** The start, while the end is being chosen. */
  rangeStart?: CalendarDate | null;
  minDays?: number;
  maxDays?: number;
  /** From/To layout, the To field tapped: days before the start can't be the end. */
  blockBeforeStart?: boolean;
  /** Multiple mode with the cap reached. */
  maxReached?: boolean;
  isSelected?: (day: CalendarDate) => boolean;
}

export const isRangeEndAllowed = (
  start: CalendarDate,
  day: CalendarDate,
  rules: Pick<SelectionRules, 'minDays' | 'maxDays' | 'blockBeforeStart'>
): boolean => {
  const span = daysBetween(start, day);
  if (span < 0) return !rules.blockBeforeStart;
  const length = span + 1;
  if (rules.minDays !== undefined && length < rules.minDays) return false;
  if (rules.maxDays !== undefined && length > rules.maxDays) return false;
  return true;
};

export const withSelectionRules = (
  base: Constraints,
  rules: SelectionRules
): Constraints => {
  const start = rules.rangeStart;
  const rangeActive =
    !!start &&
    (rules.minDays !== undefined ||
      rules.maxDays !== undefined ||
      !!rules.blockBeforeStart);
  if (!rangeActive && !rules.maxReached) return base;

  const dayStatus = (day: CalendarDate): DayStatus => {
    const status = base.dayStatus(day);
    let blocked = false;
    if (rangeActive && start && compareCalendarDates(day, start) !== 0) {
      blocked = !isRangeEndAllowed(start, day, rules);
    }
    if (rules.maxReached && !rules.isSelected?.(day)) {
      return {
        ...status,
        disabled: true,
        reasons: [...status.reasons, 'MAX_SELECTIONS'],
      };
    }
    if (!blocked) return status;
    return {
      ...status,
      disabled: true,
      reasons: [...status.reasons, 'RANGE_LENGTH'],
    };
  };
  return { ...base, dayStatus };
};
