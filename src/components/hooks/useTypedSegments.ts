import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  createSegmentEditor,
  segmentEditorReducer,
  type SegmentEditorAction,
  type SegmentEditorOptions,
  type SegmentEditorState,
} from '../../core/segmentEditor';
import type { ParsedSegments } from '../../core/segments';
import type { DateTimeValue } from '../../core/types';

const valueKey = (v: DateTimeValue | null): string =>
  v
    ? `${v.date.year}-${v.date.month}-${v.date.day} ${v.time?.hour ?? ''}:${v.time?.minute ?? ''}`
    : '';

/**
 * State for the typed field. Re-syncs from `value` when it changes from outside
 * (a calendar tap, a clear) while no segment is focused, and reports every
 * parse result to `onParsed`, saying whether it came from such a value
 * (`fromOutside`) rather than from typing.
 */
export const useTypedSegments = (
  value: DateTimeValue | null,
  options: SegmentEditorOptions,
  onParsed?: (parsed: ParsedSegments, fromOutside: boolean) => void
): {
  state: SegmentEditorState;
  dispatch: (action: SegmentEditorAction) => void;
  /** The state after every action dispatched so far, even before React re-renders. */
  getState: () => SegmentEditorState;
} => {
  const opts = useMemo(
    () => options,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are compared field by field
    [
      options.dateFormat,
      options.type,
      options.timeFormat,
      options.yearRange?.first,
      options.yearRange?.last,
    ]
  );
  const reducer = useCallback(
    (s: SegmentEditorState, a: SegmentEditorAction) =>
      segmentEditorReducer(s, a, opts),
    [opts]
  );
  const [state, reactDispatch] = useReducer(reducer, value, (v) =>
    createSegmentEditor(v, opts)
  );
  // Fast typing (a hardware keyboard, autofill) sends the next character
  // before React re-renders, so inputs compare against this, not `state`.
  const latest = useRef(state);
  // Whether the last action was a value set from outside, not typing.
  const lastWasReset = useRef(false);
  const dispatch = useCallback(
    (action: SegmentEditorAction) => {
      latest.current = reducer(latest.current, action);
      lastWasReset.current = action.type === 'reset';
      reactDispatch(action);
    },
    [reducer]
  );
  const getState = useCallback(() => latest.current, []);

  // A value set from outside (a calendar tap, a clear, a filled-in time)
  // replaces what's shown, but never while a segment is focused: then it waits
  // until focus leaves the field. Values this field produced itself don't count.
  const lastValueKey = useRef(valueKey(value));
  const valueRef = useRef(value);
  valueRef.current = value;
  const resetOnLeave = useRef(false);
  useEffect(() => {
    const key = valueKey(value);
    if (key === lastValueKey.current) return;
    lastValueKey.current = key;
    if (latest.current.focused) resetOnLeave.current = true;
    else dispatch({ type: 'reset', value });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the value changes from outside
  }, [value]);
  useEffect(() => {
    if (state.focused || !resetOnLeave.current) return;
    resetOnLeave.current = false;
    dispatch({ type: 'reset', value: valueRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when focus leaves the field
  }, [state.focused]);

  const onParsedRef = useRef(onParsed);
  onParsedRef.current = onParsed;
  const lastParsed = useRef(state.parsed);
  useEffect(() => {
    if (state.parsed === lastParsed.current) return;
    lastParsed.current = state.parsed;
    if (state.parsed.value) {
      lastValueKey.current = valueKey(state.parsed.value);
      // What's typed is newer than anything that was waiting to be shown.
      resetOnLeave.current = false;
    }
    onParsedRef.current?.(state.parsed, lastWasReset.current);
  }, [state.parsed]);

  return { state, dispatch, getState };
};
