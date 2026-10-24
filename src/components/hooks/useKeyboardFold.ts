import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * True while the keyboard is up inside the open picker, so the sheet folds the
 * calendar away and the box being typed in (and Confirm) stay visible on small
 * phones. The picker closes the keyboard before opening, so a keyboard that shows
 * while it's open belongs to one of its own boxes.
 */
export const useKeyboardFold = (active: boolean): boolean => {
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    if (!active) {
      setKeyboardUp(false);
      return undefined;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);

  return keyboardUp;
};
