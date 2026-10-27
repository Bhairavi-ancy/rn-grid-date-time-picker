import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createElement } from 'react';
import {
  Dimensions,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewProps,
} from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import { KEYBOARD_WAIT_FALLBACK_MS } from '../hooks/useOpenPicker';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import type {
  DateTimePickerProps,
  InstructionRenderProps,
  LabelRenderProps,
  SheetRenderProps,
} from '../types';

// Stand-ins for an app's own sheet, label and instruction, passed through the
// render props. The sheet just renders its body and footer; wrapping it in a
// component keeps its props (testID 'dp-sheet', onRequestClose) findable.
const StandInSheet = (p: SheetRenderProps) => (
  <View testID={`${p.testID}-view`}>
    {p.body}
    {p.footer}
  </View>
);
const renderSheet = (p: SheetRenderProps) => <StandInSheet {...p} />;
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

const base: DateTimePickerProps = {
  type: 'date',
  value: '',
  onChange: () => {},
  timeZone: 'Asia/Kolkata',
  locale: 'en-IN',
  allowTyping: true,
  // The saved-string fixtures and the field text below use these.
  valueFormat: 'utc-midnight',
  dateFormat: 'dd-MM-yyyy',
  timeFormat: '12h',
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

const openSheet = (tree: ReactTestRenderer) =>
  act(() => find(tree, 'dp-trigger-field').props.onPress());
const typeSegment = (
  tree: ReactTestRenderer,
  field: string,
  key: string,
  text: string
) => {
  const input = tree.root
    .findAllByType(TextInput)
    .find((i) => i.props.testID === `${field}-segment-${key}`);
  if (!input) throw new Error(`no segment ${field}-${key}`);
  act(() => input.props.onFocus());
  act(() => input.props.onChangeText(text));
};
const typeDate = (tree: ReactTestRenderer, field = 'dp-value') => {
  typeSegment(tree, field, 'day', '21');
  typeSegment(tree, field, 'month', '10');
  typeSegment(tree, field, 'year', '2026');
};
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id).props.onPress());

describe('DateTimePicker: open, type, Confirm', () => {
  it('saves exactly once on Confirm, then calls onBlur and closes', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();
    const tree = mount({ onChange, onBlur });
    expect(exists(tree, 'dp-sheet')).toBe(false);
    openSheet(tree);
    expect(exists(tree, 'dp-sheet')).toBe(true);
    typeDate(tree);
    expect(onChange).not.toHaveBeenCalled();
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-10-21T00:00:00.000Z');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlur.mock.invocationCallOrder[0]).toBeGreaterThan(
      onChange.mock.invocationCallOrder[0]
    );
    expect(exists(tree, 'dp-sheet')).toBe(false);
  });

  it('keeps Confirm disabled until the value is complete', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    openSheet(tree);
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    typeSegment(tree, 'dp-value', 'day', '21');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closing saves nothing, and reopening shows the saved value, not the cancelled pick', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange, value: '2026-10-05T00:00:00.000Z' });
    openSheet(tree);
    typeSegment(tree, 'dp-value', 'day', '21');
    act(() => find(tree, 'dp-sheet').props.onRequestClose()); // close / backdrop / Android back
    expect(onChange).not.toHaveBeenCalled();
    expect(exists(tree, 'dp-sheet')).toBe(false);
    openSheet(tree);
    const day = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-value-segment-day');
    expect(day?.props.value).toBe('05');
  });

  it('an untouched date-time Confirm saves exactly what was stored (seconds kept)', () => {
    const onChange = jest.fn();
    const tree = mount({
      onChange,
      type: 'datetime',
      value: '2026-10-21T05:00:12.345Z',
    });
    openSheet(tree);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-21T05:00:12.345Z');
  });
});

