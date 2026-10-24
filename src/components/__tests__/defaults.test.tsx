import { describe, expect, it, jest } from '@jest/globals';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { createConstraints } from '../../core/constraints';
import type { ValueAdapter } from '../../core/types';
import DateTimePicker from '../DateTimePicker';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import type { ConstraintContext, DateTimePickerProps } from '../types';

// Wednesday 21 Oct 2026, 06:30 UTC.
const now = () => new Date(Date.UTC(2026, 9, 21, 6, 30));

const mount = (props: DateTimePickerProps): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DateTimePicker {...props} />);
  });
  return tree;
};
const find = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) => n.props.testID === id && typeof n.type !== 'string'
  )[0];
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id)?.props.onPress());
const dayCells = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (n) =>
      typeof n.props.testID === 'string' &&
      n.props.testID.startsWith('dp-day-') &&
      n.props.accessibilityRole === 'button' &&
      typeof n.type !== 'string'
  );
const dayCell = (tree: ReactTestRenderer, d: number) =>
  dayCells(tree).find((n) => n.props.testID === `dp-day-2026-10-${d}`);
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const typeBox = (tree: ReactTestRenderer, id: string, text: string) => {
  const input = tree.root
    .findAllByType(TextInput)
    .find((i) => i.props.testID === id);
  if (!input) throw new Error(`no box ${id}`);
  act(() => input.props.onFocus());
  act(() => input.props.onChangeText(text));
  act(() => input.props.onBlur());
};

describe('defaults: no optional props', () => {
  it('renders, opens the built-in sheet, picks a day and confirms an ISO date', () => {
    const onChange = jest.fn();
    const tree = mount({ type: 'date', value: '', onChange, testID: 'dp' });
    expect(find(tree, 'dp-sheet')).toBeUndefined();
    press(tree, 'dp-trigger-field');
    expect(find(tree, 'dp-sheet')).toBeTruthy();
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        DEFAULT_STRINGS.titleDate,
        DEFAULT_STRINGS.confirm,
      ])
    );
    const day = dayCells(tree).find((n) => !n.props.disabled);
    act(() => day?.props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(find(tree, 'dp-sheet')).toBeUndefined();
  });
});

describe('defaults: overrides', () => {
  it('getConstraints is used as is, with the limit props in ctx.limits', () => {
    const getConstraints = jest.fn((ctx: ConstraintContext) =>
      createConstraints({
        type: ctx.type,
        timeZone: ctx.timeZone,
        now: ctx.now,
        isEnabled: (d) => d.day === 15,
      })
    );
    const minDate = { year: 2026, month: 10, day: 20 };
    const tree = mount({
      type: 'date',
      value: '',
      onChange: () => {},
      now,
      timeZone: 'UTC',
      minDate,
      disabledWeekdays: [6, 7],
      holidays: ['2026-10-23'],
      getConstraints,
      testID: 'dp',
    });
    press(tree, 'dp-trigger-field');
    const ctx = getConstraints.mock.calls[0]?.[0];
    expect(ctx).toMatchObject({
      type: 'date',
      timeZone: 'UTC',
      today: { year: 2026, month: 10, day: 21 },
      holidays: ['2026-10-23'],
      limits: { minDate, disabledWeekdays: [6, 7] },
    });
    // minDate isn't applied on top: only the returned constraints count.
    expect(dayCell(tree, 15)?.props.disabled).toBe(false);
    expect(dayCell(tree, 22)?.props.disabled).toBe(true);
  });

  it('newDayTime wins over a time typed before the day and over "now"', () => {
    const onChange = jest.fn();
    const props: DateTimePickerProps = {
      type: 'datetime',
      value: '',
      onChange,
      now,
      timeZone: 'UTC',
      timeFormat: '24h',
      newDayTime: { hour: 9, minute: 0 },
      testID: 'dp',
    };
    const tree = mount(props);
    press(tree, 'dp-trigger-field');
    typeBox(tree, 'dp-time-hour', '14');
    typeBox(tree, 'dp-time-minute', '15');
    act(() => dayCell(tree, 25)?.props.onPress());
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-25T09:00:00.000Z');

    const untyped = mount(props);
    press(untyped, 'dp-trigger-field');
    act(() => dayCell(untyped, 26)?.props.onPress());
    press(untyped, 'dp-confirm');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-26T09:00:00.000Z');
  });

  it('onBeforeOpen is called before onOpen', () => {
    const onBeforeOpen = jest.fn();
    const onOpen = jest.fn();
    const tree = mount({
      type: 'date',
      value: '',
      onChange: () => {},
      onBeforeOpen,
      onOpen,
      testID: 'dp',
    });
    press(tree, 'dp-trigger-field');
    expect(onBeforeOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onBeforeOpen.mock.invocationCallOrder[0]).toBeLessThan(
      onOpen.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('a custom adapter formats the value, even when a new adapter object comes in while open', () => {
    // Stores dates as 'DD.MM.YYYY'.
    const dotted = (): ValueAdapter => {
      return {
        parse: (raw) => {
          const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
          return m
            ? {
                date: { year: +m[3]!, month: +m[2]!, day: +m[1]! },
                time: null,
              }
            : null;
        },
        format: ({ date }) =>
          [date.day, date.month]
            .map((n) => String(n).padStart(2, '0'))
            .concat(String(date.year))
            .join('.'),
      };
    };
    const onChange = jest.fn();
    const props: DateTimePickerProps = {
      type: 'date',
      value: '20.10.2026',
      onChange,
      now,
      timeZone: 'UTC',
      valueFormat: dotted(),
      testID: 'dp',
    };
    const tree = mount(props);
    press(tree, 'dp-trigger-field');
    expect(dayCell(tree, 20)?.props.accessibilityState.selected).toBe(true);
    act(() => dayCell(tree, 25)?.props.onPress());
    act(() =>
      tree.update(<DateTimePicker {...props} valueFormat={dotted()} />)
    );
    press(tree, 'dp-confirm');
    expect(onChange).toHaveBeenCalledWith('25.10.2026');
  });
});
