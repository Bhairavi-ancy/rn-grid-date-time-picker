import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  AccessibilityInfo,
  I18nManager,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { createConstraints } from '../../core/constraints';
import { ChevronLeftIcon } from '../../icons';
import Calendar, { type CalendarProps } from '../calendar/Calendar';
import { buildCalendarStyles } from '../calendar/calendarStyles';
import DateTimePicker from '../DateTimePicker';
import { MonthChips } from '../calendar/CalendarHeader';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { DAY_HIT_SLOP, MAX_FONT_SCALE } from '../theme/a11y';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';
import TimeRow from '../time/TimeRow';

const NOW = new Date(Date.UTC(2026, 9, 21, 6, 30));
const tokens = buildTokens();
const strings = DEFAULT_STRINGS;

const mountCalendar = (
  props: Partial<CalendarProps> = {}
): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Calendar
        constraints={createConstraints({
          type: 'date',
          timeZone: 'Asia/Kolkata',
          now: NOW,
        })}
        today={{ year: 2026, month: 10, day: 21 }}
        selection={{
          kind: 'range',
          from: { year: 2026, month: 10, day: 20 },
          to: { year: 2026, month: 10, day: 23 },
        }}
        onSelectDay={() => {}}
        firstDayOfWeek={7}
        showOutsideDays
        showHolidays
        yearRange={{ first: 1900, last: 2200 }}
        locale="en-IN"
        tokens={tokens}
        strings={strings}
        testID="cal"
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
const dayButton = (tree: ReactTestRenderer, d: number) =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `cal-day-2026-10-${d}` &&
      n.props.accessibilityRole === 'button' &&
      typeof n.type !== 'string'
  )[0];

// AccessibilityInfo is already a jest mock (react-native preset); its fns are used as-is.
const a11y = AccessibilityInfo as unknown as Record<
  string,
  jest.Mock<(...args: unknown[]) => Promise<boolean>>
>;

describe('accessibility', () => {
  it('day cells reach a 48 pt target and cap font scaling', () => {
    const tree = mountCalendar();
    expect(dayButton(tree, 21).props.hitSlop).toBe(DAY_HIT_SLOP);
    expect(40 + 2 * DAY_HIT_SLOP).toBeGreaterThanOrEqual(48);
    const scaled = tree.root
      .findAllByType(Text)
      .filter((t) => t.props.maxFontSizeMultiplier === MAX_FONT_SCALE);
    expect(scaled.length).toBeGreaterThan(40);
  });

  it('range ends are read out', () => {
    const tree = mountCalendar();
    expect(dayButton(tree, 20).props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11yRangeStart
    );
    expect(dayButton(tree, 23).props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11yRangeEnd
    );
  });

  it('announces the new month when it changes', () => {
    const tree = mountCalendar();
    act(() => find(tree, 'cal-next').props.onPress());
    expect(a11y.announceForAccessibility).toHaveBeenCalledWith('October 2027');
  });

  it('time boxes are labelled and cap font scaling', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimeRow
          time={{ hour: 9, minute: 30 }}
          onTime={() => {}}
          timeFormat="12h"
          label="Time"
          tokens={tokens}
          strings={strings}
          testID="t"
        />
      );
    });
    const inputs = tree.root.findAllByType(TextInput);
    // The row's label goes first, so a range's Start and End boxes differ.
    expect(inputs.map((i) => i.props.accessibilityLabel)).toEqual([
      `Time, ${DEFAULT_STRINGS.a11yHour}`,
      `Time, ${DEFAULT_STRINGS.a11yMinute}`,
    ]);
    expect(
      inputs.every((i) => i.props.maxFontSizeMultiplier === MAX_FONT_SCALE)
    ).toBe(true);
    const am = find(tree, 't-am');
    expect(am.props.accessibilityRole).toBe('radio');
    expect(am.props.accessibilityState.checked).toBe(true);
  });

  it('useReduceMotion follows the system setting', async () => {
    a11y.isReduceMotionEnabled.mockResolvedValueOnce(true);
    let value = false;
    const Probe = () => {
      value = useReduceMotion();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });
    expect(value).toBe(true);
  });
});

