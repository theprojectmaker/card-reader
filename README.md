# Card Reader

Personal iPhone app: tap an NFC card or tag and see its UID (hex, decimal, reversed decimal),
chip type, maker, memory, NDEF data (links, text, Wi-Fi, vCards), smart-card AIDs and FeliCa /
ISO 15693 details. Keeps a local history with nicknames per card. Read-only.

- `App.tsx`: scan / history / detail screens
- `src/decode.ts`: all decoding (pure, tested by `npm test`)
- `src/nfc.native.ts`: Core NFC via react-native-nfc-manager 4.0.0 (read-only probes)
- `src/nfc.web.ts`: sample cards for the web preview (`npm run web`, port 8130 in launch.json)
- `src/store.ts`: AsyncStorage history + nicknames

Shipping: see SHIP.md.
