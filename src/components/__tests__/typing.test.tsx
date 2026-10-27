import { describe, expect, it, jest } from '@jest/globals';
import { useState, type ReactElement } from 'react';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import ValueField, { type ValueFieldProps } from '../field/ValueField';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';
import type { DateTimePickerProps } from '../types';
import type { PickerValue } from '../../core/types';

const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

/** A screen that owns the value, typing straight into the on-screen field. */
function Screen({
  log,
  initial = '',
  ...props
}: Partial<DateTimePickerProps> & {
  log: jest.Mock;
  initial?: PickerValue;
}) {
  const [value, setValue] = useState<PickerValue>(initial);
  return (
    <DateTimePicker
      type="datetime"
      now={now}
      timeZone="UTC"
      dateFormat="dd-MM-yyyy"
      timeFormat="12h"
      allowFieldTyping
      testID="dp"
      {...(props as object)}
      value={value}
      onChange={(next) => {
        log(next);
        setValue(next);
      }}
    />
  );
}

const mount = (el: ReactElement): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
};
const seg = (tree: ReactTestRenderer, prefix: string, key: string) =>
  tree.root
    .findAllByType(TextInput)
    .find((i) => i.props.testID === `${prefix}-segment-${key}`)!;
const typeIn = (
  tree: ReactTestRenderer,
  prefix: string,
  pairs: [string, string][]
) => {
  for (const [key, text] of pairs) {
    act(() => seg(tree, prefix, key).props.onFocus());
    act(() => seg(tree, prefix, key).props.onChangeText(text));
  }
};
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const fullDate: [string, string][] = [
  ['day', '25'],
  ['month', '10'],
  ['year', '2026'],
];

describe('on-screen field saving', () => {
  it('switching to PM after the minutes fill is saved', () => {
    const log = jest.fn();
    const tree = mount(<Screen log={log} />);
    typeIn(tree, 'dp-trigger', [...fullDate, ['hour', '09'], ['minute', '30']]);
    expect(log).toHaveBeenLastCalledWith('2026-10-25T09:30:00.000Z');
    act(() =>
      tree.root
        .findAll(
          (n) =>
            n.props.testID === 'dp-trigger-segment-period' &&
            typeof n.type !== 'string'
        )[0]!
        .props.onPress()
    );
    expect(log).toHaveBeenLastCalledWith('2026-10-25T21:30:00.000Z');
  });

  it('deleting every digit and leaving clears the value', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen log={log} timeFormat="24h" initial="2026-10-25T09:30:00.000Z" />
    );
    for (const key of ['day', 'month', 'year', 'hour', 'minute']) {
      act(() => seg(tree, 'dp-trigger', key).props.onFocus());
      act(() => seg(tree, 'dp-trigger', key).props.onChangeText(''));
    }
    act(() => seg(tree, 'dp-trigger', 'minute').props.onBlur());
    expect(log).toHaveBeenLastCalledWith('');
  });

  it('runs validate, and shows its message instead of saving', () => {
    const log = jest.fn();
    const onConfirm = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="date"
        onConfirm={onConfirm}
        validate={() => 'Pick a weekday'}
      />
    );
    typeIn(tree, 'dp-trigger', fullDate);
    expect(log).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Pick a weekday');
  });

  it('an off-step time is flagged, not saved', () => {
    const log = jest.fn();
    const tree = mount(<Screen log={log} timeFormat="24h" minuteStep={15} />);
    typeIn(tree, 'dp-trigger', [...fullDate, ['hour', '09'], ['minute', '07']]);
    expect(log).not.toHaveBeenCalled();
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorMinuteStep(15));
  });

  it('a day outside the limits is flagged, not saved', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="date"
        minDate={{ year: 2026, month: 10, day: 23 }}
      />
    );
    typeIn(tree, 'dp-trigger', [
      ['day', '22'],
      ['month', '10'],
      ['year', '2026'],
    ]);
    expect(log).not.toHaveBeenCalled();
    expect(texts(tree)).toContain(DEFAULT_STRINGS.errorNotAllowed);
  });

  it('focusing and leaving without an edit saves nothing, so the stored string is kept', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        timeFormat="24h"
        valueFormat="iso"
        initial="2026-10-25T04:30:00Z"
      />
    );
    act(() => seg(tree, 'dp-trigger', 'day').props.onFocus());
    act(() => seg(tree, 'dp-trigger', 'day').props.onBlur());
    expect(log).not.toHaveBeenCalled();
  });
});