describe('DateTimePicker: the on-screen field', () => {
  it('shows the saved value in the locale format', () => {
    expect(texts(mount({ value: '2026-10-21T00:00:00.000Z' }))).toContain(
      '21-10-2026'
    );
    // Without a dateFormat prop the order and separator come from the locale.
    expect(
      texts(
        mount({
          value: '2026-10-21T00:00:00.000Z',
          locale: 'en-US',
          dateFormat: undefined,
        })
      )
    ).toContain('10/21/2026');
    expect(
      texts(mount({ value: '2026-10-21T00:00:00.000Z', dateFormat: undefined }))
    ).toContain('21/10/2026');
  });

  it('× clears straight away with onChange("") and does not open the sheet', () => {
    const onChange = jest.fn();
    const tree = mount({
      onChange,
      value: '2026-10-21T00:00:00.000Z',
      allowClear: true,
    });
    press(tree, 'dp-trigger-clear');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('');
    expect(exists(tree, 'dp-sheet')).toBe(false);
  });

  it('never opens when disabled or read-only', () => {
    const disabled = mount({ disabled: true });
    act(() => find(disabled, 'dp-trigger-field').props.onPress?.());
    expect(exists(disabled, 'dp-sheet')).toBe(false);
    const readOnly = mount({ readOnly: true });
    act(() => find(readOnly, 'dp-trigger-field').props.onPress?.());
    expect(exists(readOnly, 'dp-sheet')).toBe(false);
  });

  it('can be replaced with renderField', () => {
    const tree = mount({
      renderField: (state) => (
        <Text testID="custom">{state.isOpen ? 'open' : 'closed'}</Text>
      ),
    });
    expect(exists(tree, 'dp-trigger-field')).toBe(false);
    expect(texts(tree)).toContain('closed');
  });

  it('typing in the on-screen field (allowTriggerTyping) saves a complete value', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange, allowTriggerTyping: true });
    typeDate(tree, 'dp-trigger');
    expect(onChange).toHaveBeenCalledWith('2026-10-21T00:00:00.000Z');
  });

  it('typing in the on-screen field saves once typing pauses, never the values on the way', () => {
    const onChange = jest.fn();
    const tree = mount({
      type: 'datetime',
      timeFormat: '24h',
      onChange,
      allowTriggerTyping: true,
    });
    const seg = (key: string) =>
      tree.root
        .findAllByType(TextInput)
        .find((i) => i.props.testID === `dp-trigger-segment-${key}`)!;
    const type = (key: string, text: string) => {
      act(() => seg(key).props.onFocus());
      act(() => seg(key).props.onChangeText(text));
    };
    type('day', '21');
    type('month', '10');
    type('year', '2026');
    type('hour', '09');
    // 09:3 is already a complete time, but typing hasn't paused.
    act(() => seg('minute').props.onFocus());
    act(() => seg('minute').props.onChangeText('3'));
    expect(onChange).not.toHaveBeenCalled();
    // The last box fills: saved once. 09:30 in India = 04:00 UTC.
    act(() => seg('minute').props.onChangeText('30'));
    expect(onChange.mock.calls).toEqual([['2026-10-21T04:00:00.000Z']]);
    // A correction saves again when its box is left.
    type('hour', '1');
    expect(onChange).toHaveBeenCalledTimes(1);
    act(() => seg('hour').props.onBlur());
    // 01:30 in India = 20:00 UTC the day before.
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20T20:00:00.000Z');
  });
});

describe('DateTimePicker: slots, strings, Reset', () => {
  it('uses the title, Reset and Confirm defaults, with strings from props', () => {
    const onReset = jest.fn();
    const tree = mount({
      title: 'Filter Label',
      onReset,
      strings: { confirm: 'Apply' },
    });
    openSheet(tree);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Filter Label', DEFAULT_STRINGS.reset, 'Apply'])
    );
    press(tree, 'dp-reset');
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders custom header, bodyTop, bodyBottom and footer (functions get the state)', () => {
    const tree = mount({
      header: <Text>my header</Text>,
      bodyTop: <Text>chips</Text>,
      bodyBottom: (state) => <Text>{state.canConfirm ? 'can' : 'cannot'}</Text>,
      footer: (state) => (
        <Text testID="my-footer" onPress={state.confirm}>
          Save
        </Text>
      ),
    });
    openSheet(tree);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['my header', 'chips', 'cannot', 'Save'])
    );
    expect(exists(tree, 'dp-confirm')).toBe(false);
  });
});

describe('DateTimePicker: inline and instant', () => {
  it('inline: shows the content in place, with no trigger, and stays open after Confirm', () => {
    const onChange = jest.fn();
    const tree = mount({ presentation: 'inline', onChange });
    expect(exists(tree, 'dp-inline')).toBe(true);
    expect(exists(tree, 'dp-trigger-field')).toBe(false);
    typeDate(tree);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-21T00:00:00.000Z');
    expect(exists(tree, 'dp-inline')).toBe(true);
  });

  it('commitMode "instant" saves a complete edit without Confirm, once', () => {
    const onChange = jest.fn();
    const tree = mount({
      presentation: 'inline',
      commitMode: 'instant',
      onChange,
    });
    typeDate(tree);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-10-21T00:00:00.000Z');
  });
});

describe('DateTimePicker: limits', () => {
  it('blocks Confirm and explains why when the typed day is not allowed', () => {
    const tree = mount({ minDate: { year: 2026, month: 10, day: 25 } });
    openSheet(tree);
    typeDate(tree);
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorNotAllowed);
  });
});

