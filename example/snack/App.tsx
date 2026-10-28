/**
 * rn-grid-date-time-picker playground, for Expo Snack.
 *
 * Pick the options below the preview; the preview, the saved value and the
 * code update as you go. Everything is in this one file, so copy what you need.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  type DateTimePickerProps,
  type PickerStrings,
  type PickerValue,
  type ThemeTokens,
} from 'rn-grid-date-time-picker';

// ─── Theme: a colour, light or dark, and the corners ────────────────────────

/** Everything but the colour, for dark mode. Light mode uses the defaults. */
const DARK_TOKENS: Partial<ThemeTokens> = {
  text: '#E4E4E7',
  heading: '#FAFAFA',
  mutedText: '#A1A1AA',
  placeholder: '#71717A',
  border: '#3F3F46',
  inputBorder: '#3F3F46',
  separator: '#27272A',
  toggleTrack: '#27272A',
  error: '#F87171',
  background: '#18181B',
  surface: '#27272A',
  disabledBackground: '#27272A',
  disabledText: '#52525B',
  holiday: '#F87171',
};

type Shade = Pick<ThemeTokens, 'accent' | 'rangeFill'> &
  Partial<Pick<ThemeTokens, 'onAccent'>>;

const COLOURS: Record<string, { label: string; light: Shade; dark: Shade }> = {
  blue: {
    label: 'Blue',
    light: { accent: '#2563EB', rangeFill: '#DBEAFE' },
    dark: { accent: '#60A5FA', rangeFill: '#1E3A5F', onAccent: '#0B1220' },
  },
  coral: {
    label: 'Coral',
    light: { accent: '#D9434B', rangeFill: '#FDE2E2' },
    dark: { accent: '#FF7A7F', rangeFill: '#4C1D20', onAccent: '#1A0A0B' },
  },
  green: {
    label: 'Green',
    light: { accent: '#15803D', rangeFill: '#DCFCE7' },
    dark: { accent: '#4ADE80', rangeFill: '#14432A', onAccent: '#052E16' },
  },
  violet: {
    label: 'Violet',
    light: { accent: '#7C3AED', rangeFill: '#EDE9FE' },
    dark: { accent: '#A78BFA', rangeFill: '#352760', onAccent: '#1E1036' },
  },
  teal: {
    label: 'Teal',
    light: { accent: '#0F766E', rangeFill: '#CCFBF1' },
    dark: { accent: '#2DD4BF', rangeFill: '#134440', onAccent: '#042F2E' },
  },
  amber: {
    label: 'Amber',
    light: { accent: '#B45309', rangeFill: '#FEF3C7' },
    dark: { accent: '#FBBF24', rangeFill: '#4A3410', onAccent: '#1C1917' },
  },
  graphite: {
    label: 'Graphite',
    light: { accent: '#18181B', rangeFill: '#E4E4E7' },
    dark: { accent: '#E4E4E7', rangeFill: '#3F3F46', onAccent: '#18181B' },
  },
};

const themeTokens = (c: Config): Partial<ThemeTokens> => ({
  ...(c.appearance === 'dark' ? DARK_TOKENS : {}),
  ...COLOURS[c.colour]![c.appearance],
  ...(c.corners !== '8' ? { radius: Number(c.corners) } : {}),
});

// ─── Languages: `locale` names the months and days; `strings` the rest ───────