describe('typed segments', () => {
  const base: ValueFieldProps = {
    type: 'date',
    value: null,
    dateFormat: 'dd-MM-yyyy',
    timeFormat: '24h',
    allowTyping: true,
    tokens: buildTokens(),
    strings: DEFAULT_STRINGS,
    testID: 'f',
  };
  const field = (props: Partial<ValueFieldProps> = {}) =>
    mount(<ValueField {...base} {...props} />);

  it("a late focus event doesn't pad a digit that already reached the box", () => {
    const tree = field();
    act(() => seg(tree, 'f', 'day').props.onFocus());
    act(() => seg(tree, 'f', 'day').props.onChangeText('21'));
    // The next digit reaches the month box before its focus event does.
    act(() => seg(tree, 'f', 'month').props.onChangeText('1'));
    act(() => seg(tree, 'f', 'month').props.onFocus());
    // The box shows what React rendered, plus the next digit.
    const shown = seg(tree, 'f', 'month').props.value as string;
    act(() => seg(tree, 'f', 'month').props.onChangeText(`${shown}2`));
    expect(seg(tree, 'f', 'month').props.value).toBe('12');
  });

  it('a render between two keystrokes in a full box counts each once', () => {
    const tree = field();
    act(() => seg(tree, 'f', 'day').props.onFocus());
    act(() => seg(tree, 'f', 'day').props.onChangeText('21'));
    // The day box is full but keeps receiving: '1', a render, then '0'.
    act(() => seg(tree, 'f', 'day').props.onChangeText('211'));
    act(() => seg(tree, 'f', 'day').props.onChangeText('2110'));
    expect(seg(tree, 'f', 'month').props.value).toBe('10');
  });

  it('focusing and leaving a box without an edit reports nothing', () => {
    const onTyped = jest.fn();
    const tree = field({
      value: { date: { year: 2026, month: 10, day: 25 }, time: null },
      onTyped,
    });
    act(() => seg(tree, 'f', 'month').props.onFocus());
    act(() => seg(tree, 'f', 'month').props.onBlur());
    expect(onTyped).not.toHaveBeenCalled();
  });

  it('one Backspace deletes once, even when the change arrives before the key', () => {
    const tree = field();
    act(() => seg(tree, 'f', 'day').props.onFocus());
    act(() => seg(tree, 'f', 'day').props.onChangeText('21'));
    act(() => seg(tree, 'f', 'month').props.onChangeText('5'));
    const month = seg(tree, 'f', 'month');
    act(() => {
      month.props.onChangeText('');
      month.props.onKeyPress({ nativeEvent: { key: 'Backspace' } });
    });
    expect(seg(tree, 'f', 'day').props.value).toBe('21');
    expect(seg(tree, 'f', 'month').props.value).toBe('');
  });
});

describe('digits from an Arabic or Persian number pad', () => {
  it('the on-screen field reads ٢٥ ١٠ ٢٠٢٦ as 25-10-2026', () => {
    const log = jest.fn();
    const tree = mount(<Screen log={log} type="date" />);
    typeIn(tree, 'dp-trigger', [
      ['day', '٢٥'],
      ['month', '١٠'],
      ['year', '٢٠٢٦'],
    ]);
    expect(log).toHaveBeenLastCalledWith('2026-10-25');
  });

  it('the time boxes read ۱۱ as 11', () => {
    const log = jest.fn();
    const tree = mount(
      <DateTimePicker
        type="datetime"
        presentation="inline"
        now={now}
        timeZone="UTC"
        timeFormat="24h"
        testID="dp"
        value="2026-10-25T09:30:00.000Z"
        onChange={log}
      />
    );
    const hour = () =>
      tree.root
        .findAllByType(TextInput)
        .find((i) => i.props.testID === 'dp-time-hour')!;
    act(() => hour().props.onFocus());
    act(() => hour().props.onChangeText('۱۱'));
    act(() =>
      tree.root
        .findAll(
          (n) => n.props.testID === 'dp-confirm' && typeof n.type !== 'string'
        )[0]!
        .props.onPress()
    );
    expect(log).toHaveBeenLastCalledWith('2026-10-25T11:30:00.000Z');
  });
});