describe('DateTimePicker: keyboard wait before opening', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('closes the keyboard and opens after it hides, or after the fallback', () => {
    jest.useFakeTimers();
    jest
      .spyOn(TextInput.State, 'currentlyFocusedInput')
      .mockReturnValue({} as never);
    const dismiss = jest
      .spyOn(Keyboard, 'dismiss')
      .mockImplementation(() => {});
    const tree = mount({});
    openSheet(tree);
    expect(dismiss).toHaveBeenCalled();
    expect(exists(tree, 'dp-sheet')).toBe(false);
    act(() => jest.advanceTimersByTime(KEYBOARD_WAIT_FALLBACK_MS));
    expect(exists(tree, 'dp-sheet')).toBe(true);
  });
});

describe('DateTimePicker: calendar', () => {
  // Wednesday 21 Oct 2026, 12:00 in India.
  const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
  const dayCell = (tree: ReactTestRenderer, y: number, m: number, d: number) =>
    tree.root.findAll(
      (n) =>
        n.props.testID === `dp-day-${y}-${m}-${d}` &&
        n.props.accessibilityRole === 'button' &&
        typeof n.type !== 'string'
    )[0];

  it('tapping a day fills the field, and Confirm saves it', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange, now });
    openSheet(tree);
    act(() => dayCell(tree, 2026, 10, 25).props.onPress());
    const day = tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === 'dp-value-segment-day');
    expect(day?.props.value).toBe('25');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T00:00:00.000Z');
  });

  it('newDayTime: a picked day on a date-time field takes that time', () => {
    const onChange = jest.fn();
    const tree = mount({
      onChange,
      type: 'datetime',
      now,
      newDayTime: { hour: 14, minute: 30 }, // 09:00 UTC
    });
    openSheet(tree);
    act(() => dayCell(tree, 2026, 10, 25).props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T09:00:00.000Z');
  });

  it('loads holidays once per year it shows; they block only with disableHolidays', async () => {
    const loadHolidays = jest.fn((year: number) =>
      Promise.resolve(year === 2026 ? ['2026-10-23T00:00:00.000Z'] : [])
    );
    const tree = mount({ now, loadHolidays });
    openSheet(tree);
    await act(async () => {});
    expect(loadHolidays).toHaveBeenCalledWith(2026);
    const holiday = dayCell(tree, 2026, 10, 23);
    expect(holiday.props.disabled).toBe(false);
    expect(holiday.props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11yHoliday
    );

    const blocking = mount({
      now,
      holidays: ['2026-10-23T00:00:00.000Z'],
      disableHolidays: true,
      disabledWeekdays: [6, 7],
    });
    openSheet(blocking);
    expect(dayCell(blocking, 2026, 10, 23).props.disabled).toBe(true);
    expect(dayCell(blocking, 2026, 10, 24).props.disabled).toBe(true); // Saturday
    expect(dayCell(blocking, 2026, 10, 22).props.disabled).toBe(false);

    press(tree, 'dp-title');
    press(tree, 'dp-year-2027');
    await act(async () => {});
    press(tree, 'dp-title');
    press(tree, 'dp-year-2026');
    expect(loadHolidays.mock.calls.map((c) => c[0])).toEqual([2026, 2027]);
    await act(async () => {});
  });

  it('tells the screen once per open when nothing can be picked', () => {
    const onError = jest.fn();
    const tree = mount({
      onError,
      now,
      minDate: { year: 2026, month: 12, day: 1 },
      maxDate: { year: 2026, month: 11, day: 1 },
    });
    openSheet(tree);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('NOTHING_SELECTABLE', '');
    expect(exists(tree, 'dp-empty')).toBe(true);
  });

  it('hides the calendar while the keyboard is up for typing', () => {
    const listeners: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      name: string,
      cb: () => void
    ) => {
      listeners[name] = cb;
      return { remove: () => {} };
    }) as never);
    const tree = mount({ now });
    openSheet(tree);
    expect(exists(tree, 'dp-calendar')).toBe(true);
    const show = Object.keys(listeners).find((k) => k.endsWith('Show'));
    act(() => listeners[show!]());
    expect(exists(tree, 'dp-calendar')).toBe(false);
    const hide = Object.keys(listeners).find((k) => k.endsWith('Hide'));
    act(() => listeners[hide!]());
    expect(exists(tree, 'dp-calendar')).toBe(true);
    jest.restoreAllMocks();
  });
});