const FRENCH: Partial<PickerStrings> = {
  titleDate: 'Choisir une date',
  confirm: 'Valider',
  reset: 'Réinitialiser',
  clear: 'Effacer',
  today: "Aujourd'hui",
  done: 'OK',
  time: 'Heure',
  startTime: 'Heure de début',
  endTime: 'Heure de fin',
  from: 'Du',
  to: 'Au',
  placeholderDay: 'JJ',
  placeholderYear: 'AAAA',
  errorIncomplete: 'Saisissez une date complète',
  errorIncompleteTime: 'Saisissez une heure complète',
  errorInvalidDate: 'Saisissez une date valide',
  errorInvalidTime: 'Saisissez une heure valide',
  errorYearOutOfRange: ({ first, last }) =>
    `Saisissez une année entre ${first} et ${last}`,
  errorNotAllowed: "Cette date n'est pas disponible",
  errorTimeNotAllowed: "Cette heure n'est pas disponible",
  errorMinuteStep: (step) => `Choisissez des minutes par pas de ${step}`,
  errorRangeOrder: 'La fin doit être après le début',
  errorRangeTooShort: (n) => `Choisissez au moins ${n} jours`,
  errorRangeTooLong: (n) => `Choisissez au plus ${n} jours`,
  nothingSelectable: 'Aucune date disponible',
  calendarGregorian: 'Grégorien',
  calendarHijri: 'Hégire',
  calendarDual: 'Les deux',
  a11yOpen: 'Ouvrir le calendrier',
  a11yClear: 'Effacer la date',
};

const GERMAN: Partial<PickerStrings> = {
  titleDate: 'Datum wählen',
  confirm: 'Bestätigen',
  reset: 'Zurücksetzen',
  clear: 'Löschen',
  today: 'Heute',
  done: 'Fertig',
  time: 'Uhrzeit',
  startTime: 'Startzeit',
  endTime: 'Endzeit',
  from: 'Von',
  to: 'Bis',
  placeholderDay: 'TT',
  placeholderYear: 'JJJJ',
  errorIncomplete: 'Gib ein vollständiges Datum ein',
  errorIncompleteTime: 'Gib eine vollständige Uhrzeit ein',
  errorInvalidDate: 'Gib ein gültiges Datum ein',
  errorInvalidTime: 'Gib eine gültige Uhrzeit ein',
  errorYearOutOfRange: ({ first, last }) =>
    `Gib ein Jahr zwischen ${first} und ${last} ein`,
  errorNotAllowed: 'Dieses Datum ist nicht verfügbar',
  errorTimeNotAllowed: 'Diese Uhrzeit ist nicht verfügbar',
  errorMinuteStep: (step) => `Wähle Minuten in ${step}er-Schritten`,
  errorRangeOrder: 'Das Ende muss nach dem Anfang liegen',
  errorRangeTooShort: (n) => `Wähle mindestens ${n} Tage`,
  errorRangeTooLong: (n) => `Wähle höchstens ${n} Tage`,
  nothingSelectable: 'Keine Tage verfügbar',
  calendarGregorian: 'Gregorianisch',
  calendarHijri: 'Hidschri',
  calendarDual: 'Beide',
  a11yOpen: 'Kalender öffnen',
  a11yClear: 'Datum löschen',
};

const ARABIC: Partial<PickerStrings> = {
  titleDate: 'اختر التاريخ',
  confirm: 'تأكيد',
  reset: 'إعادة تعيين',
  clear: 'مسح',
  today: 'اليوم',
  done: 'تم',
  time: 'الوقت',
  startTime: 'وقت البدء',
  endTime: 'وقت الانتهاء',
  from: 'من',
  to: 'إلى',
  am: 'ص',
  pm: 'م',
  errorIncomplete: 'أدخل تاريخًا كاملًا',
  errorIncompleteTime: 'أدخل وقتًا كاملًا',
  errorInvalidDate: 'أدخل تاريخًا صحيحًا',
  errorInvalidTime: 'أدخل وقتًا صحيحًا',
  errorYearOutOfRange: ({ first, last }) => `أدخل سنة بين ${first} و${last}`,
  errorNotAllowed: 'هذا التاريخ غير متاح',
  errorTimeNotAllowed: 'هذا الوقت غير متاح',
  errorMinuteStep: (step) => `اختر الدقائق بفواصل ${step}`,
  errorRangeOrder: 'يجب أن تكون النهاية بعد البداية',
  errorRangeTooShort: (n) => `اختر مدة لا تقل عن ${n} أيام`,
  errorRangeTooLong: (n) => `اختر مدة لا تزيد عن ${n} أيام`,
  nothingSelectable: 'لا توجد تواريخ متاحة',
  calendarGregorian: 'ميلادي',
  calendarHijri: 'هجري',
  calendarDual: 'كلاهما',
  a11yCalendarSystem: 'التقويم',
  a11yOpen: 'فتح منتقي التاريخ',
  a11yClear: 'مسح التاريخ',
};

