// Pure helpers that turn raw NFC data into readable facts. No React Native
// imports here, so scripts/test-decode.ts can run it under plain Node.

export type Field = { label: string; value: string; mono?: boolean; hint?: string };
export type Section = { title: string; fields: Field[] };
export type NdefOut = { kind: string; value: string; detail?: string };

export type ScanResult = {
  uid: string;          // hex, uppercase, no separators ('' when the card hides it)
  family: string;       // short label: "NTAG215", "FeliCa", "ISO 7816 (smart card)" ...
  guess: string;        // human guess: "NFC sticker / tag", "Transit card" ...
  techs: string[];
  sections: Section[];
  ndef: NdefOut[];
  raw: unknown;         // whatever the reader returned, kept for the JSON view
};

// ---------- bytes ----------

export const toBytes = (hex: string): number[] => {
  const h = hex.replace(/[^0-9a-f]/gi, '');
  const out: number[] = [];
  for (let i = 0; i + 1 < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
  return out;
};

export const hex = (b: number[] | undefined, sep = ''): string =>
  (b ?? []).map((x) => (x & 0xff).toString(16).padStart(2, '0').toUpperCase()).join(sep);

export const prettyHex = (h: string) => (h.match(/.{1,2}/g) ?? []).join(':');

export const toDecimal = (b: number[]): string => {
  if (!b.length) return '';
  let n = BigInt(0);
  const k = BigInt(256);
  for (const x of b) n = n * k + BigInt(x & 0xff);
  return n.toString();
};

const ascii = (b: number[]) => String.fromCharCode(...b.filter((x) => x >= 0x20 && x < 0x7f));

const utf8 = (b: number[]): string => {
  try {
    // TextDecoder exists in Hermes and browsers; the fallback covers old runtimes.
    return new TextDecoder('utf-8').decode(new Uint8Array(b));
  } catch {
    return decodeURIComponent(b.map((x) => '%' + x.toString(16).padStart(2, '0')).join(''));
  }
};

// ---------- manufacturers (ISO/IEC 7816-6 IC manufacturer codes) ----------

const MANUFACTURERS: Record<number, string> = {
  0x01: 'Motorola', 0x02: 'STMicroelectronics', 0x03: 'Hitachi', 0x04: 'NXP Semiconductors',
  0x05: 'Infineon', 0x06: 'Cylink', 0x07: 'Texas Instruments', 0x08: 'Fujitsu',
  0x09: 'Matsushita', 0x0a: 'NEC', 0x0b: 'Oki', 0x0c: 'Toshiba', 0x0d: 'Mitsubishi',
  0x0e: 'Samsung', 0x0f: 'Hynix', 0x10: 'LG Semiconductors', 0x11: 'Emosyn-EM',
  0x12: 'INSIDE Technology', 0x13: 'ORGA Kartensysteme', 0x14: 'Sharp', 0x15: 'ATMEL',
  0x16: 'EM Microelectronic', 0x17: 'SMARTRAC', 0x18: 'ZMD', 0x19: 'XICOR',
  0x1a: 'Sony', 0x1b: 'Malaysia Microelectronic', 0x1c: 'Emosyn', 0x1d: 'Shanghai Fudan',
  0x1e: 'Magellan', 0x1f: 'Melexis', 0x20: 'Renesas', 0x21: 'TAGSYS', 0x22: 'Transcore',
  0x23: 'Shanghai Belling', 0x24: 'Masktech', 0x25: 'Innovision', 0x26: 'Hitachi ULSI',
  0x27: 'Yubico', 0x28: 'Ricoh', 0x29: 'ASK', 0x2a: 'Unicore', 0x2b: 'Maxim',
  0x2c: 'Impinj', 0x2d: 'RightPlug Alliance', 0x2e: 'Broadcom', 0x2f: 'MStar',
  0x30: 'BeeDar', 0x31: 'RFIDsec', 0x32: 'Schweizer Electronic', 0x33: 'AMIC',
  0x34: 'Mikron', 0x35: 'Fraunhofer IPMS', 0x36: 'IDS Microchip', 0x37: 'Kovio',
  0x38: 'HMT Microelectronic', 0x39: 'Silicon Craft', 0x3a: 'Advanced Film Device',
  0x3b: 'Nitecrest', 0x3c: 'Verayo', 0x3d: 'HID Global', 0x3e: 'Productivity Engineering',
  0x3f: 'Austriamicrosystems', 0x40: 'Gemalto', 0x41: 'Renesas', 0x42: '3Alogics',
  0x43: 'Top TroniQ', 0x44: 'Gentag', 0x45: 'Invengo', 0x46: 'Guangzhou Sysur',
  0x47: 'CEITEC', 0x48: 'Shanghai Quanray', 0x49: 'MediaTek', 0x4a: 'Angstrem',
  0x4b: 'Celisic', 0x4c: 'LEGIC', 0x4d: 'Balluff', 0x4e: 'Oberthur', 0x4f: 'Silterra',
  0x50: 'DELTA Danish Electronics', 0x51: 'Giesecke & Devrient', 0x52: 'Shenzhen China Vision',
  0x53: 'Shanghai Feiju', 0x54: 'Intel', 0x55: 'Microsensys', 0x56: 'Sonix',
  0x57: 'Qualcomm', 0x58: 'Realtek', 0x59: 'Freevision', 0x5a: 'Giantec',
  0x5b: 'JSC Angstrem-T', 0x5c: 'STARCHIP', 0x5d: 'SPIRTECH', 0x5e: 'GANTNER',
  0x5f: 'Nordic Semiconductor', 0x60: 'Verisiti', 0x61: 'Wearlinks', 0x62: 'Userstar',
  0x63: 'Pragmatic Printing', 0x64: 'LSI-TEC', 0x65: 'Tendyron', 0x66: 'MUTO Smart',
  0x67: 'ON Semiconductor', 0x68: 'TUBITAK BILGEM', 0x69: 'Huada Semiconductor',
  0x6a: 'SEVENEY', 0x6b: 'ISSM', 0x6c: 'Wisesec',
};

export const manufacturer = (code: number | undefined) =>
  code === undefined ? undefined : MANUFACTURERS[code] ?? `Unknown (0x${hex([code])})`;

// ---------- ISO 7816 application IDs ----------

export const KNOWN_AIDS: Record<string, string> = {
  '325041592E5359532E4444463031': 'Contactless payment directory (PPSE)',
  'A0000000031010': 'Visa credit/debit',
  'A0000000032010': 'Visa Electron',
  'A0000000033010': 'Visa Interlink',
  'A0000000038010': 'Visa Plus',
  'A0000000041010': 'Mastercard credit/debit',
  'A0000000043060': 'Maestro',
  'A00000002501': 'American Express',
  'A0000001523010': 'Discover',
  'A0000000651010': 'JCB',
  'A000000333010101': 'UnionPay debit',
  'A000000333010102': 'UnionPay credit',
  'A0000002771010': 'Interac',
  'D2760000850100': 'MIFARE DESFire (native)',
  'D2760000850101': 'NFC Forum Type 4 tag (NDEF)',
  'A0000002471001': 'ePassport / travel document (ICAO)',
  'A000000308': 'PIV smart card (US government ID)',
  'A00000030800001000': 'PIV smart card (US government ID)',
  'A0000005272101': 'YubiKey OATH',
  'A000000527200101': 'YubiKey OTP',
  'A0000006472F0001': 'FIDO security key (U2F/FIDO2)',
  'A00000039656434103F12100': 'HID / Seos access credential',
  'A000000396564341': 'HID / Seos access credential',
  'F0010203040506': 'Generic test applet',
};

export const aidName = (aid: string | undefined) => {
  if (!aid) return undefined;
  const u = aid.toUpperCase();
  if (KNOWN_AIDS[u]) return KNOWN_AIDS[u];
  const prefix = Object.keys(KNOWN_AIDS).find((k) => u.startsWith(k));
  return prefix ? KNOWN_AIDS[prefix] : undefined;
};

// Minimal BER-TLV walk: returns every [tag, value] pair, descending into constructed tags.
export const tlv = (b: number[]): [string, number[]][] => {
  const out: [string, number[]][] = [];
  let i = 0;
  while (i < b.length) {
    if (b[i] === 0x00 || b[i] === 0xff) { i++; continue; }
    const t0 = i;
    const constructed = (b[i] & 0x20) !== 0;
    if ((b[i++] & 0x1f) === 0x1f) while (i < b.length && b[i++] & 0x80);
    const tag = hex(b.slice(t0, i));
    if (i >= b.length) break;
    let len = b[i++];
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let k = 0; k < n; k++) len = (len << 8) | b[i++];
    }
    const val = b.slice(i, i + len);
    i += len;
    out.push([tag, val]);
    if (constructed) out.push(...tlv(val));
  }
  return out;
};

