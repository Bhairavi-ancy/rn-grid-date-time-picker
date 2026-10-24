import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import { buildFieldStyles } from './fieldStyles';

interface Props {
  /** Matches the `inputAccessoryViewID` of the boxes it serves. */
  nativeID: string;
  onDone: () => void;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
}

/** iOS only: a "Done" bar above the number pad, which has no return key. */
const KeyboardDoneBar: React.FC<Props> = ({
  nativeID,
  onDone,
  tokens,
  styles,
  strings,
}) => {
  if (Platform.OS !== 'ios') return null;
  const s = buildFieldStyles(tokens);
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={[s.doneBar, styles?.keyboardDoneBar]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onDone();
            Keyboard.dismiss();
          }}
          hitSlop={8}
        >
          <Text style={[s.doneText, styles?.keyboardDoneText]}>
            {strings.done}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
};

export default KeyboardDoneBar;