const LANGUAGES: Record<
  string,
  { label: string; strings?: Partial<PickerStrings>; name?: string }
> = {
  'en-US': { label: 'English (US)' },
  'en-GB': { label: 'English (UK)' },
  'fr-FR': { label: 'Français', strings: FRENCH, name: 'FRENCH' },
  'de-DE': { label: 'Deutsch', strings: GERMAN, name: 'GERMAN' },
  'ar-SA': { label: 'العربية', strings: ARABIC, name: 'ARABIC' },
};

// ─── Limits ──────────────────────────────────────────────────────────────────

const now = new Date();
const today = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
};
const dayKey = (offset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const HOLIDAYS = [dayKey(2), dayKey(9)];

/** The same check the picker makes before it shows Hijri dates. */
const hijriSupported = (() => {
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: 'UTC',
      year: 'numeric',
    });
    return f.resolvedOptions().calendar === 'islamic-umalqura';
  } catch {
    return false;
  }
})();

/** The saved dates as Hijri dates, in Arabic as the picker writes them ('٢٠ جمادى الأولى ١٤٤٨ هـ'). */
function hijriText(value: PickerValue, c: Config): string {
  const raws = (
    typeof value === 'string'
      ? [value]
      : Array.isArray(value)
        ? value
        : [value.from, value.to]
  ).filter(Boolean);
  const f = new Intl.DateTimeFormat(
    // The digits the picker uses for Hijri: Arabic unless set otherwise.
    // A Hijri calendar is written in Arabic whatever the language.
    `ar-SA-u-ca-islamic-umalqura${
      c.numerals === 'latin'
        ? '-nu-latn'
        : c.numerals === 'locale'
          ? ''
          : '-nu-arab'
    }`,
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
  );
  return raws
    .map((raw) => {
      // A date is the day itself; a date-time is read on this device's clock.
      const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T12:00:00Z`)
        : (() => {
            const t = new Date(raw);
            return new Date(
              Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), 12)
            );
          })();
      return f.format(d);
    })
    .join(c.mode === 'range' ? '  →  ' : '  ·  ');
}

// ─── Options ─────────────────────────────────────────────────────────────────

interface Config {
  type: 'date' | 'datetime';
  mode: 'single' | 'multiple' | 'range';
  rangeLayout: 'singleField' | 'fromTo';
  presentation: 'sheet' | 'inline';
  language: string;
  calendar: 'gregory' | 'dual' | 'hijri';
  calendarSwitch: boolean;
  dualTab: 'gregory' | 'hijri';
  numerals: 'auto' | 'latin' | 'arabic' | 'locale';
  timeFormat: 'auto' | '12h' | '24h';
  timeInput: 'typed' | 'wheel';
  minuteStep: string;
  limits: 'none' | 'future' | 'weekdays' | 'holidays';
  allowTyping: boolean;
  allowClear: boolean;
  showToday: boolean;
  colour: string;
  appearance: 'light' | 'dark';
  corners: '4' | '8' | '16';
}

const INITIAL: Config = {
  type: 'date',
  mode: 'single',
  rangeLayout: 'fromTo',
  presentation: 'sheet',
  language: I18nManager.isRTL ? 'ar-SA' : 'en-US',
  calendar: I18nManager.isRTL ? 'hijri' : 'gregory',
  calendarSwitch: false,
  dualTab: 'gregory',
  numerals: 'auto',
  timeFormat: 'auto',
  timeInput: 'typed',
  minuteStep: '1',
  limits: 'none',
  allowTyping: false,
  allowClear: true,
  showToday: false,
  colour: 'violet',
  appearance: 'light',
  corners: '8',
};

const emptyValue = (mode: Config['mode']): PickerValue =>
  mode === 'multiple' ? [] : mode === 'range' ? { from: '', to: '' } : '';

/** The picker props for a config, in the order the code shows them. */
function buildProps(c: Config): Record<string, unknown> {
  const lang = LANGUAGES[c.language]!;
  const p: Record<string, unknown> = { type: c.type };
  if (c.mode !== 'single') p.mode = c.mode;
  if (c.mode === 'range') p.range = { layout: c.rangeLayout };
  if (c.presentation === 'inline') p.presentation = 'inline';
  // Always set: without it the picker follows the phone's language.
  p.locale = c.language;
  if (lang.strings) p.strings = lang.strings;
  if (c.calendar !== 'gregory') p.calendarSystem = c.calendar;
  if (c.calendarSwitch) p.calendarSwitch = true;
  if ((c.calendarSwitch || c.calendar === 'dual') && c.dualTab === 'hijri')
    p.dualDefaultTab = 'hijri';
  if (c.numerals !== 'auto') p.numerals = c.numerals;
  if (c.type === 'datetime') {
    if (c.timeFormat !== 'auto') p.timeFormat = c.timeFormat;
    if (c.timeInput === 'wheel') p.timeInput = 'wheel';
    if (c.minuteStep !== '1') p.minuteStep = Number(c.minuteStep);
  }
  if (c.limits === 'future') p.minDate = today;
  if (c.limits === 'weekdays') p.disabledWeekdays = [6, 7];
  if (c.limits === 'holidays') {
    p.holidays = HOLIDAYS;
    p.disableHolidays = true;
  }
  if (c.allowTyping) p.allowTyping = true;
  if (c.allowClear) p.allowClear = true;
  if (c.showToday) p.showToday = true;
  const tokens = themeTokens(c);
  if (Object.keys(tokens).length) p.theme = tokens;
  return p;
}

/** JSX for the props, as you'd write it in your app. */
function toCode(c: Config, props: Record<string, unknown>): string {
  const lines = Object.entries(props).map(([key, v]) => {
    if (key === 'strings') return `  strings={${LANGUAGES[c.language]!.name}}`;
    if (v === true) return `  ${key}`;
    if (typeof v === 'string') return `  ${key}="${v}"`;
    if (key === 'theme') {
      // Dark mode spreads DARK_TOKENS (in this file), then sets the colour.
      const shown =
        c.appearance === 'dark'
          ? Object.fromEntries(
              Object.entries(v as object).filter(([k]) => !(k in DARK_TOKENS))
            )
          : (v as object);
      const body = [
        ...(c.appearance === 'dark' ? ['    ...DARK_TOKENS,'] : []),
        ...Object.entries(shown).map(
          ([k, t]) => `    ${k}: ${JSON.stringify(t).replace(/"/g, "'")},`
        ),
      ].join('\n');
      return `  theme={{\n${body}\n  }}`;
    }
    const json = JSON.stringify(v)
      .replace(/"([a-z]+)":/gi, '$1: ')
      .replace(/"/g, "'")
      .replace(/,/g, ', ');
    return `  ${key}={${json.startsWith('{') ? `{ ${json.slice(1, -1)} }` : json}}`;
  });
  return `<DateTimePicker\n${lines.join('\n')}\n  value={value}\n  onChange={setValue}\n/>`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <Playground />
    </SafeAreaProvider>
  );
}

