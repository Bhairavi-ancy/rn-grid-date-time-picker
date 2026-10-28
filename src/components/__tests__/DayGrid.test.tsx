import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet, Text, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { createConstraints } from '../../core/constraints';
import DayGrid, {
  isSwipeStart,
  swipeStep,
  type DayGridProps,
} from '../calendar/DayGrid';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { DEFAULT_TOKENS, buildTokens } from '../theme/tokens';

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
  it('a greyed day is grey, not struck through', () => {
    const tree = mount({
      constraints: createConstraints({
        type: 'date',
        timeZone: 'Asia/Kolkata',
        now: NOW,
        minDate: { year: 2026, month: 10, day: 15 },
      }),
    });
    const dayText = (day: number) => {
      const cell = tree.root.findAll(
        (n) =>
          n.props.testID === `g-day-2026-10-${day}` &&
          typeof n.type !== 'string'
      )[0]!;
      return StyleSheet.flatten(cell.findAllByType(Text)[0]!.props.style);
    };
    expect(dayText(10).color).toBe(DEFAULT_TOKENS.disabledText);
    expect(dayText(10).textDecorationLine).toBeUndefined();
    expect(dayText(20).color).not.toBe(DEFAULT_TOKENS.disabledText);
  });

  it('a day of the month before is darker than a greyed one; outsideText follows mutedText', () => {
    const textOf = (tree: ReactTestRenderer, id: string) => {
      const cell = tree.root.findAll(
        (n) => n.props.testID === id && typeof n.type !== 'string'
      )[0]!;
      return StyleSheet.flatten(cell.findAllByType(Text)[0]!.props.style);
    };
    const tree = mount({});
    expect(textOf(tree, 'g-day-2026-9-27').color).toBe(
      DEFAULT_TOKENS.outsideText
    );
    expect(DEFAULT_TOKENS.outsideText).not.toBe(DEFAULT_TOKENS.disabledText);
    expect(buildTokens({ mutedText: '#555555' }).outsideText).toBe('#555555');
    expect(
      buildTokens({ mutedText: '#555555', outsideText: '#777777' }).outsideText
    ).toBe('#777777');
  });

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

  it('takes a touch no day takes, so a swipe from greyed days changes month', () => {
    const onSwipe = jest.fn();
    const grid = (tree: ReactTestRenderer) =>
      tree.root.findAll(
        (n) => n.props.testID === 'g-grid' && typeof n.type === 'string'
      )[0]!;
    const tree = mount({
      onSwipe,
      constraints: createConstraints({
        type: 'date',
        timeZone: 'Asia/Kolkata',
        now: NOW,
        minDate: { year: 2026, month: 10, day: 28 },
      }),
    });
    expect(
      grid(tree).props.onStartShouldSetResponder({ touchHistory: {} })
    ).toBe(true);
    // Without a swipe handler the grid leaves touches alone.
    expect(
      grid(mount({})).props.onStartShouldSetResponder({ touchHistory: {} })
    ).toBe(false);
  });
});