// From a SELECT PPSE response: the card's payment apps (AID + label only; never the card number).
export const parsePpse = (resp: number[]) => {
  const apps: { aid: string; label?: string; name?: string }[] = [];
  for (const [tag, val] of tlv(resp)) {
    if (tag === '4F') apps.push({ aid: hex(val), name: aidName(hex(val)) });
    else if (tag === '50' && apps.length) apps[apps.length - 1].label = ascii(val);
  }
  return apps;
};

// ---------- MIFARE / NTAG ----------

// GET_VERSION (0x60) response from Ultralight EV1, NTAG and DESFire (first frame).
export const parseGetVersion = (v: number[]) => {
  if (v.length < 8) return undefined;
  // Byte 0 is a header (0x00) or, on DESFire, the status 0xAF ("more frames").
  const r = v.slice(0, 8);
  const [, vendor, type, subtype, major, minor, size, protocol] = r;
  const bytes = 1 << (size >> 1);
  const sizeText = size & 1 ? `between ${bytes} and ${bytes * 2} bytes` : `${bytes} bytes`;
  let product = 'Unknown NXP product';
  let userBytes: number | undefined;
  if (type === 0x04) {
    const ntag: Record<number, [string, number]> = {
      0x0b: ['NTAG210', 48], 0x0e: ['NTAG212', 128], 0x0f: ['NTAG213', 144],
      0x11: ['NTAG215', 504], 0x13: ['NTAG216', 888],
    };
    const hit = ntag[size];
    product = major === 0x30 ? 'NTAG 424 DNA' : hit ? hit[0] : 'NTAG (unknown size)';
    if (subtype === 0x08 && hit) product += ' (TagTamper)';
    userBytes = major === 0x30 ? undefined : hit?.[1];
  } else if (type === 0x03) {
    product = size === 0x0b ? 'MIFARE Ultralight EV1 (MF0UL11)' : size === 0x0e ? 'MIFARE Ultralight EV1 (MF0UL21)' : 'MIFARE Ultralight family';
    userBytes = size === 0x0b ? 48 : size === 0x0e ? 128 : undefined;
  } else if (type === 0x01) {
    const gen = major === 0x00 ? 'EV0' : major === 0x01 ? 'EV1' : major === 0x12 ? 'EV2' : major === 0x33 ? 'EV3' : major === 0x30 ? 'Light' : `v${major}`;
    product = `MIFARE DESFire ${gen}`;
  } else if (type === 0x02) {
    product = 'MIFARE Plus';
  } else if (type === 0x81) {
    product = 'MIFARE DESFire Light';
  }
  return {
    product,
    vendor: manufacturer(vendor),
    version: `${major}.${minor}`,
    storage: sizeText,
    userBytes,
    protocol: protocol === 0x03 ? 'ISO 14443-3' : protocol === 0x05 ? 'ISO 14443-4' : `0x${hex([protocol])}`,
    raw: hex(r, ' '),
  };
};

