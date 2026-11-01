// One scanned card: name, identity, chip facts, NDEF data and the raw JSON.
import { useEffect, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import type { Scan } from './store';
import { prettyHex } from './decode';
import { C, mono } from './theme';

type Props = {
  scan: Scan;
  name?: string;
  seen: number;
  onRename: (name: string) => void;
  onDelete?: () => void;
};

export function ResultView({ scan, name, seen, onRename, onDelete }: Props) {
  const [draft, setDraft] = useState(name ?? '');
  const [copied, setCopied] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  useEffect(() => setDraft(name ?? ''), [name, scan.key]);

  const copy = async (label: string, v: string) => {
    await Clipboard.setStringAsync(v);
    Haptics.selectionAsync().catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(''), 1400);
  };

  const share = () =>
    Share.share({
      message: [
        name ? `${name}` : scan.family,
        `UID ${scan.uid ? prettyHex(scan.uid) : '(none)'}`,
        ...scan.sections.flatMap((s) => s.fields.map((f) => `${f.label}: ${f.value}`)),
        ...scan.ndef.map((n) => `${n.kind}: ${n.value}`),
      ].join('\n'),
    }).catch(() => {});

  return (
    <View style={{ gap: 14 }}>
      <View style={st.hero}>
        <View style={st.chipArt}><View style={st.chipLines} /></View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={() => draft !== (name ?? '') && onRename(draft)}
          onSubmitEditing={() => onRename(draft)}
          placeholder="Name this card"
          placeholderTextColor={C.faint}
          style={st.name}
          returnKeyType="done"
          accessibilityLabel="Card nickname"
        />
        <Text style={st.family}>{scan.family}</Text>
        <Text style={st.guess}>{scan.guess}</Text>
        <Pressable onPress={() => scan.uid && copy('uid', scan.uid)} style={st.uidBox} accessibilityRole="button" accessibilityLabel="Copy UID">
          <Text style={st.uidLabel}>{copied === 'uid' ? 'COPIED' : 'UID · TAP TO COPY'}</Text>
          <Text style={st.uid} selectable>{scan.uid ? prettyHex(scan.uid) : 'hidden'}</Text>
        </Pressable>
        <Text style={st.meta}>
          {new Date(scan.at).toLocaleString()} · seen {seen} {seen === 1 ? 'time' : 'times'}
        </Text>
      </View>

      {scan.ndef.length > 0 && (
        <View style={st.card}>
          <Text style={st.h}>Data on the card</Text>
          {scan.ndef.map((n, i) => {
            const isLink = /^[a-z][a-z0-9+.-]*:/i.test(n.value) && n.kind === 'Link';
            return (
              <Pressable key={i} style={st.row} onPress={() => (isLink ? Linking.openURL(n.value).catch(() => {}) : copy(`n${i}`, n.value))}>
                <Text style={st.label}>{copied === `n${i}` ? 'Copied' : n.kind}</Text>
                <Text style={[st.value, isLink && { color: C.accent }]} selectable>{n.value || '—'}</Text>
                {!!n.detail && <Text style={st.hint}>{n.detail}</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      {scan.sections.map((s) => (
        <View key={s.title} style={st.card}>
          <Text style={st.h}>{s.title}</Text>
          {s.fields.map((f, i) => (
            <Pressable key={i} style={st.row} onLongPress={() => copy(`${s.title}${i}`, f.value)}>
              <Text style={st.label}>{copied === `${s.title}${i}` ? 'Copied' : f.label}</Text>
              <Text style={[st.value, f.mono && st.monoValue]} selectable>{f.value}</Text>
              {!!f.hint && <Text style={st.hint}>{f.hint}</Text>}
            </Pressable>
          ))}
        </View>
      ))}

      <View style={st.actions}>
        <Btn label="Share" onPress={share} />
        <Btn label={showRaw ? 'Hide raw' : 'Raw data'} onPress={() => setShowRaw(!showRaw)} />
        {onDelete && <Btn label="Delete" danger onPress={onDelete} />}
      </View>
      {showRaw && (
        <View style={st.card}>
          <Text style={[st.value, st.monoValue, { fontSize: 11 }]} selectable>{JSON.stringify(scan.raw, null, 1)}</Text>
        </View>
      )}
      <Text style={st.foot}>Long-press any value to copy it.</Text>
    </View>
  );
}

export function Btn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.btn, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Text style={[st.btnText, danger && { color: C.danger }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  chipArt: { position: 'absolute', right: 20, top: 20, width: 42, height: 32, borderRadius: 7, backgroundColor: C.gold, opacity: 0.9, justifyContent: 'center' },
  chipLines: { height: 1, backgroundColor: '#00000055', marginHorizontal: 6 },
  name: { color: C.text, fontSize: 24, fontWeight: '700', paddingVertical: 2, marginRight: 60 },
  family: { color: C.accent, fontSize: 15, fontWeight: '600', marginTop: 4 },
  guess: { color: C.dim, fontSize: 14, marginTop: 2 },
  uidBox: { marginTop: 16, backgroundColor: C.bg, borderRadius: 14, padding: 14 },
  uidLabel: { color: C.faint, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  uid: { color: C.text, fontFamily: mono, fontSize: 20, marginTop: 4, letterSpacing: 0.5 },
  meta: { color: C.faint, fontSize: 12, marginTop: 12 },
  card: { backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: C.line },
  h: { color: C.dim, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 2 },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  label: { color: C.dim, fontSize: 13 },
  value: { color: C.text, fontSize: 16, marginTop: 2 },
  monoValue: { fontFamily: mono, fontSize: 15 },
  hint: { color: C.faint, fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  btnText: { color: C.text, fontSize: 15, fontWeight: '600' },
  foot: { color: C.faint, fontSize: 12, textAlign: 'center', marginBottom: 8 },
});
