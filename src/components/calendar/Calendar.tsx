import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { addDays, compareCalendarDates } from '../../core/calendarDate';
import {
  buildSystemGrid,
  daysOfMonth,
  hijriDateText,
  hijriMonthNames,
  monthSystemFor,
  type MonthSystem,
  type SystemMonth,
} from '../../core/calendarSystem';
import type { Constraints } from '../../core/constraints';
import type { CalendarDate, Weekday } from '../../core/types';
import type { IconName, IconOptions, IconSet } from '../../icons';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import { buildCalendarStyles } from './calendarStyles';
import { CalendarHeader, MonthChips } from './CalendarHeader';
import type { DayCellState } from './DayCell';
import DayGrid from './DayGrid';
import { fullDateLabel, localeNames } from './localeNames';
import PeriodGrid, { type PeriodItem } from './PeriodGrid';
import {
  firstSelectedDay,
  selectedDays,
  type CalendarSelection,
} from './selection';

export type CalendarView = 'day' | 'month' | 'year';

export interface CalendarProps {
  constraints: Constraints;
  today: CalendarDate;
  /** With nothing selected, the calendar opens on this day's month instead of today's. */
  initialVisibleDate?: CalendarDate;
  selection: CalendarSelection;
  onSelectDay: (day: CalendarDate) => void;
  firstDayOfWeek: Weekday;
  showOutsideDays: boolean;
  showHolidays: boolean;
  yearRange: { first: number; last: number };
  locale: string;
  /** The grid on screen (a dual calendar shows one of the two). Default 'gregory'. */
  calendarSystem?: 'gregory' | 'hijri';
  initialView?: CalendarView;
  /** 'month' / 'year': that grid is the last step and a tap picks the period's first day. */
  precision?: 'day' | 'month' | 'year';
  enableMonthSwipe?: boolean;
  showToday?: boolean;
  /** Gregorian year and month of the first day shown (also in the Hijri grid). */
  onVisibleMonthChange?: (year: number, month: number) => void;
  /**
   * A day in the month now shown (today when it's there, else the middle), so
   * the other calendar system can open on the same days.
   */
  onAnchorChange?: (day: CalendarDate) => void;
  /** A second line under each day. None by default. */
  subLabel?: (day: CalendarDate) => string | null;
  renderDay?: (state: DayCellState, onPress: () => void) => React.ReactNode;
  renderWeekday?: (weekday: Weekday, name: string) => React.ReactNode;
  renderMonthChip?: (
    month: number,
    state: { selected: boolean; disabled: boolean }
  ) => React.ReactNode;
  renderYearCell?: (item: PeriodItem) => React.ReactNode;
  renderMonthCell?: (item: PeriodItem) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  /** Replacements for the header's built-in chevrons. */
  icons?: Partial<IconSet>;
  iconProps?: Partial<Record<IconName, IconOptions>>;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

type VisibleMonth = SystemMonth;

const PAGE = 12;

const cmpMonth = (a: VisibleMonth, b: VisibleMonth) =>
  a.year - b.year || a.month - b.month;

/** The first and last months the year range allows, in the calendar's system. */
const monthLimits = (
  sys: MonthSystem,
  range: { first: number; last: number }
): { first: VisibleMonth; last: VisibleMonth } => {
  return {
    first: sys.monthOf({ year: range.first, month: 1, day: 1 }),
    last: sys.monthOf({ year: range.last, month: 12, day: 31 }),
  };
};

const clampMonth = (
  v: VisibleMonth,
  limits: { first: VisibleMonth; last: VisibleMonth }
): VisibleMonth => {
  if (cmpMonth(v, limits.first) < 0) return limits.first;
  if (cmpMonth(v, limits.last) > 0) return limits.last;
  return v;
};

/** Whether any day of a month can be picked. Gregorian uses the constraint's own check. */
const isMonthOpen = (
  sys: MonthSystem,
  constraints: Constraints,
  m: VisibleMonth
): boolean =>
  sys.kind === 'gregory'
    ? constraints.isMonthSelectable(m.year, m.month)
    : daysOfMonth(sys, m).some((d) => !constraints.dayStatus(d).disabled);

const isYearOpen = (
  sys: MonthSystem,
  constraints: Constraints,
  year: number
): boolean => {
  if (sys.kind === 'gregory') return constraints.isYearSelectable(year);
  const { min, max } = constraints.range;
  const first = sys.monthStart({ year, month: 1 });
  const nextYear = sys.monthStart({ year: year + 1, month: 1 });
  if (min && compareCalendarDates(addDays(nextYear, -1), min.date) < 0)
    return false;
  if (max && compareCalendarDates(first, max.date) > 0) return false;
  for (let month = 1; month <= 12; month += 1) {
    if (isMonthOpen(sys, constraints, { year, month })) return true;
  }
  return false;
};

/**
 * Where the calendar opens: the value's month, else `initialVisibleDate`'s,
 * else today's; when that month has nothing selectable, the nearest one that does.
 */
const initialMonth = (props: CalendarProps, sys: MonthSystem): VisibleMonth => {
  const limits = monthLimits(sys, props.yearRange);
  const picked = firstSelectedDay(props.selection);
  const anchor = props.initialVisibleDate ?? props.today;
  const start = sys.monthOf(picked ?? anchor);
  if (picked || isMonthOpen(sys, props.constraints, start)) {
    return clampMonth(start, limits);
  }
  const first = props.constraints.firstSelectable(anchor);
  return clampMonth(first ? sys.monthOf(first) : start, limits);
};

/**
 * The Date view: `‹ year ▾ ›` header, month chips, and the day grid (or the year /
 * month grids). Greyed days come from `constraints`; navigation stops at the
 * allowed range; when no day can ever be picked it shows the empty state.
 * In the Hijri system the months, chips and years are Hijri; days stay Gregorian.
 */
const Calendar: React.FC<CalendarProps> = (props) => {
  const {
    constraints,
    today,
    selection,
    onSelectDay,
    firstDayOfWeek,
    showOutsideDays,
    showHolidays,
    yearRange,
    locale,
    calendarSystem = 'gregory',
    initialView = 'day',
    precision = 'day',
    enableMonthSwipe = true,
    showToday,
    onVisibleMonthChange,
    onAnchorChange,
    subLabel,
    renderDay,
    renderWeekday,
    renderMonthChip,
    renderYearCell,
    renderMonthCell,
    renderEmptyState,
    icons,
    iconProps,
    tokens,
    styles,
    strings,
    testID,
  } = props;
  const s = buildCalendarStyles(tokens);
  const sys = monthSystemFor(calendarSystem);
  const names = useMemo(() => {
    const gregorian = localeNames(locale);
    if (sys.kind === 'gregory') return gregorian;
    const hijri = hijriMonthNames(locale);
    return { ...gregorian, monthsLong: hijri, monthsShort: hijri };
  }, [locale, sys]);
  const limits = useMemo(
    () => monthLimits(sys, yearRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the year range is compared by content
    [sys, yearRange.first, yearRange.last]
  );
  const years = { first: limits.first.year, last: limits.last.year };
  const [view, setView] = useState<CalendarView>(
    precision === 'day' ? initialView : precision
  );
  // A month or year pick: what's picked, and the grid that's the last step.
  const picked = precision === 'day' ? null : firstSelectedDay(selection);
  const pickView: CalendarView = precision === 'day' ? 'day' : precision;
  const [visible, setVisible] = useState<VisibleMonth>(() =>
    initialMonth(props, sys)
  );
  const [pageStart, setPageStart] = useState(
    () => visible.year - ((visible.year - years.first) % PAGE)
  );

  const goTo = useCallback(
    (next: VisibleMonth) => {
      const clamped = clampMonth(next, limits);
      setVisible(clamped);
      // Screen readers hear the new month (the header only shows the year).
      AccessibilityInfo.announceForAccessibility?.(
        `${names.monthsLong[clamped.month - 1]} ${clamped.year}`
      );
      const start = sys.monthStart(clamped);
      onVisibleMonthChange?.(start.year, start.month);
      onAnchorChange?.(
        cmpMonth(sys.monthOf(today), clamped) === 0
          ? today
          : addDays(start, Math.min(14, sys.monthLength(clamped) - 1))
      );
    },
    [limits, sys, names, today, onVisibleMonthChange, onAnchorChange]
  );

  // A day newly picked outside the month on screen (typed in the field, say)
  // brings the calendar to its month; picks in the month shown leave it be.
  const dayKey = (d: CalendarDate) => `${d.year}-${d.month}-${d.day}`;
  const shownPicks = useRef(new Set(selectedDays(selection).map(dayKey)));
  useEffect(() => {
    const days = selectedDays(selection);
    const fresh = days.filter((d) => !shownPicks.current.has(dayKey(d)));
    shownPicks.current = new Set(days.map(dayKey));
    const last = fresh[fresh.length - 1];
    if (last && cmpMonth(sys.monthOf(last), visible) !== 0)
      goTo(sys.monthOf(last));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when the selection changes
  }, [selection]);

  // A tap on a day of the previous / next month (the muted outside days) selects it
  // and moves the calendar to that month.
  const selectDay = useCallback(
    (day: CalendarDate) => {
      const month = sys.monthOf(day);
      if (cmpMonth(month, visible) !== 0) goTo(month);
      onSelectDay(day);
    },
    [sys, visible, goTo, onSelectDay]
  );

  // Screen readers hear a Hijri grid's days as Hijri dates.
  const dateLabel = useMemo(
    () =>
      sys.kind === 'hijri'
        ? (day: CalendarDate) =>
            hijriDateText(day, locale) ?? fullDateLabel(locale, day)
        : undefined,
    [sys, locale]
  );

  const { min, max } = constraints.range;
  const prevMonth = sys.addMonths(visible, -1);
  const nextMonth = sys.addMonths(visible, 1);
  const prevEnd = addDays(sys.monthStart(visible), -1);
  const nextStart = sys.monthStart(nextMonth);
  const canPrevMonth =
    cmpMonth(prevMonth, limits.first) >= 0 &&
    (!min || compareCalendarDates(prevEnd, min.date) >= 0);
  const canNextMonth =
    cmpMonth(nextMonth, limits.last) <= 0 &&
    (!max || compareCalendarDates(nextStart, max.date) <= 0);

  const monthEnabled = useMemo(() => {
    const enabled = new Map<number, boolean>();
    for (let m = 1; m <= 12; m += 1)
      enabled.set(
        m,
        isMonthOpen(sys, constraints, { year: visible.year, month: m })
      );
    return enabled;
  }, [constraints, visible.year, sys]);

  const nothingSelectable = useMemo(
    () => constraints.firstSelectable(today) === null,
    [constraints, today]
  );

  /** The same month in `year`, or the nearest month there with a selectable day. */
  const monthIn = (year: number): VisibleMonth => {
    const open = (m: number) =>
      isMonthOpen(sys, constraints, { year, month: m });
    for (let d = 0; d < 12; d += 1) {
      if (visible.month + d <= 12 && open(visible.month + d))
        return { year, month: visible.month + d };
      if (visible.month - d >= 1 && open(visible.month - d))
        return { year, month: visible.month - d };
    }
    return { year, month: visible.month };
  };

  const pickYear = (year: number) => {
    if (precision === 'year') {
      onSelectDay({ year, month: 1, day: 1 });
      return;
    }
    goTo(monthIn(year));
    setView(pickView);
  };

  // ‹ › beside the year move a whole year; months change by swipe or chips.
  const canPrevYear = useMemo(
    () =>
      visible.year - 1 >= years.first &&
      isYearOpen(sys, constraints, visible.year - 1),
    [visible.year, years.first, sys, constraints]
  );
  const canNextYear = useMemo(
    () =>
      visible.year + 1 <= years.last &&
      isYearOpen(sys, constraints, visible.year + 1),
    [visible.year, years.last, sys, constraints]
  );

  const header =
    view === 'year' ? (
      <CalendarHeader
        title={`${pageStart} – ${Math.min(pageStart + PAGE - 1, years.last)}`}
        canPrev={pageStart > years.first}
        canNext={pageStart + PAGE <= years.last}
        onPrev={() => setPageStart((p) => Math.max(years.first, p - PAGE))}
        onNext={() => setPageStart((p) => p + PAGE)}
        onTitlePress={() => {
          if (precision !== 'year') setView(pickView);
        }}
        prevLabel={strings.a11yPreviousYear}
        nextLabel={strings.a11yNextYear}
        titleLabel={strings.a11yChooseYear}
        icons={icons}
        iconProps={iconProps}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    ) : (
      <CalendarHeader
        title={String(visible.year)}
        canPrev={canPrevYear}
        canNext={canNextYear}
        onPrev={() => goTo(monthIn(visible.year - 1))}
        onNext={() => goTo(monthIn(visible.year + 1))}
        onTitlePress={() => {
          setPageStart(visible.year - ((visible.year - years.first) % PAGE));
          setView('year');
        }}
        prevLabel={strings.a11yPreviousYear}
        nextLabel={strings.a11yNextYear}
        titleLabel={strings.a11yChooseYear}
        icons={icons}
        iconProps={iconProps}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    );

  let body: React.ReactNode;
  if (nothingSelectable) {
    body = renderEmptyState ? (
      renderEmptyState()
    ) : (
      <View
        style={[s.empty, styles?.emptyState]}
        testID={testID ? `${testID}-empty` : undefined}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={[s.emptyText, styles?.emptyStateText]}
        >
          {strings.nothingSelectable}
        </Text>
      </View>
    );
  } else if (view === 'year') {
    const yearItems: PeriodItem[] = [];
    for (let y = pageStart; y < pageStart + PAGE && y <= years.last; y += 1) {
      yearItems.push({
        value: y,
        label: String(y),
        selected:
          precision === 'year' ? picked?.year === y : y === visible.year,
        current: precision !== 'day' && y === today.year,
        disabled: y < years.first || !isYearOpen(sys, constraints, y),
      });
    }
    body = (
      <PeriodGrid
        kind="year"
        items={yearItems}
        onSelect={pickYear}
        renderCell={renderYearCell}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    );
  } else if (view === 'month') {
    const months: PeriodItem[] = names.monthsLong.map((label, i) => {
      return {
        value: i + 1,
        label,
        selected:
          precision === 'month'
            ? picked?.year === visible.year && picked?.month === i + 1
            : i + 1 === visible.month,
        current:
          precision === 'month' &&
          visible.year === today.year &&
          i + 1 === today.month,
        disabled: !monthEnabled.get(i + 1),
      };
    });
    body = (
      <PeriodGrid
        kind="month"
        items={months}
        onSelect={(month) => {
          if (precision === 'month') {
            onSelectDay({ year: visible.year, month, day: 1 });
            return;
          }
          goTo({ ...visible, month });
          setView('day');
        }}
        renderCell={renderMonthCell}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    );
  } else {
    body = (
      <>
        <MonthChips
          names={names.monthsShort}
          fullNames={names.monthsLong}
          selectedMonth={visible.month}
          isEnabled={(m) => !!monthEnabled.get(m)}
          onSelect={(month) => goTo({ ...visible, month })}
          renderMonthChip={renderMonthChip}
          tokens={tokens}
          styles={styles}
          strings={strings}
          testID={testID}
        />
        <DayGrid
          year={visible.year}
          month={visible.month}
          grid={
            sys.kind === 'gregory'
              ? undefined
              : buildSystemGrid(sys, visible, firstDayOfWeek)
          }
          dayNumber={sys.kind === 'gregory' ? undefined : sys.dayNumber}
          firstDayOfWeek={firstDayOfWeek}
          showOutsideDays={showOutsideDays}
          showHolidays={showHolidays}
          today={today}
          selection={selection}
          constraints={constraints}
          locale={locale}
          dateLabel={dateLabel}
          onSelectDay={selectDay}
          onSwipe={
            enableMonthSwipe
              ? (step) => {
                  if (step === 1 && canNextMonth) goTo(nextMonth);
                  if (step === -1 && canPrevMonth) goTo(prevMonth);
                }
              : undefined
          }
          subLabel={subLabel}
          renderDay={renderDay}
          renderWeekday={renderWeekday}
          tokens={tokens}
          styles={styles}
          strings={strings}
          testID={testID}
        />
      </>
    );
  }

  const todayDisabled = constraints.dayStatus(today).disabled;
  return (
    <View style={s.calendar} testID={testID ? `${testID}-calendar` : undefined}>
      {header}
      {body}
      {showToday && !nothingSelectable && view === 'day' ? (
        <Pressable
          testID={testID ? `${testID}-today` : undefined}
          accessibilityRole="button"
          accessibilityState={{ disabled: todayDisabled }}
          disabled={todayDisabled}
          onPress={() => {
            goTo(sys.monthOf(today));
            onSelectDay(today);
          }}
          style={[
            s.todayButton,
            styles?.todayButton,
            todayDisabled && s.gridDisabled,
          ]}
        >
          <Text style={[s.todayButtonText, styles?.todayButtonText]}>
            {strings.today}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default Calendar;
