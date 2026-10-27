import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  isVisible,
  type Choice,
  type Config,
  type Group,
  type Preset,
} from './config';
import { PALETTES } from './fixtures';

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/** The app's own colours, apart from the picker's theme. */
export const colors = {
  screen: '#F2F2F5',
  surface: '#FFFFFF',
  ink: '#0B0B12',
  text: '#1F2330',
  muted: '#6B7080',
  faint: '#A1A5B3',
  line: '#E6E7EC',
  fill: '#EEEFF3',
  code: '#0E1117',
  codeText: '#E6E8EE',
};

/** Inter, loaded in App under these names. */
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
};

const isBoolean = (g: Group) =>
  !g.multi && g.options.map((o) => o.value).join() === 'false,true';

const labelOf = (o: { value: string; label?: string }) => o.label ?? o.value;

export function Chip({
  label,
  selected,
  swatch,
  onPress,
}: {
  label: string;
  selected: boolean;
  swatch?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      {swatch ? (
        <View style={[styles.swatch, { backgroundColor: swatch }]} />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of equal buttons, one of them on. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: K; label: string }[];
  value: K;
  onChange: (value: K) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A plain-words title with the prop it sets underneath. */
function GroupTitle({ group }: { group: Group }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{group.title}</Text>
      <Text style={styles.prop}>{group.label}</Text>
    </View>
  );
}

/**
 * One option row, drawn to fit its choices: a switch for true / false, a
 * segmented control for a few short choices, chips for the rest.
 */
export function GroupControl({
  group,
  config,
  onChange,
}: {
  group: Group;
  config: Config;
  onChange: (key: string, choice: Choice) => void;
}) {
  const choice = config[group.key]!;
  const options = group.options.filter((o) => isVisible(o, config));
  const hint = group.hint ? (
    <Text style={styles.hint}>{group.hint}</Text>
  ) : null;

  if (isBoolean(group))
    return (
      <View style={styles.group}>
        <View style={styles.switchRow}>
          <GroupTitle group={group} />
          <Switch
            accessibilityLabel={group.title}
            value={choice === 'true'}
            onValueChange={(on) => onChange(group.key, String(on))}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.line}
          />
        </View>
        {hint}
      </View>
    );

  const segmented =
    !group.multi &&
    options.length <= 3 &&
    options.every((o) => labelOf(o).length <= 14);
  return (
    <View style={styles.group}>
      <GroupTitle group={group} />
      {segmented ? (
        <Segmented
          options={options.map((o) => ({ value: o.value, label: labelOf(o) }))}
          value={choice as string}
          onChange={(v) => onChange(group.key, v)}
        />
      ) : (
        <View style={styles.chips}>
          {options.map((o) => {
            const selected = Array.isArray(choice)
              ? choice.includes(o.value)
              : choice === o.value;
            return (
              <Chip
                key={o.value}
                label={labelOf(o)}
                swatch={o.swatch}
                selected={selected}
                onPress={() => {
                  if (!Array.isArray(choice)) onChange(group.key, o.value);
                  else
                    onChange(
                      group.key,
                      selected
                        ? choice.filter((v) => v !== o.value)
                        : [...choice, o.value]
                    );
                }}
              />
            );
          })}
        </View>
      )}
      {hint}
    </View>
  );
}

/** One line of tabs that scrolls sideways instead of wrapping. */
export function PillTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pills}
    >
      {tabs.map((t) => {
        const selected = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.pillText, selected && styles.pillTextSelected]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function PresetCard({
  preset,
  selected,
  onPress,
}: {
  preset: Preset;
  selected: boolean;
  onPress: () => void;
}) {
  // A tiny preview of the preset's theme: its background with an accent dot.
  const palette = PALETTES[(preset.config.palette as string) ?? 'default']!;
  const tile = {
    background: palette.tokens.background ?? colors.surface,
    accent: palette.tokens.accent ?? palette.swatch,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint="Loads this setup into the preview"
      onPress={onPress}
      style={({ pressed }) => [
        styles.preset,
        selected && styles.presetSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.presetTile, { backgroundColor: tile.background }]}>
        <View style={[styles.presetDot, { backgroundColor: tile.accent }]} />
      </View>
      <Text style={styles.presetTitle}>{preset.title}</Text>
      <Text style={styles.presetText}>{preset.description}</Text>
    </Pressable>
  );
}

/** A small text button, e.g. Reset or Done. */
export function TextButton({
  label,
  onPress,
  strong,
}: {
  label: string;
  onPress: () => void;
  strong?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.textButton,
        strong && styles.textButtonStrong,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.textButtonText, strong && styles.textButtonTextStrong]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  group: { gap: 10 },
  titleBlock: { flexShrink: 1, gap: 2 },
  title: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  prop: { fontSize: 11, fontFamily: mono, color: colors.faint },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.fill,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  segmentTextSelected: { fontFamily: fonts.semibold, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.ink, backgroundColor: colors.ink },
  chipText: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  chipTextSelected: { color: colors.surface },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  pills: { gap: 6, paddingHorizontal: 16 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.fill,
  },
  pillSelected: { backgroundColor: colors.ink },
  pillText: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  pillTextSelected: { color: colors.surface },
  preset: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  presetSelected: { borderColor: colors.ink },
  presetTile: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  presetDot: { width: 10, height: 10, borderRadius: 5 },
  presetTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.ink },
  presetText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.fill,
  },
  textButtonStrong: { backgroundColor: colors.ink },
  textButtonText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  textButtonTextStrong: { color: colors.surface },
});
