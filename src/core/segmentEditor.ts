import {
  formatSegments,
  inputDigit,
  padSegment,
  parseSegments,
  segmentLayout,
  type ParsedSegments,
  type Period,
  type SegmentKey,
  type SegmentLayout,
  type SegmentValues,
} from './segments';
import type { DateTimeValue, PickerType, TimeFormat } from './types';

/**
 * What each key press does in the typed field. Pure: the field component
 * only forwards events and renders `state`.
 * - a digit fills the focused segment and moves on when it's full (or can't grow);
 * - Backspace on an empty segment moves back and deletes there;
 * - AM/PM is set by tapping (number pads have no letters);
 * - leaving a segment pads a one-digit entry ("7" → "07").
 */

export interface SegmentEditorOptions {
  /** Date format, e.g. 'dd/MM/yyyy'. */
  dateFormat: string;
  type: PickerType;
  timeFormat: TimeFormat;
  yearRange?: { first: number; last: number };
}

export interface SegmentEditorState {
  layout: SegmentLayout;
  values: SegmentValues;
  focused: SegmentKey | null;
  parsed: ParsedSegments;
}

export type SegmentEditorAction =
  | { type: 'focus'; key: SegmentKey }
  | { type: 'digit'; digit: string }
  | { type: 'backspace' }
  | { type: 'period'; period: Period }
  | { type: 'blur' }
  | { type: 'reset'; value: DateTimeValue | null };

const withParsed = (
  state: Omit<SegmentEditorState, 'parsed'>,
  opts: SegmentEditorOptions
): SegmentEditorState => {
  return {
    ...state,
    parsed: parseSegments(state.values, {
      type: opts.type,
      timeFormat: opts.timeFormat,
      yearRange: opts.yearRange,
    }),
  };
};

export const createSegmentEditor = (
  value: DateTimeValue | null,
  opts: SegmentEditorOptions
): SegmentEditorState =>
  withParsed(
    {
      layout: segmentLayout(opts.dateFormat, opts.type, opts.timeFormat),
      values: formatSegments(value, opts.type, opts.timeFormat),
      focused: null,
    },
    opts
  );

const keys = (state: SegmentEditorState): SegmentKey[] =>
  state.layout.segments.map((s) => s.key);

const specOf = (state: SegmentEditorState, key: SegmentKey) =>
  state.layout.segments.find((s) => s.key === key);

const nextKey = (
  state: SegmentEditorState,
  key: SegmentKey,
  step: 1 | -1
): SegmentKey | null => {
  const list = keys(state);
  return list[list.indexOf(key) + step] ?? null;
};

/** Pads the segment being left, then focuses `to`. */
/** Characters that end a segment when typed or pasted between numbers. */
const SEPARATOR = /^[/\-.:\s]$/;

const moveFocus = (
  state: SegmentEditorState,
  to: SegmentKey | null
): Omit<SegmentEditorState, 'parsed'> => {
  const from = state.focused;
  const spec = from ? specOf(state, from) : undefined;
  const values =
    from && spec
      ? { ...state.values, [from]: padSegment(state.values[from] ?? '', spec) }
      : state.values;
  return { layout: state.layout, values, focused: to };
};

const sameValues = (a: SegmentValues, b: SegmentValues): boolean => {
  const keysOf = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keysOf].every((k) => a[k as SegmentKey] === b[k as SegmentKey]);
};

/** Moving focus re-reads the segments only when leaving one changed it. */
const withFocus = (
  state: SegmentEditorState,
  to: SegmentKey | null,
  opts: SegmentEditorOptions
): SegmentEditorState => {
  const moved = moveFocus(state, to);
  return sameValues(moved.values, state.values)
    ? { ...moved, parsed: state.parsed }
    : withParsed(moved, opts);
};

export const segmentEditorReducer = (
  state: SegmentEditorState,
  action: SegmentEditorAction,
  opts: SegmentEditorOptions
): SegmentEditorState => {
  switch (action.type) {
    case 'focus':
      // A late focus event for the box already being typed in changes nothing
      // (padding it would turn a typed '1' into '01').
      if (state.focused === action.key) return state;
      return withFocus(state, action.key, opts);

    case 'blur':
      return withFocus(state, null, opts);

    case 'digit': {
      const key = state.focused;
      const spec = key ? specOf(state, key) : undefined;
      if (!key || !spec || spec.key === 'period') return state;
      // A separator typed or pasted after some digits ('1/12/2025') ends the
      // segment, as moving on would: 1 becomes 01 and the next segment starts.
      if (SEPARATOR.test(action.digit)) {
        if (!state.values[key]) return state;
        const following = nextKey(state, key, 1);
        return withParsed(
          moveFocus(state, following === 'period' ? null : following),
          opts
        );
      }
      const { next, advance } = inputDigit(
        state.values[key] ?? '',
        action.digit,
        spec
      );
      const typed = { ...state, values: { ...state.values, [key]: next } };
      if (!advance) return withParsed(typed, opts);
      const following = nextKey(state, key, 1);
      // The period segment isn't typed into, so focus stops before it.
      const target = following === 'period' ? null : following;
      return withParsed(moveFocus(typed, target), opts);
    }

    case 'backspace': {
      const key = state.focused;
      if (!key) return state;
      const current = state.values[key] ?? '';
      if (current) {
        return withParsed(
          {
            ...state,
            values: { ...state.values, [key]: current.slice(0, -1) },
          },
          opts
        );
      }
      const previous = nextKey(state, key, -1);
      if (!previous) return state;
      const prevText = state.values[previous] ?? '';
      return withParsed(
        {
          layout: state.layout,
          values: { ...state.values, [previous]: prevText.slice(0, -1) },
          focused: previous,
        },
        opts
      );
    }

    case 'period':
      return withParsed(
        { ...state, values: { ...state.values, period: action.period } },
        opts
      );

    case 'reset':
      return createSegmentEditor(action.value, opts);

    default:
      return state;
  }
};
