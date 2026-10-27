import React, { useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { KeyPressEvent, TextInputRef } from '../nativeTypes';
import type {
  SegmentEditorAction,
  SegmentEditorState,
} from '../../core/segmentEditor';
import { toLatinDigits } from '../../core/digits';
import type { Period, SegmentKey, SegmentSpec } from '../../core/segments';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import { MAX_FONT_SCALE } from '../theme/a11y';
import { useNumerals } from '../theme/numerals';
import type { ThemeTokens } from '../theme/tokens';
import { buildFieldStyles } from './fieldStyles';

interface Props {
  state: SegmentEditorState;
  dispatch: (action: SegmentEditorAction) => void;
  /** The latest state, ahead of `state` while fast input waits for a render. */
  getState?: () => SegmentEditorState;
  disabled?: boolean;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  /** The field's label, spoken before each segment's own name. */
  fieldLabel?: string;
  testID?: string;
}

/** The hour segment of a 24-hour layout counts to 23. */
const PLACEHOLDER = (
  strings: PickerStrings,
  hour24: boolean
): Record<SegmentKey, string> => {
  return {
    day: strings.placeholderDay,
    month: strings.placeholderMonth,
    year: strings.placeholderYear,
    hour: hour24 ? strings.placeholderHour24 : strings.placeholderHour,
    minute: strings.placeholderMinute,
    period: strings.am,
  };
};

const A11Y_LABEL = (strings: PickerStrings): Record<SegmentKey, string> => {
  return {
    day: strings.a11yDay,
    month: strings.a11yMonth,
    year: strings.a11yYear,
    hour: strings.a11yHour,
    minute: strings.a11yMinute,
    period: strings.a11yPeriod,
  };
};

/** Turns a controlled TextInput change into editor actions (typed digits, paste, delete). */
export const changeToActions = (
  current: string,
  next: string
): ({ type: 'digit'; digit: string } | { type: 'backspace' })[] => {
  if (next.startsWith(current)) {
    return next
      .slice(current.length)
      .split('')
      .map((digit) => {
        return { type: 'digit', digit };
      });
  }
  if (current.startsWith(next)) {
    return Array.from({ length: current.length - next.length }, () => {
      return { type: 'backspace' };
    });
  }
  const clear: { type: 'backspace' }[] = Array.from(
    { length: current.length },
    () => {
      return { type: 'backspace' };
    }
  );
  return [
    ...clear,
    ...next.split('').map((digit) => ({ type: 'digit', digit }) as const),
  ];
};

/**
 * The typed field: one box per segment in locale order, plus an AM/PM switch for
 * 12-hour date-times. Number pad, with a "Done" bar on iOS (its number pad has no
 * return key).
 */
const SegmentedInput: React.FC<Props> = ({
  state,
  dispatch,
  getState,
  disabled,
  tokens,
  styles,
  strings,
  fieldLabel,
  testID,
}) => {
  const digits = useNumerals();
  // Each box's text as last rendered, and as it last reported. Fast input (a
  // hardware keyboard, autofill) sends the next character before React has
  // re-rendered, and the native box may ignore React's reset while it's
  // behind, so a change is read against whichever of the two it extends.
  const boxText = useRef<
    Partial<Record<SegmentKey, { rendered: string; reported?: string }>>
  >({});
  const refs = useRef<Partial<Record<SegmentKey, TextInputRef | null>>>({});
  const s = buildFieldStyles(tokens);
  // 'From, Day' and 'To, Day' read differently when the field has a label.
  const own = A11Y_LABEL(strings);
  const labels = fieldLabel
    ? (Object.fromEntries(
        Object.entries(own).map(([k, v]) => [k, `${fieldLabel}, ${v}`])
      ) as Record<SegmentKey, string>)
    : own;
  // Segment boxes fit their digits at the font size in use and the phone's
  // text size (up to the picker's cap), so nothing clips at large sizes.
  const { fontScale } = useWindowDimensions();
  const fontSize =
    (StyleSheet.flatten(styles?.fieldSegment) as { fontSize?: number } | null)
      ?.fontSize ?? tokens.fontSizeMedium;
  const widths = useMemo(() => {
    const em = fontSize * Math.min(fontScale || 1, MAX_FONT_SCALE);
    return {
      short: { width: Math.ceil(em * 1.75) + 2 },
      long: { width: Math.ceil(em * 3) + 2 },
    };
  }, [fontSize, fontScale]);
  const placeholders = PLACEHOLDER(
    strings,
    state.layout.segments.some((seg) => seg.key === 'hour' && seg.max === 23)
  );

  useEffect(() => {
    if (state.focused) refs.current[state.focused]?.focus();
  }, [state.focused]);

  const renderNumeric = (spec: SegmentSpec, index: number) => {
    const text = state.values[spec.key] ?? '';
    const isFocused = state.focused === spec.key;
    const track = boxText.current[spec.key] ?? { rendered: text };
    track.rendered = text;
    boxText.current[spec.key] = track;
    // After the last box fills, no segment is focused but the cursor stays in
    // that box: input there (a correction, Backspace) focuses it first.
    const claimFocus = () => {
      if (!(getState?.() ?? state).focused)
        dispatch({ type: 'focus', key: spec.key });
    };
    // Backspace in a box that was already empty goes back to the previous
    // one; the box's rendered text is checked, so a change that arrives first
    // (and empties it) doesn't also delete in the previous box.
    const onKeyPress = (e: KeyPressEvent) => {
      claimFocus();
      if (e.nativeEvent.key === 'Backspace' && !track.rendered)
        dispatch({ type: 'backspace' });
    };
    const separator =
      index > 0
        ? spec.key === 'hour'
          ? ' '
          : spec.key === 'minute'
            ? ':'
            : state.layout.dateSeparator
        : '';
    return (
      <React.Fragment key={spec.key}>
        {separator ? (
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[s.separator, styles?.fieldSeparator]}
          >
            {separator}
          </Text>
        ) : null}
        <TextInput
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          ref={(r) => {
            refs.current[spec.key] = r;
          }}
          testID={testID ? `${testID}-segment-${spec.key}` : undefined}
          accessibilityLabel={labels[spec.key]}
          value={digits(text)}
          placeholder={placeholders[spec.key]}
          placeholderTextColor={tokens.placeholder}
          keyboardType="number-pad"
          editable={!disabled}
          contextMenuHidden
          // iOS adds a Done button above the number pad for every box; it
          // closes the keyboard (and blurs the box).
          returnKeyType="done"
          inputAccessoryViewButtonLabel={strings.done}
          onFocus={() => dispatch({ type: 'focus', key: spec.key })}
          onBlur={() => {
            if ((getState?.() ?? state).focused === spec.key)
              dispatch({ type: 'blur' });
          }}
          onKeyPress={onKeyPress}
          onChangeText={(raw) => {
            claimFocus();
            // An Arabic or Persian number pad types ٠–٩ / ۰–۹.
            const next = toLatinDigits(raw);
            const { rendered, reported } = track;
            const before =
              reported !== undefined &&
              reported !== rendered &&
              next.startsWith(reported)
                ? reported
                : rendered;
            track.reported = next;
            changeToActions(before, next).forEach(dispatch);
          }}
          style={[
            s.segment,
            spec.maxLength === 4 ? widths.long : widths.short,
            styles?.fieldSegment,
            isFocused && [s.segmentFocused, styles?.fieldSegmentFocused],
          ]}
        />
      </React.Fragment>
    );
  };

  const renderPeriod = () => {
    // With a time typed and no AM/PM chosen, the time reads as AM (as in the
    // time row), so the switch shows AM as chosen.
    const typedTime = !!(state.values.hour || state.values.minute);
    const current = state.values.period ?? (typedTime ? 'AM' : undefined);
    const toggle = () =>
      dispatch({
        type: 'period',
        period: (current === 'AM' ? 'PM' : 'AM') as Period,
      });
    return (
      <Pressable
        key="period"
        testID={testID ? `${testID}-segment-period` : undefined}
        accessibilityRole="button"
        accessibilityLabel={labels.period}
        accessibilityValue={{ text: current ?? '' }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={toggle}
        hitSlop={8}
        style={[
          s.period,
          styles?.fieldPeriod,
          current && [s.periodSelected, styles?.fieldPeriodSelected],
        ]}
      >
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[
            s.periodText,
            styles?.fieldPeriodText,
            !current && { color: tokens.placeholder },
          ]}
        >
          {current === 'PM'
            ? strings.pm
            : current === 'AM'
              ? strings.am
              : placeholders.period}
        </Text>
      </Pressable>
    );
  };

  // The date and the time are each kept on one line; when the field is too
  // narrow (large text, a small phone) the time moves to a second line
  // instead of running under the icons.
  const isDateKey = (key: SegmentKey) =>
    key === 'day' || key === 'month' || key === 'year';
  const dateSpecs = state.layout.segments.filter((spec) => isDateKey(spec.key));
  const timeSpecs = state.layout.segments.filter(
    (spec) => !isDateKey(spec.key)
  );
  return (
    <View style={s.segmentRow}>
      <View style={s.segmentGroup}>
        {dateSpecs.map((spec, i) => renderNumeric(spec, i))}
      </View>
      {timeSpecs.length ? (
        <View style={s.segmentGroup}>
          {timeSpecs.map((spec, i) =>
            spec.key === 'period' ? renderPeriod() : renderNumeric(spec, i)
          )}
        </View>
      ) : null}
    </View>
  );
};

export default SegmentedInput;
