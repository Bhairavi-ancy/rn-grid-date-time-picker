import { StyleSheet } from 'react-native';
import { fontStyle, type ThemeTokens } from '../theme/tokens';

const cache = new WeakMap<ThemeTokens, ReturnType<typeof create>>();

const create = (t: ThemeTokens) =>
  StyleSheet.create({
    wrapper: { width: '100%' },
    labelWrap: { marginBottom: 6 },
    label: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    mandatory: { color: t.error },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.fieldHeight,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: t.radius,
      backgroundColor: t.background,
      paddingHorizontal: 12,
    },
    fieldFocused: { borderColor: t.borderFocused },
    fieldError: { borderColor: t.error },
    fieldDisabled: { backgroundColor: t.disabledBackground },
    text: {
      flex: 1,
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    textScroll: { flex: 1 },
    textScrollContent: { flexGrow: 1, alignItems: 'center' },
    // In the scroll, or as a date set apart from its time, the text keeps its full width.
    textScrolled: { flex: 0, flexShrink: 0 },
    placeholder: { color: t.placeholder },
    disabledText: { color: t.disabledText },
    icons: { flexDirection: 'row', alignItems: 'center', marginStart: 8 },
    iconButton: {
      minWidth: t.touchTarget / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButton: { marginEnd: 12 },
    // Typed dates and times keep their locale order in RTL (numbers read left to right).
    segmentRow: {
      direction: 'ltr',
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 10,
    },
    segmentGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    // After a date, the time sits in the middle of the space left before the icons.
    segmentTime: { flexGrow: 1, justifyContent: 'center' },
    segment: {
      paddingVertical: 8,
      paddingHorizontal: 0,
      textAlign: 'center',
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.text,
    },
    segmentFocused: { color: t.accent },
    separator: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.mutedText,
    },
    period: {
      marginStart: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: t.radius,
      borderWidth: 1,
      borderColor: t.border,
    },
    periodSelected: { borderColor: t.accent },
    periodText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeSmall,
      color: t.accent,
    },
    message: {
      marginTop: 4,
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeSmall,
    },
    error: { color: t.error },
    helper: { color: t.mutedText },
  });

/** Field styles for a theme, created once per tokens object. */
export const buildFieldStyles = (
  tokens: ThemeTokens
): ReturnType<typeof create> => {
  const hit = cache.get(tokens);
  if (hit) return hit;
  const styles = create(tokens);
  cache.set(tokens, styles);
  return styles;
};
