/**
 * Colours, fonts and sizes for every part of the picker. Screens override any of
 * them with the `theme` prop; usually the accent is the app's brand colour.
 */
export interface ThemeTokens {
  accent: string;
  onAccent: string;
  text: string;
  /** Headings in the sheet: the year title and the time label. */
  heading: string;
  mutedText: string;
  placeholder: string;
  border: string;
  /** Typed time boxes. */
  inputBorder: string;
  /** Line above the time row. */
  separator: string;
  /** Track behind the AM / PM options. */
  toggleTrack: string;
  borderFocused: string;
  error: string;
  background: string;
  surface: string;
  disabledBackground: string;
  disabledText: string;
  rangeFill: string;
  holiday: string;
  /**
   * One font family for all text, drawn at weight 400 / 500 / 600 as each
   * part needs. Default: the system font.
   */
  fontFamily: string | undefined;
  /**
   * A family per weight, for fonts shipped as one file per weight (see
   * `INTER_FONTS`). Each one set wins over `fontFamily`; `undefined`
   * everywhere (the default) uses the system font.
   */
  fontRegular: string | undefined;
  fontMedium: string | undefined;
  fontSemiBold: string | undefined;
  fontSizeSmall: number;
  fontSizeMedium: number;
  fontSizeLarge: number;
  radius: number;
  fieldHeight: number;
  touchTarget: number;
}

export const DEFAULT_TOKENS: ThemeTokens = {
  accent: '#2563EB',
  onAccent: '#FFFFFF',
  text: '#111827',
  heading: '#111827',
  mutedText: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#D1D5DB',
  inputBorder: '#D1D5DB',
  separator: '#E5E7EB',
  toggleTrack: '#F3F4F6',
  borderFocused: '#2563EB',
  error: '#DC2626',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  disabledBackground: '#F3F4F6',
  disabledText: '#9CA3AF',
  rangeFill: '#DBEAFE',
  holiday: '#DC2626',
  fontFamily: undefined,
  fontRegular: undefined,
  fontMedium: undefined,
  fontSemiBold: undefined,
  fontSizeSmall: 12,
  fontSizeMedium: 14,
  fontSizeLarge: 16,
  radius: 8,
  fieldHeight: 44,
  touchTarget: 44,
};

type FontTokens = Pick<
  ThemeTokens,
  'fontFamily' | 'fontRegular' | 'fontMedium' | 'fontSemiBold'
>;

/** The system font at weight 400 / 500 / 600 (the default): `theme={{ ...SYSTEM_FONTS }}`. */
export const SYSTEM_FONTS: FontTokens = {
  fontFamily: undefined,
  fontRegular: undefined,
  fontMedium: undefined,
  fontSemiBold: undefined,
};

/**
 * Inter under the names of its static files, for apps that load them
 * (`Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`): `theme={{ ...INTER_FONTS }}`.
 */
export const INTER_FONTS: FontTokens = {
  fontFamily: undefined,
  fontRegular: 'Inter-Regular',
  fontMedium: 'Inter-Medium',
  fontSemiBold: 'Inter-SemiBold',
};

/**
 * Defaults with the caller's overrides on top. A given accent also becomes the
 * focused border.
 */
export const buildTokens = (overrides?: Partial<ThemeTokens>): ThemeTokens => {
  return {
    ...DEFAULT_TOKENS,
    ...(overrides?.accent ? { borderFocused: overrides.accent } : null),
    ...overrides,
  };
};

type FontWeightName = 'regular' | 'medium' | 'semiBold';

const WEIGHTS = { regular: '400', medium: '500', semiBold: '600' } as const;
const FAMILIES = {
  regular: 'fontRegular',
  medium: 'fontMedium',
  semiBold: 'fontSemiBold',
} as const;

/**
 * The text style for a weight: its own family when one is set, else
 * `fontFamily` at that weight, else the system font at that weight.
 */
export const fontStyle = (
  t: ThemeTokens,
  weight: FontWeightName
):
  | { fontFamily: string }
  | { fontFamily: string; fontWeight: '400' | '500' | '600' }
  | { fontWeight: '400' | '500' | '600' } => {
  const own = t[FAMILIES[weight]];
  if (own) return { fontFamily: own };
  if (t.fontFamily)
    return { fontFamily: t.fontFamily, fontWeight: WEIGHTS[weight] };
  return { fontWeight: WEIGHTS[weight] };
};
