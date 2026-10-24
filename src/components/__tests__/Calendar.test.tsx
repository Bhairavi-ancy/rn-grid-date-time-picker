import { describe, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import {
  createConstraints,
  type CreateConstraintsOptions,
} from '../../core/constraints';
import { hijriMonthStart } from '../../core/calendarSystem';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../icons';
import Calendar, { type CalendarProps } from '../calendar/Calendar';
import DayGrid from '../calendar/DayGrid';
import { DEFAULT_STRINGS } from '../theme/defaultStrings';
import { buildTokens } from '../theme/tokens';

// "Now" = Wednesday 21 Oct 2026, 12:00 in India.
const NOW = new Date(Date.UTC(2026, 9, 21, 6, 30));
const TODAY = { year: 2026, month: 10, day: 21 };
const strings = DEFAULT_STRINGS;
const tokens = buildTokens();

const constraintsFor = (extra: Partial<CreateConstraintsOptions> = {}) =>
  createConstraints({
    type: 'date',
    timeZone: 'Asia/Kolkata',
    now: NOW,
    ...extra,
  });
const oct = (day: number) => {
  return { year: 2026, month: 10, day };
};

const mount = (props: Partial<CalendarProps>): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Calendar
        constraints={constraintsFor()}
        today={TODAY}
        selection={{ kind: 'single', day: null }}
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
const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(''));
const day = (tree: ReactTestRenderer, y: number, m: number, d: number) =>
  tree.root.findAll(
    (n) =>
      n.props.testID === `cal-day-${y}-${m}-${d}` &&
      n.props.accessibilityRole === 'button' &&
      typeof n.type !== 'string'
  )[0];
const press = (tree: ReactTestRenderer, id: string) =>
  act(() => find(tree, id).props.onPress());

describe('Calendar: header icons', () => {
  const CHEVRONS: unknown[] = [
    ChevronLeftIcon,
    ChevronDownIcon,
    ChevronRightIcon,
  ];

  it('uses the built-in chevrons (down in the accent colour after the year)', () => {
    const tree = mount({});
    const icons = tree.root
      .findAll((n) => CHEVRONS.includes(n.type))
      .map((n) => n.type);
    expect(icons).toEqual([ChevronLeftIcon, ChevronDownIcon, ChevronRightIcon]);
    const down = tree.root.findByType(ChevronDownIcon);
    expect(down.props).toMatchObject({ size: 24, color: tokens.accent });
  });

  it('icons replace the built-in chevrons, with the same size and colours', () => {
    const tree = mount({
      icons: {
        chevronLeft: (p) => (
          <Text testID="my-left">{`${p.size} ${p.color}`}</Text>
        ),
        chevronDown: (p) => (
          <Text testID="my-down">{`${p.size} ${p.color}`}</Text>
        ),
      },
    });
    expect(find(tree, 'my-left').props.children).toBe(`24 ${tokens.mutedText}`);
    expect(find(tree, 'my-down').props.children).toBe(`24 ${tokens.accent}`);
    expect(tree.root.findAllByType(ChevronLeftIcon)).toHaveLength(0);
    expect(tree.root.findAllByType(ChevronRightIcon)).toHaveLength(1);
  });
});

describe('Calendar: month view', () => {
  it('shows the year, month chips, a Sunday-first weekday row and the month', () => {
    const tree = mount({});
    const t = texts(tree);
    expect(t).toEqual(
      expect.arrayContaining(['2026', 'Oct', 'Su', 'Mo', 'Sa'])
    );
    expect(t.indexOf('Su')).toBeLessThan(t.indexOf('Mo'));
    expect(day(tree, 2026, 10, 1)).toBeTruthy();
    expect(day(tree, 2026, 9, 27)).toBeTruthy(); // outside day before 1 Oct (a Thursday)
  });

  it('starts on Monday when asked', () => {
    const t = texts(mount({ firstDayOfWeek: 1 }));
    expect(t.indexOf('Mo')).toBeLessThan(t.indexOf('Su'));
  });

  it('reads each day as a full date with its state', () => {
    const tree = mount({
      selection: { kind: 'single', day: { year: 2026, month: 10, day: 23 } },
    });
    expect(day(tree, 2026, 10, 21).props.accessibilityLabel).toBe(
      `Wednesday, 21 October 2026, ${DEFAULT_STRINGS.a11yToday}`
    );
    expect(day(tree, 2026, 10, 23).props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11ySelected
    );
  });

  it('a tap on an outside day selects it and moves to its month', () => {
    const onSelectDay = jest.fn();
    const onVisibleMonthChange = jest.fn();
    const tree = mount({ onSelectDay, onVisibleMonthChange });
    // 27 Sep is shown greyed before 1 Oct.
    act(() => day(tree, 2026, 9, 27).props.onPress());
    expect(onSelectDay).toHaveBeenCalledWith({ year: 2026, month: 9, day: 27 });
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2026, 9);
    expect(find(tree, 'cal-chip-9').props.accessibilityState.selected).toBe(
      true
    );
    // Across the year end: Dec 2026 → a January outside day.
    press(tree, 'cal-chip-12');
    act(() => day(tree, 2027, 1, 2).props.onPress());
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2027, 1);
    expect(texts(tree)).toContain('2027');
    // A day of the shown month doesn't move anything.
    onVisibleMonthChange.mockClear();
    act(() => day(tree, 2027, 1, 15).props.onPress());
    expect(onVisibleMonthChange).not.toHaveBeenCalled();
  });

  it('calls onSelectDay for an allowed day', () => {
    const onSelectDay = jest.fn();
    const tree = mount({ onSelectDay });
    act(() => day(tree, 2026, 10, 25).props.onPress());
    expect(onSelectDay).toHaveBeenCalledWith({
      year: 2026,
      month: 10,
      day: 25,
    });
  });
});

