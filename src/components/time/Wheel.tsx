import React, { memo, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { ScrollViewRef } from '../nativeTypes';
import type { TimeBounds } from '../../core/constraints';
import { from12Hour, to12Hour, type Period } from '../../core/segments';
import { isPeriodAllowed } from '../../core/timeEntry';
import type { Time, TimeFormat } from '../../core/types';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import { useNumerals } from '../theme/numerals';
import type { ThemeTokens } from '../theme/tokens';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { buildTimeStyles } from './timeStyles';

export const WHEEL_ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;
/** Android sends drag-end before momentum-begin; wait this long for a fling. */
const MOMENTUM_WAIT_MS = 60;

export interface WheelItem {
  value: number;
  label: string;
  disabled: boolean;
}

/** The enabled row nearest to `index` (searching both ways), or `index` when none is. */
export const nearestEnabled = (items: WheelItem[], index: number): number => {
  const start = Math.max(0, Math.min(items.length - 1, index));
  for (let d = 0; d < items.length; d += 1) {
    const after = items[start + d];
    const before = items[start - d];
    if (after && !after.disabled) return start + d;
    if (before && !before.disabled) return start - d;
  }
  return start;
};

/** The next enabled row in a direction (screen-reader increment / decrement). */
export const stepEnabled = (
  items: WheelItem[],
  index: number,
  step: 1 | -1
): number => {
  for (let i = index + step; i >= 0 && i < items.length; i += step) {
    if (!items[i]?.disabled) return i;
  }
  return index;
};

interface ColumnProps {
  items: WheelItem[];
  value: number;
  onChange: (value: number) => void;
  onSpinChange: (spinning: boolean) => void;
  a11yLabel: string;
  disabled?: boolean;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

/**
 * One wheel column on a native ScrollView: momentum and snapping come from the
 * platform. A disabled row it stops on springs to the nearest enabled one. The
 * value is reported only once it settles, and the picker blocks Confirm until then.
 */
const WheelColumnBase: React.FC<ColumnProps> = ({
  items,
  value,
  onChange,
  onSpinChange,
  a11yLabel,
  disabled,
  tokens,
  styles,
  testID,
}) => {
  const digits = useNumerals();
  const s = buildTimeStyles(tokens);
  const ref = useRef<ScrollViewRef>(null);
  const reduceMotion = useReduceMotion();
  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.value === value)
  );
  const [centered, setCentered] = useState(selectedIndex);
  const spinning = useRef(false);
  const momentumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSpinning = (next: boolean) => {
    if (spinning.current === next) return;
    spinning.current = next;
    onSpinChange(next);
  };

  // Follow a value set from outside (typed, reset) while the wheel is still.
  useEffect(() => {
    if (spinning.current) return;
    setCentered(selectedIndex);
    ref.current?.scrollTo({
      y: selectedIndex * WHEEL_ROW_HEIGHT,
      animated: false,
    });
  }, [selectedIndex, items.length]);

  // Closed mid-spin: drop the timer and stop blocking Confirm.
  const onSpinRef = useRef(onSpinChange);
  onSpinRef.current = onSpinChange;
  useEffect(
    () => () => {
      if (momentumTimer.current) clearTimeout(momentumTimer.current);
      if (spinning.current) onSpinRef.current(false);
    },
    []
  );

  const indexAt = (y: number) =>
    Math.max(0, Math.min(items.length - 1, Math.round(y / WHEEL_ROW_HEIGHT)));

  const settle = (y: number) => {
    if (momentumTimer.current) clearTimeout(momentumTimer.current);
    momentumTimer.current = null;
    const landed = indexAt(y);
    const target = nearestEnabled(items, landed);
    if (target !== landed)
      ref.current?.scrollTo({
        y: target * WHEEL_ROW_HEIGHT,
        animated: !reduceMotion,
      });
    setCentered(target);
    setSpinning(false);
    if (items[target] && items[target].value !== value)
      onChange(items[target].value);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = indexAt(e.nativeEvent.contentOffset.y);
    if (i !== centered) setCentered(i);
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    const next = stepEnabled(items, selectedIndex, step);
    const item = items[next];
    if (next !== selectedIndex && item) onChange(item.value);
  };

  return (
    <View
      style={[s.wheelColumn, styles?.wheel]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={a11yLabel}
      accessibilityValue={{ text: items[selectedIndex]?.label ?? '' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={[s.wheelHighlight, styles?.wheelHighlight]}
      />
      <ScrollView
        ref={ref}
        testID={testID ? `${testID}-scroll` : undefined}
        scrollEnabled={!disabled}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: selectedIndex * WHEEL_ROW_HEIGHT }}
        contentContainerStyle={{ paddingVertical: PAD_ROWS * WHEEL_ROW_HEIGHT }}
        importantForAccessibility="no-hide-descendants"
        onScroll={onScroll}
        onScrollBeginDrag={() => setSpinning(true)}
        onScrollEndDrag={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          momentumTimer.current = setTimeout(() => settle(y), MOMENTUM_WAIT_MS);
        }}
        onMomentumScrollBegin={() => {
          if (momentumTimer.current) clearTimeout(momentumTimer.current);
          setSpinning(true);
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {items.map((item, i) => (
          <View
            key={item.value}
            style={[
              s.wheelRow,
              styles?.wheelRow,
              i === centered && styles?.wheelRowSelected,
              item.disabled && styles?.wheelRowDisabled,
            ]}
          >
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[
                s.wheelText,
                styles?.wheelText,
                i === centered && [
                  s.wheelTextSelected,
                  styles?.wheelTextSelected,
                ],
                item.disabled && [
                  s.wheelTextDisabled,
                  styles?.wheelTextDisabled,
                ],
              ]}
            >
              {digits(item.label)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const WheelColumn = memo(WheelColumnBase);

const pad2 = (n: number) => String(n).padStart(2, '0');
const minutesOf = (t: Time) => t.hour * 60 + t.minute;
const inBounds = (t: Time, b?: TimeBounds | null) =>
  !(b?.min && minutesOf(t) < minutesOf(b.min)) &&
  !(b?.max && minutesOf(t) > minutesOf(b.max));

export interface TimeWheelProps {
  time: Time | null;
  onTime: (time: Time) => void;
  onSpinChange: (spinning: boolean) => void;
  timeFormat: TimeFormat;
  minuteStep?: number;
  bounds?: TimeBounds | null;
  disabled?: boolean;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

/**
 * `timeInput='wheel'`: hour, minute (by `minuteStep`) and AM/PM columns; two in
 * 24-hour. Rows outside the day's limits are dimmed and can't be stopped on.
 */
const TimeWheel: React.FC<TimeWheelProps> = ({
  time,
  onTime,
  onSpinChange,
  timeFormat,
  minuteStep = 1,
  bounds,
  disabled,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const s = buildTimeStyles(tokens);
  const current = time ?? { hour: 0, minute: 0 };
  const { hour12, period } = to12Hour(current.hour);
  const is12 = timeFormat === '12h';

  // Each column spinning separately; Confirm waits for all of them.
  const spinningColumns = useRef(new Set<string>());
  const spin = (column: string) => (on: boolean) => {
    if (on) spinningColumns.current.add(column);
    else spinningColumns.current.delete(column);
    onSpinChange(spinningColumns.current.size > 0);
  };

  const hourOf = (h: number) => (is12 ? from12Hour(h, period) : h);
  const hourItems: WheelItem[] = (
    is12
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : Array.from({ length: 24 }, (_, i) => i)
  ).map((h) => {
    const h24 = hourOf(h);
    const anyMinute =
      !bounds ||
      inBounds({ hour: h24, minute: 0 }, bounds) ||
      inBounds({ hour: h24, minute: 59 }, bounds);
    return { value: h, label: pad2(h), disabled: !anyMinute };
  });
  const minuteItems: WheelItem[] = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep
  ).map((m) => {
    return {
      value: m,
      label: pad2(m),
      disabled: !inBounds({ hour: current.hour, minute: m }, bounds),
    };
  });
  const periodItems: WheelItem[] = (['AM', 'PM'] as Period[]).map((p, i) => {
    return {
      value: i,
      label: p === 'AM' ? strings.am : strings.pm,
      disabled: !isPeriodAllowed(p, bounds),
    };
  });

  const common = { disabled, tokens, styles };
  return (
    <View style={[s.wheels, styles?.timeRow]} testID={testID}>
      <WheelColumn
        {...common}
        items={hourItems}
        value={is12 ? hour12 : current.hour}
        onChange={(h) => onTime({ hour: hourOf(h), minute: current.minute })}
        onSpinChange={spin('hour')}
        a11yLabel={strings.a11yHour}
        testID={testID ? `${testID}-hour` : undefined}
      />
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[s.colon, styles?.timeColon]}
      >
        :
      </Text>
      <WheelColumn
        {...common}
        items={minuteItems}
        value={current.minute}
        onChange={(m) => onTime({ hour: current.hour, minute: m })}
        onSpinChange={spin('minute')}
        a11yLabel={strings.a11yMinute}
        testID={testID ? `${testID}-minute` : undefined}
      />
      {is12 ? (
        <WheelColumn
          {...common}
          items={periodItems}
          value={period === 'AM' ? 0 : 1}
          onChange={(p) =>
            onTime({
              hour: from12Hour(hour12, p === 0 ? 'AM' : 'PM'),
              minute: current.minute,
            })
          }
          onSpinChange={spin('period')}
          a11yLabel={strings.a11yPeriod}
          testID={testID ? `${testID}-period` : undefined}
        />
      ) : null}
    </View>
  );
};

export default TimeWheel;
