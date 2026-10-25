import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useState, type ReactElement } from 'react';
import { Keyboard, Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type { ConstraintContext, DateTimePickerProps } from '../types';
import type { PickerValue } from '../../core/types';
import { createConstraints } from '../../core/constraints';

// Wednesday 21 Oct 2026, 06:30 UTC.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

/** A screen that owns the value, as a real one does. */
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
      type="date"
      now={now}
      timeZone="UTC"
      dateFormat="dd-MM-yyyy"
      timeFormat="24h"
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
const find = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && typeof n.type !== 'string'
  )[0];
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id)!.props.onPress());
const open = (tree: ReactTestRenderer) => press(tree, 'dp-trigger-field');
const close = (tree: ReactTestRenderer) =>
  act(() => find(tree, 'dp-sheet')!.props.onRequestClose());
const day = (tree: ReactTestRenderer, y: number, m: number, d: number) =>
  act(() =>
    tree.root
      .findAll(
        (n) =>
          n.props.testID === `dp-day-${y}-${m}-${d}` &&
          n.props.accessibilityRole === 'button' &&
          typeof n.type !== 'string'
      )[0]!
      .props.onPress()
  );
const box = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAllByType(TextInput).find((i) => i.props.testID === id)!;
const type = (tree: ReactTestRenderer, id: string, text: string) => {
  act(() => box(tree, id).props.onFocus());
  act(() => box(tree, id).props.onChangeText(text));
};
const blur = (tree: ReactTestRenderer, id: string) =>
  act(() => box(tree, id).props.onBlur());
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));

describe('instant mode', () => {
  it('after a clear, picking the same day again is saved', () => {
    const log = jest.fn();
    const tree = mount(<Screen log={log} commitMode="instant" allowClear />);
    open(tree);
    day(tree, 2026, 10, 25);
    close(tree);
    press(tree, 'dp-trigger-clear');
    open(tree);
    day(tree, 2026, 10, 25);
    expect(log.mock.calls.map((c) => c[0])).toEqual([
      '2026-10-25',
      '',
      '2026-10-25',
    ]);
  });

  it('closing with an unfinished range saves nothing', () => {
    const log = jest.fn();
    const onBlur = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        onBlur={onBlur}
        commitMode="instant"
        mode="range"
        initial={{ from: '2026-10-22', to: '2026-10-24' }}
      />
    );
    open(tree);
    day(tree, 2026, 10, 27);
    close(tree);
    expect(log).not.toHaveBeenCalled();
    expect(onBlur).not.toHaveBeenCalled();
  });

  it('closing with a time still being typed saves nothing', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        commitMode="instant"
        initial="2026-10-25T09:00:00.000Z"
      />
    );
    open(tree);
    type(tree, 'dp-time-minute', '4');
    close(tree);
    expect(log).not.toHaveBeenCalled();
  });

  it('a time outside the limits is never saved, even while an allowed one is typed', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        commitMode="instant"
        now={() => new Date(Date.UTC(2026, 9, 21, 10, 45))}
        timeBounds={() => {
          return { max: { hour: 10, minute: 30 } };
        }}
      />
    );
    open(tree);
    day(tree, 2026, 10, 21); // starts at 10:45, past the limit
    type(tree, 'dp-time-minute', '15'); // 10:15, still being typed
    expect(log).not.toHaveBeenCalled();
    blur(tree, 'dp-time-minute');
    expect(log).toHaveBeenLastCalledWith('2026-10-21T10:15:00.000Z');
  });
});

