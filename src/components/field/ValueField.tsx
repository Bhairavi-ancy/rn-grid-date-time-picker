import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SegmentEditorAction } from '../../core/segmentEditor';
import type { ParsedSegments } from '../../core/segments';
import type { DateTimeValue, PickerType, TimeFormat } from '../../core/types';
import {
  renderIcon,
  resolveIcons,
  type IconName,
  type IconOptions,
  type IconSet,
} from '../../icons';
import { useTypedSegments } from '../hooks/useTypedSegments';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import type { InstructionRenderProps, LabelRenderProps } from '../types';
import FieldMessages from './FieldMessages';
import {
  formatValueText,
  placeholderText,
  segmentErrorText,
} from './fieldText';
import { buildFieldStyles } from './fieldStyles';
import SegmentedInput from './SegmentedInput';

export interface ValueFieldProps {
  type: PickerType;
  /** The value to show (or to start typing from). */
  value: DateTimeValue | null;
  /** Text to show instead of `value` (range and multiple fields). Display only. */
  displayText?: string;
  /** Date format, e.g. 'dd/MM/yyyy'. */
  dateFormat: string;
  timeFormat: TimeFormat;
  yearRange?: { first: number; last: number };
  /** Typed date + time segments. Otherwise the field shows text and opens the picker on tap. */
  allowTyping?: boolean;
  /** Every typing result: a value, or null with the problems found. */
  onTyped?: (parsed: ParsedSegments) => void;
  /**
   * Typing paused: no segment is focused any more (focus left the field, or
   * the last box filled). Gets what the field holds then.
   */
  onTypingDone?: (parsed: ParsedSegments) => void;
  /** One of its typed boxes gained or lost focus. */
  onFocusChange?: (focused: boolean) => void;
  /** Tap on a display-only field, or on its calendar icon. */
  onPress?: () => void;
  allowClear?: boolean;
  /** × pressed: the screen calls onChange('') right away. */
  onClear?: () => void;
  label?: string;
  isMandatory?: boolean;
  placeholder?: string;
  /** Shown with the label (below it in the built-in label). */
  helperText?: string;
  /** Shown under the box. */
  instruction?: string;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Draw the focused border, e.g. for the field that the calendar is editing. */
  active?: boolean;
  /** Replaces the calendar icon; null hides it. */
  icon?: React.ReactNode | null;
  /** Replaces the built-in label (and helper text). */
  renderLabel?: (p: LabelRenderProps) => React.ReactNode;
  /** Replaces the built-in instruction text. */
  renderInstruction?: (p: InstructionRenderProps) => React.ReactNode;
  /** Replacements for the built-in clear and calendar icons; null hides one. */
  icons?: Partial<IconSet>;
  /** Colour and size of the clear and calendar icons. */
  iconProps?: Partial<Record<IconName, IconOptions>>;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

/** The built-in label: the text, a ' *' for mandatory fields, and the helper text below. */
const DefaultLabel: React.FC<
  LabelRenderProps & { tokens: ThemeTokens; styles?: PickerStyles }
> = ({ label, isMandatory, helperText, style, testID, tokens, styles }) => {
  const s = buildFieldStyles(tokens);
  return (
    <View style={s.labelWrap} testID={testID}>
      {label ? (
        <Text style={[s.label, style]}>
          {label}
          {isMandatory ? (
            <Text style={[s.mandatory, styles?.mandatoryMark]}>{' *'}</Text>
          ) : null}
        </Text>
      ) : null}
      {helperText ? (
        <Text style={[s.message, s.helper, styles?.helperText]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

/** The built-in instruction: muted, small text under the box. */
const DefaultInstruction: React.FC<
  InstructionRenderProps & { tokens: ThemeTokens; styles?: PickerStyles }
> = ({ instruction, fieldTestID, tokens, styles }) => {
  const s = buildFieldStyles(tokens);
  return (
    <Text
      testID={fieldTestID ? `${fieldTestID}-instruction` : undefined}
      style={[s.message, s.helper, styles?.instructionText]}
    >
      {instruction}
    </Text>
  );
};

/**
 * The value field: label, the value (as text, or as typed segments), the × clear
 * and calendar icons, and the messages below it. Holds no draft of its own: typed
 * results go to `onTyped`, and the sheet decides what to do with them.
 */
const ValueField: React.FC<ValueFieldProps> = (props) => {
  const {
    type,
    value,
    displayText,
    dateFormat,
    timeFormat,
    yearRange,
    allowTyping,
    onTyped,
    onTypingDone,
    onFocusChange,
    onPress,
    allowClear,
    onClear,
    label,
    isMandatory,
    placeholder,
    helperText,
    instruction,
    errorMessage,
    disabled,
    readOnly,
    active,
    icon,
    renderLabel,
    renderInstruction,
    icons: iconOverrides,
    iconProps,
    tokens,
    styles,
    strings,
    testID,
  } = props;
  const s = buildFieldStyles(tokens);
  const ico = resolveIcons(iconOverrides);
  const [lastParsed, setLastParsed] = useState<ParsedSegments | null>(null);
  const { state, dispatch, getState } = useTypedSegments(
    value,
    { dateFormat, type, timeFormat, yearRange },
    (parsed) => {
      setLastParsed(parsed);
      onTyped?.(parsed);
    }
  );

  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;
  const hasFocus = !!state.focused;
  useEffect(() => {
    onFocusChangeRef.current?.(hasFocus);
  }, [hasFocus]);
  useEffect(() => () => onFocusChangeRef.current?.(false), []);

  const wasFocused = useRef(false);
  const onTypingDoneRef = useRef(onTypingDone);
  onTypingDoneRef.current = onTypingDone;
  useEffect(() => {
    const focused = !!state.focused;
    if (wasFocused.current && !focused)
      onTypingDoneRef.current?.(getState().parsed);
    wasFocused.current = focused;
  }, [state.focused, getState]);

  // Switching AM/PM once no box is focused (after the minutes filled) is
  // a finished edit of its own.
  const dispatchTyped = (action: SegmentEditorAction) => {
    dispatch(action);
    if (action.type === 'period' && !getState().focused)
      onTypingDoneRef.current?.(getState().parsed);
  };

  const editable = !disabled && !readOnly;
  const typing = !!allowTyping && editable;
  const typedError =
    typing && !state.focused && lastParsed && !lastParsed.isEmpty
      ? segmentErrorText(lastParsed.errors, strings, yearRange)
      : '';
  const error = typedError || errorMessage || '';
  const hasValue = typing ? !state.parsed.isEmpty : !!value || !!displayText;
  const text =
    displayText ?? formatValueText(value, type, dateFormat, timeFormat);

  const clear = () => {
    dispatch({ type: 'reset', value: null });
    setLastParsed(null);
    onClear?.();
  };

  const fieldStyle = [
    s.field,
    styles?.field,
    (active || state.focused) && [s.fieldFocused, styles?.fieldFocused],
    error && [s.fieldError, styles?.fieldError],
    disabled && [s.fieldDisabled, styles?.fieldDisabled],
  ];

  const icons = (
    <View style={s.icons}>
      {allowClear && editable && hasValue && ico.clear ? (
        <Pressable
          testID={testID ? `${testID}-clear` : undefined}
          accessibilityRole="button"
          accessibilityLabel={strings.a11yClear}
          onPress={clear}
          hitSlop={10}
          style={[s.iconButton, s.clearButton, styles?.clearIcon]}
        >
          {renderIcon(
            ico.clear,
            { color: tokens.mutedText, size: 12 },
            iconProps?.clear
          )}
        </Pressable>
      ) : null}
      {icon === null ||
      readOnly ||
      (icon === undefined && !ico.calendar) ? null : (
        <Pressable
          testID={testID ? `${testID}-icon` : undefined}
          accessibilityRole="button"
          accessibilityLabel={strings.a11yOpen}
          disabled={!editable}
          onPress={onPress}
          hitSlop={10}
          style={[s.iconButton, styles?.fieldIcon]}
        >
          {icon ??
            renderIcon(
              ico.calendar,
              {
                color: editable ? tokens.accent : tokens.disabledText,
                size: 18,
                disabled: !editable,
              },
              iconProps?.calendar
            )}
        </Pressable>
      )}
    </View>
  );

  const body = typing ? (
    <View style={fieldStyle}>
      <SegmentedInput
        state={state}
        dispatch={dispatchTyped}
        getState={getState}
        fieldLabel={label}
        disabled={!editable}
        tokens={tokens}
        styles={styles}
        strings={strings}
        testID={testID}
      />
      {icons}
    </View>
  ) : (
    <Pressable
      testID={testID ? `${testID}-field` : undefined}
      accessibilityRole="button"
      accessibilityLabel={[label, text || placeholder]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={editable ? strings.a11yOpen : undefined}
      accessibilityState={{ disabled: !editable }}
      disabled={!editable}
      onPress={onPress}
      style={fieldStyle}
    >
      <Text
        numberOfLines={1}
        style={[
          s.text,
          styles?.fieldText,
          !text && [s.placeholder, styles?.fieldPlaceholder],
          disabled && [s.disabledText, text ? styles?.fieldTextDisabled : null],
        ]}
      >
        {text ||
          placeholder ||
          placeholderText(type, dateFormat, timeFormat, strings)}
      </Text>
      {icons}
    </Pressable>
  );

  // Label and instruction can be swapped for the app's own, so date fields look
  // like every other field.
  const defaultLabel = (p: LabelRenderProps) => (
    <DefaultLabel {...p} tokens={tokens} styles={styles} />
  );
  const defaultInstruction = (p: InstructionRenderProps) => (
    <DefaultInstruction {...p} tokens={tokens} styles={styles} />
  );
  return (
    <View style={s.wrapper}>
      {label || helperText
        ? (renderLabel ?? defaultLabel)({
            label,
            isMandatory,
            helperText,
            style: styles?.label,
            testID: testID ? `${testID}-label` : undefined,
            fieldTestID: testID,
          })
        : null}
      {body}
      {instruction
        ? (renderInstruction ?? defaultInstruction)({
            instruction,
            fieldTestID: testID,
          })
        : null}
      <FieldMessages
        error={disabled ? '' : error}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    </View>
  );
};

export default ValueField;
