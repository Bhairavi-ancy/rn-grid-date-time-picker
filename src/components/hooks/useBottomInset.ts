import { createContext, useContext, type Context } from 'react';

type Insets = { bottom: number } | null;

declare const require: (name: string) => unknown;

/**
 * react-native-safe-area-context's insets, when the app has that package (an
 * optional peer: most Expo apps do). The require sits in a try so a missing
 * package is fine: Metro allows optional dependencies there.
 */
const readContext = (): Context<Insets> | null => {
  try {
    const lib = require('react-native-safe-area-context') as {
      SafeAreaInsetsContext?: Context<Insets>;
    };
    return lib.SafeAreaInsetsContext ?? null;
  } catch {
    return null;
  }
};

const NO_INSETS = createContext<Insets>(null);
const InsetsContext = readContext() ?? NO_INSETS;

/**
 * The bottom safe-area inset (the home indicator, or Android's navigation bar
 * in an edge-to-edge app), from the app's SafeAreaProvider; 0 without one.
 * Read through the context rather than `useSafeAreaInsets`, which throws when
 * there's no provider.
 */
export const useBottomInset = (): number =>
  useContext(InsetsContext)?.bottom ?? 0;