function Playground() {
  const [config, setConfig] = useState<Config>(INITIAL);
  const [value, setValue] = useState<PickerValue>('');
  // The calendar the value was picked in (onChange's second argument).
  const [pickedIn, setPickedIn] = useState<string>('');
  const [events, setEvents] = useState<string[]>([]);
  const dark = config.appearance === 'dark';
  const ui = dark ? DARK_UI : LIGHT_UI;

  const set = <K extends keyof Config>(key: K, next: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: next }));
    // A range value doesn't fit a single picker, so the value starts again.
    if (key === 'type' || key === 'mode') {
      setValue(
        emptyValue(key === 'mode' ? (next as Config['mode']) : config.mode)
      );
    }
  };
  const log = (event: string) => setEvents((e) => [event, ...e].slice(0, 4));

  const props = useMemo(() => buildProps(config), [config]);
  const code = useMemo(() => toCode(config, props), [config, props]);
  const isDateTime = config.type === 'datetime';
  const hijriShown =
    (config.calendar !== 'gregory' || config.calendarSwitch) && hijriSupported;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: ui.page }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: ui.text }]}>
          rn-grid-date-time-picker
        </Text>
        <Text style={[styles.sub, { color: ui.muted }]}>
          Change the options below. The picker, its value and the code follow.
        </Text>

        <Card ui={ui}>
          <DateTimePicker
            key={`${config.type}-${config.mode}`}
            {...(props as unknown as DateTimePickerProps)}
            label={config.mode === 'range' ? undefined : 'Date'}
            value={value}
            onChange={(next, info) => {
              setValue(next);
              setPickedIn(info?.calendarSystem ?? '');
              log('onChange');
              // Shows in the Snack's logs panel.
              console.log(
                'onChange',
                JSON.stringify(next),
                info ? `picked in ${info.calendarSystem}` : '',
                hijriShown ? `(Hijri: ${hijriText(next, config)})` : ''
              );
            }}
            onCalendarSystemChange={(system) => {
              set('calendar', system);
              log(`onCalendarSystemChange: ${system}`);
            }}
            onOpen={() => log('onOpen')}
            onClose={() => log('onClose')}
            onError={(error) => log(`onError: ${error}`)}
          />
          {(config.calendar !== 'gregory' || config.calendarSwitch) &&
          !hijriSupported ? (
            <Text style={[styles.note, { color: ui.muted }]}>
              This device has no Hijri calendar, so the picker shows Gregorian.
            </Text>
          ) : null}
          <Collapsible ui={ui} title="Value and events" divider>
            <Text style={[styles.resultLabel, { color: ui.muted }]}>
              onChange value
            </Text>
            <Text selectable style={[styles.mono, { color: ui.text }]}>
              {JSON.stringify(value, null, 1).replace(/\n\s*/g, ' ')}
            </Text>
            {hijriShown ? (
              <>
                <Text style={[styles.resultLabel, { color: ui.muted }]}>
                  Picked in
                </Text>
                <Text selectable style={[styles.mono, { color: ui.text }]}>
                  {pickedIn || '–'}
                </Text>
                <Text style={[styles.resultLabel, { color: ui.muted }]}>
                  The same day in Hijri
                </Text>
                <Text selectable style={[styles.mono, { color: ui.text }]}>
                  {hijriText(value, config) || '–'}
                </Text>
              </>
            ) : null}
            <Text style={[styles.resultLabel, { color: ui.muted }]}>
              Events, newest first
            </Text>
            <Text style={[styles.mono, { color: ui.text }]}>
              {events.length ? events.join('  ·  ') : '–'}
            </Text>
          </Collapsible>
        </Card>

        <Card ui={ui}>
          <Text style={[styles.cardTitle, { color: ui.text }]}>Theme</Text>
          <Row
            ui={ui}
            title="Appearance"
            value={config.appearance}
            onChange={(v) => set('appearance', v)}
            options={[
              ['light', 'Light'],
              ['dark', 'Dark'],
            ]}
          />
          <View style={styles.row}>
            <Text style={[styles.rowTitle, { color: ui.muted }]}>Colour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.swatches}
            >
              {Object.entries(COLOURS).map(([key, colour]) => (
                <Swatch
                  key={key}
                  label={colour.label}
                  shade={colour[config.appearance]}
                  selected={config.colour === key}
                  ui={ui}
                  onPress={() => set('colour', key)}
                />
              ))}
            </ScrollView>
          </View>
          <Row
            ui={ui}
            title="Corners"
            value={config.corners}
            onChange={(v) => set('corners', v)}
            options={[
              ['4', 'Sharp'],
              ['8', 'Default'],
              ['16', 'Round'],
            ]}
          />
        </Card>

        <Card ui={ui}>
          <Row
            ui={ui}
            title="Picks"
            value={config.type}
            onChange={(v) => set('type', v)}
            options={[
              ['date', 'Date'],
              ['datetime', 'Date & time'],
            ]}
          />
          <Row
            ui={ui}
            title="Selection"
            value={config.mode}
            onChange={(v) => set('mode', v)}
            options={[
              ['single', 'Single'],
              ['multiple', 'Multiple'],
              ['range', 'Range'],
            ]}
          />
          {config.mode === 'range' ? (
            <Row
              ui={ui}
              title="Range layout"
              value={config.rangeLayout}
              onChange={(v) => set('rangeLayout', v)}
              options={[
                ['singleField', 'One field'],
                ['fromTo', 'From / To'],
              ]}
            />
          ) : null}
          <Row
            ui={ui}
            title="Show as"
            value={config.presentation}
            onChange={(v) => set('presentation', v)}
            options={[
              ['sheet', 'Bottom sheet'],
              ['inline', 'Inline'],
            ]}
          />
        </Card>

        <Card ui={ui}>
          <Row
            ui={ui}
            title="Language"
            value={config.language}
            onChange={(v) => set('language', v)}
            options={Object.entries(LANGUAGES).map(([k, l]) => [k, l.label])}
          />
          <Row
            ui={ui}
            title="Calendar"
            value={config.calendar}
            onChange={(v) => set('calendar', v)}
            options={[
              ['gregory', 'Gregorian'],
              ['hijri', 'Hijri'],
              ['dual', 'Dual'],
            ]}
          />
          <Row
            ui={ui}
            title="Calendar switch"
            value={config.calendarSwitch ? 'on' : 'off'}
            onChange={(v) => set('calendarSwitch', v === 'on')}
            options={[
              ['off', 'Off'],
              ['on', 'In the picker'],
            ]}
          />
          {config.calendarSwitch || config.calendar === 'dual' ? (
            <Row
              ui={ui}
              title="Dual opens on"
              value={config.dualTab}
              onChange={(v) => set('dualTab', v)}
              options={[
                ['gregory', 'Gregorian'],
                ['hijri', 'Hijri'],
              ]}
            />
          ) : null}
          <Row
            ui={ui}
            title="Digits"
            value={config.numerals}
            onChange={(v) => set('numerals', v)}
            options={[
              ['auto', 'Auto'],
              ['latin', '123'],
              ['arabic', '١٢٣'],
              ['locale', "The language's own"],
            ]}
          />
          <Text style={[styles.note, { color: ui.muted }]}>
            Auto: Gregorian shows 123 and Hijri shows ١٢٣, in any language.
          </Text>
          <Text style={[styles.note, { color: ui.muted }]}>
            Direction: {I18nManager.isRTL ? 'right to left' : 'left to right'},
            from your phone's language. To try RTL, set Expo Go's language to
            Arabic (Android: Settings → Apps → Expo Go → Language; iOS: Settings
            → Expo Go → Language) and reopen it.
          </Text>
        </Card>

        {isDateTime ? (
          <Card ui={ui}>
            <Row
              ui={ui}
              title="Clock"
              value={config.timeFormat}
              onChange={(v) => set('timeFormat', v)}
              options={[
                ['auto', 'From language'],
                ['12h', '12h'],
                ['24h', '24h'],
              ]}
            />
            <Row
              ui={ui}
              title="Time input"
              value={config.timeInput}
              onChange={(v) => set('timeInput', v)}
              options={[
                ['typed', 'Typed'],
                ['wheel', 'Wheel'],
              ]}
            />
            <Row
              ui={ui}
              title="Minute step"
              value={config.minuteStep}
              onChange={(v) => set('minuteStep', v)}
              options={[
                ['1', '1'],
                ['5', '5'],
                ['15', '15'],
                ['30', '30'],
              ]}
            />
          </Card>
        ) : null}

        <Card ui={ui}>
          <Row
            ui={ui}
            title="Limits"
            value={config.limits}
            onChange={(v) => set('limits', v)}
            options={[
              ['none', 'None'],
              ['future', 'From today'],
              ['weekdays', 'Weekdays only'],
              ['holidays', 'No holidays'],
            ]}
          />
          <Text style={[styles.rowTitle, { color: ui.muted }]}>Options</Text>
          <View style={styles.chips}>
            <Chip
              ui={ui}
              label="Type in the sheet"
              selected={config.allowTyping}
              onPress={() => set('allowTyping', !config.allowTyping)}
            />
            <Chip
              ui={ui}
              label="Clear ×"
              selected={config.allowClear}
              onPress={() => set('allowClear', !config.allowClear)}
            />
            <Chip
              ui={ui}
              label="Today button"
              selected={config.showToday}
              onPress={() => set('showToday', !config.showToday)}
            />
          </View>
        </Card>

        <Card ui={ui}>
          <Collapsible ui={ui} title="Code">
            <Text
              selectable
              style={[
                styles.mono,
                styles.code,
                { color: ui.text, backgroundColor: ui.codeBg },
              ]}
            >
              {code}
            </Text>
          </Collapsible>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small UI pieces ─────────────────────────────────────────────────────────