describe('DateTimePicker: time row', () => {
  const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
  const dayCell = (tree: ReactTestRenderer, y: number, m: number, d: number) =>
    tree.root.findAll(
      (n) =>
        n.props.testID === `dp-day-${y}-${m}-${d}` &&
        n.props.accessibilityRole === 'button' &&
        typeof n.type !== 'string'
    )[0];
  const box = (tree: ReactTestRenderer, id: string) =>
    tree.root.findAllByType(TextInput).find((i) => i.props.testID === id);
  const typeBox = (tree: ReactTestRenderer, id: string, text: string) => {
    const input = box(tree, id);
    if (!input) throw new Error(`no box ${id}`);
    act(() => input.props.onFocus());
    act(() => input.props.onChangeText(text));
  };
  const blurBox = (tree: ReactTestRenderer, id: string) =>
    act(() => box(tree, id)!.props.onBlur());
  const dt: Partial<DateTimePickerProps> = {
    type: 'datetime',
    now,
  };

  it('a day tap on an empty value starts at the current time; the typed time is saved on Confirm (12h)', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange });
    openSheet(tree);
    expect(exists(tree, 'dp-time')).toBe(true);
    act(() => dayCell(tree, 2026, 10, 25).props.onPress());
    // "Now" is 06:30 UTC = 12:00 PM in India: a new day starts at the current time.
    expect(box(tree, 'dp-time-hour')?.props.value).toBe('12');
    expect(box(tree, 'dp-time-minute')?.props.value).toBe('00');
    expect(find(tree, 'dp-time-pm').props.accessibilityState.checked).toBe(
      true
    );
    typeBox(tree, 'dp-time-hour', '09');
    typeBox(tree, 'dp-time-minute', '30');
    press(tree, 'dp-time-pm');
    press(tree, 'dp-confirm');
    // 21:30 in India = 16:00 UTC.
    expect(onChange).toHaveBeenCalledWith('2026-10-25T16:00:00.000Z');
  });

  it('the value field and the time row stay in sync', () => {
    const tree = mount({ ...dt, value: '2026-10-25T04:30:00.000Z' }); // 10:00 AM IST
    openSheet(tree);
    expect(box(tree, 'dp-time-hour')?.props.value).toBe('10');
    typeBox(tree, 'dp-time-hour', '11');
    blurBox(tree, 'dp-time-hour');
    expect(box(tree, 'dp-value-segment-hour')?.props.value).toBe('11');
    typeBox(tree, 'dp-value-segment-minute', '45');
    blurBox(tree, 'dp-value-segment-minute');
    expect(box(tree, 'dp-time-minute')?.props.value).toBe('45');
  });

  it('a time typed before picking a day is used when the day is tapped', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange, timeFormat: '24h' });
    openSheet(tree);
    typeBox(tree, 'dp-time-hour', '14');
    typeBox(tree, 'dp-time-minute', '15');
    act(() => dayCell(tree, 2026, 10, 25).props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T08:45:00.000Z');
  });

  it('an off-step minute is flagged only when Confirm is pressed, and is not saved', () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    const tree = mount({
      ...dt,
      onChange,
      onError,
      minuteStep: 15,
      value: '2026-10-25T04:30:00.000Z',
    });
    openSheet(tree);
    typeBox(tree, 'dp-time-minute', '07');
    // Nothing is flagged while typing, and Confirm stays enabled.
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorMinuteStep(15));
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      'OFF_STEP',
      '2026-10-25T04:30:00.000Z'
    );
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorMinuteStep(15));
    expect(exists(tree, 'dp-sheet')).toBe(true);
    // Editing hides the error again; the next Confirm checks again and saves.
    typeBox(tree, 'dp-time-minute', '15');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorMinuteStep(15));
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T04:45:00.000Z');
  });

  it('a time outside the limits is explained on Confirm; the impossible AM/PM side is disabled', () => {
    const onChange = jest.fn();
    const tree = mount({
      ...dt,
      onChange,
      value: '2026-10-25T04:30:00.000Z',
      timeBounds: () => {
        return { min: { hour: 13, minute: 0 } };
      },
    });
    openSheet(tree);
    expect(find(tree, 'dp-time-am').props.disabled).toBe(true);
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorTimeNotAllowed);
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorTimeNotAllowed);
    press(tree, 'dp-time-pm');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorTimeNotAllowed);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('an unfinished time is flagged on Confirm, not on leaving the box', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange, value: '2026-10-25T04:30:00.000Z' });
    openSheet(tree);
    // Empty minutes count as 00, so clear the hour to leave it unfinished.
    typeBox(tree, 'dp-time-hour', '');
    blurBox(tree, 'dp-time-hour');
    expect(texts(tree)).not.toContain(DEFAULT_STRINGS.errorIncompleteTime);
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorIncompleteTime);
  });

  it("commitMode 'instant' shows time errors as they happen and never saves them", () => {
    const onChange = jest.fn();
    const tree = mount({
      ...dt,
      onChange,
      commitMode: 'instant',
      minuteStep: 15,
      value: '2026-10-25T04:30:00.000Z',
    });
    openSheet(tree);
    typeBox(tree, 'dp-time-minute', '07');
    blurBox(tree, 'dp-time-minute');
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorMinuteStep(15));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a date typed after the time row was filled takes that time, and Confirm saves it', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange });
    openSheet(tree);
    typeBox(tree, 'dp-time-hour', '09');
    typeBox(tree, 'dp-time-minute', '30');
    blurBox(tree, 'dp-time-minute');
    // The field's own hour and minute stay empty.
    typeSegment(tree, 'dp-value', 'day', '25');
    typeSegment(tree, 'dp-value', 'month', '12');
    typeSegment(tree, 'dp-value', 'year', '2026');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
    press(tree, 'dp-confirm');
    // 09:30 AM in India = 04:00 UTC.
    expect(onChange).toHaveBeenCalledWith('2026-12-25T04:00:00.000Z');
  });

  it('renderTimeRow replaces the row; date fields have none', () => {
    const tree = mount({
      ...dt,
      renderTimeRow: () => <Text>my time</Text>,
    });
    openSheet(tree);
    expect(texts(tree)).toContain('my time');
    expect(exists(tree, 'dp-time')).toBe(false);
    const dateOnly = mount({ now });
    openSheet(dateOnly);
    expect(exists(dateOnly, 'dp-time')).toBe(false);
  });
});

