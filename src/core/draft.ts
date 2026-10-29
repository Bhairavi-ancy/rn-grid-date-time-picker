import { compareCalendarDates, daysBetween, isSameDay } from './calendarDate';
import type {
  AdapterContext,
  CalendarDate,
  DateTimeValue,
  PickerType,
  PickerValue,
  RangeValue,
  SelectionMode,
  Time,
  ValueAdapter,
} from './types';
import { toZonedDateTime } from './zoned';

/**
 * The in-progress value while the sheet is open. It is rebuilt from the saved
 * value on every open, and turned back into saved strings only on Confirm.
 *
 * Each slot remembers the saved string it opened with, so confirming without a
 * change emits the adapter's `formatUnchanged` of it (by default, the string
 * itself) rather than a re-formatted copy.
 */

/**
 * Fallback time for a newly picked day on a date-time field when the caller gives
 * none (12:00 AM). The picker passes the current time instead, so this only
 * applies to direct callers.
 */
export const DEFAULT_TIME: Time = { hour: 0, minute: 0 };

export interface DraftSlot {
  value: DateTimeValue | null;
  /** The saved string this slot opened with ('' when it was empty). */
  initialWire: string;
}

export type Draft =
  | { mode: 'single'; slot: DraftSlot }
  | { mode: 'range'; from: DraftSlot; to: DraftSlot }
  | {
      mode: 'multiple';
      slots: DraftSlot[];
      /**
       * Shared time mode: the time every date gets. Null while the saved dates
       * have different times, which each date then keeps until one is set.
       */
      sharedTime: Time | null;
    };

export interface DraftOptions {
  type: PickerType;
  /** IANA zone date-time values are read and written in. */
  zone: string;
  /** Turns saved strings into values and back. */
  adapter: ValueAdapter;
  defaultTime?: Time;
  multiple?: {
    timeMode?: 'shared' | 'perDate';
    maxSelections?: number;
  };
  range?: {
    /** Date fields only: allow start and end on the same day. Default false (filters reject it). */
    allowSameDay?: boolean;
    /** A tap after the range is complete: start a new range (default) or move the nearest end. */
    reselect?: 'newRange' | 'moveNearestEnd';
    /** Fewest / most days from start to end (end − start). */
    minDays?: number;
    maxDays?: number;
  };
}

/**
 * Which part of the draft an edit goes to. Multiple dates are targeted by
 * their day, not their position, since the list re-sorts as days are added.
 */
export type DraftTarget =
  'single' | 'from' | 'to' | 'shared' | { day: CalendarDate };

export type DraftIssue =
  'INCOMPLETE' | 'RANGE_ORDER' | 'RANGE_LENGTH' | 'MAX_SELECTIONS';

const contextOf = (opts: DraftOptions): AdapterContext => {
  return { type: opts.type, timeZone: opts.zone };
};

const parseWire = (wire: string, opts: DraftOptions): DateTimeValue | null =>
  wire ? opts.adapter.parse(wire, contextOf(opts)) : null;

const slotFrom = (wire: string, opts: DraftOptions): DraftSlot => {
  return {
    value: parseWire(wire, opts),
    initialWire: parseWire(wire, opts) ? wire : '',
  };
};

const emptySlot = (): DraftSlot => {
  return { value: null, initialWire: '' };
};

const splitMultiple = (value: PickerValue): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value) return [value];
  return [];
};

const readRange = (value: PickerValue): RangeValue => {
  if (Array.isArray(value)) return { from: value[0] ?? '', to: value[1] ?? '' };
  if (value && typeof value === 'object')
    return { from: value.from ?? '', to: value.to ?? '' };
  return { from: typeof value === 'string' ? value : '', to: '' };
};

const sortSlots = (slots: DraftSlot[]): DraftSlot[] =>
  [...slots].sort((a, b) =>
    a.value && b.value ? compareCalendarDates(a.value.date, b.value.date) : 0
  );

