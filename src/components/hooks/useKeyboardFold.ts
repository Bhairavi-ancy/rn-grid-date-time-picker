import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

interface KeyboardState {
  up: boolean;
  /** The keyboard's height while it's up, 0 when down (or not reported). */
  height: number;
}

const DOWN: KeyboardState = { up: false, height: 0 };

/** The keyboard as it is now: it can already be up when the picker mounts or opens. */
const current = (): KeyboardState =>
  Keyboard.isVisible()
    ? { up: true, height: Keyboard.metrics()?.height ?? 0 }
    : DOWN;

/** Whether the keyboard is up, and how tall it is, while `active`. */
export const useKeyboard = (active: boolean): KeyboardState => {
  const [keyboard, setKeyboard] = useState(() => (active ? current() : DOWN));

  useEffect(() => {
    if (!active) {
      setKeyboard(DOWN);
      return undefined;
    }
    setKeyboard(current());
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e?: KeyboardEvent) =>
      setKeyboard({ up: true, height: e?.endCoordinates?.height ?? 0 })
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(DOWN));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);

  return keyboard;
};

/**
 * True while the keyboard is up and the picker is open. With
 * `hideCalendarOnKeyboard` the picker folds the calendar away then, so the box being typed in (and Confirm) stay visible on
 * small phones; inline, it folds only while one of its own boxes has focus,
 * since another field on the screen can raise the keyboard too.
 */
export const useKeyboardFold = (active: boolean): boolean =>
  useKeyboard(active).up;
