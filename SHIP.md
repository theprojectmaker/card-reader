# Getting Card Reader onto your iPhone

Everything is built and tested except the parts that need **your Apple login**.
The app is linked to the EAS project `@solomonsasson/card-reader`
(id `69f3a33e-b2d5-496a-b0f9-987094445730`), bundle id `com.solyapps.cardreader`.

## Fastest way (about 20 minutes, two commands)

Uses 1 of your 15 free Expo cloud iOS builds this month. Run these in a terminal.

```bash
cd C:\Users\Soly\Desktop\tests\card-reader-native
```

```bash
npx eas-cli@latest build -p ios --profile production
```

- Log in to your Apple account when asked and say **yes** to letting EAS create the
  certificate and provisioning profile.
- EAS turns on **NFC Tag Reading** for the App ID by itself (it reads the entitlement from
  app.json). If the build ever fails with an NFC entitlement or profile error, turn it on by hand:
  developer.apple.com > Certificates, IDs & Profiles > Identifiers > `com.solyapps.cardreader`
  > tick **NFC Tag Reading** > Save, then run the build again.

When the build finishes:

```bash
npx eas-cli@latest submit -p ios --latest
```

- Pick **create a new app** if asked. If "Card Reader" is taken on the App Store it adds a
  suffix like "Card Reader (ab12cd)"; that's fine, it is never published.
- After Apple processes it (5-15 min), open **TestFlight** on your iPhone and install it.
- Copy the `ascAppId` it prints into `eas.json` under `submit.production.ios`
  (needed for the GitHub route below).

## Free rebuilds later (GitHub Actions, no Expo quota)

Only after the steps above (credentials have to exist first):

1. In PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\setup-github.ps1`
   (creates the **public** repo theprojectmaker/card-reader, since private repos can't get free
   macOS minutes on this account, and asks for your Expo token).
2. Build + send to TestFlight:

```bash
gh workflow run ios-testflight.yml -R theprojectmaker/card-reader -f submit=true
```

## Good to know

- iPhone 7 or newer. Hold the **top edge** of the phone on the card.
- iPhones never see **MIFARE Classic** (most hotel keys, many gym/old access cards). Nothing
  any app can do about that; an Android phone can.
- iOS hides ATQA/SAK; the app says so. It works out the chip from read-only commands instead
  (READ, GET_VERSION, SELECT, GET SYSTEM INFO). It never writes, clones or emulates.
- Bank cards: only the payment app name (e.g. "VISA CREDIT") and its AID, never the card number.
- Smart cards are only seen if they answer one of the AIDs listed in app.json
  (`selectIdentifiers`); add an AID there and rebuild to support another kind.