const LIGHT_UI = {
  page: '#F4F4F5',
  card: '#FFFFFF',
  text: '#18181B',
  muted: '#71717A',
  border: '#E4E4E7',
  chip: '#FFFFFF',
  chipOn: '#18181B',
  chipOnText: '#FFFFFF',
  codeBg: '#F4F4F5',
};
const DARK_UI = {
  page: '#09090B',
  card: '#18181B',
  text: '#F4F4F5',
  muted: '#A1A1AA',
  border: '#3F3F46',
  chip: '#18181B',
  chipOn: '#F4F4F5',
  chipOnText: '#18181B',
  codeBg: '#09090B',
};
type UI = typeof LIGHT_UI;

function Card({ ui, children }: { ui: UI; children: ReactNode }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: ui.card, borderColor: ui.border },
      ]}
    >
      {children}
    </View>
  );
}

function Chip({
  ui,
  label,
  selected,
  onPress,
}: {
  ui: UI;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? ui.chipOn : ui.chip,
          borderColor: selected ? ui.chipOn : ui.border,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: selected ? ui.chipOnText : ui.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row<V extends string>({
  ui,
  title,
  value,
  options,
  onChange,
}: {
  ui: UI;
  title: string;
  value: V;
  options: [V, string][] | string[][];
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowTitle, { color: ui.muted }]}>{title}</Text>
      <View style={styles.chips}>
        {(options as [V, string][]).map(([v, label]) => (
          <Chip
            key={v}
            ui={ui}
            label={label}
            selected={v === value}
            onPress={() => onChange(v)}
          />
        ))}
      </View>
    </View>
  );
}