describe('DateTimePicker: wheel', () => {
  it('Confirm waits while the wheel spins, then saves the settled time', () => {
    const onChange = jest.fn();
    const tree = mount({
      type: 'datetime',
      timeInput: 'wheel',
      value: '2026-10-25T04:30:00.000Z', // 10:00 AM IST
      onChange,
    });
    openSheet(tree);
    const sv = tree.root
      .findAll((n) => n.props.testID === 'dp-time-wheel-minute-scroll')
      .find((n) => typeof n.props.onScrollBeginDrag === 'function')!;
    act(() => sv.props.onScrollBeginDrag());
    expect(find(tree, 'dp-confirm').props.disabled).toBe(true);
    act(() =>
      sv.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 0, y: 20 * 40 } },
      })
    );
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T04:50:00.000Z');
  });
});

describe('DateTimePicker: editing a typed time', () => {
  const box = (tree: ReactTestRenderer, id: string) =>
    tree.root.findAllByType(TextInput).find((i) => i.props.testID === id)!;
  const dt: Partial<DateTimePickerProps> = {
    type: 'datetime',
    value: '2026-10-25T04:59:00.000Z', // 10:29 AM IST
  };
  // The TextInput mock shares one focus() across instances, so spy per box.
  const spyFocus = (tree: ReactTestRenderer, id: string) => {
    const fn = jest.fn();
    (box(tree, id).instance as { focus: () => void }).focus = fn;
    return fn;
  };
  const change = (tree: ReactTestRenderer, id: string, text: string) =>
    act(() => box(tree, id).props.onChangeText(text));
  const focus = (tree: ReactTestRenderer, id: string) =>
    act(() => box(tree, id).props.onFocus());
  const blur = (tree: ReactTestRenderer, id: string) =>
    act(() => box(tree, id).props.onBlur());
  it('boxes are normal inputs: free cursor, digits only, two at most', () => {
    const tree = mount(dt);
    openSheet(tree);
    expect(box(tree, 'dp-time-minute').props.selection).toBeUndefined();
    expect(box(tree, 'dp-time-minute').props.maxLength).toBe(2);
    focus(tree, 'dp-time-minute');
    change(tree, 'dp-time-minute', '2a');
    expect(box(tree, 'dp-time-minute').props.value).toBe('2');
  });

  it('a time is saved when focus leaves the box, not while typing', () => {
    const tree = mount(dt);
    openSheet(tree);
    focus(tree, 'dp-time-minute');
    change(tree, 'dp-time-minute', '2');
    // The field above keeps 29 while typing.
    expect(box(tree, 'dp-value-segment-minute').props.value).toBe('29');
    blur(tree, 'dp-time-minute');
    expect(box(tree, 'dp-time-minute').props.value).toBe('02');
    expect(box(tree, 'dp-value-segment-minute').props.value).toBe('02');
  });

  it('Confirm saves a time still being typed', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange });
    openSheet(tree);
    focus(tree, 'dp-time-minute');
    change(tree, 'dp-time-minute', '45');
    expect(find(tree, 'dp-confirm').props.disabled).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T05:15:00.000Z'); // 10:45 IST
  });

  it('empty minutes count as 00, and a single digit is padded on leave', () => {
    const onChange = jest.fn();
    const tree = mount({ ...dt, onChange });
    openSheet(tree);
    focus(tree, 'dp-time-hour');
    change(tree, 'dp-time-hour', '9');
    blur(tree, 'dp-time-hour');
    expect(box(tree, 'dp-time-hour').props.value).toBe('09');
    focus(tree, 'dp-time-minute');
    change(tree, 'dp-time-minute', '');
    blur(tree, 'dp-time-minute');
    expect(box(tree, 'dp-time-minute').props.value).toBe('00');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T03:30:00.000Z'); // 09:00 IST
  });

  it('two hour digits jump to the minutes; Backspace in an empty minute box goes back', () => {
    const tree = mount(dt);
    openSheet(tree);
    const toMinute = spyFocus(tree, 'dp-time-minute');
    const toHour = spyFocus(tree, 'dp-time-hour');
    focus(tree, 'dp-time-hour');
    change(tree, 'dp-time-hour', '1');
    expect(toMinute).not.toHaveBeenCalled();
    change(tree, 'dp-time-hour', '11');
    expect(toMinute).toHaveBeenCalledTimes(1);
    // The jump saves the hour but leaves the minutes to type.
    blur(tree, 'dp-time-hour');
    focus(tree, 'dp-time-minute');
    expect(box(tree, 'dp-time-minute').props.value).toBe('29');
    change(tree, 'dp-time-minute', '');
    act(() =>
      box(tree, 'dp-time-minute').props.onKeyPress({
        nativeEvent: { key: 'Backspace' },
      })
    );
    expect(toHour).toHaveBeenCalledTimes(1);
  });

  it('a day tapped while a time is being typed keeps the typed time', () => {
    const onChange = jest.fn();
    const tree = mount({ type: 'datetime', timeFormat: '24h', onChange });
    openSheet(tree);
    focus(tree, 'dp-time-hour');
    change(tree, 'dp-time-hour', '14');
    focus(tree, 'dp-time-minute');
    change(tree, 'dp-time-minute', '15');
    const cell = tree.root.findAll(
      (n) =>
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('dp-day-') &&
        n.props.accessibilityRole === 'button' &&
        !n.props.disabled &&
        typeof n.type !== 'string'
    )[10];
    act(() => cell.props.onPress());
    expect(box(tree, 'dp-time-hour').props.value).toBe('14');
    press(tree, 'dp-confirm');
    expect(String(onChange.mock.calls[0][0])).toMatch(/T08:45:00\.000Z$/);
  });
});