// Pages 0-3 of a Type 2 tag (READ 0x30 page 0 returns 16 bytes). Page 3 is the capability container.
export const parseType2Header = (p: number[]) => {
  if (p.length < 16) return undefined;
  const cc = p.slice(12, 16);
  const isNdef = cc[0] === 0xe1;
  return {
    capabilityContainer: hex(cc, ' '),
    ndefFormatted: isNdef,
    ndefBytes: isNdef ? cc[2] * 8 : undefined,
    access: isNdef ? ((cc[3] & 0x0f) === 0 ? 'Writable' : 'Read-only') : undefined,
    lockBytes: hex(p.slice(10, 12), ' '),
  };
};

// ---------- NDEF ----------

const URI_PREFIX = [
  '', 'http://www.', 'https://www.', 'http://', 'https://', 'tel:', 'mailto:',
  'ftp://anonymous:anonymous@', 'ftp://ftp.', 'ftps://', 'sftp://', 'smb://', 'nfs://',
  'ftp://', 'dav://', 'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:', 'sip:',
  'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://', 'tcpobex://', 'irdaobex://',
  'file://', 'urn:epc:id:', 'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:',
  'urn:nfc:',
];

export type RawNdef = { tnf: number; type: number[] | string; payload: number[]; id?: number[] | string };

const typeBytes = (t: number[] | string) =>
  typeof t === 'string' ? (/^[0-9a-f]+$/i.test(t) && t.length % 2 === 0 && !/^[A-Za-z]{1,2}$/.test(t) ? toBytes(t) : [...t].map((c) => c.charCodeAt(0))) : t;