describe('Calendar: greyed days and limits', () => {
  // The next 5 days after today.
  const futureOnly = constraintsFor({ minDate: oct(22), maxDate: oct(26) });

  it('greys days outside the range and makes them not pressable', () => {
    const tree = mount({ constraints: futureOnly });
    expect(day(tree, 2026, 10, 21).props.disabled).toBe(true);
    expect(day(tree, 2026, 10, 21).props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11yUnavailable
    );
    expect(day(tree, 2026, 10, 22).props.disabled).toBe(false);
  });

  it('stops the arrows at the range and greys months with no allowed day', () => {
    const tree = mount({ constraints: futureOnly });
    expect(find(tree, 'cal-prev').props.disabled).toBe(true);
    expect(find(tree, 'cal-next').props.disabled).toBe(true); // range ends 26 Oct
    expect(find(tree, 'cal-chip-11').props.disabled).toBe(true);
    expect(find(tree, 'cal-chip-10').props.disabled).toBe(false);
  });

  it('opens on the first month with a selectable day when today has none', () => {
    const later = constraintsFor({
      minDate: { year: 2026, month: 12, day: 6 },
    });
    const tree = mount({ constraints: later });
    expect(day(tree, 2026, 12, 6).props.disabled).toBe(false);
    expect(find(tree, 'cal-chip-12').props.accessibilityState.selected).toBe(
      true
    );
  });

  it('shows the empty state when no day can ever be picked', () => {
    const none = constraintsFor({
      minDate: { year: 2026, month: 1, day: 1 },
      maxDate: { year: 2026, month: 6, day: 30 },
      isEnabled: (d) => d.month === 12,
    });
    const tree = mount({ constraints: none });
    expect(find(tree, 'cal-empty')).toBeTruthy();
    expect(texts(tree)).toContain(DEFAULT_STRINGS.nothingSelectable);
  });

  it('marks holidays and keeps them selectable when not blocked', () => {
    const c = constraintsFor({ holidays: ['2026-10-23'] });
    const tree = mount({ constraints: c });
    expect(day(tree, 2026, 10, 23).props.disabled).toBe(false);
    expect(day(tree, 2026, 10, 23).props.accessibilityLabel).toContain(
      DEFAULT_STRINGS.a11yHoliday
    );
  });
});

