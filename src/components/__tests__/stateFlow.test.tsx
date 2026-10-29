import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useState, type ReactElement } from 'react';
import { Keyboard, Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import DateTimePicker from '../DateTimePicker';
import type {
  ConstraintContext,
  DateTimePickerProps,
  PickerState,
} from '../types';
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

describe('× in the field above the calendar', () => {
  it('instant, inline: clears the saved value in one save', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen log={log} commitMode="instant" presentation="inline" allowClear />
    );
    day(tree, 2026, 10, 25);
    press(tree, 'dp-value-clear');
    expect(log.mock.calls.map((c) => c[0])).toEqual(['2026-10-25', '']);
    expect(texts(tree)).not.toContain('25-10-2026');
    // An empty field has no ×.
    expect(find(tree, 'dp-value-clear')).toBeUndefined();
  });

  it('instant, inline range: clears both ends; a half-picked range saves nothing', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        commitMode="instant"
        presentation="inline"
        mode="range"
        allowClear
      />
    );
    day(tree, 2026, 10, 22);
    day(tree, 2026, 10, 24);
    press(tree, 'dp-value-clear');
    expect(log.mock.calls.map((c) => c[0])).toEqual([
      { from: '2026-10-22', to: '2026-10-24' },
      '',
    ]);
    day(tree, 2026, 10, 27);
    press(tree, 'dp-value-clear');
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('with Confirm: clears the selection only; the saved value stays until Confirm', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        allowClear
        sheet={{ showField: true }}
        initial="2026-10-25"
      />
    );
    open(tree);
    press(tree, 'dp-value-clear');
    expect(log).not.toHaveBeenCalled();
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

describe('time row editing', () => {
  it('Backspace from the empty minutes back to the hour saves nothing and leaves the minutes empty', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        commitMode="instant"
        initial="2026-10-25T09:30:00.000Z"
      />
    );
    open(tree);
    type(tree, 'dp-time-minute', '');
    act(() =>
      box(tree, 'dp-time-minute').props.onKeyPress({
        nativeEvent: { key: 'Backspace' },
      })
    );
    // Focus moves to the hour: the minute box blurs.
    blur(tree, 'dp-time-minute');
    expect(box(tree, 'dp-time-minute').props.value).toBe('');
    expect(log).not.toHaveBeenCalled();
  });

  it('both boxes select their text on focus, so a typed digit replaces a full box', () => {
    const tree = mount(<Screen log={jest.fn()} type="datetime" />);
    open(tree);
    expect(box(tree, 'dp-time-hour').props.selectTextOnFocus).toBe(true);
    expect(box(tree, 'dp-time-minute').props.selectTextOnFocus).toBe(true);
  });
});

