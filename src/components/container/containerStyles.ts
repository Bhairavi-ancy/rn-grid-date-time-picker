import { StyleSheet } from 'react-native';
import { fontStyle, type ThemeTokens } from '../theme/tokens';

const GUTTER = 16;

const cache = new WeakMap<ThemeTokens, ReturnType<typeof create>>();

const create = (t: ThemeTokens) =>
  StyleSheet.create({
    sheetRoot: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
      borderTopLeftRadius: t.radius * 2,
      borderTopRightRadius: t.radius * 2,
      backgroundColor: t.background,
      paddingBottom: 24,
    },
    container: { width: '100%', paddingHorizontal: GUTTER },
    // In a sheet the body shrinks to the sheet's max height and scrolls.
    containerScroll: { flexShrink: 1 },
    // A sheet with a fixed height: the body takes the room left, so the footer sits at the bottom.
    containerFill: { flex: 1 },
    // A footer that scrolls with the body sits inside the container's padding.
    footerInScroll: { marginHorizontal: -GUTTER },
    scroll: { flexGrow: 0, flexShrink: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: {
      flex: 1,
      ...fontStyle(t, 'semiBold'),
      fontSize: t.fontSizeLarge,
      color: t.text,
    },
    resetButton: {
      minHeight: t.touchTarget,
      justifyContent: 'center',
      paddingStart: 12,
    },
    resetText: {
      ...fontStyle(t, 'medium'),
      fontSize: t.fontSizeMedium,
      color: t.accent,
    },
    body: { width: '100%' },
    footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    confirmButton: {
      minHeight: t.touchTarget,
      borderRadius: t.radius,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmText: {
      ...fontStyle(t, 'semiBold'),
      fontSize: t.fontSizeLarge,
      color: t.onAccent,
    },
  });

/** Container styles for a theme, created once per tokens object. */
export const buildContainerStyles = (
  tokens: ThemeTokens
): ReturnType<typeof create> => {
  const hit = cache.get(tokens);
  if (hit) return hit;
  const styles = create(tokens);
  cache.set(tokens, styles);
  return styles;
};
