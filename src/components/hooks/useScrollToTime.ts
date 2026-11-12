import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { ScrollViewRef, ViewRef } from '../nativeTypes';
import { useReduceMotion } from './useReduceMotion';

export interface ScrollToTime {
  /** The sheet body's ScrollView. */
  scrollRef: RefObject<ScrollViewRef | null>;
  /** The time section. */
  timeRef: RefObject<ViewRef | null>;
  /** Called from the calendar tap that picks the date. */
  request: () => void;
}

/** Rounding in the measured positions, in points. */
const SLACK = 1;

/**
 * Scrolls `scroll` so `section` shows: just far enough to show all of it (its
 * top, when it's taller than the view), or to the end of the content with
 * `toEnd`. Nothing moves while it already shows in full.
 */
export const scrollSectionIntoView = (
  scroll: ScrollViewRef,
  section: ViewRef,
  toEnd: boolean,
  animated: boolean
): void => {
  scroll.measureInWindow((_vx, viewTop, _vw, viewHeight) => {
    section.measureInWindow((_x, top, _w, height) => {
      // Not laid out, or folded away.
      if (!viewHeight || !height) return;
      const fromTop = top - viewTop;
      if (fromTop >= -SLACK && fromTop + height <= viewHeight + SLACK) return;
      if (toEnd) {
        scroll.scrollToEnd({ animated });
        return;
      }
      // Where the section sits in the scrolled content.
      const content = scroll.getInnerViewRef?.();
      if (!content) return;
      section.measureLayout(
        content,
        (_cx, y) => {
          const target =
            fromTop < 0 || height > viewHeight ? y : y + height - viewHeight;
          scroll.scrollTo({ y: Math.max(0, target), animated });
        },
        () => {}
      );
    });
  });
};

/**
 * The sheet's scroll to the time section once a calendar tap picks the date.
 * `request()` from the tap; the scroll runs after that render, when `ready`
 * (the picked date is complete) holds for it. Refs go on the body's ScrollView
 * and the time section; `outerRef` (an inline picker's own ScrollView, from
 * the app) is scrolled instead when given. 'end' scrolls to the end of the
 * body; false never scrolls.
 */
export const useScrollToTime = (
  mode: boolean | 'end',
  ready: boolean,
  outerRef?: RefObject<ScrollViewRef | null>
): ScrollToTime => {
  const scrollRef = useRef<ScrollViewRef>(null);
  const timeRef = useRef<ViewRef>(null);
  const reduceMotion = useReduceMotion();
  const [tapped, setTapped] = useState(0);
  const on = useRef(mode !== false);
  on.current = mode !== false;
  const request = useCallback(() => {
    if (on.current) setTapped((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!tapped || !ready || mode === false) return;
    // A frame after the tap, on iOS and Android alike: the old architecture
    // lays the tap's changes out after this effect, so measuring now could
    // read the layout before them; and Android runs a scroll sent in the frame
    // that grows the content (a per-date row showing) before it grows, so the
    // scroll would stop short.
    const frame = requestAnimationFrame(() => {
      const scroll = outerRef?.current ?? scrollRef.current;
      const section = timeRef.current;
      if (scroll && section)
        scrollSectionIntoView(scroll, section, mode === 'end', !reduceMotion);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per tap
  }, [tapped]);
  return { scrollRef, timeRef, request };
};
