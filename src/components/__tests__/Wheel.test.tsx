import { describe, expect, it, jest } from '@jest/globals';
import { ScrollView, Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';
import TimeWheel, {
  nearestEnabled,
  stepEnabled,
  WHEEL_ROW_HEIGHT,
  type TimeWheelProps,
} from '../time/Wheel';

const items = (disabled: number[]) =>
  [0, 1, 2, 3, 4].map((v) => {
    return { value: v, label: String(v), disabled: disabled.includes(v) };
  });

describe('wheel helpers', () => {
  it('finds the nearest enabled row, either way', () => {
    expect(nearestEnabled(items([2]), 2)).toBe(3);
    expect(nearestEnabled(items([2, 3, 4]), 3)).toBe(1);
    expect(nearestEnabled(items([]), 9)).toBe(4);
  });

  it('steps over disabled rows and stops at the ends', () => {
    expect(stepEnabled(items([1, 2]), 0, 1)).toBe(3);
    expect(stepEnabled(items([]), 4, 1)).toBe(4);
    expect(stepEnabled(items([0]), 1, -1)).toBe(1);
  });
});

const mount = (props: Partial<TimeWheelProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <TimeWheel
        time={{ hour: 9, minute: 30 }}
        onTime={() => {}}
        onSpinChange={() => {}}
        timeFormat="12h"
        tokens={buildTokens()}
        strings={DEFAULT_STRINGS}
        testID="w"
        {...props}
      />
    );
  });
  return tree;
};
const column = (tree: ReactTestRenderer, key: string) =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `w-${key}` &&
      n.props.accessibilityRole === 'adjustable'
  )[0];
const scroll = (tree: ReactTestRenderer, key: string) =>
  tree.root
    .findAllByType(ScrollView)
    .find((n) => n.props.testID === `w-${key}-scroll`)!;
const labelsOf = (tree: ReactTestRenderer, key: string) =>
  scroll(tree, key)
    .findAllByType(Text)
    .map((t) => t.props.children);
const stopAt = (tree: ReactTestRenderer, key: string, row: number) => {
  const sv = scroll(tree, key);
  act(() => sv.props.onScrollBeginDrag());
  act(() => sv.props.onMomentumScrollBegin());
  act(() =>
    sv.props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: 0, y: row * WHEEL_ROW_HEIGHT } },
    })
  );
};

describe('TimeWheel', () => {
  it('has hour, minute and AM/PM columns in 12h, two columns in 24h', () => {
    const tree = mount({});
    expect(labelsOf(tree, 'hour')).toHaveLength(12);
    expect(labelsOf(tree, 'minute')).toHaveLength(60);
    expect(column(tree, 'period')).toBeTruthy();
    const h24 = mount({ timeFormat: '24h' });
    expect(labelsOf(h24, 'hour')).toHaveLength(24);
    expect(column(h24, 'period')).toBeUndefined();
  });

  it('minute rows follow minuteStep', () => {
    expect(labelsOf(mount({ minuteStep: 15 }), 'minute')).toEqual([
      '00',
      '15',
      '30',
      '45',
    ]);
  });

  it('reports the row it settles on, and spinning while it moves', () => {
    const onTime = jest.fn();
    const onSpinChange = jest.fn();
    const tree = mount({ onTime, onSpinChange });
    const sv = scroll(tree, 'minute');
    act(() => sv.props.onScrollBeginDrag());
    expect(onSpinChange).toHaveBeenLastCalledWith(true);
    expect(onTime).not.toHaveBeenCalled();
    act(() =>
      sv.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 0, y: 45 * WHEEL_ROW_HEIGHT } },
      })
    );
    expect(onTime).toHaveBeenCalledWith({ hour: 9, minute: 45 });
    expect(onSpinChange).toHaveBeenLastCalledWith(false);
  });

  it('a slow drag with no fling settles after the drag ends', () => {
    jest.useFakeTimers();
    const onTime = jest.fn();
    const tree = mount({ onTime });
    const sv = scroll(tree, 'hour');
    act(() => sv.props.onScrollBeginDrag());
    act(() =>
      sv.props.onScrollEndDrag({
        nativeEvent: { contentOffset: { x: 0, y: 2 * WHEEL_ROW_HEIGHT } },
      })
    );
    expect(onTime).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(100));
    expect(onTime).toHaveBeenCalledWith({ hour: 3, minute: 30 });
    jest.useRealTimers();
  });

  it('PM keeps the hour, and a row outside the limits springs to the nearest allowed one', () => {
    const onTime = jest.fn();
    const bounds = { min: { hour: 9, minute: 15 } };
    const tree = mount({ onTime, bounds });
    stopAt(tree, 'period', 1);
    expect(onTime).toHaveBeenLastCalledWith({ hour: 21, minute: 30 });
    stopAt(tree, 'minute', 5); // 09:05 is before 09:15
    expect(onTime).toHaveBeenLastCalledWith({ hour: 9, minute: 15 });
  });

  it('screen readers: adjustable, with the value read out and increment skipping blocked rows', () => {
    const onTime = jest.fn();
    const tree = mount({ onTime, bounds: { max: { hour: 11, minute: 59 } } });
    const period = column(tree, 'period');
    expect(period.props.accessibilityValue).toEqual({
      text: DEFAULT_STRINGS.am,
    });
    act(() =>
      period.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      })
    );
    expect(onTime).not.toHaveBeenCalled(); // PM is not allowed
    const hour = column(tree, 'hour');
    act(() =>
      hour.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      })
    );
    expect(onTime).toHaveBeenCalledWith({ hour: 10, minute: 30 });
  });
});
