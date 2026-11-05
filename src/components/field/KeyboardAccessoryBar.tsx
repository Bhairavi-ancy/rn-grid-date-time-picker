import React from 'react';
import { InputAccessoryView, Platform, StyleSheet, View } from 'react-native';
import type { ThemeTokens } from '../theme/tokens';

interface Props {
  /** The `inputAccessoryViewID` of the one box it serves. */
  nativeID: string;
  tokens: ThemeTokens;
}

/**
 * iOS only: an empty solid bar above a box's number pad. Without it React
 * Native adds its own Done bar, which is see-through on newer iOS, so a sheet
 * resting on the keyboard showed the screen behind it.
 */
const KeyboardAccessoryBar: React.FC<Props> = ({ nativeID, tokens }) => {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={[
          styles.bar,
          {
            height: tokens.touchTarget,
            backgroundColor: tokens.surface,
            borderTopColor: tokens.border,
          },
        ]}
      />
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
});

export default KeyboardAccessoryBar;