export const decodeNdef = (records: RawNdef[] | undefined): NdefOut[] =>
  (records ?? []).map((r) => {
    const type = typeBytes(r.type);
    const typeStr = ascii(type);
    const p = r.payload ?? [];
    if (r.tnf === 1 && typeStr === 'U') {
      return { kind: 'Link', value: (URI_PREFIX[p[0]] ?? '') + utf8(p.slice(1)) };
    }
    if (r.tnf === 1 && typeStr === 'T') {
      const langLen = p[0] & 0x3f;
      return { kind: 'Text', value: utf8(p.slice(1 + langLen)), detail: `language: ${ascii(p.slice(1, 1 + langLen)) || '?'}` };
    }
    if (r.tnf === 1 && typeStr === 'Sp') return { kind: 'Smart poster', value: `${p.length} bytes`, detail: hex(p.slice(0, 32), ' ') };
    if (r.tnf === 3) return { kind: 'Link', value: utf8(type) };
    if (r.tnf === 2) {
      if (typeStr === 'text/vcard' || typeStr === 'text/x-vcard') return { kind: 'Contact (vCard)', value: utf8(p) };
      if (typeStr.startsWith('text/') || typeStr.includes('json')) return { kind: typeStr, value: utf8(p) };
      if (typeStr === 'application/vnd.wfa.wsc') return { kind: 'Wi-Fi setup', value: `${p.length} bytes`, detail: wifiSsid(p) };
      return { kind: typeStr || 'MIME data', value: `${p.length} bytes`, detail: hex(p.slice(0, 32), ' ') };
    }
    if (r.tnf === 4) {
      if (typeStr === 'android.com:pkg') return { kind: 'Android app', value: utf8(p) };
      return { kind: `External: ${typeStr}`, value: utf8(p) };
    }
    if (r.tnf === 0) return { kind: 'Empty record', value: '' };
    return { kind: `Record (TNF ${r.tnf}${typeStr ? ', ' + typeStr : ''})`, value: `${p.length} bytes`, detail: hex(p.slice(0, 32), ' ') };
  });

const wifiSsid = (p: number[]) => {
  for (let i = 0; i + 4 <= p.length; ) {
    const t = (p[i] << 8) | p[i + 1];
    const len = (p[i + 2] << 8) | p[i + 3];
    if (t === 0x1045) return `network: ${utf8(p.slice(i + 4, i + 4 + len))}`;
    i += t === 0x100e ? 4 : 4 + len; // descend into the Credential attribute
  }
  return undefined;
};

// ---------- the summary ----------

// What the reader handed back, normalised across iOS (tech/id/idm...) and Android (techTypes/atqa/sak).
export type RawTag = {
  id?: string;
  tech?: string;
  techTypes?: string[];
  atqa?: number[];
  sak?: number;
  maxSize?: number;
  type?: string;
  isWritable?: boolean;
  ndefMessage?: RawNdef[];
  idm?: string;
  systemCode?: string;
  initialSelectedAID?: string;
  historicalBytes?: number[];
  applicationData?: number[];
  hiLayerResponse?: number[];
  icManufacturerCode?: number;
  icSerialNumber?: number[];
  dsfid?: number;
};

// Extra facts gathered with read-only commands after the tag connected.
export type Probe = {
  getVersion?: number[];
  type2Header?: number[];
  ppse?: number[];
  iso15693Info?: { dsfid: number; afi: number; blockSize: number; blockCount: number; icReference: number };
  errors?: string[];
};

const SAK_GUESS: Record<number, string> = {
  0x00: 'MIFARE Ultralight / NTAG', 0x08: 'MIFARE Classic 1K', 0x09: 'MIFARE Mini',
  0x18: 'MIFARE Classic 4K', 0x10: 'MIFARE Plus 2K (SL2)', 0x11: 'MIFARE Plus 4K (SL2)',
  0x20: 'ISO 14443-4 smart card (DESFire, Plus SL3, bank card...)', 0x28: 'JCOP / dual interface',
  0x38: 'MIFARE Classic 4K emulation',
};

const FELICA_SYSTEMS: Record<string, string> = {
  '0003': 'Transit IC (Suica, PASMO, ICOCA...)', '8008': 'Octopus', 'FE00': 'FeliCa common area (Edy, nanaco, WAON...)',
  '12FC': 'NFC Forum Type 3 tag (NDEF)', '88B4': 'FeliCa Lite-S', '927A': 'IruCa',
};