describe('Calendar: navigation', () => {
  it('‹ › beside the year move a whole year and keep the month', () => {
    const onVisibleMonthChange = jest.fn();
    const tree = mount({ onVisibleMonthChange });
    expect(find(tree, 'cal-next').props.accessibilityLabel).toBe(
      DEFAULT_STRINGS.a11yNextYear
    );
    press(tree, 'cal-next');
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2027, 10);
    expect(texts(tree)).toContain('2027');
    expect(day(tree, 2027, 10, 1)).toBeTruthy();
    press(tree, 'cal-prev');
    press(tree, 'cal-prev');
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2025, 10);
  });

  it('months change by chips and by swipe, and a swipe crosses the year end', () => {
    const onVisibleMonthChange = jest.fn();
    const tree = mount({ onVisibleMonthChange });
    press(tree, 'cal-chip-12');
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2026, 12);
    const swipe = (step: 1 | -1) =>
      act(() => tree.root.findByType(DayGrid).props.onSwipe(step));
    swipe(1);
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2027, 1);
    expect(texts(tree)).toContain('2027');
    swipe(-1);
    swipe(-1);
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2026, 11);
  });

  it('the year arrows land on the nearest allowed month, and stop when a year has none', () => {
    // Allowed: 1 Nov 2026 – 15 Feb 2027.
    const limited = constraintsFor({
      minDate: { year: 2026, month: 11, day: 1 },
      maxDate: { year: 2027, month: 2, day: 15 },
    });
    const onVisibleMonthChange = jest.fn();
    const tree = mount({ constraints: limited, onVisibleMonthChange });
    // Opens on Nov 2026 (October has nothing to pick).
    expect(find(tree, 'cal-chip-11').props.accessibilityState.selected).toBe(
      true
    );
    expect(find(tree, 'cal-prev').props.disabled).toBe(true);
    press(tree, 'cal-next');
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(2027, 2);
    expect(find(tree, 'cal-next').props.disabled).toBe(true);
    expect(find(tree, 'cal-prev').props.disabled).toBe(false);
  });

  it('opens the year grid from the title and jumps to a year', () => {
    const tree = mount({});
    press(tree, 'cal-title');
    expect(texts(tree)).toContain('2020 – 2031');
    press(tree, 'cal-year-2020');
    expect(texts(tree)).toContain('2020');
    expect(day(tree, 2020, 10, 1)).toBeTruthy();
  });

  it('pages the year grid and stops at the year range', () => {
    const tree = mount({ yearRange: { first: 2020, last: 2030 } });
    press(tree, 'cal-title');
    expect(find(tree, 'cal-prev').props.disabled).toBe(true);
    expect(find(tree, 'cal-next').props.disabled).toBe(true);
  });

  it('can open on the month grid', () => {
    const tree = mount({ initialView: 'month' });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['January', 'December'])
    );
    press(tree, 'cal-month-5');
    expect(day(tree, 2026, 5, 1)).toBeTruthy();
  });
});

describe('Calendar: Today button', () => {
  it('selects today, and is disabled when today is not allowed', () => {
    const onSelectDay = jest.fn();
    const tree = mount({ showToday: true, onSelectDay });
    press(tree, 'cal-today');
    expect(onSelectDay).toHaveBeenCalledWith(TODAY);

    // From tomorrow on.
    const blocked = constraintsFor({ minDate: oct(22) });
    expect(
      find(mount({ showToday: true, constraints: blocked }), 'cal-today').props
        .disabled
    ).toBe(true);
  });
});

describe('Calendar: calendar systems', () => {
  const dayText = (tree: ReactTestRenderer, y: number, m: number, d: number) =>
    day(tree, y, m, d)
      .findAllByType(Text)
      .map((t) => String(t.props.children));

  it("'dual' shows the Hijri day under each Gregorian day", () => {
    const tree = mount({ calendarSystem: 'dual' });
    expect(dayText(tree, 2026, 10, 21)).toEqual(['21', '10']); // 10 Jumada I 1448
  });

  it("'hijri' lays out Hijri months: Hijri year, month chips and day numbers", () => {
    const onSelectDay = jest.fn();
    const onVisibleMonthChange = jest.fn();
    const tree = mount({
      calendarSystem: 'hijri',
      onSelectDay,
      onVisibleMonthChange,
    });
    const t = texts(tree);
    expect(t).toEqual(expect.arrayContaining(['1448', 'Jumada I']));
    expect(find(tree, 'cal-chip-5').props.accessibilityState.selected).toBe(
      true
    );
    // Only the Hijri day (10 Jumada I 1448), no Gregorian number under it.
    expect(dayText(tree, 2026, 10, 21)).toEqual(['10']);
    // Days are still Gregorian.
    act(() => day(tree, 2026, 10, 21).props.onPress());
    expect(onSelectDay).toHaveBeenCalledWith(TODAY);
    // ›: Jumada I of the next Hijri year (1449), which starts in Gregorian 2027.
    press(tree, 'cal-next');
    expect(texts(tree)).toContain('1449');
    const start = hijriMonthStart(1449, 5);
    expect(onVisibleMonthChange).toHaveBeenLastCalledWith(
      start.year,
      start.month
    );
    expect(find(tree, 'cal-chip-5').props.accessibilityState.selected).toBe(
      true
    );
  });

  it("'hijri' still greys by the Gregorian limits and stops at the range", () => {
    const tree = mount({
      calendarSystem: 'hijri',
      constraints: constraintsFor({ minDate: oct(22), maxDate: oct(26) }),
    });
    expect(day(tree, 2026, 10, 21).props.disabled).toBe(true);
    expect(day(tree, 2026, 10, 22).props.disabled).toBe(false);
    expect(find(tree, 'cal-prev').props.disabled).toBe(true);
    expect(find(tree, 'cal-next').props.disabled).toBe(true);
    expect(find(tree, 'cal-chip-6').props.disabled).toBe(true);
  });
});
