import { useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, {
  type DateTimePickerProps,
  type IconRenderProps,
  type PickerState,
  type PickerStrings,
  type PickerValue,
  type SheetRenderProps,
  type ThemeTokens,
  type ValueAdapter,
} from 'rn-calendar-time-picker';

/** One demo: a title, the picker, and its current value as JSON. */
function Demo({
  title,
  initial = '',
  children,
}: {
  title: string;
  initial?: PickerValue;
  children: (
    value: PickerValue,
    onChange: (v: PickerValue) => void
  ) => ReactNode;
}) {
  const [value, setValue] = useState<PickerValue>(initial);
  return (
    <View style={styles.demo}>
      <Text style={styles.title}>{title}</Text>
      {children(value, setValue)}
      <Text style={styles.json}>{JSON.stringify(value)}</Text>
    </View>
  );
}

/** Props every demo shares. */
const common = (
  value: PickerValue,
  onChange: (v: PickerValue) => void
): Pick<DateTimePickerProps, 'value' | 'onChange' | 'allowClear'> => {
  return { value, onChange, allowClear: true };
};

// Holidays "from a server": a few fixed days in each year, loaded once per year.
const loadHolidays = (year: number) =>
  new Promise<string[]>((resolve) =>
    setTimeout(
      () => resolve([`${year}-01-01`, `${year}-05-01`, `${year}-12-25`]),
      300
    )
  );

const today = new Date();
const thisMonth = { year: today.getFullYear(), month: today.getMonth() + 1 };

const greenTheme: Partial<ThemeTokens> = {
  accent: '#047857',
  rangeFill: '#D1FAE5',
  radius: 14,
};

const frenchStrings: Partial<PickerStrings> = {
  titleDate: 'Choisir une date',
  titleTime: "Choisir l'heure",
  confirm: 'Valider',
  clear: 'Effacer',
  today: "Aujourd'hui",
  time: 'Heure',
  from: 'Du',
  to: 'Au',
  errorNotAllowed: "Cette date n'est pas disponible",
  a11yOpen: 'Ouvrir le calendrier',
  a11yClear: 'Effacer la date',
};

// A system serif, so the font demo needs no font files.
const serif = Platform.select({ ios: 'Georgia', default: 'serif' });

/** An app's own clear icon: a round badge with a cross, in the colour it's given. */
const RoundClearIcon = ({ color, size }: IconRenderProps) => (
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

/** An app's own sheet header: a question and a Close button. */
const renderStartHeader = (state: PickerState) => (
  <View style={styles.sheetHeader}>
    <Text style={styles.title}>When does it start?</Text>
    <Pressable accessibilityRole="button" onPress={state.close}>
      <Text style={styles.sheetHeaderClose}>Close</Text>
    </Pressable>
  </View>
);

/** A centred card instead of the built-in bottom sheet. */
const renderCardSheet = ({
  onRequestClose,
  body,
  footer,
}: SheetRenderProps) => (
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
      <View style={styles.card}>
        {body}
        {footer}
      </View>
    </View>
  </Modal>
);

/**
 * Stores date-times as epoch milliseconds, read and written through a JS Date
 * in the device zone.
 */
const epochAdapter: ValueAdapter = {
  parse: (raw) => {
    const d = new Date(Number(raw));
    if (!raw || Number.isNaN(d.getTime())) return null;
    return {
      date: {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      },
      time: { hour: d.getHours(), minute: d.getMinutes() },
    };
  },
  format: ({ date, time }) =>
    time
      ? String(
          new Date(
            date.year,
            date.month - 1,
            date.day,
            time.hour,
            time.minute
          ).getTime()
        )
      : '',
};

export default function App() {
  // The picker's default font: Inter, under the names it looks for.
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });
  if (!fontsLoaded) return null;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="dark" />
      <Text style={styles.heading}>rn-calendar-time-picker</Text>

      <Demo title="Date">
        {(v, set) => (
          <DateTimePicker type="date" label="Due date" {...common(v, set)} />
        )}
      </Demo>

      <Demo title="Date-time, typed">
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            label="Starts at"
            allowTyping
            allowTriggerTyping
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Date-time, wheel, 24-hour, 15-minute steps">
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            timeInput="wheel"
            timeFormat="24h"
            minuteStep={15}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Range in one field" initial={{ from: '', to: '' }}>
        {(v, set) => (
          <DateTimePicker type="date" mode="range" {...common(v, set)} />
        )}
      </Demo>

      <Demo
        title="Range, From / To, 2 to 7 days"
        initial={{ from: '', to: '' }}
      >
        {(v, set) => (
          <DateTimePicker
            type="date"
            mode="range"
            range={{ layout: 'fromTo', minDays: 2, maxDays: 7 }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Multiple dates, each with its own time" initial={[]}>
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            mode="multiple"
            multiple={{ timeMode: 'perDate', maxSelections: 5 }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Inline">
        {(v, set) => (
          <DateTimePicker
            type="date"
            presentation="inline"
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Limits: this month and next, weekdays only, holidays loaded">
        {(v, set) => (
          <DateTimePicker
            type="date"
            minDate={{ ...thisMonth, day: 1 }}
            maxDate={{
              year:
                thisMonth.month === 12 ? thisMonth.year + 1 : thisMonth.year,
              month: (thisMonth.month % 12) + 1,
              day: 28,
            }}
            disabledWeekdays={[6, 7]}
            loadHolidays={loadHolidays}
            disableHolidays
            showToday
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Gregorian with Hijri days ('dual')">
        {(v, set) => (
          <DateTimePicker
            type="date"
            calendarSystem="dual"
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Hijri grid ('hijri')">
        {(v, set) => (
          <DateTimePicker
            type="date"
            calendarSystem="hijri"
            locale="ar-SA"
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Custom theme and French strings">
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            locale="fr-FR"
            label="Rendez-vous"
            theme={greenTheme}
            strings={frenchStrings}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="dateFormat 'dd/mm/yyyy', icon colours and sizes, own clear icon">
        {(v, set) => (
          <DateTimePicker
            type="date"
            label="Due date"
            dateFormat="dd/mm/yyyy"
            iconProps={{
              calendar: { color: '#DB2777', size: 22 },
              chevronDown: { color: '#DB2777' },
              chevronLeft: { color: '#DB2777' },
              chevronRight: { color: '#DB2777' },
              clear: { color: '#DB2777', size: 18 },
            }}
            icons={{ clear: RoundClearIcon }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="One font for all text (theme.fontFamily), larger sizes">
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            label="Meeting"
            theme={{
              fontFamily: serif,
              fontSizeSmall: 13,
              fontSizeMedium: 16,
              fontSizeLarge: 18,
            }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo
        title="Disabled field (icon in its disabled colour)"
        initial="2026-10-21"
      >
        {(v, set) => (
          <DateTimePicker
            type="date"
            disabled
            iconProps={{ calendar: { disabledColor: '#F59E0B' } }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Sheet: 60% high, own header, no field, Confirm scrolls">
        {(v, set) => (
          <DateTimePicker
            type="datetime"
            header={renderStartHeader}
            sheet={{ height: '60%', showField: false, fixedFooter: false }}
            strings={{ placeholderHour: 'HH', placeholderMinute: 'MM' }}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Custom sheet (renderSheet)">
        {(v, set) => (
          <DateTimePicker
            type="date"
            renderSheet={renderCardSheet}
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="valueFormat 'utc-midnight'">
        {(v, set) => (
          <DateTimePicker
            type="date"
            valueFormat="utc-midnight"
            {...common(v, set)}
          />
        )}
      </Demo>

      <Demo title="Custom adapter (epoch milliseconds via JS Date)">
        {(v, set) => (
          <>
            <DateTimePicker
              type="datetime"
              valueFormat={epochAdapter}
              {...common(v, set)}
            />
            {typeof v === 'string' && v ? (
              <Text style={styles.json}>{new Date(Number(v)).toString()}</Text>
            ) : null}
          </>
        )}
      </Demo>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingTop: 64, paddingBottom: 48, gap: 16 },
  heading: { fontSize: 22, fontWeight: '600', color: '#111827' },
  demo: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  json: { fontSize: 12, color: '#6B7280', fontFamily: 'Courier' },
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
  sheetHeaderClose: { fontSize: 15, color: '#2563EB' },
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
});
