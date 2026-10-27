import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  IconRenderProps,
  PickerState,
  PickerStrings,
  PickerValue,
  SheetRenderProps,
  ThemeTokens,
  ValueAdapter,
} from 'rn-calendar-time-picker';

const today = new Date();
export const thisMonth = {
  year: today.getFullYear(),
  month: today.getMonth() + 1,
};
const pad = (n: number) => String(n).padStart(2, '0');

// Holidays "from a server", loaded once per year: a few fixed days, plus the
// 15th of this month so there is one to see straight away.
export const loadHolidays = (year: number) =>
  new Promise<string[]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          `${year}-01-01`,
          `${year}-05-01`,
          `${year}-12-25`,
          ...(year === thisMonth.year
            ? [`${year}-${pad(thisMonth.month)}-15`]
            : []),
        ]),
      300
    )
  );

/** Rejects a Saturday or Sunday on Confirm, with a message in the sheet. */
export const weekdaysOnly = (value: PickerValue) => {
  const raws =
    typeof value === 'string'
      ? [value]
      : Array.isArray(value)
        ? value
        : [value.from, value.to];
  const weekend = raws.filter(Boolean).some((raw) => {
    if (/^\d+$/.test(raw)) return [0, 6].includes(new Date(+raw).getDay());
    // Plain dates and UTC-midnight days are calendar days: read them in UTC.
    if (raw.length === 10 || raw.endsWith('T00:00:00.000Z'))
      return [0, 6].includes(new Date(raw.slice(0, 10)).getUTCDay());
    return [0, 6].includes(new Date(raw).getDay());
  });
  return weekend ? 'Weekends are closed, pick a weekday' : null;
};

/**
 * Colour presets for `theme`. Each one only sets colour tokens, so it combines
 * with the radius, font and size chips.
 */
export const PALETTES: Record<
  string,
  { label: string; swatch: string; tokens: Partial<ThemeTokens> }
> = {
  default: { label: 'default', swatch: '#2563EB', tokens: {} },
  emerald: {
    label: 'emerald',
    swatch: '#047857',
    tokens: { accent: '#047857', rangeFill: '#D1FAE5' },
  },
  violet: {
    label: 'violet',
    swatch: '#7C3AED',
    tokens: { accent: '#7C3AED', rangeFill: '#EDE9FE' },
  },
  rose: {
    label: 'rose',
    swatch: '#E11D48',
    tokens: { accent: '#E11D48', rangeFill: '#FFE4E6', holiday: '#7C3AED' },
  },
  amber: {
    label: 'amber',
    swatch: '#B45309',
    tokens: { accent: '#B45309', rangeFill: '#FEF3C7' },
  },
  teal: {
    label: 'teal',
    swatch: '#0F766E',
    tokens: { accent: '#0F766E', rangeFill: '#CCFBF1' },
  },
  mono: {
    label: 'mono',
    swatch: '#111827',
    tokens: { accent: '#111827', rangeFill: '#E5E7EB' },
  },
  midnight: {
    label: 'midnight (dark)',
    swatch: '#0F172A',
    tokens: {
      accent: '#60A5FA',
      onAccent: '#0B1220',
      text: '#E5E7EB',
      heading: '#F9FAFB',
      mutedText: '#9CA3AF',
      placeholder: '#6B7280',
      border: '#334155',
      inputBorder: '#334155',
      separator: '#1E293B',
      toggleTrack: '#1E293B',
      error: '#F87171',
      background: '#0F172A',
      surface: '#1E293B',
      disabledBackground: '#1E293B',
      disabledText: '#475569',
      rangeFill: '#1E3A5F',
      holiday: '#F87171',
    },
  },
};

// A system serif, so the font chip needs no font files.
export const serif = Platform.select({ ios: 'Georgia', default: 'serif' });

export const frenchStrings: Partial<PickerStrings> = {
  titleDate: 'Choisir une date',
  confirm: 'Valider',
  reset: 'Réinitialiser',
  clear: 'Effacer',
  today: "Aujourd'hui",
  time: 'Heure',
  from: 'Du',
  to: 'Au',
  errorNotAllowed: "Cette date n'est pas disponible",
  a11yOpen: 'Ouvrir le calendrier',
  a11yClear: 'Effacer la date',
};

/** An app's own clear icon: a round badge with a cross, in the colour it's given. */
export const RoundClearIcon = ({ color, size }: IconRenderProps) => (
  <View
    style={[
      styles.roundClear,
      { width: size, height: size, borderRadius: size / 2, borderColor: color },
    ]}
  >
    <Text style={[styles.roundClearText, { color, fontSize: size * 0.6 }]}>
      ×
    </Text>
  </View>
);

/** An app's own sheet header: a question and a Close button, in the theme's colours. */
export const renderStartHeader = (state: PickerState) => (
  <View style={styles.sheetHeader}>
    <Text style={[styles.sheetHeaderTitle, { color: state.tokens.heading }]}>
      When does it start?
    </Text>
    <Pressable accessibilityRole="button" onPress={state.close}>
      <Text style={[styles.sheetHeaderClose, { color: state.tokens.accent }]}>
        Close
      </Text>
    </Pressable>
  </View>
);

/**
 * A centred card instead of the built-in bottom sheet. The card is the app's,
 * so it takes the theme's background here.
 */
export const renderCardSheet = (background = '#FFFFFF') =>
  function CardSheet({ onRequestClose, body, footer }: SheetRenderProps) {
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={onRequestClose}
      >
        <View style={styles.cardBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={StyleSheet.absoluteFill}
            onPress={onRequestClose}
          />
          <View style={[styles.card, { backgroundColor: background }]}>
            {body}
            {footer}
          </View>
        </View>
      </Modal>
    );
  };

/**
 * Stores values as epoch milliseconds, read and written through a JS Date in
 * the device zone (a date is its local midnight).
 */
export const epochAdapter: ValueAdapter = {
  parse: (raw, ctx) => {
    const d = new Date(Number(raw));
    if (!raw || Number.isNaN(d.getTime())) return null;
    return {
      date: {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      },
      time:
        ctx.type === 'datetime'
          ? { hour: d.getHours(), minute: d.getMinutes() }
          : null,
    };
  },
  format: ({ date, time }, ctx) =>
    ctx.type === 'datetime' && !time
      ? ''
      : String(
          new Date(
            date.year,
            date.month - 1,
            date.day,
            time?.hour ?? 0,
            time?.minute ?? 0
          ).getTime()
        ),
};

const styles = StyleSheet.create({
  roundClear: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  roundClearText: { fontWeight: '600' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sheetHeaderTitle: { fontSize: 15, fontWeight: '600' },
  sheetHeaderClose: { fontSize: 15 },
  cardBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    maxHeight: '90%',
    borderRadius: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  bodyHint: { fontSize: 13, color: '#6B7280', paddingVertical: 8 },
});

/** A note above the calendar, for the `bodyTop` slot. */
export const bodyHint = (
  <Text style={styles.bodyHint}>Bookings open two weeks ahead.</Text>
);
