import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Segmented, TextButton, colors, fonts, mono } from './ui';

export interface LogEntry {
  id: number;
  at: string;
  name: string;
  detail?: string;
}

/** The JSX for the current setup, with Copy, and the events the picker fired. */
export function CodeSheet({
  visible,
  onClose,
  jsx,
  events,
  onClearEvents,
}: {
  visible: boolean;
  onClose: () => void;
  jsx: string;
  events: LogEntry[];
  onClearEvents: () => void;
}) {
  const insets = useSafeAreaInsets();
  // A page sheet sits below the status bar on iOS; Android is full screen.
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  const [tab, setTab] = useState<'jsx' | 'events'>('jsx');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(jsx);
    setCopied(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { paddingTop: top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Code</Text>
          <TextButton label="Done" onPress={onClose} strong />
        </View>
        <View style={styles.tabs}>
          <Segmented
            options={[
              { value: 'jsx', label: 'JSX' },
              {
                value: 'events',
                label: events.length ? `Events · ${events.length}` : 'Events',
              },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'jsx' ? (
          <View style={styles.body}>
            <View style={styles.codeCard}>
              <View style={styles.codeBar}>
                <Text style={styles.codeFile}>Example.tsx</Text>
                <TextButton label={copied ? 'Copied' : 'Copy'} onPress={copy} />
              </View>
              <ScrollView contentContainerStyle={styles.codeScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.code} selectable>
                    {jsx}
                  </Text>
                </ScrollView>
              </ScrollView>
            </View>
            <Text style={[styles.note, { marginBottom: insets.bottom }]}>
              Names like loadHolidays, epochAdapter and frenchStrings are
              helpers in the example app's playground/fixtures.tsx.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.events,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            {events.length ? (
              <>
                {events.map((e) => (
                  <View key={e.id} style={styles.event}>
                    <View style={styles.eventHead}>
                      <Text style={styles.eventName}>{e.name}</Text>
                      <Text style={styles.eventAt}>{e.at}</Text>
                    </View>
                    {e.detail ? (
                      <Text style={styles.eventDetail} selectable>
                        {e.detail}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <View style={styles.clear}>
                  <TextButton label="Clear events" onPress={onClearEvents} />
                </View>
              </>
            ) : (
              <Text style={styles.empty}>
                Nothing yet. Open the picker and pick something: onChange,
                onConfirm, onBlur, onOpen, onClose, onError and
                onVisibleMonthChange show up here.
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heading: { fontSize: 22, fontFamily: fonts.semibold, color: colors.ink },
  tabs: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  body: { flex: 1, paddingHorizontal: 20 },
  codeCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.code,
  },
  codeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  codeFile: { fontSize: 12, fontFamily: mono, color: '#8B93A7' },
  codeScroll: { padding: 16 },
  code: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: mono,
    color: colors.codeText,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  events: { gap: 8 },
  event: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  eventHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventName: { fontSize: 13, fontFamily: mono, color: colors.ink },
  eventAt: { fontSize: 11, fontFamily: mono, color: colors.faint },
  eventDetail: { fontSize: 12, fontFamily: mono, color: colors.muted },
  clear: { alignItems: 'center', paddingTop: 8 },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingTop: 32,
  },
});
