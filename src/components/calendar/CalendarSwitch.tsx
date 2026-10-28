import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MAX_FONT_SCALE } from '../theme/a11y';
import type { PickerStyles } from '../theme/styleKeys';
import { fontStyle, type ThemeTokens } from '../theme/tokens';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** 'switch': segments in a track (the calendar switch). 'tabs': underlined tabs (a dual calendar's). */
  variant: 'switch' | 'tabs';
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

const KEYS = {
  switch: {
    box: 'calendarSwitch',
    item: 'calendarSwitchSegment',
    itemSelected: 'calendarSwitchSegmentSelected',
    text: 'calendarSwitchText',
    textSelected: 'calendarSwitchTextSelected',
  },
  tabs: {
    box: 'dualTabs',
    item: 'dualTab',
    itemSelected: 'dualTabSelected',
    text: 'dualTabText',
    textSelected: 'dualTabTextSelected',
  },
} as const;

const cache = new WeakMap<ThemeTokens, ReturnType<typeof create>>();

const create = (t: ThemeTokens) =>
  StyleSheet.create({
    switch: {
      flexDirection: 'row',
      padding: 4,
      gap: 4,
      marginTop: 12,
      borderRadius: t.radius,
      backgroundColor: t.toggleTrack,
    },
    switchItem: {
      flex: 1,
      minHeight: t.touchTarget - 8,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Math.max(0, t.radius - 2),
    },
    switchItemSelected: { backgroundColor: t.accent },
    switchText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    switchTextSelected: { color: t.onAccent },
    tabs: {
      flexDirection: 'row',
      marginTop: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    tabsItem: {
      flex: 1,
      minHeight: t.touchTarget,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabsItemSelected: { borderBottomColor: t.accent },
    tabsText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.mutedText,
    },
    tabsTextSelected: { ...fontStyle(t, 'semiBold'), color: t.accent },
  });

const stylesFor = (t: ThemeTokens) => {
  let s = cache.get(t);
  if (!s) {
    s = create(t);
    cache.set(t, s);
  }
  return s;
};

/**
 * One row of choices, one of them selected: the Gregorian / Hijri / Dual
 * switch above the calendar, and the Gregorian / Hijri tabs of a dual calendar.
 * Each part takes its own key from the `styles` prop.
 */
const CalendarSwitch = <T extends string>({
  variant,
  options,
  selected,
  onSelect,
  accessibilityLabel,
  tokens,
  styles,
  testID,
}: Props<T>): React.ReactElement => {
  const s = stylesFor(tokens);
  const keys = KEYS[variant];
  const own = {
    box: variant === 'switch' ? s.switch : s.tabs,
    item: variant === 'switch' ? s.switchItem : s.tabsItem,
    itemSelected:
      variant === 'switch' ? s.switchItemSelected : s.tabsItemSelected,
    text: variant === 'switch' ? s.switchText : s.tabsText,
    textSelected:
      variant === 'switch' ? s.switchTextSelected : s.tabsTextSelected,
  };
  const tabs = variant === 'tabs';
  return (
    <View
      style={[own.box, styles?.[keys.box]]}
      accessibilityRole={tabs ? 'tablist' : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {options.map((option) => {
        const on = option.value === selected;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole={tabs ? 'tab' : 'radio'}
            accessibilityState={tabs ? { selected: on } : { checked: on }}
            onPress={() => {
              if (!on) onSelect(option.value);
            }}
            style={[
              own.item,
              styles?.[keys.item],
              on && [own.itemSelected, styles?.[keys.itemSelected]],
            ]}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[
                own.text,
                styles?.[keys.text],
                on && [own.textSelected, styles?.[keys.textSelected]],
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default CalendarSwitch;