/** Builds a fresh draft from the saved value. */
export const createDraft = (
  mode: SelectionMode,
  value: PickerValue | null | undefined,
  opts: DraftOptions
): Draft => {
  const safe: PickerValue = value ?? '';
  if (mode === 'range') {
    const { from, to } = readRange(safe);
    return { mode, from: slotFrom(from, opts), to: slotFrom(to, opts) };
  }
  if (mode === 'multiple') {
    // One slot per day: a later value on a day already listed is dropped.
    const slots = sortSlots(
      splitMultiple(safe)
        .map((w) => slotFrom(w, opts))
        .filter(
          (s, i, all) =>
            s.value &&
            all.findIndex((o) => isSameDay(o.value?.date, s.value?.date)) === i
        )
    );
    const times = slots.map((s) => s.value?.time ?? null);
    const first = times[0] ?? null;
    const sameTime = times.every(
      (t) => t?.hour === first?.hour && t?.minute === first?.minute
    );
    const sharedTime = opts.type === 'datetime' && sameTime ? first : null;
    return { mode, slots, sharedTime };
  }
  return {
    mode: 'single',
    slot: slotFrom(typeof safe === 'string' ? safe : '', opts),
  };
};

const timeForNewDay = (
  existing: Time | null | undefined,
  opts: DraftOptions,
  newDayTime?: Time | null
): Time | null => {
  if (opts.type !== 'datetime') return null;
  return existing ?? newDayTime ?? opts.defaultTime ?? DEFAULT_TIME;
};

const withDay = (
  slot: DraftSlot,
  day: CalendarDate,
  opts: DraftOptions,
  newDayTime?: Time | null
): DraftSlot => {
  return {
    ...slot,
    value: {
      date: day,
      time: timeForNewDay(slot.value?.time, opts, newDayTime),
    },
  };
};

/**
 * Whether a range may start and end on one day: date-time ranges and
 * `allowSameDay` date ranges, as long as minDays allows a 1-day range.
 */
export const sameDayRangeOk = (opts: DraftOptions): boolean =>
  (opts.type === 'datetime' || !!opts.range?.allowSameDay) &&
  (opts.range?.minDays ?? 1) <= 1;

const pickRangeDay = (
  draft: Extract<Draft, { mode: 'range' }>,
  day: CalendarDate,
  opts: DraftOptions,
  eq?: Time | null
): Draft => {
  const from = draft.from.value?.date;
  const to = draft.to.value?.date;

  if (!from) return { ...draft, from: withDay(draft.from, day, opts, eq) };

  if (!to) {
    const order = compareCalendarDates(day, from);
    if (order < 0)
      return { ...draft, from: withDay(draft.from, day, opts, eq) };
    // The start tapped again, where it can't also be the end: deselects it.
    if (order === 0 && !sameDayRangeOk(opts))
      return { ...draft, from: { ...draft.from, value: null } };
    return { ...draft, to: withDay(draft.to, day, opts, eq) };
  }

  if (opts.range?.reselect === 'moveNearestEnd') {
    return Math.abs(daysBetween(from, day)) < Math.abs(daysBetween(to, day))
      ? { ...draft, from: withDay(draft.from, day, opts, eq) }
      : { ...draft, to: withDay(draft.to, day, opts, eq) };
  }
  return {
    ...draft,
    from: withDay(draft.from, day, opts, eq),
    to: { ...draft.to, value: null },
  };
};

/**
 * A day was tapped (or typed).
 * - single: sets the day and keeps the time (or the given time for a new day, e.g. the
 *   caller's fixed time or the current time; DEFAULT_TIME if none);
 * - range: first tap = start, second = end, later taps follow `range.reselect`;
 * - multiple: toggles the day; adding past `maxSelections` is ignored.
 */
