import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Cancelled, isMock, nfcStatus, scanCard } from './src/nfc';
import { addScan, cardId, clearHistory, load, removeScan, rename, type Scan } from './src/store';
import { prettyHex } from './src/decode';
import { Btn, ResultView } from './src/ResultView';
import { C, mono } from './src/theme';

type Saved = Awaited<ReturnType<typeof load>>;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [data, setData] = useState<Saved>({ scans: [], names: {} });
  const [tab, setTab] = useState<'scan' | 'history'>('scan');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'ok' | 'unsupported' | 'off' | '...'>('...');
  const [query, setQuery] = useState('');

  useEffect(() => {
    load().then(setData);
    nfcStatus().then(setStatus);
  }, []);

  const seen = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of data.scans) m[cardId(s)] = (m[cardId(s)] ?? 0) + 1;
    return m;
  }, [data.scans]);

  const scan = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const r = await scanCard();
      const next = await addScan(r);
      setData(next);
      setLastKey(next.scans[0].key);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      if (!(e instanceof Cancelled)) {
        setError(e instanceof Error ? e.message : String(e));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  const last = data.scans.find((s) => s.key === lastKey);
  const open = data.scans.find((s) => s.key === openKey);
  const doRename = async (s: Scan, n: string) => setData(await rename(s, n));
  const doDelete = (s: Scan) => {
    const go = async () => {
      setData(await removeScan(s.key));
      setOpenKey(null);
      if (lastKey === s.key) setLastKey(null);
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('Delete this scan?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };
  const doClear = () => {
    const go = async () => setData(await clearHistory());
    if (Platform.OS === 'web') return void go();
    Alert.alert('Clear all history?', 'Card nicknames are kept.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: go }]);
  };

  const q = query.trim().toLowerCase();
  const list = data.scans.filter((s) =>
    !q || [data.names[cardId(s)], s.uid, prettyHex(s.uid), s.family, s.guess].some((v) => v?.toLowerCase().includes(q)));

  return (
    <SafeAreaView style={st.root} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Text style={st.title}>{open ? 'Card' : tab === 'scan' ? 'Card Reader' : 'History'}</Text>
        {open ? (
          <Pressable onPress={() => setOpenKey(null)} hitSlop={12}><Text style={st.link}>Done</Text></Pressable>
        ) : tab === 'history' && data.scans.length > 0 ? (
          <Pressable onPress={doClear} hitSlop={12}><Text style={[st.link, { color: C.danger }]}>Clear</Text></Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        {open ? (
          <ResultView scan={open} name={data.names[cardId(open)]} seen={seen[cardId(open)] ?? 1}
            onRename={(n) => doRename(open, n)} onDelete={() => doDelete(open)} />
        ) : tab === 'scan' ? (
          <View style={{ gap: 18 }}>
            <ScanButton busy={busy} onPress={scan} disabled={status === 'unsupported'} />
            {isMock && <Text style={st.note}>Web preview: sample cards, not a real reader.</Text>}
            {status === 'unsupported' && <Text style={st.err}>This device has no NFC reader (needs iPhone 7 or newer).</Text>}
            {status === 'off' && <Text style={st.err}>NFC is turned off in settings.</Text>}
            {!!error && <Text style={st.err}>{error}</Text>}
            {last ? (
              <ResultView scan={last} name={data.names[cardId(last)]} seen={seen[cardId(last)] ?? 1}
                onRename={(n) => doRename(last, n)} />
            ) : (
              <View style={st.tips}>
                <Text style={st.tipsH}>How to scan</Text>
                <Text style={st.tip}>1. Tap the button.</Text>
                <Text style={st.tip}>2. Hold the TOP edge of the iPhone flat on the card, still, for a second.</Text>
                <Text style={st.tip}>Works with NFC stickers, student and work IDs, transit cards, library tags and bank cards (only the app name, never the number).</Text>
                <Text style={st.tip}>Most hotel keys use MIFARE Classic, which iPhones cannot see at all.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search name, UID, type" placeholderTextColor={C.faint}
              style={st.search} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" />
            {list.length === 0 && <Text style={st.note}>{data.scans.length ? 'No matches.' : 'No scans yet.'}</Text>}
            {list.map((s) => {
              const nm = data.names[cardId(s)];
              return (
                <Pressable key={s.key} onPress={() => setOpenKey(s.key)} style={({ pressed }) => [st.item, pressed && { opacity: 0.7 }]}>
                  <View style={st.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.itemName} numberOfLines={1}>{nm || s.family}</Text>
                    <Text style={st.itemUid} numberOfLines={1}>{s.uid ? prettyHex(s.uid) : 'no UID'}</Text>
                    <Text style={st.itemMeta} numberOfLines={1}>
                      {nm ? s.family : s.guess} · {when(s.at)}{(seen[cardId(s)] ?? 1) > 1 ? ` · seen ${seen[cardId(s)]}×` : ''}
                    </Text>
                  </View>
                  <Text style={st.chev}>›</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {!open && (
        <SafeAreaView edges={['bottom']} style={st.tabs}>
          <Tab label="Scan" on={tab === 'scan'} onPress={() => setTab('scan')} />
          <Tab label={`History${data.scans.length ? ` (${data.scans.length})` : ''}`} on={tab === 'history'} onPress={() => setTab('history')} />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const when = (t: number) => {
  const d = new Date(t);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

function Tab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      <Text style={[st.tabText, on && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

function ScanButton({ busy, onPress, disabled }: { busy: boolean; onPress: () => void; disabled?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!busy) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [busy]);
  return (
    <View style={st.scanWrap}>
      <Animated.View pointerEvents="none" style={[st.ring, {
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
      }]} />
      <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityLabel="Scan a card"
        style={({ pressed }) => [st.scanBtn, pressed && { transform: [{ scale: 0.97 }] }, (disabled) && { opacity: 0.4 }]}>
        <Text style={st.waves}>)))</Text>
        <Text style={st.scanText}>{busy ? 'Hold card near top…' : 'Scan a card'}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { color: C.text, fontSize: 30, fontWeight: '800' },
  link: { color: C.accent, fontSize: 17, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  scanWrap: { alignItems: 'center', justifyContent: 'center', height: 230 },
  ring: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 3, borderColor: C.accent },
  scanBtn: { width: 190, height: 190, borderRadius: 95, backgroundColor: C.card, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center', gap: 6 },
  waves: { color: C.accent, fontSize: 34, fontWeight: '300', transform: [{ rotate: '-90deg' }], letterSpacing: -4 },
  scanText: { color: C.text, fontSize: 16, fontWeight: '600' },
  note: { color: C.faint, textAlign: 'center', fontSize: 13 },
  err: { color: C.danger, textAlign: 'center', fontSize: 14, paddingHorizontal: 10 },
  tips: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8, borderWidth: 1, borderColor: C.line },
  tipsH: { color: C.text, fontSize: 16, fontWeight: '700' },
  tip: { color: C.dim, fontSize: 14, lineHeight: 20 },
  search: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, borderWidth: 1, borderColor: C.line },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line },
  dot: { width: 34, height: 24, borderRadius: 5, backgroundColor: C.gold, opacity: 0.85 },
  itemName: { color: C.text, fontSize: 16, fontWeight: '600' },
  itemUid: { color: C.dim, fontFamily: mono, fontSize: 13, marginTop: 2 },
  itemMeta: { color: C.faint, fontSize: 12, marginTop: 2 },
  chev: { color: C.faint, fontSize: 26 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: '#0E1118' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: C.dim, fontSize: 15, fontWeight: '600' },
});