/** Whether the calendar shows: a folded one stays mounted but hidden. */
const shown = (tree: ReactTestRenderer) => {
  const calendar = find(tree, 'dp-calendar');
  if (!calendar) return false;
  let node = calendar.parent;
  while (node) {
    const style = [].concat(node.props.style ?? []) as { display?: string }[];
    if (style.some((x) => x?.display === 'none')) return false;
    node = node.parent;
  }
  return true;
};

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
      <Screen
        log={jest.fn()}
        presentation="inline"
        allowTyping
        hideCalendarOnKeyboard
      />
    );
    const showEvent = Object.keys(listeners).find((k) => k.endsWith('Show'))!;
    // Another field on the screen raises the keyboard.
    act(() => listeners[showEvent]!());
    expect(find(tree, 'dp-calendar')).toBeTruthy();
    // One of the picker's own boxes does.
    act(() => box(tree, 'dp-value-segment-day').props.onFocus());
    expect(shown(tree)).toBe(false);
  });

  it('a folded calendar comes back on the month it showed', () => {
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      cb: () => void
    ) => {
      listeners[event] = cb;
      return { remove: () => {} };
    }) as never);
    const tree = mount(
      <Screen
        log={jest.fn()}
        initial="2026-10-15"
        allowTyping
        hideCalendarOnKeyboard
      />
    );
    open(tree);
    press(tree, 'dp-chip-12');
    const showEvent = Object.keys(listeners).find((k) => k.endsWith('Show'))!;
    const hideEvent = Object.keys(listeners).find((k) => k.endsWith('Hide'))!;
    act(() => listeners[showEvent]!());
    expect(shown(tree)).toBe(false);
    act(() => listeners[hideEvent]!());
    expect(shown(tree)).toBe(true);
    expect(find(tree, 'dp-day-2026-12-15')).toBeTruthy();
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

  it('dependsOnNow limits follow the clock while the sheet is open', () => {
    jest.useFakeTimers();
    try {
      let clock = Date.UTC(2026, 9, 21, 6, 30);
      const log = jest.fn();
      const tree = mount(
        <Screen
          log={log}
          type="datetime"
          now={() => new Date(clock)}
          getConstraints={(ctx) =>
            createConstraints({
              type: ctx.type,
              timeZone: ctx.timeZone,
              now: ctx.now,
              min: { date: ctx.today, time: ctx.nowTime },
              dependsOnNow: true,
            })
          }
        />
      );
      open(tree);
      day(tree, 2026, 10, 21);
      // An hour later, the 06:30 picked on open is in the past.
      clock += 60 * 60_000;
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      press(tree, 'dp-confirm');
      expect(log).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
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

describe('renderTimeRow can set the time', () => {
  const MyRow = (state: PickerState) => (
    <>
      <Text testID="my-time">
        {state.time ? `${state.time.hour}:${state.time.minute}` : 'none'}
      </Text>
      <Text testID="my-range">{JSON.stringify(state.rangeTimes)}</Text>
      <Text
        testID="set-1415"
        onPress={() => state.setTime({ hour: 14, minute: 15 })}
      >
        14:15
      </Text>
      <Text
        testID="set-end-1800"
        onPress={() => state.setTime({ hour: 18, minute: 0 }, 'to')}
      >
        end 18:00
      </Text>
    </>
  );
  const shown = (tree: ReactTestRenderer, id: string) =>
    [].concat(find(tree, id)!.props.children).join('');

  it('single: a time set before the day is used, and one set after replaces it', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen log={log} type="datetime" renderTimeRow={MyRow} />
    );
    open(tree);
    press(tree, 'set-1415');
    expect(shown(tree, 'my-time')).toBe('14:15');
    day(tree, 2026, 10, 25);
    press(tree, 'dp-confirm');
    expect(log).toHaveBeenLastCalledWith('2026-10-25T14:15:00.000Z');
  });

  it('range: rangeTimes shows both ends, and setTime takes the end', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        mode="range"
        renderTimeRow={MyRow}
        initial={{
          from: '2026-10-22T09:00:00.000Z',
          to: '2026-10-24T09:00:00.000Z',
        }}
      />
    );
    open(tree);
    press(tree, 'set-end-1800');
    expect(JSON.parse(shown(tree, 'my-range'))).toEqual({
      from: { hour: 9, minute: 0 },
      to: { hour: 18, minute: 0 },
    });
    press(tree, 'dp-confirm');
    expect(log).toHaveBeenLastCalledWith({
      from: '2026-10-22T09:00:00.000Z',
      to: '2026-10-24T18:00:00.000Z',
    });
  });

  it('multiple with a shared time: setTime sets it for every day', () => {
    const log = jest.fn();
    const tree = mount(
      <Screen
        log={log}
        type="datetime"
        mode="multiple"
        renderTimeRow={MyRow}
        initial={['2026-10-10T09:00:00.000Z', '2026-10-11T09:00:00.000Z']}
      />
    );
    open(tree);
    press(tree, 'set-1415');
    press(tree, 'dp-confirm');
    expect(log).toHaveBeenLastCalledWith([
      '2026-10-10T14:15:00.000Z',
      '2026-10-11T14:15:00.000Z',
    ]);
  });
});
