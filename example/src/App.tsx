import { useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import DateTimePicker, {
  type DateTimePickerProps,
  type PickerValue,
} from 'rn-grid-date-time-picker';
import { CodeSheet, type LogEntry } from './playground/CodeSheet';
import {
  CATEGORIES,
  PRESETS,
  buildProps,
  initialConfig,
  isVisible,
  presetConfig,
  toJsx,
  type Choice,
  type Config,
  type Preset,
} from './playground/config';
import { PALETTES } from './playground/fixtures';
import {
  GroupControl,
  PillTabs,
  PresetCard,
  TextButton,
  colors,
  fonts,
  mono,
} from './playground/ui';

/** Chips that change the value's shape or format, so the value starts empty. */
const VALUE_KEYS = ['type', 'mode', 'valueFormat', 'precision'];

const emptyValue = (mode: Choice): PickerValue =>
  mode === 'multiple' ? [] : mode === 'range' ? { from: '', to: '' } : '';

const isEmpty = (value: PickerValue) =>
  typeof value === 'string'
    ? !value
    : Array.isArray(value)
      ? !value.length
      : !value.from && !value.to;

const FIRST = PRESETS[0]!;

export default function App() {
  // Inter under the names INTER_FONTS looks for (the "INTER_FONTS" theme chip),
  // and for the playground's own text.
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Playground />
    </SafeAreaProvider>
  );
}

