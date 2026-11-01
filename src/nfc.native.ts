// Real NFC reading (iPhone Core NFC via react-native-nfc-manager; Android works too).
// Everything here is READ-ONLY: it only sends commands that ask a card about
// itself (READ, GET_VERSION, SELECT, GET SYSTEM INFO). Nothing is ever written.
import { Platform } from 'react-native';
import NfcManager, { NfcError, NfcTech, Nfc15693RequestFlagIOS } from 'react-native-nfc-manager';
import { summarize, toBytes, type Probe, type RawTag, type ScanResult } from './decode';

export const isMock = false;

let started: Promise<void> | null = null;
const start = () => (started ??= NfcManager.start());

export async function nfcStatus(): Promise<'ok' | 'unsupported' | 'off'> {
  try {
    if (!(await NfcManager.isSupported())) return 'unsupported';
    await start();
    if (Platform.OS === 'android' && !(await NfcManager.isEnabled())) return 'off';
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export class Cancelled extends Error {}

const PPSE = '325041592E5359532E4444463031';
const selectApdu = (aidHex: string) => {
  const aid = toBytes(aidHex);
  return [0x00, 0xa4, 0x04, 0x00, aid.length, ...aid, 0x00];
};
const errText = (e: unknown) => (e instanceof Error ? e.message || e.constructor.name : String(e));

async function probeIOS(tag: RawTag): Promise<Probe> {
  const probe: Probe = { errors: [] };
  const step = async <T,>(what: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e) {
      probe.errors!.push(`${what}: ${errText(e)}`);
      return undefined;
    }
  };

  if (tag.tech === 'mifare') {
    // READ page 0 first: on an original Ultralight a failed GET_VERSION halts the tag.
    const pages = await step('READ pages 0-3', () => NfcManager.sendMifareCommandIOS([0x30, 0x00]));
    if (pages && pages.length >= 16) probe.type2Header = pages;
    const v = await step('GET_VERSION', () => NfcManager.sendMifareCommandIOS([0x60]));
    if (v && v.length >= 8) probe.getVersion = v;
  }

  if (tag.tech === 'IsoDep') {
    const aid = (tag.initialSelectedAID ?? '').toUpperCase();
    // Payment cards: list the apps (name + AID). Never asks for the card number.
    if (aid === PPSE || aid.startsWith('A0000000')) {
      const r = await step('SELECT PPSE', () => NfcManager.sendCommandAPDUIOS(selectApdu(PPSE)));
      if (r && r.sw1 === 0x90) probe.ppse = r.response;
    }
    if (aid.startsWith('D27600008501')) {
      const v = await step('DESFire GetVersion', () => NfcManager.sendCommandAPDUIOS([0x90, 0x60, 0x00, 0x00, 0x00]));
      if (v && v.sw1 === 0x91) probe.getVersion = [0xaf, ...v.response.slice(0, 7)];
    }
  }

  if (tag.tech === 'iso15693') {
    const info = await step('GET SYSTEM INFO', () =>
      NfcManager.iso15693HandlerIOS.getSystemInfo(Nfc15693RequestFlagIOS.HighDataRate));
    if (info) probe.iso15693Info = info;
  }

  if (!probe.errors!.length) delete probe.errors;
  return probe;
}

async function probeAndroid(tag: RawTag): Promise<Probe> {
  const probe: Probe = {};
  const techs = tag.techTypes ?? [];
  try {
    if (techs.some((t) => t.endsWith('MifareUltralight'))) {
      probe.type2Header = await NfcManager.nfcAHandler.transceive([0x30, 0x00]);
      probe.getVersion = await NfcManager.nfcAHandler.transceive([0x60]);
    }
  } catch {}
  return probe;
}

export async function scanCard(): Promise<ScanResult> {
  await start();
  try {
    if (Platform.OS === 'ios') {
      await NfcManager.requestTechnology(
        [NfcTech.MifareIOS, NfcTech.IsoDep, NfcTech.Iso15693IOS, NfcTech.FelicaIOS],
        { alertMessage: 'Hold the top of your iPhone against the card' },
      );
    } else {
      await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.NfcB, NfcTech.NfcF, NfcTech.NfcV, NfcTech.IsoDep, NfcTech.Ndef]);
    }
    const tag = ((await NfcManager.getTag()) ?? {}) as RawTag;
    const probe = Platform.OS === 'ios' ? await probeIOS(tag) : await probeAndroid(tag);
    const result = summarize(tag, probe);
    if (Platform.OS === 'ios') await NfcManager.setAlertMessageIOS(`Read: ${result.family}`).catch(() => {});
    return result;
  } catch (e) {
    if (e instanceof NfcError.UserCancel) throw new Cancelled('cancelled');
    if (e instanceof NfcError.Timeout) throw new Error('No card found before the reader timed out. Try again and hold it still.');
    throw new Error(errText(e) || 'Could not read the card');
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}
