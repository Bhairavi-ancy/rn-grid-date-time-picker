import React from 'react';
import { Text, View } from 'react-native';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import { buildFieldStyles } from './fieldStyles';

interface Props {
  /** The picker's own error first (typed input, out of range), otherwise the screen's. */
  error?: string;
  helperText?: string;
  instruction?: string;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  testID?: string;
}

/** Helper text, instruction and the error, below the field. The error is announced. */
const FieldMessages: React.FC<Props> = ({
  error,
  helperText,
  instruction,
  tokens,
  styles,
  testID,
}) => {
  const s = buildFieldStyles(tokens);
  if (!error && !helperText && !instruction) return null;
  return (
    <View>
      {helperText ? (
        <Text style={[s.message, s.helper, styles?.helperText]}>
          {helperText}
        </Text>
      ) : null}
      {instruction ? (
        <Text style={[s.message, s.helper, styles?.instructionText]}>
          {instruction}
        </Text>
      ) : null}
      {error ? (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[s.message, s.error, styles?.errorText]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default FieldMessages;