export const selectDay = (
  draft: Draft,
  day: CalendarDate,
  opts: DraftOptions,
  newDayTime?: Time | null
): Draft => {
  if (draft.mode === 'single')
    return { ...draft, slot: withDay(draft.slot, day, opts, newDayTime) };
  if (draft.mode === 'range') return pickRangeDay(draft, day, opts, newDayTime);

  const existing = draft.slots.findIndex((s) => isSameDay(s.value?.date, day));
  if (existing > -1)
    return { ...draft, slots: draft.slots.filter((_, i) => i !== existing) };
  const max = opts.multiple?.maxSelections;
  if (max !== undefined && draft.slots.length >= max) return draft;
  const perDate = opts.multiple?.timeMode === 'perDate';
  const time = timeForNewDay(
    perDate ? null : draft.sharedTime,
    opts,
    newDayTime
  );
  return {
    ...draft,
    slots: sortSlots([
      ...draft.slots,
      { value: { date: day, time }, initialWire: '' },
    ]),
    // The first date's time becomes the shared one; dates with their own
    // (different) times keep them.
    sharedTime:
      opts.type === 'datetime' && !perDate && draft.slots.length === 0
        ? (draft.sharedTime ?? time)
        : draft.sharedTime,
  };
};

/**
 * From/To layout: a tap fills the end being edited. An end that would come
 * before the start (or after the end) clears the other one. The start tapped
 * again as the end, where a range can't be one day, deselects the start, as
 * in the single field.
 */
export const setRangeEnd = (
  draft: Draft,
  day: CalendarDate,
  end: 'from' | 'to',
  opts: DraftOptions,
  newDayTime?: Time | null
): Draft => {
  if (draft.mode !== 'range') return draft;
  const sameDayOk = sameDayRangeOk(opts);
  const fits = (from?: CalendarDate, to?: CalendarDate) => {
    if (!from || !to) return true;
    const order = compareCalendarDates(to, from);
    return order > 0 || (order === 0 && sameDayOk);
  };
  if (end === 'to' && !sameDayOk && isSameDay(draft.from.value?.date, day))
    return { ...draft, from: { ...draft.from, value: null } };
  if (end === 'from') {
    const from = withDay(draft.from, day, opts, newDayTime);
    const keepTo = fits(day, draft.to.value?.date);
    return {
      ...draft,
      from,
      to: keepTo ? draft.to : { ...draft.to, value: null },
    };
  }
  const to = withDay(draft.to, day, opts, newDayTime);
  const keepFrom = fits(draft.from.value?.date, day);
  return {
    ...draft,
    to,
    from: keepFrom ? draft.from : { ...draft.from, value: null },
  };
};

const setSlotTime = (slot: DraftSlot, time: Time): DraftSlot =>
  slot.value ? { ...slot, value: { ...slot.value, time } } : slot;

/** A time was typed or picked for one slot (or for all dates when `shared`). */
export const setTime = (
  draft: Draft,
  time: Time,
  target: DraftTarget
): Draft => {
  if (draft.mode === 'single')
    return { ...draft, slot: setSlotTime(draft.slot, time) };
  if (draft.mode === 'range') {
    if (target === 'from')
      return { ...draft, from: setSlotTime(draft.from, time) };
    if (target === 'to') return { ...draft, to: setSlotTime(draft.to, time) };
    return draft;
  }
  if (target === 'shared') return { ...draft, sharedTime: time };
  if (typeof target === 'object') {
    return {
      ...draft,
      slots: draft.slots.map((s) =>
        isSameDay(s.value?.date, target.day) ? setSlotTime(s, time) : s
      ),
    };
  }
  return draft;
};

/** Replaces one slot's whole value, e.g. after the typed field is parsed. */
export const setSlotValue = (
  draft: Draft,
  value: DateTimeValue | null,
  target: DraftTarget
): Draft => {
  if (draft.mode === 'single')
    return { ...draft, slot: { ...draft.slot, value } };
  if (draft.mode === 'range') {
    if (target === 'from') return { ...draft, from: { ...draft.from, value } };
    if (target === 'to') return { ...draft, to: { ...draft.to, value } };
    return draft;
  }
  if (typeof target === 'object') {
    const slots = draft.slots
      .map((s) => (isSameDay(s.value?.date, target.day) ? { ...s, value } : s))
      .filter((s) => s.value);
    return { ...draft, slots: sortSlots(slots) };
  }
  return draft;
};

/** Empties the draft (the sheet's own clear; the field's × calls onChange('') directly). */
export const clearDraft = (draft: Draft): Draft => {
  if (draft.mode === 'single')
    return { ...draft, slot: { ...draft.slot, value: null } };
  if (draft.mode === 'range')
    return {
      ...draft,
      from: { ...draft.from, value: null },
      to: { ...draft.to, value: null },
    };
  return { ...draft, slots: [], sharedTime: null };
};

