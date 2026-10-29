import { describe, expect, it, jest } from '@jest/globals';
import { createElement } from 'react';
import { Text, TextInput, View, type ViewProps } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import type {
  DateTimePickerProps,
  InstructionRenderProps,
  LabelRenderProps,
  SheetRenderProps,
} from '../types';

// Stand-ins for an app's own sheet, label and instruction, passed through the
// render props: the sheet just renders its body and footer.
const renderSheet = (p: SheetRenderProps) => (
  <View testID={`${p.testID}-view`}>
    {p.body}
    {p.footer}
  </View>
);
const renderLabel = (p: LabelRenderProps) => (
  <View testID={p.testID}>
    <Text>{p.label}</Text>
    {p.isMandatory ? <Text>{' *'}</Text> : null}
    {p.helperText
      ? createElement(View, {
          testID: 'help-tooltip',
          helperText: p.helperText,
        } as ViewProps)
      : null}
  </View>
);
const renderInstruction = (p: InstructionRenderProps) => (
  <Text testID="info-field">{p.instruction}</Text>
);

// Wednesday 21 Oct 2026, 12:00 in India.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
const base: DateTimePickerProps = {
  type: 'date',
  value: '',
  onChange: () => {},
  timeZone: 'Asia/Kolkata',
  locale: 'en-IN',
  // The saved-string fixtures and the field text below use these.
  valueFormat: 'utc-midnight',
  dateFormat: 'dd-MM-yyyy',
  timeFormat: '12h',
  now,
  renderSheet,
  renderLabel,
  renderInstruction,
  testID: 'dp',
};

const mount = (props: Partial<DateTimePickerProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DateTimePicker {...base} {...props} />);
  });
  return tree;
};
const find = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && typeof n.type !== 'string'
  )[0];
const exists = (tree: ReactTestRenderer, id: string) => !!find(tree, id);
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id).props.onPress());
const open = (tree: ReactTestRenderer) => press(tree, 'dp-trigger-field');
const dayCell = (tree: ReactTestRenderer, d: number, m = 10) =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `dp-day-2026-${m}-${d}` &&
      n.props.accessibilityRole === 'button' &&
      typeof n.type !== 'string'
  )[0];
const tap = (tree: ReactTestRenderer, d: number, m = 10) =>
  act(() => dayCell(tree, d, m).props.onPress());
const box = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAllByType(TextInput).find((i) => i.props.testID === id);
const typeBox = (tree: ReactTestRenderer, id: string, text: string) => {
  const input = box(tree, id);
  if (!input) throw new Error(`no box ${id}`);
  act(() => input.props.onFocus());
  act(() => input.props.onChangeText(text));
};

describe('range: single field', () => {
  it('first tap = start, second = end; Confirm saves {from, to}', () => {
    const onChange = jest.fn();
    const tree = mount({ mode: 'range', onChange });
    open(tree);
    tap(tree, 20);
    expect(texts(tree)).toContain('20-10-2026 –');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    tap(tree, 25);
    expect(texts(tree)).toContain('20-10-2026 – 25-10-2026');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-20T00:00:00.000Z',
      to: '2026-10-25T00:00:00.000Z',
    });
  });

  it('a tap before the start moves the start; a later tap starts a new range', () => {
    const tree = mount({ mode: 'range' });
    open(tree);
    tap(tree, 20);
    tap(tree, 18);
    expect(texts(tree)).toContain('18-10-2026 –');
    tap(tree, 22);
    tap(tree, 5);
    expect(texts(tree)).toContain('05-10-2026 –');
  });

  it('greys ends too close or too far once the start is picked (calendar days, both ends included)', () => {
    const tree = mount({ mode: 'range', range: { minDays: 3, maxDays: 5 } });
    open(tree);
    tap(tree, 20);
    expect(dayCell(tree, 21).props.disabled).toBe(true); // 2 days
    expect(dayCell(tree, 22).props.disabled).toBe(false); // 3 days
    expect(dayCell(tree, 24).props.disabled).toBe(false); // 5 days
    expect(dayCell(tree, 25).props.disabled).toBe(true); // 6 days
  });

  it('with minDays above 1, tapping the start again never makes a same-day range', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      timeFormat: '24h',
      range: { minDays: 2 },
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorRangeTooShort(2));
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
  });

  it('shows the saved range on the screen field', () => {
    const tree = mount({
      mode: 'range',
      value: {
        from: '2026-10-20T00:00:00.000Z',
        to: '2026-10-25T00:00:00.000Z',
      },
    });
    expect(texts(tree)).toContain('20-10-2026 – 25-10-2026');
  });

  it('date-time: start and end time rows; an end before the start blocks Confirm', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      timeFormat: '24h',
      onChange,
    });
    open(tree);
    expect(exists(tree, 'dp-time-from')).toBe(true);
    expect(exists(tree, 'dp-time-to')).toBe(true);
    tap(tree, 20);
    tap(tree, 20);
    typeBox(tree, 'dp-time-from-hour', '10');
    typeBox(tree, 'dp-time-from-minute', '00');
    typeBox(tree, 'dp-time-to-hour', '09');
    typeBox(tree, 'dp-time-to-minute', '00');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorRangeOrder);
    typeBox(tree, 'dp-time-to-hour', '11');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-20T04:30:00.000Z',
      to: '2026-10-20T05:30:00.000Z',
    });
  });
});

