import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearDraft,
  createDraft,
  draftToWire,
  selectDay,
  setRangeEnd,
  setSlotValue,
  setTime,
  validateDraft,
  type Draft,
  type DraftIssue,
  type DraftOptions,
  type DraftTarget,
} from '../../core/draft';
import type {
  CalendarDate,
  DateTimeValue,
  PickerValue,
  SelectionMode,
  Time,
} from '../../core/types';

export interface PickerDraftApi {
  draft: Draft;
  issue: DraftIssue | null;
  selectDay: (day: CalendarDate, newDayTime?: Time | null) => void;
  /** From/To layout: put the day on the end being edited. */
  setRangeEnd: (
    day: CalendarDate,
    end: 'from' | 'to',
    newDayTime?: Time | null
  ) => void;
  setTime: (time: Time, target: DraftTarget) => void;
  setValue: (value: DateTimeValue | null, target: DraftTarget) => void;
  clear: () => void;
  /** The draft in the saved format (what onChange will receive). */
  toWire: () => PickerValue;
}

/**
 * The value being edited while the picker is open. It is rebuilt from `value`
 * every time the picker opens (so closing never keeps a cancelled pick), and is
 * only turned into saved strings by `toWire` on Confirm.
 */
export const usePickerDraft = (
  mode: SelectionMode,
  value: PickerValue,
  isOpen: boolean,
  options: DraftOptions
): PickerDraftApi => {
  const opts = useMemo(
    () => options,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are compared field by field; screens often pass new objects
    [
      options.type,
      options.zone,
      options.adapter,
      options.defaultTime?.hour,
      options.defaultTime?.minute,
      options.multiple?.timeMode,
      options.multiple?.maxSelections,
      options.range?.allowSameDay,
      options.range?.reselect,
      options.range?.minDays,
      options.range?.maxDays,
    ]
  );
  const [draft, setDraft] = useState<Draft>(() =>
    createDraft(mode, value, opts)
  );

  // Rebuild on every open, and whenever the saved value changes from outside
  // (e.g. a screen's Reset while an inline picker is showing).
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    const changed = isOpen !== wasOpen.current;
    wasOpen.current = isOpen;
    if (changed) setDraft(createDraft(mode, value, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the open state flips
  }, [isOpen]);

  // Compared by content: screens often pass a new {from, to} or array object on every render.
  const valueKey = JSON.stringify(value ?? '');
  const seenValue = useRef({ mode, valueKey, opts });
  useEffect(() => {
    const seen = seenValue.current;
    if (seen.mode === mode && seen.valueKey === valueKey && seen.opts === opts)
      return;
    seenValue.current = { mode, valueKey, opts };
    setDraft(createDraft(mode, value, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the value is compared by content (`valueKey`)
  }, [valueKey, mode, opts]);

  return {
    draft,
    issue: validateDraft(draft, opts),
    selectDay: useCallback(
      (day, newDayTime) => setDraft((d) => selectDay(d, day, opts, newDayTime)),
      [opts]
    ),
    setRangeEnd: useCallback(
      (day, end, newDayTime) =>
        setDraft((d) => setRangeEnd(d, day, end, opts, newDayTime)),
      [opts]
    ),
    setTime: useCallback(
      (time, target) => setDraft((d) => setTime(d, time, target)),
      []
    ),
    setValue: useCallback(
      (v, target) => setDraft((d) => setSlotValue(d, v, target)),
      []
    ),
    clear: useCallback(() => setDraft((d) => clearDraft(d)), []),
    toWire: useCallback(() => draftToWire(draft, opts), [draft, opts]),
  };
};