describe('Confirm', () => {
  it('a From/To range with a From that does not parse stays blocked when To is fine', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        mode="range"
        range={{ layout: 'fromTo' }}
        allowTyping
        initial={{ from: '2026-10-22', to: '2026-10-24' }}
      />
    );
    open(tree);
    type(tree, 'dp-from-segment-month', '02');
    type(tree, 'dp-from-segment-day', '31'); // 31-02-2026
    type(tree, 'dp-to-segment-day', '28'); // 28-10-2026
    expect(find(tree, 'dp-confirm')!.props.disabled).toBe(true);
  });

  it('multiple dates, time per date: a time being typed stays with its own day', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        mode="multiple"
        multiple={{ timeMode: 'perDate' }}
        initial={['2026-10-10T09:00:00.000Z', '2026-10-20T09:00:00.000Z']}
      />
    );
    open(tree);
    day(tree, 2026, 10, 20); // makes 20 Oct the day the time row edits
    act(() => box(tree, 'dp-time-hour').props.onFocus());
    act(() => box(tree, 'dp-time-hour').props.onChangeText('3'));
    day(tree, 2026, 10, 5); // added and sorted first
    press(tree, 'dp-confirm');
    const saved = log.mock.calls.at(-1)?.[0] as string[];
    expect(saved).toContain('2026-10-10T09:00:00.000Z');
    expect(saved).toContain('2026-10-20T03:00:00.000Z');
  });

  it('uses the validate passed on the latest render', () => {
    const log = jest.fn();
    const props = {
      type: 'date' as const,
      presentation: 'inline' as const,
      now,
      timeZone: 'UTC',
      testID: 'dp',
      value: '',
      onChange: log,
    };
    const tree = mount(<DateTimePicker {...props} validate={() => null} />);
    day(tree, 2026, 10, 25);
    act(() =>
      tree.update(<DateTimePicker {...props} validate={() => 'nope'} />)
    );
    press(tree, 'dp-confirm');
    expect(log).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('nope');
  });

  it('is enabled again after reopening, even if a typed date did not parse', () => {
    const log = jest.fn();
    const tree = mount(<Screen log={log} allowTyping initial="2026-10-21" />);
    open(tree);
    type(tree, 'dp-value-segment-month', '02');
    type(tree, 'dp-value-segment-day', '31');
    expect(find(tree, 'dp-confirm')!.props.disabled).toBe(true);
    close(tree);
    open(tree);
    expect(find(tree, 'dp-confirm')!.props.disabled).toBe(false);
  });
});

describe('keyboard folding inline', () => {
  const listeners: Record<string, () => void> = {};
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("folds the calendar only for the picker's own boxes", () => {
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      cb: () => void
    ) => {
      listeners[event] = cb;
      return { remove: () => {} };
    }) as never);
    const tree = mount(
      <Screen log={jest.fn()} presentation="inline" allowTyping />
    );
    const showEvent = Object.keys(listeners).find((k) => k.endsWith('Show'))!;
    // Another field on the screen raises the keyboard.
    act(() => listeners[showEvent]!());
    expect(find(tree, 'dp-calendar')).toBeTruthy();
    // One of the picker's own boxes does.
    act(() => box(tree, 'dp-value-segment-day').props.onFocus());
    expect(find(tree, 'dp-calendar')).toBeUndefined();
  });
});

describe('limits and opening month', () => {
  it('getConstraints gets the current time in timeZone', () => {
    const getConstraints = jest.fn((ctx: ConstraintContext) =>
      createConstraints({
        type: ctx.type,
        timeZone: ctx.timeZone,
        now: ctx.now,
      })
    );
    const tree = mount(
      <Screen
        log={jest.fn()}
        timeZone="Asia/Kolkata"
        getConstraints={getConstraints}
      />
    );
    open(tree);
    // 06:30 UTC is 12:00 in India.
    expect(getConstraints.mock.calls.at(-1)?.[0].nowTime).toEqual({
      hour: 12,
      minute: 0,
    });
  });

  it('initialVisibleDate opens an empty calendar on that month, and the value wins', () => {
    const empty = mount(
      <Screen
        log={jest.fn()}
        initialVisibleDate={{ year: 2000, month: 1, day: 1 }}
      />
    );
    open(empty);
    expect(find(empty, 'dp-day-2000-1-15')).toBeTruthy();
    const withValue = mount(
      <Screen
        log={jest.fn()}
        initial="2026-10-21"
        initialVisibleDate={{ year: 2000, month: 1, day: 1 }}
      />
    );
    open(withValue);
    expect(find(withValue, 'dp-day-2026-10-21')).toBeTruthy();
  });
});