export function summarize(tag: RawTag, probe: Probe = {}): ScanResult {
  const uidHex = (tag.id ?? '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  const uid = toBytes(uidHex);
  const ndef = decodeNdef(tag.ndefMessage);
  const techs = new Set<string>();
  const t = tag.tech;
  for (const x of tag.techTypes ?? []) techs.add(x.replace('android.nfc.tech.', ''));
  if (t === 'mifare') techs.add('NfcA').add('MIFARE');
  if (t === 'IsoDep') techs.add('IsoDep');
  if (t === 'felica') techs.add('NfcF').add('FeliCa');
  if (t === 'iso15693') techs.add('NfcV').add('ISO 15693');
  if (ndef.length) techs.add('Ndef');

  const id: Field[] = [];
  if (uid.length) {
    id.push({ label: 'UID (hex)', value: prettyHex(uidHex), mono: true });
    id.push({ label: 'UID (decimal)', value: toDecimal(uid), mono: true });
    if (uid.length > 1) id.push({ label: 'UID (reversed decimal)', value: toDecimal([...uid].reverse()), mono: true, hint: 'What many door / ID readers print' });
    id.push({ label: 'UID length', value: `${uid.length} bytes${uid.length === 4 && uid[0] === 0x08 ? ' (random, changes every tap)' : ''}` });
  } else {
    id.push({ label: 'UID', value: 'Not given by this card' });
  }

  const chip: Field[] = [];
  const sections: Section[] = [{ title: 'Identity', fields: id }, { title: 'Chip', fields: chip }];
  let family = 'NFC tag';
  let guess = 'Unknown card';

  if (uid.length === 7 || uid.length === 10) chip.push({ label: 'Maker (from UID)', value: manufacturer(uid[0])! });
  if (tag.atqa?.length) chip.push({ label: 'ATQA', value: hex(tag.atqa, ' '), mono: true });
  if (tag.sak !== undefined) {
    chip.push({ label: 'SAK', value: `0x${hex([tag.sak])}`, mono: true, hint: SAK_GUESS[tag.sak] });
    if (SAK_GUESS[tag.sak]) family = SAK_GUESS[tag.sak];
  } else if (t) {
    chip.push({ label: 'ATQA / SAK', value: 'Hidden by iOS', hint: 'Apple does not expose these; Android does' });
  }

  const gv = probe.getVersion ? parseGetVersion(probe.getVersion) : undefined;
  if (gv) {
    family = gv.product;
    chip.push({ label: 'Product', value: gv.product });
    chip.push({ label: 'Vendor', value: gv.vendor ?? '?' });
    chip.push({ label: 'Storage', value: gv.userBytes ? `${gv.userBytes} bytes user memory` : gv.storage });
    chip.push({ label: 'Protocol', value: gv.protocol });
    chip.push({ label: 'GET_VERSION', value: gv.raw, mono: true });
  }
  const t2 = probe.type2Header ? parseType2Header(probe.type2Header) : undefined;
  if (t2) {
    chip.push({ label: 'Capability container', value: t2.capabilityContainer, mono: true });
    chip.push({ label: 'NDEF formatted', value: t2.ndefFormatted ? `Yes, ${t2.ndefBytes} bytes, ${t2.access}` : 'No' });
  }

  if (t === 'mifare' && !gv) {
    family = t2 ? 'MIFARE Ultralight (original) / NTAG' : 'MIFARE (DESFire, Plus or Ultralight)';
  }

  if (t === 'felica' || tag.idm) {
    family = 'FeliCa';
    const sc = (tag.systemCode ?? '').toUpperCase();
    chip.push({ label: 'IDm', value: prettyHex((tag.idm ?? '').toUpperCase()), mono: true });
    if (sc) chip.push({ label: 'System code', value: sc, mono: true, hint: FELICA_SYSTEMS[sc] });
    const idm = toBytes(tag.idm ?? '');
    if (idm.length >= 2) chip.push({ label: 'Manufacturer code', value: hex(idm.slice(0, 2), ' '), mono: true });
    guess = FELICA_SYSTEMS[sc]?.startsWith('Transit') || sc === '8008' ? 'Transit card' : 'FeliCa card (Japan / Hong Kong style)';
  }

  if (t === 'iso15693' || tag.icSerialNumber || techs.has('NfcV')) {
    family = 'ISO 15693 (vicinity) tag';
    const m = tag.icManufacturerCode ?? (uid.length === 8 && uid[0] === 0xe0 ? uid[1] : undefined);
    if (m !== undefined) chip.push({ label: 'Maker', value: manufacturer(m)! });
    if (tag.icSerialNumber) chip.push({ label: 'IC serial', value: hex(tag.icSerialNumber, ' '), mono: true });
    const info = probe.iso15693Info;
    if (info) {
      chip.push({ label: 'Memory', value: `${info.blockCount} blocks x ${info.blockSize} bytes = ${info.blockCount * info.blockSize} bytes` });
      chip.push({ label: 'DSFID / AFI', value: `0x${hex([info.dsfid])} / 0x${hex([info.afi])}`, mono: true });
      chip.push({ label: 'IC reference', value: `0x${hex([info.icReference])}`, mono: true });
    }
    guess = 'Library / ski pass / industrial tag';
  }

  const apps = probe.ppse ? parsePpse(probe.ppse) : [];
  if (t === 'IsoDep' || tag.historicalBytes || tag.hiLayerResponse || tag.initialSelectedAID) {
    const smart: Field[] = [];
    if (tag.initialSelectedAID) {
      smart.push({ label: 'Answered to AID', value: tag.initialSelectedAID.toUpperCase(), mono: true, hint: aidName(tag.initialSelectedAID) });
    }
    if (tag.historicalBytes?.length) smart.push({ label: 'Historical bytes', value: hex(tag.historicalBytes, ' '), mono: true, hint: ascii(tag.historicalBytes).length > 3 ? `"${ascii(tag.historicalBytes)}"` : undefined });
    if (tag.hiLayerResponse?.length) smart.push({ label: 'Hi-layer response', value: hex(tag.hiLayerResponse, ' '), mono: true });
    if (tag.applicationData?.length) smart.push({ label: 'Application data', value: hex(tag.applicationData, ' '), mono: true });
    for (const a of apps) smart.push({ label: a.label || 'Payment app', value: a.aid, mono: true, hint: a.name });
    if (smart.length) sections.push({ title: 'Smart card (ISO 7816)', fields: smart });
    if (family === 'NFC tag' || t === 'IsoDep') family = gv?.product ?? 'ISO 7816 smart card';
  }

  const aidTxt = `${aidName(tag.initialSelectedAID) ?? ''} ${apps.map((a) => a.name ?? '').join(' ')}`;
  if (apps.length || /Visa|Mastercard|Express|Discover|JCB|UnionPay|Interac|Maestro|payment/i.test(aidTxt)) guess = 'Bank / payment card';
  else if (/passport/i.test(aidTxt)) guess = 'Passport or travel ID';
  else if (/PIV/.test(aidTxt)) guess = 'Government / employee smart ID';
  else if (/YubiKey|FIDO/.test(aidTxt)) guess = 'Security key';
  else if (/Seos|HID/.test(aidTxt)) guess = 'Building access badge';
  else if (/DESFire/.test(family)) guess = 'Student ID, transit or access card (DESFire)';
  else if (/MIFARE Plus/.test(family)) guess = 'Access / campus card (MIFARE Plus)';
  else if (/Classic/.test(family)) guess = 'Hotel key, gym or access card (MIFARE Classic)';
  else if (/NTAG|Ultralight/.test(family)) guess = ndef.length ? 'NFC sticker / tag with data' : 'NFC sticker, wristband or single-ride ticket';
  else if (t === 'IsoDep' && guess === 'Unknown card') guess = 'Smart card (ID, transit or bank)';

  const memory: Field[] = [];
  if (tag.maxSize) memory.push({ label: 'NDEF max size', value: `${tag.maxSize} bytes` });
  if (tag.type) memory.push({ label: 'NDEF tag type', value: tag.type.replace('org.nfcforum.ndef.', '') });
  if (tag.isWritable !== undefined) memory.push({ label: 'Writable', value: tag.isWritable ? 'Yes' : 'No (locked)' });
  memory.push({ label: 'NDEF records', value: ndef.length ? String(ndef.length) : 'None' });
  sections.push({ title: 'Memory & data', fields: memory });

  sections.push({ title: 'Technologies', fields: [{ label: 'Reported', value: [...techs].join(', ') || 'None' }] });
  if (probe.errors?.length) sections.push({ title: 'Not readable', fields: probe.errors.map((e, i) => ({ label: `Step ${i + 1}`, value: e })) });

  return { uid: uidHex, family, guess, techs: [...techs], sections: sections.filter((s) => s.fields.length), ndef, raw: { tag, probe } };
}
