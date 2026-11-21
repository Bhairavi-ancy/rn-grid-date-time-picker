import { describe, expect, it, jest } from '@jest/globals';
import { TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { DateTimePickerProps } from '../types';

// Wednesday 21 Oct 2026, 06:30 UTC.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

// An inline 'instant' picker, as a filter sheet with its own Apply button uses.
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
const type = (tree: ReactTestRenderer, id: string, text: string) => {
  act(() => box(tree, id).props.onFocus());
  act(() => box(tree, id).props.onChangeText(text));
};
const leave = (tree: ReactTestRenderer, id: string) =>
  act(() => box(tree, id).props.onBlur());
const last = (fn: jest.Mock) => fn.mock.calls[fn.mock.calls.length - 1]?.[0];

describe('onTimeIssueChange', () => {
  it('single: INCOMPLETE while half typed or cleared, null once the time is good', () => {
    const onTimeIssueChange = jest.fn();
    const onChange = jest.fn();
    const tree = mount({ onTimeIssueChange, onChange });
    expect(last(onTimeIssueChange)).toBe(null);
    tap(tree, 25);
    // A new day with no time typed yet can't be saved: reported, nothing saved.
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    expect(onChange).not.toHaveBeenCalled();
    type(tree, 'dp-time-hour', '14');
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    type(tree, 'dp-time-minute', '15');
    leave(tree, 'dp-time-minute');
    expect(last(onTimeIssueChange)).toBe(null);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T14:15:00.000Z');
    const saves = onChange.mock.calls.length;

    // Clearing saves nothing (the parent keeps 14:15) but reports it.
    type(tree, 'dp-time-minute', '');
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    type(tree, 'dp-time-hour', '');
    leave(tree, 'dp-time-hour');
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    expect(onChange).toHaveBeenCalledTimes(saves);

    type(tree, 'dp-time-hour', '09');
    type(tree, 'dp-time-minute', '30');
    expect(last(onTimeIssueChange)).toBe(null);
  });

  it('single: another day keeps the time, so it is saved, not INCOMPLETE', () => {
    const onTimeIssueChange = jest.fn();
    const onChange = jest.fn();
    const tree = mount({ onTimeIssueChange, onChange });
    tap(tree, 25);
    type(tree, 'dp-time-hour', '10');
    type(tree, 'dp-time-minute', '00');
    leave(tree, 'dp-time-minute');
    tap(tree, 27);
    expect(last(onTimeIssueChange)).toBe(null);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-27T10:00:00.000Z');
  });

  it('range: a new day after a full range reports INCOMPLETE until the range is finished again', () => {
    const onTimeIssueChange = jest.fn();
    const onChange = jest.fn();
    const tree = mount({ mode: 'range', onTimeIssueChange, onChange });
    tap(tree, 25);
    tap(tree, 27);
    for (const end of ['from', 'to']) {
      type(tree, `dp-time-${end}-hour`, '10');
      type(tree, `dp-time-${end}-minute`, '15');
      leave(tree, `dp-time-${end}-minute`);
    }
    expect(last(onTimeIssueChange)).toBe(null);
    const saves = onChange.mock.calls.length;
    tap(tree, 22);
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    expect(onChange).toHaveBeenCalledTimes(saves);
    tap(tree, 24);
    expect(last(onTimeIssueChange)).toBe(null);
    expect(onChange.mock.calls.length).toBeGreaterThan(saves);
  });

  it('date type: a picked day is never INCOMPLETE', () => {
    const onTimeIssueChange = jest.fn();
    const tree = mount({ type: 'date', onTimeIssueChange });
    tap(tree, 25);
    expect(onTimeIssueChange.mock.calls.every((c) => c[0] === null)).toBe(true);
  });

  it('range: INCOMPLETE until both ends have a day and a time', () => {
    const onTimeIssueChange = jest.fn();
    const onChange = jest.fn();
    const tree = mount({ mode: 'range', onTimeIssueChange, onChange });
    expect(last(onTimeIssueChange)).toBe(null);
    tap(tree, 25);
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    tap(tree, 27);
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    type(tree, 'dp-time-from-hour', '10');
    type(tree, 'dp-time-from-minute', '15');
    leave(tree, 'dp-time-from-minute');
    // From has its time, To still has none.
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
    expect(onChange).not.toHaveBeenCalled();
    type(tree, 'dp-time-to-hour', '11');
    type(tree, 'dp-time-to-minute', '30');
    leave(tree, 'dp-time-to-minute');
    expect(last(onTimeIssueChange)).toBe(null);
    expect(onChange).toHaveBeenCalled();
  });

  it('reports only changes', () => {
    const onTimeIssueChange = jest.fn();
    const tree = mount({ onTimeIssueChange });
    tap(tree, 25);
    type(tree, 'dp-time-hour', '1');
    type(tree, 'dp-time-hour', '14');
    type(tree, 'dp-time-minute', '15');
    const calls = onTimeIssueChange.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([null, 'INCOMPLETE', null]);
  });

  it('range: an end cleared reports INCOMPLETE', () => {
    const onTimeIssueChange = jest.fn();
    const tree = mount({ mode: 'range', onTimeIssueChange });
    tap(tree, 25);
    tap(tree, 27);
    for (const end of ['from', 'to']) {
      type(tree, `dp-time-${end}-hour`, '10');
      type(tree, `dp-time-${end}-minute`, '15');
      leave(tree, `dp-time-${end}-minute`);
    }
    expect(last(onTimeIssueChange)).toBe(null);
    type(tree, 'dp-time-to-minute', '');
    type(tree, 'dp-time-to-hour', '');
    leave(tree, 'dp-time-to-hour');
    expect(last(onTimeIssueChange)).toBe('INCOMPLETE');
  });
});
