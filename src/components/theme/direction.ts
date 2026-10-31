import { createContext, useContext } from 'react';
import { I18nManager } from 'react-native';

/**
 * Whether a part of the picker is laid out right to left. The picker sets it
 * for the calendar and the time rows while the Hijri tab shows; elsewhere the
 * app's direction (`I18nManager.isRTL`) decides.
 */
export const RtlContext = createContext<boolean | null>(null);

export const useIsRTL = (): boolean =>
  useContext(RtlContext) ?? I18nManager.isRTL;