describe('right-to-left', () => {
  const original = I18nManager.isRTL;
  afterEach(() => {
    Object.defineProperty(I18nManager, 'isRTL', {
      value: original,
      configurable: true,
    });
  });

  it('the range band uses start / end, so it flips', () => {
    const s = buildCalendarStyles(tokens);
    expect(StyleSheet.flatten(s.fillStart)).toMatchObject({
      start: '50%',
      end: 0,
    });
    expect(StyleSheet.flatten(s.fillEnd)).toMatchObject({
      start: 0,
      end: '50%',
    });
  });

  it('chevrons are 24 pt icons and point the other way in RTL', () => {
    const icon = (tree: ReactTestRenderer, id: string) =>
      tree.root.findAll((n) => n.props.testID === id).length > 0;
    const ltr = mountCalendar();
    expect(icon(ltr, 'cal-prev-left')).toBe(true);
    expect(icon(ltr, 'cal-next-right')).toBe(true);
    // The built-in chevron, 24 pt, in the muted colour.
    const prev = ltr.root.findAll((n) => n.props.testID === 'cal-prev-left')[0];
    expect(prev.findByType(ChevronLeftIcon).props).toMatchObject({
      size: 24,
      color: buildTokens().mutedText,
    });
    Object.defineProperty(I18nManager, 'isRTL', {
      value: true,
      configurable: true,
    });
    const rtl = mountCalendar();
    expect(icon(rtl, 'cal-prev-right')).toBe(true);
    expect(icon(rtl, 'cal-next-left')).toBe(true);
  });
});

describe('segment labels', () => {
  it('From and To segments read differently', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DateTimePicker
          type="date"
          mode="range"
          range={{ layout: 'fromTo' }}
          value={{ from: '', to: '' }}
          onChange={() => {}}
          allowTyping
          presentation="inline"
          testID="dp"
        />
      );
    });
    const label = (id: string) =>
      tree.root.findAllByType(TextInput).find((i) => i.props.testID === id)!
        .props.accessibilityLabel;
    expect(label('dp-from-segment-day')).toBe(
      `${DEFAULT_STRINGS.from}, ${DEFAULT_STRINGS.a11yDay}`
    );
    expect(label('dp-to-segment-day')).toBe(
      `${DEFAULT_STRINGS.to}, ${DEFAULT_STRINGS.a11yDay}`
    );
  });
});

describe('month chips', () => {
  /** The chip row with October selected, laid out 300 wide with October at x 700. */
  const chipRow = () => {
    const scrollTo = jest.fn();
    const names = Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MonthChips
          names={names}
          fullNames={names}
          selectedMonth={10}
          isEnabled={() => true}
          onSelect={() => {}}
          tokens={buildTokens()}
          strings={DEFAULT_STRINGS}
          testID="dp"
        />,
        { createNodeMock: () => ({ scrollTo }) }
      );
    });
    const row = tree.root.findAll(
      (n) => n.props.horizontal && typeof n.type !== 'string'
    )[0]!;
    act(() => row.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    const chip = tree.root.findAll(
      (n) => n.props.testID === 'dp-chip-10' && typeof n.type !== 'string'
    )[0]!;
    act(() =>
      chip.props.onLayout({ nativeEvent: { layout: { x: 700, width: 120 } } })
    );
    // The Jest preset's ScrollView keeps its own scrollTo.
    const own = (row.instance as { scrollTo?: jest.Mock } | null)?.scrollTo;
    const calls = () => [...scrollTo.mock.calls, ...(own?.mock?.calls ?? [])];
    const scroll = (x: number) =>
      act(() => row.props.onScroll({ nativeEvent: { contentOffset: { x } } }));
    return { row, calls, scroll };
  };

  it('centres the selected chip from its measured position', () => {
    const { calls } = chipRow();
    // 700 − (300 − 120) / 2
    expect(calls().at(-1)?.[0]).toEqual({ x: 610, animated: false });
  });

  it('keeps the scroll inside the row', () => {
    const { row, calls } = chipRow();
    act(() => row.props.onContentSizeChange(800, 40));
    // The row ends at 800 − 300.
    expect(calls().at(-1)?.[0]).toEqual({ x: 500, animated: false });
  });

  it('scrolls back when the platform moves the row before it is dragged', () => {
    // Android moves a right-to-left row to its end after the first layout.
    const { calls, scroll } = chipRow();
    const before = calls().length;
    scroll(900);
    expect(calls().length).toBe(before + 1);
    expect(calls().at(-1)?.[0]).toEqual({ x: 610, animated: false });
    scroll(610);
    expect(calls().length).toBe(before + 1);
  });

  it('leaves the row where the user drags it', () => {
    const { row, calls, scroll } = chipRow();
    const before = calls().length;
    act(() => row.props.onScrollBeginDrag());
    scroll(50);
    expect(calls().length).toBe(before);
  });
});
