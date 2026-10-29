import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, TextInput } from 'react-native';

/** How long to wait for the keyboard to finish closing before opening anyway. */
export const KEYBOARD_WAIT_FALLBACK_MS = 450;

interface Options {
  disabled?: boolean;
  readOnly?: boolean;
  /** Controlled open state; when given, the hook only reports open/close requests. */
  visible?: boolean;
  /** Called just before opening, e.g. to close the app's own dropdowns. */
  onBeforeOpen?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Opens and closes the picker.
 * - calls `onBeforeOpen` first;
 * - if a text input has focus, closes the keyboard and waits for it on iOS and
 *   Android (so the sheet doesn't jump as the keyboard leaves), with a 450 ms
 *   fallback; a controlled `visible` turned on waits the same way;
 * - disabled and read-only pickers never open.
 */
export const useOpenPicker = ({
  disabled,
  readOnly,
  visible,
  onBeforeOpen,
  onOpen,
  onClose,
}: Options): { isOpen: boolean; open: () => void; close: () => void } => {
  const [openState, setOpenState] = useState(false);
  const isControlled = visible !== undefined;
  // Controlled: `visible` turned on while the keyboard is closing.
  const [keyboardWait, setKeyboardWait] = useState(false);
  const isOpen = isControlled ? !!visible && !keyboardWait : openState;
  const pending = useRef<{ cancel: () => void } | null>(null);

  const cancelPending = () => {
    pending.current?.cancel();
    pending.current = null;
  };
  useEffect(() => cancelPending, []);

  /** Closes the keyboard and calls `then` once it's gone (or after the fallback). */
  const afterKeyboard = (then: () => void) => {
    const event =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      cancelPending();
      then();
    });
    const timer = setTimeout(() => {
      cancelPending();
      then();
    }, KEYBOARD_WAIT_FALLBACK_MS);
    pending.current = {
      cancel: () => {
        sub.remove();
        clearTimeout(timer);
      },
    };
    Keyboard.dismiss();
  };

  // Before paint, so the sheet never shows under a closing keyboard.
  useLayoutEffect(() => {
    if (!isControlled || !visible) {
      if (keyboardWait) {
        cancelPending();
        setKeyboardWait(false);
      }
      return;
    }
    if (!TextInput.State.currentlyFocusedInput?.()) return;
    setKeyboardWait(true);
    afterKeyboard(() => setKeyboardWait(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when `visible` turns on
  }, [isControlled, visible]);

  const reallyOpen = useCallback(() => {
    pending.current = null;
    if (!isControlled) setOpenState(true);
    onOpen?.();
  }, [isControlled, onOpen]);

  const open = useCallback(() => {
    if (disabled || readOnly || isOpen || pending.current) return;
    onBeforeOpen?.();
    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused) {
      reallyOpen();
      return;
    }
    afterKeyboard(reallyOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- afterKeyboard only uses refs and stable APIs
  }, [disabled, readOnly, isOpen, onBeforeOpen, reallyOpen]);

  const close = useCallback(() => {
    cancelPending();
    if (!isControlled) setOpenState(false);
    onClose?.();
  }, [isControlled, onClose]);

  return { isOpen, open, close };
};
