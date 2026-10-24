import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The system "reduce motion" setting: scrolls and snaps jump instead of animating. */
export const useReduceMotion = (): boolean => {
  const [reduce, setReduce] = useState(false);
  const current = useRef(reduce);
  useEffect(() => {
    let alive = true;
    const update = (on: boolean) => {
      // Most devices report "off": skip the re-render when nothing changed.
      if (!alive || on === current.current) return;
      current.current = on;
      setReduce(on);
    };
    // Older platforms may return nothing here.
    AccessibilityInfo.isReduceMotionEnabled?.()
      ?.then(update)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      update
    );
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
};