describe('DateTimePicker: sheet size', () => {
  it('grows to 90% of the screen and scrolls the body between the title and Confirm', () => {
    // The built-in sheet.
    const tree = mount({
      type: 'datetime',
      mode: 'range',
      renderSheet: undefined,
    });
    openSheet(tree);
    const panel = tree.root
      .findAllByType(View)
      .find((n) => n.props.testID === 'dp-sheet');
    expect(StyleSheet.flatten(panel?.props.style).maxHeight).toBeCloseTo(
      Dimensions.get('window').height * 0.9
    );
    expect(exists(tree, 'dp-scroll')).toBe(true);
    expect(exists(tree, 'dp-time-from')).toBe(true);
    // Inline pickers sit in the caller's layout and don't scroll themselves.
    const inline = mount({ presentation: 'inline' });
    expect(exists(inline, 'dp-scroll')).toBe(false);
  });
});

describe('DateTimePicker: fast typing', () => {
  // A hardware keyboard or autofill sends the next character before React has
  // re-rendered: both changes below reach the same, older props.
  const segment = (tree: ReactTestRenderer, key: string) =>
    tree.root
      .findAllByType(TextInput)
      .find((i) => i.props.testID === `dp-value-segment-${key}`)!;

  it('the last box can still be corrected after it fills and focus stops', () => {
    const tree = mount({ type: 'datetime', timeFormat: '24h' });
    openSheet(tree);
    const type = (key: string, text: string) => {
      act(() => segment(tree, key).props.onFocus());
      act(() => segment(tree, key).props.onChangeText(text));
    };
    type('day', '21');
    type('month', '10');
    type('year', '2026');
    type('hour', '09');
    type('minute', '30');
    // Focus has stopped, but the cursor is still in the minute box.
    const minute = segment(tree, 'minute');
    act(() => minute.props.onKeyPress({ nativeEvent: { key: 'Backspace' } }));
    act(() => minute.props.onChangeText('3'));
    act(() => segment(tree, 'minute').props.onChangeText('35'));
    expect(segment(tree, 'minute').props.value).toBe('35');
  });

  it('characters that arrive before a re-render are each counted once', () => {
    const tree = mount({});
    openSheet(tree);
    const day = segment(tree, 'day');
    act(() => day.props.onFocus());
    act(() => {
      day.props.onChangeText('2');
      day.props.onChangeText('21');
    });
    // The day box is full, so the next digits move on to the month and year,
    // even while they still arrive in the day box.
    act(() => {
      day.props.onChangeText('211');
      day.props.onChangeText('2110');
    });
    const year = segment(tree, 'year');
    act(() => {
      year.props.onChangeText('2');
      year.props.onChangeText('20');
      year.props.onChangeText('202');
      year.props.onChangeText('2026');
    });
    expect(segment(tree, 'day').props.value).toBe('21');
    expect(segment(tree, 'month').props.value).toBe('10');
    expect(segment(tree, 'year').props.value).toBe('2026');
  });
});

