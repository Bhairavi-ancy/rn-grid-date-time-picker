import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
import { useIsRTL } from '../theme/direction';
import { useNumerals } from '../theme/numerals';
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
  /** The title has nothing to open (a year-only pick): no caret, not tappable. */
  titleDisabled?: boolean;
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
  titleDisabled,
  prevLabel,
  nextLabel,
  titleLabel,
  icons,
  iconProps,
  tokens,
  styles,
  testID,
}) => {
  const digits = useNumerals();
  const isRTL = useIsRTL();
  const s = buildCalendarStyles(tokens);
  const ico = resolveIcons(icons);
  const arrow = (
    dir: 'prev' | 'next',
    enabled: boolean,
    onPress: () => void,
    label: string
  ) => {
    // Chevrons point in the reading direction; mirrored in right-to-left layouts.
    const pointsLeft = (dir === 'prev') !== isRTL;
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
        accessibilityRole={titleDisabled ? 'text' : 'button'}
        accessibilityLabel={titleDisabled ? title : `${title}. ${titleLabel}`}
        disabled={titleDisabled}
        onPress={onTitlePress}
        style={[s.yearButton, styles?.yearButton]}
      >
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[s.yearButtonText, styles?.yearButtonText]}
        >
          {digits(title)}
        </Text>
        {titleDisabled ? null : (
          <View style={s.caret}>
            {renderIcon(
              ico.chevronDown,
              { size: 24, color: tokens.accent },
              iconProps?.chevronDown
            )}
          </View>
        )}
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
  renderMonthChipFade?: (
    side: 'left' | 'right',
    color: string
  ) => React.ReactNode;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const FADE_EDGE = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  pointerEvents: 'none',
} as const;
const FADE_LEFT = { ...FADE_EDGE, left: 0 } as const;
const FADE_RIGHT = { ...FADE_EDGE, right: 0 } as const;

/** Scrolling row of month chips; months with no selectable day are greyed. */
export const MonthChips: React.FC<ChipsProps> = ({
  names,
  fullNames,
  selectedMonth,
  isEnabled,
  onSelect,
  renderMonthChip,
  renderMonthChipFade,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const s = buildCalendarStyles(tokens);
  const ref = useRef<ScrollViewRef>(null);
  // Which edges have months scrolled past them, for renderMonthChipFade.
  const offset = useRef(0);
  const [hidden, setHidden] = useState({ left: false, right: false });
  const syncEdges = () => {
    if (!renderMonthChipFade) return;
    const left = offset.current > 1;
    const right = content.current - viewport.current - offset.current > 1;
    setHidden((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  };
  const reduceMotion = useReduceMotion();
  // Chips are measured (long Hijri names and large text make them wider), and
  // the selected one is scrolled to the middle of the row.
  const chips = useRef<Record<number, { x: number; width: number }>>({});
  const viewport = useRef(0);
  const content = useRef(0);
  // Until the row is dragged or the month changes, the selected chip is held
  // in view: Android moves a right-to-left row to its end after the first
  // layout, which undoes the first scroll.
  const holding = useRef(true);
  const first = useRef(true);
  const selectedOffset = (): number | null => {
    const chip = chips.current[selectedMonth];
    if (!chip || !viewport.current) return null;
    const centred = chip.x - (viewport.current - chip.width) / 2;
    const end = Math.max(0, content.current - viewport.current);
    return Math.max(0, content.current ? Math.min(centred, end) : centred);
  };
  const scrollToSelected = (animated: boolean) => {
    const x = selectedOffset();
    if (x === null) return;
    ref.current?.scrollTo({ x, animated });
    offset.current = x;
    syncEdges();
  };
  useEffect(() => {
    if (first.current) first.current = false;
    else holding.current = false;
    scrollToSelected(!reduceMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrolls only when the month changes
  }, [selectedMonth]);
  const onChipLayout = (month: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    chips.current[month] = { x, width };
    if (month === selectedMonth) scrollToSelected(false);
  };

  const row = (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.chipRow, styles?.monthChipRow]}
      accessibilityLabel={strings.a11yChooseMonth}
      onLayout={(e) => {
        viewport.current = e.nativeEvent.layout.width;
        scrollToSelected(false);
        syncEdges();
      }}
      onContentSizeChange={(width) => {
        content.current = width;
        if (holding.current) scrollToSelected(false);
        syncEdges();
      }}
      scrollEventThrottle={16}
      onScroll={(e) => {
        offset.current = e.nativeEvent.contentOffset.x;
        syncEdges();
        if (!holding.current) return;
        const x = selectedOffset();
        if (x !== null && Math.abs(e.nativeEvent.contentOffset.x - x) > 1)
          ref.current?.scrollTo({ x, animated: false });
      }}
      onScrollBeginDrag={() => {
        holding.current = false;
      }}
    >
      {names.map((name, i) => {
        const month = i + 1;
        const selected = month === selectedMonth;
        const disabled = !isEnabled(month);
        if (renderMonthChip) {
          return (
            <Pressable
              key={month}
              testID={testID ? `${testID}-chip-${month}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={fullNames[i]}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(month)}
              onLayout={onChipLayout(month)}
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
            onLayout={onChipLayout(month)}
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
  if (!renderMonthChipFade) return row;
  return (
    <View>
      {row}
      {hidden.left ? (
        <View
          testID={testID ? `${testID}-chip-fade-left` : undefined}
          style={FADE_LEFT}
        >
          {renderMonthChipFade('left', tokens.background)}
        </View>
      ) : null}
      {hidden.right ? (
        <View
          testID={testID ? `${testID}-chip-fade-right` : undefined}
          style={FADE_RIGHT}
        >
          {renderMonthChipFade('right', tokens.background)}
        </View>
      ) : null}
    </View>
  );
};
