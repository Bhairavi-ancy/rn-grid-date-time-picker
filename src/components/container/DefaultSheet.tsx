import React, { useState } from 'react';
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
import { useKeyboard } from '../hooks/useKeyboardFold';
import { buildContainerStyles } from './containerStyles';

interface Props extends SheetRenderProps {
  height?: SheetSize;
  maxHeight?: SheetSize;
  keyboardMaxHeight?: SheetSize;
  /** The backdrop's screen-reader label. */
  closeLabel: string;
  tokens: ThemeTokens;
  styles?: PickerStyles;
}

/** The least room the sheet gets while the keyboard is up, in points. */
const MIN_ROOM = 160;

/** Points for a size given in points or as a percentage of the screen. */
const toPoints = (size: SheetSize, screen: number): number =>
  typeof size === 'number' ? size : (screen * parseFloat(size)) / 100;

/**
 * The built-in bottom sheet: an RN Modal with a backdrop and a panel pinned to
 * the bottom, up to 90% of the screen (`sheet.height` / `sheet.maxHeight`).
 * While the keyboard is up it stays within `sheet.keyboardMaxHeight` (default
 * `maxHeight`) of the room above the keyboard. Backdrop taps and Android back call
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
  keyboardMaxHeight = maxHeight,
  closeLabel,
  tokens,
  styles,
}) => {
  const { height: screen } = useWindowDimensions();
  const keyboard = useKeyboard(true);
  // The room above the keyboard: measured (padding on iOS, the window on
  // Android), and the screen less the keyboard for an Android window that
  // isn't resized.
  const [measured, setMeasured] = useState(screen);
  // Never less than a strip to show the sheet in, even when the keyboard
  // reports itself as tall as the window (split screen, Slide Over).
  const room = Math.max(
    Math.min(measured, screen - keyboard.height),
    Math.min(screen, MIN_ROOM)
  );
  const max = keyboard.up
    ? Math.min(toPoints(keyboardMaxHeight, room), room)
    : toPoints(maxHeight, screen);
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
          accessibilityLabel={closeLabel}
          onPress={onRequestClose}
          style={[s.sheetBackdrop, styles?.sheetBackdrop]}
        />
        <View
          style={s.sheetRoom}
          onLayout={(e) => setMeasured(e.nativeEvent.layout.height)}
        >
          <View testID={testID} style={[s.sheet, size, styles?.sheet]}>
            {body}
            {footer}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DefaultSheet;
