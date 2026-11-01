// Draws assets/icon.png (1024x1024, opaque): a card with a chip and NFC waves.
const fs = require('fs'), zlib = require('zlib');
const N = 1024, px = Buffer.alloc(N * N * 3);
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rrect = (x, y, cx, cy, w, h, r) => { const qx = Math.abs(x - cx) - w / 2 + r, qy = Math.abs(y - cy) - h / 2 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let c = mix([18, 22, 32], [8, 10, 15], y / N);
  const card = rrect(x, y, 430, 560, 560, 380, 44);
  if (card < 0) c = mix([40, 48, 66], [26, 31, 44], (y - 370) / 380);
  if (card < 0 && card > -6) c = [70, 82, 104];
  const chip = rrect(x, y, 300, 520, 120, 92, 16);
  if (chip < 0) c = mix([236, 200, 110], [190, 150, 70], (y - 474) / 92);
  if (chip < 0 && (Math.abs(y - 520) < 3 || Math.abs(x - 300) < 3)) c = [150, 115, 50];
  if (card < 0 && y > 650 && y < 676 && x > 210 && x < 520) c = [70, 82, 104];
  const d = Math.hypot(x - 640, y - 330), a = Math.atan2(y - 330, x - 640);
  if (a > -Math.PI / 4 - 0.6 && a < -Math.PI / 4 + 0.6) for (const r of [120, 200, 280]) if (Math.abs(d - r) < 22) c = [90, 200, 250];
  px.set(c, (y * N + x) * 3);
}
const raw = Buffer.alloc(N * (N * 3 + 1));
for (let y = 0; y < N; y++) px.copy(raw, y * (N * 3 + 1) + 1, y * N * 3, (y + 1) * N * 3);
const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync('assets/icon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('assets/icon.png written');
