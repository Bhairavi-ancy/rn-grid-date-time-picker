import { describe, expect, it, jest } from '@jest/globals';
import { TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

// Wednesday 21 Oct 2026, 06:30 UTC.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

const mount = (props: Partial<DateTimePickerProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DateTimePicker
        type="datetime"
        value=""
        onChange={() => {}}
        now={now}
        timeZone="UTC"
        timeFormat="24h"
        newDayTime="empty"
        presentation="inline"
        commitMode="instant"
        footer={null}
        testID="dp"
        {...props}
      />
    );
  });
  return tree;
};
const tap = (tree: ReactTestRenderer, d: number) =>
  act(() =>
    tree.root
      .findAll(
        (n) =>
          n.props.testID === `dp-day-2026-10-${d}` &&
          n.props.accessibilityRole === 'button' &&
          typeof n.type !== 'string'
      )[0]
      ?.props.onPress()
  );
const box = (tree: ReactTestRenderer, id: string) => {
  const input = tree.root
    .findAllByType(TextInput)
    .find((i) => i.props.testID === id);
  if (!input) throw new Error(`no box ${id}`);
  return input;
};
const value = (tree: ReactTestRenderer, id: string) =>
  box(tree, id).props.value;
const type = (tree: ReactTestRenderer, id: string, text: string) => {
  act(() => box(tree, id).props.onFocus());
  act(() => box(tree, id).props.onChangeText(text));
};
// Tapping another box: this one loses focus, the other gains it.
const move = (tree: ReactTestRenderer, from: string, to: string) => {
  act(() => box(tree, from).props.onBlur());
  act(() => box(tree, to).props.onFocus());
};
const last = (fn: jest.Mock) => fn.mock.calls[fn.mock.calls.length - 1]?.[0];

describe('minutes the user clears stay empty', () => {
  it('range: clearing an end’s minutes and moving to its hour keeps them empty', () => {
    const onChange = jest.fn();
    const onTimeIssueChange = jest.fn();
    const tree = mount({ mode: 'range', onChange, onTimeIssueChange });
    tap(tree, 25);
    tap(tree, 27);
    for (const end of ['from', 'to']) {
      type(tree, `dp-time-${end}-hour`, '10');
      type(tree, `dp-time-${end}-minute`, '15');
      act(() => box(tree, `dp-time-${end}-minute`).props.onBlur());
    }
    const saves = onChange.mock.calls.length;

    type(tree, 'dp-time-to-minute', '1');
    type(tree, 'dp-time-to-minute', '');
    move(tree, 'dp-time-to-minute', 'dp-time-to-hour');
    expect(value(tree, 'dp-time-to-minute')).toBe('');
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    // Leaving the hour doesn't fill them either.
    act(() => box(tree, 'dp-time-to-hour').props.onBlur());
    expect(value(tree, 'dp-time-to-minute')).toBe('');
    expect(onChange).toHaveBeenCalledTimes(saves);

    // Typing them again saves as usual.
    type(tree, 'dp-time-to-minute', '45');
    expect(last(onTimeIssueChange)).toBe(null);
    expect(last(onChange)).toEqual({
      from: '2026-10-25T10:15:00.000Z',
      to: '2026-10-27T10:45:00.000Z',
    });
  });

  it('minutes never typed still fill as 00 when the hour is left', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    tap(tree, 25);
    type(tree, 'dp-time-hour', '14');
    move(tree, 'dp-time-hour', 'dp-time-minute');
    expect(value(tree, 'dp-time-minute')).toBe('00');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T14:00:00.000Z');
  });

  it('a time set from outside fills the boxes again', () => {
    const props = {
      type: 'datetime',
      onChange: () => {},
      now,
      timeZone: 'UTC',
      timeFormat: '24h',
      presentation: 'inline',
      commitMode: 'instant',
      footer: null,
      testID: 'dp',
    } as const;
    const tree = mount({ value: '2026-10-25T14:15:00.000Z' });
    type(tree, 'dp-time-minute', '');
    act(() => box(tree, 'dp-time-minute').props.onBlur());
    expect(value(tree, 'dp-time-minute')).toBe('');
    act(() =>
      tree.update(
        <DateTimePicker {...props} value="2026-10-25T09:30:00.000Z" />
      )
    );
    expect(value(tree, 'dp-time-hour')).toBe('09');
    expect(value(tree, 'dp-time-minute')).toBe('30');
    // The minutes set from outside are kept when the hour is edited.
    type(tree, 'dp-time-hour', '11');
    act(() => box(tree, 'dp-time-hour').props.onBlur());
    expect(value(tree, 'dp-time-minute')).toBe('30');
  });
});
