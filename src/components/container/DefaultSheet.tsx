import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import type { SheetRenderProps, SheetSize } from '../types';
import { buildContainerStyles } from './containerStyles';

interface Props extends SheetRenderProps {
  height?: SheetSize;
  maxHeight?: SheetSize;
  tokens: ThemeTokens;
  styles?: PickerStyles;
}

/** Points for a size given in points or as a percentage of the screen. */
const toPoints = (size: SheetSize, screen: number): number =>
  typeof size === 'number' ? size : (screen * parseFloat(size)) / 100;

/**
 * The built-in bottom sheet: an RN Modal with a backdrop and a panel pinned to
 * the bottom, up to 90% of the screen (`sheet.height` / `sheet.maxHeight`). Backdrop taps and Android back call
 * onRequestClose. `styles.sheet` styles the panel (e.g. a bottom safe-area inset);
 * `renderSheet` replaces the whole sheet.
 */
const DefaultSheet: React.FC<Props> = ({
  onRequestClose,
  body,
  footer,
  testID,
  height,
  maxHeight = '90%',
  tokens,
  styles,
}) => {
  const { height: screen } = useWindowDimensions();
  const max = toPoints(maxHeight, screen);
  const size =
    height === undefined
      ? { maxHeight: max }
      : { height: Math.min(toPoints(height, screen), max) };
  const s = buildContainerStyles(tokens);
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.sheetRoot}
      >
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onRequestClose}
          style={[s.sheetBackdrop, styles?.sheetBackdrop]}
        />
        <View testID={testID} style={[s.sheet, size, styles?.sheet]}>
          {body}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DefaultSheet;
