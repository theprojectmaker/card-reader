// Plain-Node checks for src/decode.ts: npm test
import assert from 'node:assert/strict';
import { decodeNdef, parseGetVersion, parsePpse, parseType2Header, summarize, toBytes, toDecimal } from '../src/decode.ts';

assert.equal(toDecimal([0x04, 0xa2]), '1186');
assert.equal(toDecimal(toBytes('08d41a6f')), String(0x08d41a6f));

const gv = parseGetVersion(toBytes('0004040201001103'))!;
assert.equal(gv.product, 'NTAG215');
assert.equal(gv.userBytes, 504);
assert.equal(parseGetVersion(toBytes('0004040201000f03'))!.product, 'NTAG213');
assert.equal(parseGetVersion(toBytes('0004030101000b03'))!.product, 'MIFARE Ultralight EV1 (MF0UL11)');
assert.equal(parseGetVersion(toBytes('af04010112001a05'))!.product, 'MIFARE DESFire EV2');
assert.match(parseGetVersion(toBytes('af04010112001a05'))!.storage, /8192/);

const t2 = parseType2Header(toBytes('04a23c1aba6c1190c1480000e1103e00'))!;
assert.equal(t2.ndefBytes, 496);
assert.equal(t2.access, 'Writable');

const nd = decodeNdef([
  { tnf: 1, type: [0x55], payload: [4, ...Buffer.from('example.com/x')] },
  { tnf: 1, type: 'T', payload: [2, 0x65, 0x6e, ...Buffer.from('héllo')] },
  { tnf: 4, type: [...Buffer.from('android.com:pkg')], payload: [...Buffer.from('com.x')] },
]);
assert.deepEqual(nd.map((n) => n.value), ['https://example.com/x', 'héllo', 'com.x']);

const apps = parsePpse(toBytes('6f2d840e325041592e5359532e4444463031a51bbf0c1861164f07a0000000031010500b5649534120435245444954'));
assert.equal(apps.length, 1);
assert.equal(apps[0].aid, 'A0000000031010');
assert.equal(apps[0].label, 'VISA CREDIT');

const visa = summarize({ tech: 'IsoDep', id: '08d41a6f', initialSelectedAID: '325041592E5359532E4444463031' },
  { ppse: toBytes('6f2d840e325041592e5359532e4444463031a51bbf0c1861164f07a0000000031010500b5649534120435245444954') });
assert.equal(visa.guess, 'Bank / payment card');
assert.ok(visa.sections.some((s) => s.fields.some((f) => /random/.test(f.value))));

const ntag = summarize({ tech: 'mifare', id: '04a23cba6c1190', ndefMessage: [{ tnf: 1, type: [0x55], payload: [4, ...Buffer.from('a.b')] }] },
  { getVersion: toBytes('0004040201001103') });
assert.equal(ntag.family, 'NTAG215');
assert.equal(ntag.guess, 'NFC sticker / tag with data');
assert.ok(ntag.sections[1].fields.some((f) => f.value === 'NXP Semiconductors'));

const suica = summarize({ tech: 'felica', id: '012e4cd2b1c3a805', idm: '012e4cd2b1c3a805', systemCode: '0003' });
assert.equal(suica.guess, 'Transit card');

const android = summarize({ id: '04A23CBA6C1190', techTypes: ['android.nfc.tech.NfcA', 'android.nfc.tech.MifareUltralight'], atqa: [0x44, 0x00], sak: 0 });
assert.ok(android.techs.includes('MifareUltralight'));
assert.ok(android.sections[1].fields.some((f) => f.label === 'ATQA' && f.value === '44 00'));

console.log('decode: all checks passed');