const effectiveValue = (
  slot: DraftSlot,
  draft: Draft,
  opts: DraftOptions
): DateTimeValue | null => {
  if (!slot.value) return null;
  if (
    draft.mode === 'multiple' &&
    opts.type === 'datetime' &&
    opts.multiple?.timeMode !== 'perDate'
  ) {
    return { ...slot.value, time: draft.sharedTime ?? slot.value.time };
  }
  return slot.value;
};

const isComplete = (value: DateTimeValue | null, type: PickerType): boolean =>
  !!value && (type === 'date' || !!value.time);

/** Why Confirm must stay disabled, or null when the draft can be saved. Limits (Constraints) are checked separately. */
export const validateDraft = (
  draft: Draft,
  opts: DraftOptions
): DraftIssue | null => {
  if (draft.mode === 'single')
    return isComplete(draft.slot.value, opts.type) ? null : 'INCOMPLETE';

  if (draft.mode === 'range') {
    const from = draft.from.value;
    const to = draft.to.value;
    if (
      !isComplete(from, opts.type) ||
      !isComplete(to, opts.type) ||
      !from ||
      !to
    )
      return 'INCOMPLETE';
    if (
      opts.type === 'datetime' &&
      toZonedDateTime(to, opts.zone) <= toZonedDateTime(from, opts.zone)
    )
      return 'RANGE_ORDER';
    if (opts.type !== 'datetime') {
      const order = compareCalendarDates(to.date, from.date);
      if (order < 0 || (order === 0 && !opts.range?.allowSameDay))
        return 'RANGE_ORDER';
    }
    // Calendar days with both ends included: a same-day range is 1 day.
    const length = daysBetween(from.date, to.date) + 1;
    const { minDays, maxDays } = opts.range ?? {};
    if (
      (minDays !== undefined && length < minDays) ||
      (maxDays !== undefined && length > maxDays)
    )
      return 'RANGE_LENGTH';
    return null;
  }

  if (draft.slots.length === 0) return 'INCOMPLETE';
  const max = opts.multiple?.maxSelections;
  if (max !== undefined && draft.slots.length > max) return 'MAX_SELECTIONS';
  return draft.slots.every((s) =>
    isComplete(effectiveValue(s, draft, opts), opts.type)
  )
    ? null
    : 'INCOMPLETE';
};

const sameValue = (
  a: DateTimeValue | null,
  b: DateTimeValue | null
): boolean => {
  if (!a || !b) return a === b;
  if (!isSameDay(a.date, b.date)) return false;
  if (!a.time || !b.time) return a.time === b.time;
  return a.time.hour === b.time.hour && a.time.minute === b.time.minute;
};

const slotToWire = (
  slot: DraftSlot,
  draft: Draft,
  opts: DraftOptions
): string => {
  const value = effectiveValue(slot, draft, opts);
  if (!value) return '';
  if (slot.initialWire && sameValue(value, parseWire(slot.initialWire, opts))) {
    return opts.adapter.formatUnchanged
      ? opts.adapter.formatUnchanged(slot.initialWire, contextOf(opts))
      : slot.initialWire;
  }
  return opts.adapter.format(value, contextOf(opts));
};

/**
 * The value to send in onChange on Confirm, in the adapter's format:
 * single → string; range → {from, to}; multiple → string[], sorted by date.
 */
export const draftToWire = (draft: Draft, opts: DraftOptions): PickerValue => {
  if (draft.mode === 'single') return slotToWire(draft.slot, draft, opts);
  if (draft.mode === 'range')
    return {
      from: slotToWire(draft.from, draft, opts),
      to: slotToWire(draft.to, draft, opts),
    };
  return draft.slots.map((s) => slotToWire(s, draft, opts)).filter(Boolean);
};

export const emptyDraft = (mode: SelectionMode): Draft => {
  if (mode === 'range') return { mode, from: emptySlot(), to: emptySlot() };
  if (mode === 'multiple') return { mode, slots: [], sharedTime: null };
  return { mode: 'single', slot: emptySlot() };
};