describe('DateTimePicker: validate', () => {
  const day = (tree: ReactTestRenderer, d: number) =>
    tree.root.findAll(
      (n) =>
        n.props.testID === `dp-day-2026-10-${d}` &&
        n.props.accessibilityRole === 'button' &&
        typeof n.type !== 'string'
    )[0];
  const at = () => new Date(Date.UTC(2026, 9, 21, 6, 30));
  // Weekends need a manager's approval: a rule only the app knows.
  const validate = (v: unknown) =>
    v === '2026-10-24T00:00:00.000Z' ? 'Weekends need approval' : null;

  it('a message blocks the save and shows inside the sheet until the selection changes', () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    const tree = mount({ onChange, onError, validate, now: at });
    openSheet(tree);
    act(() => day(tree, 24).props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      'VALIDATION',
      '2026-10-24T00:00:00.000Z'
    );
    expect(texts(tree)).toContain('Weekends need approval');
    expect(exists(tree, 'dp-sheet')).toBe(true);
    act(() => day(tree, 23).props.onPress());
    expect(texts(tree)).not.toContain('Weekends need approval');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-23T00:00:00.000Z');
  });

  it('styles.validationText styles the message', () => {
    const tree = mount({
      validate,
      now: at,
      styles: { validationText: { color: '#AA00AA' } },
    });
    openSheet(tree);
    act(() => day(tree, 24).props.onPress());
    press(tree, 'dp-confirm');
    const message = find(tree, 'dp-validation-error');
    expect(StyleSheet.flatten(message?.props.style).color).toBe('#AA00AA');
  });

  it("commitMode 'instant' checks before each save", () => {
    const onChange = jest.fn();
    const tree = mount({
      onChange,
      validate,
      now: at,
      commitMode: 'instant',
    });
    openSheet(tree);
    act(() => day(tree, 24).props.onPress());
    expect(onChange).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Weekends need approval');
    act(() => day(tree, 22).props.onPress());
    expect(onChange).toHaveBeenCalledWith('2026-10-22T00:00:00.000Z');
  });
});

