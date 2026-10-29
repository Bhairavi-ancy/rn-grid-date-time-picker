import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import type { SheetRenderProps, SheetSize } from '../types';
import { useBottomInset } from '../hooks/useBottomInset';
import { useKeyboard } from '../hooks/useKeyboardFold';
import { buildContainerStyles, SHEET_PADDING_BOTTOM } from './containerStyles';

interface Props extends SheetRenderProps {
  height?: SheetSize;
  maxHeight?: SheetSize;
  keyboardMaxHeight?: SheetSize;
  /** Space kept free below the footer; default: the app's safe-area inset. */
  bottomInset?: number;
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
 * While the keyboard is up it sits on the keyboard, within `sheet.keyboardMaxHeight`
 * (default `maxHeight`) of the room above it; otherwise it keeps the bottom
 * safe-area inset (`sheet.bottomInset`) free below the footer. Backdrop taps
 * and Android back call onRequestClose. `styles.sheet` styles the panel;
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
  bottomInset,
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
  // Below the footer: the home indicator or Android's navigation bar, which
  // an edge-to-edge app draws under. While the keyboard is up the sheet sits
  // on the keyboard instead, with nothing under it.
  const safeInset = useBottomInset();
  const inset = keyboard.up ? 0 : Math.max(0, bottomInset ?? safeInset);
  const s = buildContainerStyles(tokens);
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {/* Pads by the part of the screen the keyboard covers: all of it in an
          edge-to-edge Android app, whose window the keyboard doesn't resize;
          none where the window does shrink. */}
      <KeyboardAvoidingView behavior="padding" style={s.sheetRoot}>
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
          <View
            testID={testID}
            style={[
              s.sheet,
              size,
              inset > 0 && { paddingBottom: SHEET_PADDING_BOTTOM + inset },
              styles?.sheet,
            ]}
          >
            {body}
            {footer}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DefaultSheet;
