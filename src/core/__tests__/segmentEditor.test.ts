import { describe, expect, it } from '@jest/globals';
import {
  createSegmentEditor,
  segmentEditorReducer,
  type SegmentEditorAction,
  type SegmentEditorOptions,
  type SegmentEditorState,
} from '../segmentEditor';

const dtIN: SegmentEditorOptions = {
  dateFormat: 'dd-MM-yyyy',
  type: 'datetime',
  timeFormat: '12h',
  yearRange: { first: 1900, last: 2200 },
};
const dateUS: SegmentEditorOptions = {
  dateFormat: 'MM-dd-yyyy',
  type: 'date',
  timeFormat: '12h',
};

const run = (
  state: SegmentEditorState,
  actions: SegmentEditorAction[],
  opts: SegmentEditorOptions
) => actions.reduce((s, a) => segmentEditorReducer(s, a, opts), state);

const digits = (text: string): SegmentEditorAction[] =>
  text.split('').map((digit) => {
    return { type: 'digit', digit };
  });

describe('segmentEditor: typing a full date-time (en-IN order)', () => {
  it('fills day → month → year → hour → minute, then AM/PM by tap', () => {
    let s = createSegmentEditor(null, dtIN);
    s = run(
      s,
      [{ type: 'focus', key: 'day' }, ...digits('211020260345')],
      dtIN
    );
    expect(s.values).toMatchObject({
      day: '21',
      month: '10',
      year: '2026',
      hour: '03',
      minute: '45',
    });
    expect(s.focused).toBeNull(); // stops before AM/PM
    // No AM/PM chosen yet reads as AM, as in the time row.
    expect(s.parsed.errors).toEqual([]);
    expect(s.parsed.value?.time).toEqual({ hour: 3, minute: 45 });
    s = segmentEditorReducer(s, { type: 'period', period: 'PM' }, dtIN);
    expect(s.parsed.value).toEqual({
      date: { year: 2026, month: 10, day: 21 },
      time: { hour: 15, minute: 45 },
    });
  });

  it('moves on early and pads when a digit cannot start a two-digit value', () => {
    const s = run(
      createSegmentEditor(null, dtIN),
      [{ type: 'focus', key: 'day' }, ...digits('5'), ...digits('4')],
      dtIN
    );
    expect(s.values).toMatchObject({ day: '05', month: '04' });
    expect(s.focused).toBe('year');
  });
});

describe('segmentEditor: locale order (en-US)', () => {
  it('types month first', () => {
    const s = run(
      createSegmentEditor(null, dateUS),
      [{ type: 'focus', key: 'month' }, ...digits('10212026')],
      dateUS
    );
    expect(s.parsed.value).toEqual({
      date: { year: 2026, month: 10, day: 21 },
      time: null,
    });
  });
});

describe('segmentEditor: backspace, blur, reset', () => {
  it('deletes in the segment, then moves back when it is empty', () => {
    let s = run(
      createSegmentEditor(null, dtIN),
      [{ type: 'focus', key: 'day' }, ...digits('2110')],
      dtIN
    );
    expect(s.focused).toBe('year');
    s = segmentEditorReducer(s, { type: 'backspace' }, dtIN);
    expect(s.focused).toBe('month');
    expect(s.values.month).toBe('1');
    s = segmentEditorReducer(s, { type: 'backspace' }, dtIN);
    expect(s.values.month).toBe('');
  });

  it('pads the segment when leaving it', () => {
    let s = run(
      createSegmentEditor(null, dtIN),
      [{ type: 'focus', key: 'day' }, ...digits('3')],
      dtIN
    );
    expect(s.values.day).toBe('3');
    s = segmentEditorReducer(s, { type: 'blur' }, dtIN);
    expect(s.values.day).toBe('03');
    expect(s.focused).toBeNull();
  });

  it('starts from an existing value and can be reset', () => {
    const value = {
      date: { year: 2026, month: 3, day: 5 },
      time: { hour: 0, minute: 7 },
    };
    let s = createSegmentEditor(value, dtIN);
    expect(s.values).toEqual({
      day: '05',
      month: '03',
      year: '2026',
      hour: '12',
      minute: '07',
      period: 'AM',
    });
    expect(s.parsed.value).toEqual(value);
    s = segmentEditorReducer(s, { type: 'reset', value: null }, dtIN);
    expect(s.parsed).toEqual({ value: null, errors: [], isEmpty: true });
  });

  it('reports invalid input instead of a value', () => {
    const s = run(
      createSegmentEditor(null, dateUS),
      [{ type: 'focus', key: 'month' }, ...digits('02312026')],
      dateUS
    );
    expect(s.parsed.value).toBeNull();
    expect(s.parsed.errors).toEqual([{ key: 'date', code: 'INVALID_DATE' }]);
  });

  it('ignores digits when nothing is focused', () => {
    const s = createSegmentEditor(null, dtIN);
    expect(segmentEditorReducer(s, { type: 'digit', digit: '1' }, dtIN)).toBe(
      s
    );
  });
});