describe('range: date-time on one day', () => {
  // 11:45 in India.
  const at1145 = () => new Date(Date.UTC(2026, 9, 21, 6, 15));

  it('the end starts an hour after the start, so the range is in order', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      now: at1145,
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(texts(tree)).toContain('20-10-2026 11:45 AM – 20-10-2026 12:45 PM');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorRangeOrder);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-20T06:15:00.000Z',
      to: '2026-10-20T07:15:00.000Z',
    });
  });

  it('an end before the start shows the error until the time is fixed, without leaving the box', () => {
    const tree = mount({ mode: 'range', type: 'datetime', now: at1145 });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    // 12 keeps the end's PM; AM makes it 00:45, before the start.
    press(tree, 'dp-time-to-am');
    expect(texts(tree)).toContain(
      'The end date must be greater than the start date'
    );
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    typeBox(tree, 'dp-time-to-hour', '12');
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorRangeOrder);
    press(tree, 'dp-time-to-pm');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorRangeOrder);
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
  });

  it('newDayTime: a same-day end still starts after the start', () => {
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      newDayTime: { hour: 9, minute: 0 },
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(texts(tree)).toContain('20-10-2026 09:00 AM – 20-10-2026 10:00 AM');
  });

  it('From / To: the end on the start day starts an hour later too', () => {
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      range: { layout: 'fromTo' },
      now: at1145,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(texts(tree)).toContain('20-10-2026 12:45 PM');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorRangeOrder);
  });
});

describe('range: From / To fields', () => {
  it('the start tapped again deselects it, and the next tap is the start', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(find(tree, 'dp-from').props.active).toBe(true);
    expect(texts(tree)).not.toContain('20-10-2026');
    tap(tree, 25);
    tap(tree, 27);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-25T00:00:00.000Z',
      to: '2026-10-27T00:00:00.000Z',
    });
  });

  it('date-time with minDays 3: the start tapped again never makes a same-day range', () => {
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      range: { layout: 'fromTo', minDays: 3 },
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 20);
    expect(find(tree, 'dp-from').props.active).toBe(true);
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorRangeTooShort(3));
  });

  it('taps fill the active field, then move to To; a tap before the start moves the start', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      onChange,
    });
    open(tree);
    expect(texts(tree)).toEqual(
      expect.arrayContaining([DEFAULT_STRINGS.from, DEFAULT_STRINGS.to])
    );
    tap(tree, 20);
    expect(find(tree, 'dp-to').props.active).toBe(true);
    expect(find(tree, 'dp-from').props.active).toBe(false);
    expect(dayCell(tree, 19).props.disabled).toBe(false);
    tap(tree, 18);
    expect(find(tree, 'dp-to').props.active).toBe(true);
    expect(texts(tree)).toContain('18-10-2026');
    tap(tree, 24);
    // Back to From: a start after the end clears the end.
    act(() => find(tree, 'dp-from-wrap').props.onTouchStart());
    tap(tree, 26);
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    act(() => find(tree, 'dp-to-wrap').props.onTouchStart());
    expect(dayCell(tree, 25).props.disabled).toBe(true);
    tap(tree, 28);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-26T00:00:00.000Z',
      to: '2026-10-28T00:00:00.000Z',
    });
  });

  it('a full range greys nothing; the next tap starts a new range', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 24);
    expect(dayCell(tree, 19).props.disabled).toBe(false);
    tap(tree, 12);
    expect(find(tree, 'dp-to').props.active).toBe(true);
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    tap(tree, 10);
    tap(tree, 15);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-10T00:00:00.000Z',
      to: '2026-10-15T00:00:00.000Z',
    });
  });

  it('a saved range: the first tap starts a new one', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      value: {
        from: '2026-10-20T00:00:00.000Z',
        to: '2026-10-24T00:00:00.000Z',
      },
      onChange,
    });
    open(tree);
    expect(dayCell(tree, 12).props.disabled).toBe(false);
    tap(tree, 22);
    tap(tree, 27);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-22T00:00:00.000Z',
      to: '2026-10-27T00:00:00.000Z',
    });
  });

  it('reselect moveNearestEnd: a tap on a full range moves the nearer end', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo', reselect: 'moveNearestEnd' },
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 24);
    tap(tree, 18);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-18T00:00:00.000Z',
      to: '2026-10-24T00:00:00.000Z',
    });
  });

  it('each field can be typed in', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      allowTyping: true,
      onChange,
    });
    open(tree);
    for (const [end, d] of [
      ['from', '20'],
      ['to', '22'],
    ]) {
      typeBox(tree, `dp-${end}-segment-day`, d);
      typeBox(tree, `dp-${end}-segment-month`, '10');
      typeBox(tree, `dp-${end}-segment-year`, '2026');
    }
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-10-20T00:00:00.000Z',
      to: '2026-10-22T00:00:00.000Z',
    });
  });

  it('date-time: one time row, for the field being edited', () => {
    const tree = mount({
      mode: 'range',
      type: 'datetime',
      range: { layout: 'fromTo' },
    });
    open(tree);
    expect(texts(tree)).toContain(DEFAULT_STRINGS.startTime);
    tap(tree, 20);
    expect(texts(tree)).toContain(DEFAULT_STRINGS.endTime);
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.startTime);
  });

  it('sheet.fieldPlaceholder shows in both empty fields', () => {
    const tree = mount({
      mode: 'range',
      range: { layout: 'fromTo' },
      sheet: { fieldPlaceholder: 'Pick a day' },
    });
    open(tree);
    for (const end of ['from', 'to']) {
      const shown = find(tree, `dp-${end}-field`)
        .findAllByType(Text)
        .map((t) => t.props.children);
      expect(shown).toContain('Pick a day');
    }
  });
});

