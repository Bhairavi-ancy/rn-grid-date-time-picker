import { StyleSheet } from 'react-native';
import { fontStyle, type ThemeTokens } from '../theme/tokens';

const cache = new WeakMap<ThemeTokens, ReturnType<typeof create>>();

export const DAY_SIZE = 40;

const create = (t: ThemeTokens) =>
  StyleSheet.create({
    calendar: { width: '100%', paddingTop: 12 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navArrow: {
      width: t.touchTarget,
      height: t.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navArrowDisabled: { opacity: 0.3 },
    yearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.touchTarget,
      paddingHorizontal: 8,
    },
    yearButtonText: {
      ...fontStyle(t, 'semiBold'),
      fontSize: t.fontSizeLarge,
      color: t.heading,
    },
    // A 24 pt chevron, 6 pt after the year.
    caret: { marginStart: 6 },
    chipRow: { paddingBottom: 12, gap: 8 },
    chip: {
      minWidth: 52,
      paddingHorizontal: 12,
      height: 32,
      borderRadius: t.radius,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.background,
    },
    chipText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    chipSelected: { backgroundColor: t.accent, borderColor: t.accent },
    chipSelectedText: { color: t.onAccent },
    chipDisabled: { opacity: 0.35 },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    weekdayText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeSmall,
      color: t.mutedText,
    },
    week: { flexDirection: 'row' },
    cellWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: DAY_SIZE + 6,
    },
    fill: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      backgroundColor: t.rangeFill,
    },
    // start / end (not left / right) so the band flips in right-to-left layouts.
    fillFull: { start: 0, end: 0 },
    fillStart: { start: '50%', end: 0 },
    fillEnd: { start: 0, end: '50%' },
    day: {
      width: DAY_SIZE,
      height: DAY_SIZE,
      borderRadius: t.radius,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    subLabel: {
      ...fontStyle(t, 'regular'),
      // The small Hijri day under the Gregorian one.
      fontSize: Math.round(t.fontSizeSmall * 0.75),
      color: t.mutedText,
    },
    today: { borderWidth: 1, borderColor: t.accent },
    selected: { backgroundColor: t.accent },
    selectedText: { color: t.onAccent, ...fontStyle(t, 'semiBold') },
    outsideText: { color: t.outsideText ?? t.mutedText },
    disabledText: { color: t.disabledText },
    holidayText: { color: t.holiday },
    pressed: { backgroundColor: t.rangeFill },
    // No top padding: the header's margin and the cell padding already space the first row.
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 8 },
    gridCell: { width: '33.33%', padding: 6 },
    gridButton: {
      minHeight: t.touchTarget,
      borderRadius: t.radius,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    gridSelected: { backgroundColor: t.accent },
    gridSelectedText: {
      color: t.onAccent,
      ...fontStyle(t, 'semiBold'),
    },
    gridDisabled: { opacity: 0.35 },
    gridCurrent: { borderWidth: 1, borderColor: t.accent },
    gridCurrentText: { color: t.accent },
    empty: { paddingVertical: 24, alignItems: 'center' },
    emptyText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.mutedText,
      textAlign: 'center',
    },
    todayButton: {
      alignSelf: 'flex-start',
      minHeight: t.touchTarget,
      justifyContent: 'center',
    },
    todayButtonText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.accent,
    },
  });

/** Calendar styles for a theme, created once per tokens object. */
export const buildCalendarStyles = (
  tokens: ThemeTokens
): ReturnType<typeof create> => {
  const hit = cache.get(tokens);
  if (hit) return hit;
  const styles = create(tokens);
  cache.set(tokens, styles);
  return styles;
};