describe('DateTimePicker: sheet options', () => {
  const panelStyle = (tree: ReactTestRenderer) =>
    StyleSheet.flatten(
      tree.root.findAllByType(View).find((n) => n.props.testID === 'dp-sheet')
        ?.props.style
    );
  const inScroll = (tree: ReactTestRenderer, match: (n: any) => boolean) =>
    find(tree, 'dp-scroll').findAll(match).length > 0;
  const isConfirm = (n: any) => n.props.testID === 'dp-confirm';
  const isTitle = (n: any) =>
    n.type === Text && n.props.children === 'My title';

  it('height and maxHeight take points or a percentage of the screen', () => {
    const screen = Dimensions.get('window').height;
    const pct = mount({ renderSheet: undefined, sheet: { height: '50%' } });
    openSheet(pct);
    expect(panelStyle(pct).height).toBeCloseTo(screen * 0.5);
    expect(panelStyle(pct).maxHeight).toBeUndefined();
    const capped = mount({
      renderSheet: undefined,
      sheet: { height: 5000, maxHeight: 400 },
    });
    openSheet(capped);
    expect(panelStyle(capped).height).toBe(400);
    const max = mount({ renderSheet: undefined, sheet: { maxHeight: 300 } });
    openSheet(max);
    expect(panelStyle(max).maxHeight).toBe(300);
  });

  it('header and footer are fixed by default and scroll with the body when asked', () => {
    const fixed = mount({ title: 'My title' });
    openSheet(fixed);
    expect(inScroll(fixed, isTitle)).toBe(false);
    expect(inScroll(fixed, isConfirm)).toBe(false);
    expect(exists(fixed, 'dp-confirm')).toBe(true);

    const scrolling = mount({
      title: 'My title',
      sheet: { fixedHeader: false, fixedFooter: false },
    });
    openSheet(scrolling);
    expect(inScroll(scrolling, isTitle)).toBe(true);
    expect(inScroll(scrolling, isConfirm)).toBe(true);
    // renderSheet gets no separate footer then.
    expect(find(scrolling, 'dp-sheet').props.footer).toBeNull();
  });

  it('showField hides the field above the calendar, but not its error', () => {
    const tree = mount({
      sheet: { showField: false },
      value: '2026-10-21T00:00:00.000Z',
      disabledWeekdays: [3],
    });
    openSheet(tree);
    expect(exists(tree, 'dp-value-field')).toBe(false);
    expect(
      tree.root.findAll((n) => n.props.testID?.startsWith?.('dp-value-segment'))
        .length
    ).toBe(0);
    // 21 Oct 2026 is a Wednesday, which isn't allowed.
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorNotAllowed);
  });

  it('fieldPlaceholder and the placeholder strings reach the sheet field and time boxes', () => {
    const strings = {
      placeholderDay: 'JJ',
      placeholderMonth: 'MM',
      placeholderYear: 'AAAA',
      placeholderHour: 'hh',
      placeholderMinute: 'mn',
    };
    const typed = mount({ type: 'datetime', strings });
    openSheet(typed);
    const placeholders = typed.root
      .findAllByType(TextInput)
      .map((i) => i.props.placeholder);
    expect(placeholders).toEqual(
      expect.arrayContaining(['JJ', 'MM', 'AAAA', 'hh', 'mn'])
    );
    const shown = mount({
      allowTyping: false,
      sheet: { fieldPlaceholder: 'Pick a day' },
      strings,
    });
    expect(texts(shown)).toContain('JJ-MM-AAAA');
    openSheet(shown);
    expect(texts(shown)).toContain('Pick a day');
  });
});

describe('DateTimePicker: defaults from the locale and the clock', () => {
  const nowAt = (h: number, m: number) => () =>
    new Date(Date.UTC(2026, 9, 21, h, m));
  const dayCell = (tree: ReactTestRenderer, d: number) =>
    tree.root.findAll(
      (n) =>
        n.props.testID === `dp-day-2026-10-${d}` &&
        n.props.accessibilityRole === 'button' &&
        typeof n.type !== 'string'
    )[0];

  it('the current time moves up to the next minute step', () => {
    const onChange = jest.fn();
    // 06:37 UTC = 12:07 IST; with 15-minute steps the day starts at 12:15.
    const tree = mount({
      type: 'datetime',
      minuteStep: 15,
      timeFormat: '24h',
      now: nowAt(6, 37),
      onChange,
    });
    openSheet(tree);
    act(() => dayCell(tree, 25).props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T06:45:00.000Z');
  });

  it('an existing time is kept when another day is tapped', () => {
    const onChange = jest.fn();
    const tree = mount({
      type: 'datetime',
      value: '2026-10-21T04:30:00.000Z', // 10:00 IST
      now: nowAt(6, 37),
      onChange,
    });
    openSheet(tree);
    act(() => dayCell(tree, 25).props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('2026-10-25T04:30:00.000Z');
  });

  it('without timeFormat it follows the locale (24-hour for en-GB); the prop wins', () => {
    const h24 = mount({
      type: 'datetime',
      locale: 'en-GB',
      timeFormat: undefined,
      value: '2026-10-21T09:30:00.000Z',
    });
    openSheet(h24);
    expect(exists(h24, 'dp-time-am')).toBe(false);
    expect(texts(h24)).toContain('21-10-2026 15:00');

    const forced = mount({
      type: 'datetime',
      locale: 'en-GB',
      timeFormat: '12h',
      value: '2026-10-21T09:30:00.000Z',
    });
    openSheet(forced);
    expect(exists(forced, 'dp-time-am')).toBe(true);
  });

  it('without firstDayOfWeek the week starts as in the locale; the prop wins', () => {
    const firstWeekday = (props: Partial<DateTimePickerProps>) => {
      const seen: number[] = [];
      const tree = mount({
        ...props,
        renderWeekday: (wd) => {
          seen.push(wd);
          return null;
        },
      });
      openSheet(tree);
      return seen[0];
    };
    expect(firstWeekday({ locale: 'en-US' })).toBe(7);
    expect(firstWeekday({ locale: 'en-GB' })).toBe(1);
    expect(firstWeekday({ locale: 'ar-EG' })).toBe(6);
    expect(firstWeekday({ locale: 'en-GB', firstDayOfWeek: 7 })).toBe(7);
  });
});
