import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CalendarDate } from '../../core/types';
import type { PickerStyles } from '../theme/styleKeys';
import { DAY_HIT_SLOP, MAX_FONT_SCALE } from '../theme/a11y';
import { useNumerals } from '../theme/numerals';
import type { ThemeTokens } from '../theme/tokens';
import { buildCalendarStyles } from './calendarStyles';

export type RangeRole = 'start' | 'middle' | 'end' | 'single' | null;

/** Everything a day cell shows; also what `renderDay` receives. */
export interface DayCellState {
  date: CalendarDate;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isHoliday: boolean;
  rangeRole: RangeRole;
  /** The number to show, when it isn't the Gregorian day (Hijri grid). */
  label?: number;
  /** A second line under the day number. Null unless a `subLabel` is given. */
  subLabel?: string | null;
  a11yLabel: string;
}

interface Props extends DayCellState {
  showHolidays: boolean;
  onPress: (day: CalendarDate) => void;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

/**
 * One day: today ring, selected fill, range band, greyed (not pressable) when
 * disabled, holiday colour. Only primitive-ish props change between renders, so
 * memo keeps typing and taps from redrawing all 42 cells.
 */
const DayCell: React.FC<Props> = ({
  date,
  inMonth,
  isToday,
  isSelected,
  isDisabled,
  isHoliday,
  rangeRole,
  label,
  subLabel,
  a11yLabel,
  showHolidays,
  onPress,
  tokens,
  styles,
  testID,
}) => {
  const digits = useNumerals();
  const s = buildCalendarStyles(tokens);
  const filled =
    isSelected &&
    (rangeRole === null ||
      rangeRole === 'single' ||
      rangeRole === 'start' ||
      rangeRole === 'end');
  const fill =
    rangeRole === 'middle'
      ? s.fillFull
      : rangeRole === 'start'
        ? s.fillStart
        : rangeRole === 'end'
          ? s.fillEnd
          : null;

  return (
    <View style={s.cellWrap}>
      {fill ? <View style={[s.fill, fill, styles?.rangeFill]} /> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
        disabled={isDisabled}
        hitSlop={DAY_HIT_SLOP}
        onPress={() => onPress(date)}
        style={({ pressed }) => [
          s.day,
          styles?.day,
          isToday && !filled && [s.today, styles?.today],
          filled && [s.selected, styles?.selected],
          rangeRole === 'start' && styles?.rangeStart,
          rangeRole === 'middle' && styles?.rangeMiddle,
          rangeRole === 'end' && styles?.rangeEnd,
          !inMonth && styles?.outside,
          isDisabled && styles?.disabled,
          isHoliday && showHolidays && styles?.holiday,
          pressed && !isDisabled && !filled && [s.pressed, styles?.dayPressed],
        ]}
      >
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[
            s.dayText,
            styles?.dayText,
            !inMonth && [s.outsideText, styles?.outsideText],
            isHoliday &&
              showHolidays &&
              !filled && [s.holidayText, styles?.holidayText],
            isToday && !filled && styles?.todayText,
            isDisabled && [s.disabledText, styles?.disabledText],
            filled && [s.selectedText, styles?.selectedText],
          ]}
        >
          {digits(String(label ?? date.day))}
        </Text>
        {subLabel ? (
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[s.subLabel, styles?.daySubLabel, filled && s.selectedText]}
          >
            {digits(subLabel)}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
};

export default memo(DayCell);