function Playground() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [config, setConfig] = useState<Config>(() => presetConfig(FIRST));
  const [preset, setPreset] = useState<Preset | null>(FIRST);
  const [edited, setEdited] = useState(false);
  const [value, setValue] = useState<PickerValue>('');
  const [tab, setTab] = useState('presets');
  const [codeOpen, setCodeOpen] = useState(false);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const log = (name: string, detail?: unknown) => {
    const at = new Date().toTimeString().slice(0, 8);
    const entry = {
      id: nextId.current++,
      at,
      name,
      detail: detail === undefined ? undefined : JSON.stringify(detail),
    };
    setEvents((prev) => [entry, ...prev].slice(0, 30));
  };

  const choose = (key: string, choice: Choice) => {
    const next = { ...config, [key]: choice };
    setConfig(next);
    setEdited(true);
    if (VALUE_KEYS.includes(key)) setValue(emptyValue(next.mode!));
  };

  const applyPreset = (p: Preset) => {
    const next = presetConfig(p);
    setConfig(next);
    setPreset(p);
    setEdited(false);
    setValue(emptyValue(next.mode!));
  };

  const resetAll = () => {
    setConfig(initialConfig());
    setPreset(null);
    setEdited(false);
    setValue('');
    setEvents([]);
  };

  const entries = useMemo(
    () =>
      buildProps(config, {
        onReset: () => {
          log('onReset');
          setValue(emptyValue(config.mode!));
        },
      }),
    // `log` only calls state setters.

    [config]
  );
  const props = Object.fromEntries(
    entries.map((e) => [e.name, e.value])
  ) as Omit<DateTimePickerProps, 'value' | 'onChange'>;

  const categories = CATEGORIES.filter((cat) =>
    cat.groups.some((g) => isVisible(g, config))
  );
  const tabs = [
    { key: 'presets', label: 'Presets' },
    ...categories.map((cat) => ({
      key: cat.key,
      // The one selection tab names the mode it's showing.
      label:
        cat.key === 'selection'
          ? config.mode === 'range'
            ? 'Range'
            : 'Multiple'
          : cat.label,
    })),
  ];
  const current = categories.find((cat) => cat.key === tab);
  const activeTab = current ? tab : 'presets';

  const palette = PALETTES[config.palette as string]!.tokens;
  const inline = config.presentation === 'inline';
  // A fresh picker when the value's shape or the layout changes.
  const pickerKey = [
    'type',
    'mode',
    'valueFormat',
    'precision',
    'presentation',
    'calendarSystem',
  ]
    .map((k) => config[k])
    .join('|');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Date & time picker</Text>
          <Text style={styles.subheading}>rn-grid-date-time-picker</Text>
        </View>
        <View style={styles.headerActions}>
          <TextButton label="Reset" onPress={resetAll} />
          <TextButton label="Code" onPress={() => setCodeOpen(true)} strong />
        </View>
      </View>

      <View
        style={[
          styles.stage,
          { backgroundColor: palette.background ?? colors.surface },
        ]}
      >
        <View style={styles.stageBar}>
          <Text
            style={[
              styles.stageTag,
              { color: palette.mutedText ?? colors.muted },
            ]}
          >
            {preset ? preset.title.toUpperCase() : 'DEFAULTS'}
            {edited ? ' · EDITED' : ''}
          </Text>
          <Text
            style={[
              styles.stageHint,
              { color: palette.mutedText ?? colors.faint },
            ]}
          >
            {inline ? 'Inline' : 'Tap the field to open'}
          </Text>
        </View>
        <ScrollView
          style={[styles.stageScroll, { maxHeight: height * 0.46 }]}
          contentContainerStyle={styles.stageContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <DateTimePicker
            key={pickerKey}
            {...props}
            value={value}
            onChange={(v) => {
              log('onChange', v);
              setValue(v);
            }}
            onBlur={() => log('onBlur')}
            onConfirm={(v) => log('onConfirm', v)}
            onOpen={() => log('onOpen')}
            onClose={() => log('onClose')}
            onError={(code, v) => log('onError', { code, value: v })}
            onVisibleMonthChange={(year, month) =>
              log('onVisibleMonthChange', { year, month })
            }
          />
        </ScrollView>
      </View>

      <View style={styles.valueBar}>
        <Text style={styles.valueLabel}>value</Text>
        <View style={styles.valueText}>
          <Text style={styles.value} numberOfLines={2} selectable>
            {JSON.stringify(value)}
            {isEmpty(value) ? (
              <Text style={styles.valueNote}> nothing picked yet</Text>
            ) : null}
          </Text>
          {config.valueFormat === 'epoch' &&
          typeof value === 'string' &&
          value ? (
            <Text style={styles.valueNote} numberOfLines={1}>
              {new Date(Number(value)).toString()}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom }]}>
        <View style={styles.panelTabs}>
          <PillTabs tabs={tabs} active={activeTab} onChange={setTab} />
        </View>
        <ScrollView
          key={activeTab}
          contentContainerStyle={styles.panelContent}
          keyboardShouldPersistTaps="handled"
        >
          {current ? (
            current.groups
              .filter((g) => isVisible(g, config))
              .map((g, i) => (
                <View key={g.key} style={i > 0 && styles.divided}>
                  <GroupControl group={g} config={config} onChange={choose} />
                </View>
              ))
          ) : (
            <>
              <Text style={styles.intro}>
                Start from a real setup, then fine-tune it in the other tabs.
              </Text>
              <View style={styles.presets}>
                {PRESETS.map((p) => (
                  <PresetCard
                    key={p.key}
                    preset={p}
                    selected={preset?.key === p.key}
                    onPress={() => applyPreset(p)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <CodeSheet
        visible={codeOpen}
        onClose={() => setCodeOpen(false)}
        jsx={toJsx(entries)}
        events={events}
        onClearEvents={() => setEvents([])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerText: { flexShrink: 1 },
  heading: { fontSize: 20, fontFamily: fonts.semibold, color: colors.ink },
  subheading: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: mono,
    color: colors.muted,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  stage: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  stageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stageTag: { fontSize: 11, letterSpacing: 0.6, fontFamily: fonts.semibold },
  stageHint: { fontSize: 12, fontFamily: fonts.regular },
  stageScroll: { flexGrow: 0 },
  stageContent: { padding: 16 },
  valueBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  valueLabel: {
    paddingTop: 1,
    fontSize: 11,
    fontFamily: mono,
    color: colors.faint,
  },
  valueText: { flex: 1, gap: 2 },
  value: { fontSize: 12, fontFamily: mono, color: colors.text },
  valueNote: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  panel: {
    flex: 1,
    paddingTop: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  panelTabs: { paddingBottom: 6 },
  panelContent: { padding: 20, paddingTop: 12 },
  divided: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  intro: {
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