describe('multiple', () => {
  it('taps toggle days; output is an array sorted by date', () => {
    const onChange = jest.fn();
    const tree = mount({ mode: 'multiple', onChange });
    open(tree);
    tap(tree, 25);
    tap(tree, 20);
    tap(tree, 22);
    tap(tree, 22);
    expect(texts(tree)).toContain('20-10-2026, 25-10-2026');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith([
      '2026-10-20T00:00:00.000Z',
      '2026-10-25T00:00:00.000Z',
    ]);
  });

  it('greys the other days once maxSelections is reached', () => {
    const tree = mount({ mode: 'multiple', multiple: { maxSelections: 2 } });
    open(tree);
    tap(tree, 20);
    tap(tree, 21);
    expect(dayCell(tree, 22).props.disabled).toBe(true);
    expect(dayCell(tree, 21).props.disabled).toBe(false);
    tap(tree, 21);
    expect(dayCell(tree, 22).props.disabled).toBe(false);
  });

  it('shared time: dates saved with different times keep them when nothing changes', () => {
    const value = ['2026-10-24T03:30:00.000Z', '2026-10-25T09:30:00.000Z'];
    const onChange = jest.fn();
    const tree = mount({
      mode: 'multiple',
      type: 'datetime',
      valueFormat: 'iso',
      value,
      onChange,
    });
    open(tree);
    tap(tree, 26);
    tap(tree, 26);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith(value);
  });

  it('shared time: one row applies to every date', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'multiple',
      type: 'datetime',
      timeFormat: '24h',
      onChange,
    });
    open(tree);
    tap(tree, 20);
    tap(tree, 22);
    typeBox(tree, 'dp-time-hour', '09');
    typeBox(tree, 'dp-time-minute', '30');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith([
      '2026-10-20T04:00:00.000Z',
      '2026-10-22T04:00:00.000Z',
    ]);
  });

  it('per-date time: a tap on a picked day makes it the one the row edits', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'multiple',
      type: 'datetime',
      timeFormat: '24h',
      multiple: { timeMode: 'perDate' },
      onChange,
    });
    open(tree);
    expect(exists(tree, 'dp-time')).toBe(false);
    tap(tree, 20);
    typeBox(tree, 'dp-time-hour', '09');
    typeBox(tree, 'dp-time-minute', '00');
    tap(tree, 22);
    typeBox(tree, 'dp-time-hour', '15');
    typeBox(tree, 'dp-time-minute', '00');
    tap(tree, 20); // make 20 active again, not remove it
    expect(box(tree, 'dp-time-hour')?.props.value).toBe('09');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith([
      '2026-10-20T03:30:00.000Z',
      '2026-10-22T09:30:00.000Z',
    ]);
  });

  it('shows the saved dates on the screen field, and × clears them', () => {
    const onChange = jest.fn();
    const tree = mount({
      mode: 'multiple',
      allowClear: true,
      onChange,
      value: ['2026-10-20T00:00:00.000Z', '2026-10-25T00:00:00.000Z'],
    });
    expect(texts(tree)).toContain('20-10-2026, 25-10-2026');
    press(tree, 'dp-trigger-clear');
    expect(onChange).toHaveBeenCalledWith('');
  });
});
