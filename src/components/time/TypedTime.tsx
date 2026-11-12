import React, { useId, useRef } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import KeyboardAccessoryBar from '../field/KeyboardAccessoryBar';
import type { TextInputRef } from '../nativeTypes';
import type { TimeBounds } from '../../core/constraints';
import type { Period } from '../../core/segments';
import {
  isPeriodAllowed,
  type TimeEntryValues,
  type TimeKey,
} from '../../core/timeEntry';
import type { TimeFormat } from '../../core/types';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import { useNumerals } from '../theme/numerals';
import type { ThemeTokens } from '../theme/tokens';
import { buildTimeStyles } from './timeStyles';

interface Props {
  values: TimeEntryValues;
  focused: TimeKey | null;
  onChangeBox: (key: TimeKey, text: string) => void;
  onFocusBox: (key: TimeKey) => void;
  onBlurBox: (key: TimeKey) => void;
  onBackspace: (key: TimeKey) => void;
  onPeriod: (period: Period) => void;
  setRef: (key: TimeKey, ref: TextInputRef | null) => void;
  timeFormat: TimeFormat;
  bounds?: TimeBounds | null;
  hasError: boolean;
  disabled?: boolean;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const PERIODS: Period[] = ['AM', 'PM'];

/**
 * `[hh] : [mm] [AM | PM]`, or `[HH] : [mm]` in 24-hour. The boxes are plain
 * TextInputs; the row (TimeRow) owns their values. Number pad, with a solid bar
 * on iOS. The AM/PM side that can't hold an allowed time is disabled.
 */
const TypedTime: React.FC<Props> = ({
  values,
  focused,
  onChangeBox,
  onFocusBox,
  onBlurBox,
  onBackspace,
  onPeriod,
  setRef,
  timeFormat,
  bounds,
  hasError,
  disabled,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const digits = useNumerals();
  const barId = useId();
  const s = buildTimeStyles(tokens);
  const inputs = useRef<Partial<Record<TimeKey, TextInputRef | null>>>({});

  // Android: a TextInput keeps any drag that starts on it, so the sheet can't
  // scroll from a box. The boxes ignore touches and their wrapper takes them:
  // a drag scrolls the sheet, a tap focuses the box (and brings the keyboard
  // back). None of this changes with focus: flipping a box's touch handling
  // as it gained focus made Android pass focus on to the next box, round and
  // round. The wrapper is never focusable itself.
  const passTouches = Platform.OS === 'android' && !disabled;

  const box = (key: TimeKey) => (
    <Pressable
      style={s.boxWrap}
      accessible={false}
      focusable={false}
      disabled={!passTouches}
      onPress={() => inputs.current[key]?.focus()}
      testID={testID ? `${testID}-${key}-wrap` : undefined}
    >
      <View
        style={[
          s.boxContainer,
          styles?.timeBox,
          focused === key && [s.boxFocused, styles?.timeBoxFocused],
          hasError && [s.boxError, styles?.timeBoxError],
        ]}
      >
        <View style={s.boxInner} pointerEvents={passTouches ? 'none' : 'auto'}>
          <TextInput
            ref={(r) => {
              inputs.current[key] = r;
              setRef(key, r);
            }}
            testID={testID ? `${testID}-${key}` : undefined}
            accessibilityLabel={
              key === 'hour' ? strings.a11yHour : strings.a11yMinute
            }
            value={digits(values[key] ?? '')}
            placeholder={
              key === 'minute'
                ? strings.placeholderMinute
                : timeFormat === '12h'
                  ? strings.placeholderHour
                  : strings.placeholderHour24
            }
            placeholderTextColor={tokens.placeholder}
            keyboardType="number-pad"
            maxLength={2}
            // A digit typed into a full box replaces it rather than being
            // dropped (the row jumps into the minutes after the hour).
            selectTextOnFocus
            textAlign="center"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            contextMenuHidden
            editable={!disabled}
            underlineColorAndroid="transparent"
            // iOS: this box's own solid bar (below).
            inputAccessoryViewID={`${barId}-${key}`}
            onChangeText={(text) => onChangeBox(key, text)}
            onFocus={() => onFocusBox(key)}
            onBlur={() => onBlurBox(key)}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace') onBackspace(key);
            }}
            style={[s.boxText, styles?.timeBoxText, s.boxInput]}
          />
          <KeyboardAccessoryBar nativeID={`${barId}-${key}`} tokens={tokens} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={s.boxes}>
      <View style={s.clock}>
        {box('hour')}
        <View style={s.colonCell}>
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[s.colon, styles?.timeColon]}
          >
            :
          </Text>
        </View>
        {box('minute')}
      </View>
      {timeFormat === '12h' ? (
        <View
          style={[s.toggle, styles?.ampmToggle]}
          accessibilityRole="radiogroup"
          accessibilityLabel={strings.a11yPeriod}
        >
          {PERIODS.map((period) => {
            const selected = values.period === period;
            const allowed = isPeriodAllowed(period, bounds);
            return (
              <Pressable
                key={period}
                testID={
                  testID ? `${testID}-${period.toLowerCase()}` : undefined
                }
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected,
                  disabled: !allowed || disabled,
                }}
                disabled={!allowed || disabled}
                onPress={() => onPeriod(period)}
                style={[
                  s.option,
                  styles?.ampmOption,
                  selected && [s.optionSelected, styles?.ampmOptionSelected],
                  !allowed && [s.optionDisabled, styles?.ampmOptionDisabled],
                ]}
              >
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={[
                    s.optionText,
                    styles?.ampmOptionText,
                    selected && s.optionSelectedText,
                  ]}
                >
                  {period === 'AM' ? strings.am : strings.pm}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

export default TypedTime;
