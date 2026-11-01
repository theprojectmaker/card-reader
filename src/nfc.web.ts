// Web preview only: browsers on iPhone can't read NFC, so this hands back
// realistic sample cards (shaped exactly like what Core NFC returns) to test the UI.
import { summarize, toBytes, type RawTag, type Probe, type ScanResult } from './decode';

export const isMock = true;
export class Cancelled extends Error {}
export const nfcStatus = async () => 'ok' as const;

const text = (s: string) => [0x02, 0x65, 0x6e, ...[...s].map((c) => c.charCodeAt(0))];
const uri = (prefix: number, s: string) => [prefix, ...[...s].map((c) => c.charCodeAt(0))];

const SAMPLES: { tag: RawTag; probe: Probe }[] = [
  {
    tag: {
      tech: 'mifare', id: '04a23cba6c1190', maxSize: 496, type: 'org.nfcforum.ndef.type2',
      ndefMessage: [
        { tnf: 1, type: [0x55], payload: uri(4, 'github.com/theprojectmaker') },
        { tnf: 1, type: [0x54], payload: text('Locker 214') },
      ],
    },
    probe: {
      type2Header: toBytes('04a23c1aba6c1190 c1480000 e1103e00'),
      getVersion: toBytes('0004040201001103'),
    },
  },
  {
    tag: {
      tech: 'IsoDep', id: '045b2e72e36780', initialSelectedAID: 'D2760000850100',
      historicalBytes: toBytes('8077'), applicationData: [],
    },
    probe: { getVersion: toBytes('af04010112001a05') },
  },
  {
    tag: { tech: 'felica', id: '012e4cd2b1c3a805', idm: '012e4cd2b1c3a805', systemCode: '0003' },
    probe: {},
  },
  {
    tag: { tech: 'iso15693', id: 'e004015012345678', icManufacturerCode: 0x04, icSerialNumber: toBytes('015012345678') },
    probe: { iso15693Info: { dsfid: 0, afi: 0, blockSize: 4, blockCount: 28, icReference: 1 } },
  },
  {
    tag: { tech: 'IsoDep', id: '08d41a6f', initialSelectedAID: '325041592E5359532E4444463031', historicalBytes: [] },
    probe: { ppse: toBytes('6f2d840e325041592e5359532e4444463031a51bbf0c1861164f07a0000000031010500b5649534120435245444954') },
  },
];

let next = 0;
export async function scanCard(): Promise<ScanResult> {
  await new Promise((r) => setTimeout(r, 900));
  const s = SAMPLES[next++ % SAMPLES.length];
  return summarize(s.tag, s.probe);
}