function Swatch({
  label,
  shade,
  selected,
  ui,
  onPress,
}: {
  label: string;
  shade: Shade;
  selected: boolean;
  ui: UI;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.swatch}
    >
      <View
        style={[
          styles.swatchRing,
          { borderColor: selected ? shade.accent : ui.card },
        ]}
      >
        <View style={[styles.swatchDot, { backgroundColor: shade.accent }]}>
          {selected ? (
            <Text style={[styles.tick, { color: shade.onAccent ?? '#FFFFFF' }]}>
              ✓
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={[styles.swatchLabel, { color: selected ? ui.text : ui.muted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A titled section that opens on tap. Closed at first. */
function Collapsible({
  ui,
  title,
  divider = false,
  children,
}: {
  ui: UI;
  title: string;
  /** A line above, to set it apart from what comes before in the card. */
  divider?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={divider && [styles.divider, { borderColor: ui.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.collapsibleHeader}
      >
        <Text style={[styles.cardTitle, { color: ui.text }]}>{title}</Text>
        <Text style={[styles.caret, { color: ui.muted }]}>
          {open ? '▴' : '▾'}
        </Text>
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: -4 },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  row: { gap: 8 },
  rowTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  swatches: { gap: 2 },
  swatch: { alignItems: 'center', width: 58, gap: 4 },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { fontSize: 14, fontWeight: '700' },
  swatchLabel: { fontSize: 11, fontWeight: '500' },
  note: { fontSize: 12, lineHeight: 17 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleBody: { gap: 4, marginTop: 10 },
  caret: { fontSize: 18 },
  resultLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  mono: { fontFamily: 'Courier', fontSize: 13 },
  code: { padding: 12, borderRadius: 6, lineHeight: 19 },
});
