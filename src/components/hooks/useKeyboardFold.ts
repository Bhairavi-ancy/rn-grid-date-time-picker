import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * True while the keyboard is up and the picker is open. The picker folds the
 * calendar away then, so the box being typed in (and Confirm) stay visible on
 * small phones; inline, it folds only while one of its own boxes has focus,
 * since another field on the screen can raise the keyboard too.
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
