import { compareCalendarDates, isSameDay } from '../../core/calendarDate';
import type { CalendarDate } from '../../core/types';
import type { RangeRole } from './DayCell';

/** What the calendar highlights, taken from the draft. */
export type CalendarSelection =
  | { kind: 'single'; day: CalendarDate | null }
  | { kind: 'range'; from: CalendarDate | null; to: CalendarDate | null }
  | { kind: 'multiple'; days: CalendarDate[]; joinConsecutive?: boolean };

/** The first selected day: where the calendar opens. */
export const firstSelectedDay = (
  sel: CalendarSelection
): CalendarDate | null => {
  if (sel.kind === 'single') return sel.day;
  if (sel.kind === 'range') return sel.from ?? sel.to;
  return sel.days[0] ?? null;
};

/** Every selected day. */
export const selectedDays = (sel: CalendarSelection): CalendarDate[] => {
  if (sel.kind === 'single') return sel.day ? [sel.day] : [];
  if (sel.kind === 'range')
    return [sel.from, sel.to].filter((d): d is CalendarDate => !!d);
  return sel.days;
};

const isNextDay = (a: CalendarDate, b: CalendarDate): boolean => {
  const next = new Date(Date.UTC(a.year, a.month - 1, a.day + 1));
  return (
    next.getUTCFullYear() === b.year &&
    next.getUTCMonth() + 1 === b.month &&
    next.getUTCDate() === b.day
  );
};

/** Whether a day is selected, and its place in a range band. */
export const selectionOf = (
  sel: CalendarSelection,
  day: CalendarDate
): { selected: boolean; role: RangeRole } => {
  if (sel.kind === 'single')
    return { selected: isSameDay(sel.day, day), role: null };

  if (sel.kind === 'range') {
    const { from, to } = sel;
    if (from && to && isSameDay(from, to) && isSameDay(day, from))
      return { selected: true, role: 'single' };
    if (from && isSameDay(day, from))
      return { selected: true, role: to ? 'start' : 'single' };
    if (to && isSameDay(day, to)) return { selected: true, role: 'end' };
    if (
      from &&
      to &&
      compareCalendarDates(day, from) > 0 &&
      compareCalendarDates(day, to) < 0
    ) {
      return { selected: false, role: 'middle' };
    }
    return { selected: false, role: null };
  }

  const index = sel.days.findIndex((d) => isSameDay(d, day));
  if (index < 0) return { selected: false, role: null };
  if (!sel.joinConsecutive) return { selected: true, role: null };
  // Neighbouring selected days are drawn as one band.
  const prev = sel.days[index - 1];
  const next = sel.days[index + 1];
  const joinsPrev = !!prev && isNextDay(prev, day);
  const joinsNext = !!next && isNextDay(day, next);
  if (joinsPrev && joinsNext) return { selected: true, role: 'middle' };
  if (joinsNext) return { selected: true, role: 'start' };
  if (joinsPrev) return { selected: true, role: 'end' };
  return { selected: true, role: null };
};
