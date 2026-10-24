import React, { useEffect, useRef } from 'react';
import { I18nManager, Pressable, ScrollView, Text, View } from 'react-native';
import type { ScrollViewRef } from '../nativeTypes';
import {
  renderIcon,
  resolveIcons,
  type IconName,
  type IconOptions,
  type IconSet,
} from '../../icons';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import type { ThemeTokens } from '../theme/tokens';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { buildCalendarStyles } from './calendarStyles';

interface HeaderProps {
  /** '2026', 'March 2026' or '2016 – 2027', depending on the view. */
  title: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTitlePress: () => void;
  prevLabel: string;
  nextLabel: string;
  titleLabel: string;
  /** Replacements for the built-in chevrons. */
  icons?: Partial<IconSet>;
  iconProps?: Partial<Record<IconName, IconOptions>>;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

/** `‹ 2026 ⌄ ›`: arrows stop at the allowed range; the title opens the year grid. */
export const CalendarHeader: React.FC<HeaderProps> = ({
  title,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onTitlePress,
  prevLabel,
  nextLabel,
  titleLabel,
  icons,
  iconProps,
  tokens,
  styles,
  testID,
}) => {
  const s = buildCalendarStyles(tokens);
  const ico = resolveIcons(icons);
  const arrow = (
    dir: 'prev' | 'next',
    enabled: boolean,
    onPress: () => void,
    label: string
  ) => {
    // Chevrons point in the reading direction; mirrored in right-to-left layouts.
    const pointsLeft = (dir === 'prev') !== I18nManager.isRTL;
    const chevron = pointsLeft ? 'chevronLeft' : 'chevronRight';
    return (
      <Pressable
        testID={testID ? `${testID}-${dir}` : undefined}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={onPress}
        style={[
          s.navArrow,
          styles?.navArrow,
          !enabled && [s.navArrowDisabled, styles?.navArrowDisabled],
        ]}
      >
        <View
          testID={
            testID
              ? `${testID}-${dir}-${pointsLeft ? 'left' : 'right'}`
              : undefined
          }
        >
          {renderIcon(
            ico[chevron],
            { size: 24, color: tokens.mutedText, disabled: !enabled },
            iconProps?.[chevron]
          )}
        </View>
      </Pressable>
    );
  };
  return (
    <View style={[s.header, styles?.calendarHeader]}>
      {arrow('prev', canPrev, onPrev, prevLabel)}
      <Pressable
        testID={testID ? `${testID}-title` : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${titleLabel}`}
        onPress={onTitlePress}
        style={[s.yearButton, styles?.yearButton]}
      >
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[s.yearButtonText, styles?.yearButtonText]}
        >
          {title}
        </Text>
        <View style={s.caret}>
          {renderIcon(
            ico.chevronDown,
            { size: 24, color: tokens.accent },
            iconProps?.chevronDown
          )}
        </View>
      </Pressable>
      {arrow('next', canNext, onNext, nextLabel)}
    </View>
  );
};

interface ChipsProps {
  names: string[];
  fullNames: string[];
  selectedMonth: number;
  isEnabled: (month: number) => boolean;
  onSelect: (month: number) => void;
  renderMonthChip?: (
    month: number,
    state: { selected: boolean; disabled: boolean }
  ) => React.ReactNode;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const CHIP_STEP = 60;

/** Scrolling row of month chips; months with no selectable day are greyed. */
export const MonthChips: React.FC<ChipsProps> = ({
  names,
  fullNames,
  selectedMonth,
  isEnabled,
  onSelect,
  renderMonthChip,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const s = buildCalendarStyles(tokens);
  const ref = useRef<ScrollViewRef>(null);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    ref.current?.scrollTo({
      x: Math.max(0, (selectedMonth - 2) * CHIP_STEP),
      animated: !reduceMotion,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrolls only when the month changes
  }, [selectedMonth]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.chipRow, styles?.monthChipRow]}
      accessibilityLabel={strings.a11yChooseMonth}
    >
      {names.map((name, i) => {
        const month = i + 1;
        const selected = month === selectedMonth;
        const disabled = !isEnabled(month);
        if (renderMonthChip) {
          return (
            <Pressable
              key={month}
              disabled={disabled}
              onPress={() => onSelect(month)}
            >
              {renderMonthChip(month, { selected, disabled })}
            </Pressable>
          );
        }
        return (
          <Pressable
            key={month}
            testID={testID ? `${testID}-chip-${month}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={fullNames[i]}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(month)}
            style={[
              s.chip,
              styles?.monthChip,
              selected && [s.chipSelected, styles?.monthChipSelected],
              disabled && [s.chipDisabled, styles?.monthChipDisabled],
            ]}
          >
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[
                s.chipText,
                styles?.monthChipText,
                selected && s.chipSelectedText,
              ]}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
