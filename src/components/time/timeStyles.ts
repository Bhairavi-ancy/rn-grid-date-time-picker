import { Platform, StyleSheet } from 'react-native';
import { fontStyle, type ThemeTokens } from '../theme/tokens';

const cache = new WeakMap<ThemeTokens, ReturnType<typeof create>>();

const create = (t: ThemeTokens) =>
  StyleSheet.create({
    // 'Time' on the left, boxes and AM / PM on the right, a line above.
    wrapper: { width: '100%', marginTop: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.separator,
      backgroundColor: t.background,
    },
    label: {
      flexShrink: 1,
      marginEnd: 12,
      ...fontStyle(t, 'semiBold'),
      fontSize: t.fontSizeLarge,
      color: t.heading,
    },
    // Times read hh:mm in every language, so the boxes don't mirror in RTL.
    boxes: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 22,
      direction: 'ltr',
    },
    clock: { flexDirection: 'row', alignItems: 'center' },
    // Each box is 50 × 46 with a 1 pt border and radius 6.
    boxWrap: { width: 50 },
    boxContainer: {
      width: 50,
      height: 46,
      minHeight: 46,
      borderWidth: 1,
      borderColor: t.inputBorder,
      borderRadius: 6,
      backgroundColor: t.background,
      justifyContent: 'center',
    },
    boxInner: { flex: 1, backgroundColor: 'transparent' },
    boxText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.heading,
      textAlign: 'center',
      padding: 0,
    },
    // The text area inside the border: it fills the box, and the digits sit
    // in its middle on both platforms.
    boxInput: {
      flex: 1,
      marginHorizontal: Platform.OS === 'ios' ? 10 : 5,
      paddingVertical: 0,
      textAlignVertical: 'center',
      includeFontPadding: Platform.OS === 'android' ? false : undefined,
    },
    boxFocused: { borderColor: t.borderFocused },
    boxError: { borderColor: t.error },
    colonCell: {
      width: 24,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colon: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      color: t.heading,
      textAlign: 'center',
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 118,
      height: 46,
      paddingHorizontal: 4,
      gap: 8,
      borderRadius: 8,
      backgroundColor: t.toggleTrack,
    },
    option: {
      flex: 1,
      height: 36,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionSelected: { backgroundColor: t.background, borderRadius: 8 },
    optionDisabled: { opacity: 0.4 },
    optionText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeMedium,
      lineHeight: Math.round(t.fontSizeMedium * 1.4),
      color: t.heading,
    },
    optionSelectedText: { color: t.accent },
    wheels: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      direction: 'ltr',
    },
    wheelColumn: { width: 64, height: 200, overflow: 'hidden' },
    wheelHighlight: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 80,
      height: 40,
      borderRadius: t.radius,
      backgroundColor: t.surface,
    },
    wheelRow: { height: 40, alignItems: 'center', justifyContent: 'center' },
    wheelText: {
      ...fontStyle(t, 'regular'),
      fontSize: t.fontSizeLarge,
      color: t.mutedText,
    },
    wheelTextSelected: { ...fontStyle(t, 'semiBold'), color: t.text },
    wheelTextDisabled: { color: t.disabledText, opacity: 0.4 },
  });

/** Time row styles for a theme, created once per tokens object. */
export const buildTimeStyles = (
  tokens: ThemeTokens
): ReturnType<typeof create> => {
  const hit = cache.get(tokens);
  if (hit) return hit;
  const styles = create(tokens);
  cache.set(tokens, styles);
  return styles;
};
