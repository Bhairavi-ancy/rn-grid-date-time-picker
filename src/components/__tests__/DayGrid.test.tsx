import { describe, expect, it, jest } from '@jest/globals';
import { Text, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { createConstraints } from '../../core/constraints';
import DayGrid, {
  isSwipeStart,
  swipeStep,
  type DayGridProps,
} from '../calendar/DayGrid';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';

const NOW = new Date(Date.UTC(2026, 9, 21, 6, 30));

const mount = (props: Partial<DayGridProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DayGrid
        year={2026}
        month={10}
        firstDayOfWeek={7}
        showOutsideDays
        showHolidays
        today={{ year: 2026, month: 10, day: 21 }}
        selection={{ kind: 'single', day: null }}
        constraints={createConstraints({
          type: 'date',
          timeZone: 'Asia/Kolkata',
          now: NOW,
        })}
        locale="en-IN"
        onSelectDay={() => {}}
        tokens={buildTokens()}
        strings={DEFAULT_STRINGS}
        testID="g"
        {...props}
      />
    );
  });
  return tree;
};

describe('DayGrid', () => {
  it('draws 5 or 6 weeks and hides outside days when asked', () => {
    const withOutside = mount({});
    expect(
      withOutside.root.findAll(
        (n) =>
          n.props.testID === 'g-day-2026-9-27' && typeof n.type !== 'string'
      ).length
    ).toBeGreaterThan(0);
    const without = mount({ showOutsideDays: false });
    expect(
      without.root.findAll((n) => n.props.testID === 'g-day-2026-9-27').length
    ).toBe(0);
    expect(
      without.root.findAll((n) => n.props.testID === 'g-day-2026-10-31').length
    ).toBeGreaterThan(0);
  });

  it('renderDay and renderWeekday replace the defaults; a greyed day ignores the press', () => {
    const onSelectDay = jest.fn();
    const presses: Record<string, () => void> = {};
    const constraints = createConstraints({
      type: 'date',
      timeZone: 'Asia/Kolkata',
      now: NOW,
      minDate: { year: 2026, month: 10, day: 10 },
    });
    const tree = mount({
      constraints,
      onSelectDay,
      renderWeekday: (wd, name) => <Text>{`w${wd}:${name}`}</Text>,
      renderDay: (state, onPress) => {
        presses[`${state.date.month}-${state.date.day}`] = onPress;
        return <View testID={`custom-${state.date.day}`} />;
      },
    });
    const labels = tree.root.findAllByType(Text).map((t) => t.props.children);
    expect(labels[0]).toBe('w7:Su');
    act(() => presses['10-5']());
    expect(onSelectDay).not.toHaveBeenCalled();
    act(() => presses['10-12']());
    expect(onSelectDay).toHaveBeenCalledWith({
      year: 2026,
      month: 10,
      day: 12,
    });
  });

  it('a long, mostly horizontal swipe changes month (left = next, mirrored in RTL)', () => {
    expect(isSwipeStart(20, 5)).toBe(true);
    expect(isSwipeStart(20, 15)).toBe(false); // diagonal: leave it to the sheet scroll
    expect(isSwipeStart(8, 0)).toBe(false);
    expect(swipeStep(-80, false)).toBe(1);
    expect(swipeStep(80, false)).toBe(-1);
    expect(swipeStep(-80, true)).toBe(-1);
    expect(swipeStep(30, false)).toBe(0);
  });
});
