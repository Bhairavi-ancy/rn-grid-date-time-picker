import React, { useMemo, useRef } from 'react';
import { I18nManager, PanResponder, Text, View } from 'react-native';
import type { Constraints } from '../../core/constraints';
import { isSameDay } from '../../core/calendarDate';
import { buildMonthGrid, weekdayOrder } from '../../core/monthGrid';
import type { CalendarDate, Weekday } from '../../core/types';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import type { ThemeTokens } from '../theme/tokens';
import { buildCalendarStyles } from './calendarStyles';
import DayCell, { type DayCellState } from './DayCell';
import { fullDateLabel, weekdayName } from './localeNames';
import { selectionOf, type CalendarSelection } from './selection';

export interface DayGridProps {
  year: number;
  month: number;
  /** A ready grid (Hijri months); otherwise the Gregorian month `year`/`month`. */
  grid?: {
    cells: { date: CalendarDate; inMonth: boolean }[];
    weekCount: number;
  };
  /** The number shown in each cell (the Hijri day in the Hijri grid). */
  dayNumber?: (day: CalendarDate) => number;
  firstDayOfWeek: Weekday;
  showOutsideDays: boolean;
  showHolidays: boolean;
  today: CalendarDate;
  selection: CalendarSelection;
  constraints: Constraints;
  locale: string;
  /** What a screen reader says for a day. Default: the Gregorian date in `locale`. */
  dateLabel?: (day: CalendarDate) => string;
  onSelectDay: (day: CalendarDate) => void;
  /** Swipe left / right to change month. */
  onSwipe?: (step: 1 | -1) => void;
  subLabel?: (day: CalendarDate) => string | null;
  renderDay?: (state: DayCellState, onPress: () => void) => React.ReactNode;
  renderWeekday?: (weekday: Weekday, name: string) => React.ReactNode;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const SWIPE_DISTANCE = 50;

/** A mostly-horizontal drag takes over from taps. */
export const isSwipeStart = (dx: number, dy: number): boolean =>
  Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 2;

/** Swiping left shows the next month; mirrored in right-to-left layouts. Short drags do nothing. */
export const swipeStep = (dx: number, isRTL: boolean): 1 | -1 | 0 => {
  if (Math.abs(dx) < SWIPE_DISTANCE) return 0;
  return dx < 0 !== isRTL ? 1 : -1;
};

const DayGrid: React.FC<DayGridProps> = ({
  year,
  month,
  grid: gridProp,
  dayNumber,
  firstDayOfWeek,
  showOutsideDays,
  showHolidays,
  today,
  selection,
  constraints,
  locale,
  dateLabel,
  onSelectDay,
  onSwipe,
  subLabel,
  renderDay,
  renderWeekday,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const s = buildCalendarStyles(tokens);
  const grid = gridProp ?? buildMonthGrid(year, month, firstDayOfWeek);

  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const pan = useMemo(
    () =>
      PanResponder.create({
        // A touch no day takes (a greyed day, a gap) is the grid's from the start,
        // so a swipe that begins there still changes month. A day that can be
        // picked is asked first and keeps its tap.
        onStartShouldSetPanResponder: () => !!onSwipeRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !!onSwipeRef.current && isSwipeStart(g.dx, g.dy),
        onPanResponderRelease: (_, g) => {
          const step = swipeStep(g.dx, I18nManager.isRTL);
          if (step !== 0) onSwipeRef.current?.(step);
        },
      }),
    []
  );

  const cells: (DayCellState | null)[] = grid.cells
    .slice(0, grid.weekCount * 7)
    .map((cell) => {
      if (!cell.inMonth && !showOutsideDays) return null;
      const status = constraints.dayStatus(cell.date);
      const { selected, role } = selectionOf(selection, cell.date);
      const isToday = isSameDay(cell.date, today);
      // Selected and unavailable are announced from the cell's state, so the
      // label only adds what the state can't say.
      const parts = [
        dateLabel ? dateLabel(cell.date) : fullDateLabel(locale, cell.date),
      ];
      if (isToday) parts.push(strings.a11yToday);
      if (role === 'start') parts.push(strings.a11yRangeStart);
      if (role === 'end') parts.push(strings.a11yRangeEnd);
      if (status.holiday) parts.push(strings.a11yHoliday);
      return {
        date: cell.date,
        inMonth: cell.inMonth,
        isToday,
        isSelected: selected,
        isDisabled: status.disabled,
        isHoliday: status.holiday,
        rangeRole: role,
        label: dayNumber ? dayNumber(cell.date) : undefined,
        subLabel: subLabel?.(cell.date) ?? null,
        a11yLabel: parts.join(', '),
      };
    });

  const weeks = Array.from({ length: grid.weekCount }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  return (
    <View {...pan.panHandlers} testID={testID ? `${testID}-grid` : undefined}>
      <View style={[s.weekdayRow, styles?.weekdayRow]}>
        {weekdayOrder(firstDayOfWeek).map((wd) => (
          <View key={wd} style={s.weekdayCell}>
            {renderWeekday ? (
              renderWeekday(wd, weekdayName(locale, wd))
            ) : (
              <Text
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[s.weekdayText, styles?.weekdayText]}
              >
                {weekdayName(locale, wd)}
              </Text>
            )}
          </View>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={s.week}>
          {week.map((cell, i) => {
            if (!cell) return <View key={i} style={s.cellWrap} />;
            const key = `${cell.date.month}-${cell.date.day}`;
            if (renderDay) {
              return (
                <View key={key} style={s.cellWrap}>
                  {renderDay(cell, () => {
                    if (!cell.isDisabled) onSelectDay(cell.date);
                  })}
                </View>
              );
            }
            return (
              <DayCell
                key={key}
                {...cell}
                showHolidays={showHolidays}
                onPress={onSelectDay}
                tokens={tokens}
                styles={styles}
                testID={
                  testID
                    ? `${testID}-day-${cell.date.year}-${cell.date.month}-${cell.date.day}`
                    : undefined
                }
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default DayGrid;
