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
        testID="dp"
        {...props}
      />
    );
  });
  return tree;
};
const find = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && typeof n.type !== 'string'
  )[0];
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id)?.props.onPress());
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
const box = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAllByType(TextInput).find((i) => i.props.testID === id);
const typeBox = (tree: ReactTestRenderer, id: string, text: string) => {
  const input = box(tree, id);
  if (!input) throw new Error(`no box ${id}`);
  act(() => input.props.onFocus());
  act(() => input.props.onChangeText(text));
  act(() => input.props.onBlur());
};
const confirmDisabled = (tree: ReactTestRenderer) =>
  !!find(tree, 'dp-confirm')?.props.disabled;

describe("newDayTime 'empty'", () => {
  it('a picked day has no time: Confirm waits until the time is typed', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    expect(box(tree, 'dp-time-hour')?.props.value).toBe('');
    expect(box(tree, 'dp-time-minute')?.props.value).toBe('');
    expect(confirmDisabled(tree)).toBe(true);
    // An hour alone isn't a time: Confirm waits for the minutes too.
    typeBox(tree, 'dp-time-hour', '14');
    expect(confirmDisabled(tree)).toBe(true);
    typeBox(tree, 'dp-time-minute', '15');
    expect(confirmDisabled(tree)).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T14:15:00.000Z');
  });

  it('a saved time is kept when another day is picked', () => {
    const onChange = jest.fn();
    const tree = mount({ value: '2026-10-20T10:15:00.000Z', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    expect(confirmDisabled(tree)).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T10:15:00.000Z');
  });

  it('a range leaves both times empty, also for an end on the start day', () => {
    const onChange = jest.fn();
    const tree = mount({ mode: 'range', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 20);
    tap(tree, 20);
    for (const id of ['from', 'to'])
      expect(box(tree, `dp-time-${id}-hour`)?.props.value).toBe('');
    expect(confirmDisabled(tree)).toBe(true);
    typeBox(tree, 'dp-time-from-hour', '09');
    typeBox(tree, 'dp-time-from-minute', '00');
    expect(confirmDisabled(tree)).toBe(true);
    expect(box(tree, 'dp-time-to-hour')?.props.value).toBe('');
    typeBox(tree, 'dp-time-to-hour', '11');
    expect(confirmDisabled(tree)).toBe(true);
    typeBox(tree, 'dp-time-to-minute', '30');
    expect(confirmDisabled(tree)).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith({
      from: '2026-10-20T09:00:00.000Z',
      to: '2026-10-20T11:30:00.000Z',
    });
  });

  it("commitMode 'instant' saves nothing until the time is complete", () => {
    const onChange = jest.fn();
    const tree = mount({ commitMode: 'instant', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    expect(onChange).not.toHaveBeenCalled();
    typeBox(tree, 'dp-time-hour', '14');
    expect(onChange).not.toHaveBeenCalled();
    typeBox(tree, 'dp-time-minute', '15');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T14:15:00.000Z');
  });

  it('an hour left with empty minutes (focus moves away) still counts as :00', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    typeBox(tree, 'dp-time-hour', '9');
    expect(box(tree, 'dp-time-minute')?.props.value).toBe('00');
    expect(confirmDisabled(tree)).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T09:00:00.000Z');
  });

  it('multiple dates share one empty time until it is set', () => {
    const onChange = jest.fn();
    const tree = mount({ mode: 'multiple', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 20);
    tap(tree, 22);
    expect(confirmDisabled(tree)).toBe(true);
    typeBox(tree, 'dp-time-hour', '08');
    typeBox(tree, 'dp-time-minute', '45');
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith([
      '2026-10-20T08:45:00.000Z',
      '2026-10-22T08:45:00.000Z',
    ]);
  });
});

describe('full minutes save the time while the box still has focus', () => {
  // Typing only: focus stays in the box (no blur), as on a phone before the
  // user taps anywhere else.
  const typeOnly = (tree: ReactTestRenderer, id: string, text: string) => {
    const input = box(tree, id);
    if (!input) throw new Error(`no box ${id}`);
    act(() => input.props.onFocus());
    act(() => input.props.onChangeText(text));
  };

  it("commitMode 'instant' saves on the second minute digit, not the first", () => {
    const onChange = jest.fn();
    const tree = mount({ commitMode: 'instant', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    typeOnly(tree, 'dp-time-hour', '9');
    typeOnly(tree, 'dp-time-minute', '3');
    expect(onChange).not.toHaveBeenCalled();
    typeOnly(tree, 'dp-time-minute', '30');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T09:30:00.000Z');
    // Leaving the box afterwards doesn't save the same time again.
    act(() => box(tree, 'dp-time-minute')?.props.onBlur());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("commitMode 'instant' range: each end saves when its minutes are full", () => {
    const onChange = jest.fn();
    const tree = mount({ mode: 'range', commitMode: 'instant', onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 20);
    tap(tree, 22);
    typeOnly(tree, 'dp-time-from-hour', '9');
    typeOnly(tree, 'dp-time-from-minute', '15');
    typeOnly(tree, 'dp-time-to-hour', '6');
    expect(onChange).not.toHaveBeenCalled();
    typeOnly(tree, 'dp-time-to-minute', '45');
    expect(onChange).toHaveBeenLastCalledWith({
      from: '2026-10-20T09:15:00.000Z',
      to: '2026-10-22T06:45:00.000Z',
    });
  });

  it('Confirm stays off while only the hour is typed', () => {
    const tree = mount({});
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    typeOnly(tree, 'dp-time-hour', '9');
    expect(confirmDisabled(tree)).toBe(true);
    typeOnly(tree, 'dp-time-hour', '09');
    act(() => box(tree, 'dp-time-hour')?.props.onBlur());
    typeOnly(tree, 'dp-time-minute', '');
    expect(confirmDisabled(tree)).toBe(true);
    typeOnly(tree, 'dp-time-minute', '3');
    expect(confirmDisabled(tree)).toBe(false);
  });

  it('Confirm saves the typed minutes without leaving the box', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    press(tree, 'dp-trigger-field');
    tap(tree, 25);
    typeOnly(tree, 'dp-time-hour', '9');
    typeOnly(tree, 'dp-time-minute', '30');
    expect(confirmDisabled(tree)).toBe(false);
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T09:30:00.000Z');
  });
});
