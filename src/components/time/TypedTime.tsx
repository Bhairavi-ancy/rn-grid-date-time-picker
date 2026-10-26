import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
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
 * TextInputs; the row (TimeRow) owns their values. Number pad, with a Done bar
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
  const s = buildTimeStyles(tokens);

  const box = (key: TimeKey) => (
    <View style={s.boxWrap}>
      <View
        style={[
          s.boxContainer,
          styles?.timeBox,
          focused === key && [s.boxFocused, styles?.timeBoxFocused],
          hasError && [s.boxError, styles?.timeBoxError],
        ]}
      >
        <View style={s.boxInner}>
          <TextInput
            ref={(r) => setRef(key, r)}
            testID={testID ? `${testID}-${key}` : undefined}
            accessibilityLabel={
              key === 'hour' ? strings.a11yHour : strings.a11yMinute
            }
            value={values[key] ?? ''}
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
            // iOS adds a Done button above the number pad for each box.
            returnKeyType="done"
            inputAccessoryViewButtonLabel={strings.done}
            onChangeText={(text) => onChangeBox(key, text)}
            onFocus={() => onFocusBox(key)}
            onBlur={() => onBlurBox(key)}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace') onBackspace(key);
            }}
            style={[s.boxText, styles?.timeBoxText, s.boxInput]}
          />
        </View>
      </View>
    </View>
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
