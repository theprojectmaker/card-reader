// Scan history + per-card nicknames, kept on the phone only (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanResult } from './decode';

export type Scan = ScanResult & { key: string; at: number };
type Saved = { scans: Scan[]; names: Record<string, string> };

const KEY = 'cardreader.v1';
const MAX = 300;
let cache: Saved | null = null;

export async function load(): Promise<Saved> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : { scans: [], names: {} };
  } catch {
    cache = { scans: [], names: {} };
  }
  return cache!;
}

const save = async (s: Saved) => {
  cache = s;
  await AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  return s;
};

export async function addScan(r: ScanResult): Promise<Saved> {
  const s = await load();
  const scan: Scan = { ...r, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() };
  return save({ ...s, scans: [scan, ...s.scans].slice(0, MAX) });
}

// Nicknames belong to the card (its UID), so every scan of that card shows it.
export const cardId = (r: ScanResult) => r.uid || `${r.family}`;

export async function rename(r: ScanResult, name: string): Promise<Saved> {
  const s = await load();
  const names = { ...s.names };
  if (name.trim()) names[cardId(r)] = name.trim();
  else delete names[cardId(r)];
  return save({ ...s, names });
}

export async function removeScan(key: string): Promise<Saved> {
  const s = await load();
  return save({ ...s, scans: s.scans.filter((x) => x.key !== key) });
}

export async function clearHistory(): Promise<Saved> {
  const s = await load();
  return save({ ...s, scans: [] });
}
