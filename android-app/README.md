# Grihsevak Nidhi — Android app

A [Capacitor 6](https://capacitorjs.com) shell that opens the live web app at
**https://cooperative-crm-theta.vercel.app** (`server.url` in `capacitor.config.json`).
Every Vercel deploy shows up in the app straight away; you only rebuild the APK
to change the URL, icon, name or native code.

On phones the web app renders its mobile design (Poppins, `#eef1fb` canvas,
white cards, blue + gold, floating pill bottom nav); see `components/mobile/`.

## What the native side adds

- Brand icon, adaptive icon and splash screen (from `../resources/mark.svg`).
- Status and navigation bars in the app's canvas colour.
- An offline screen (`www/offline.html`) with a Try Again button.
- `AndroidBridge` in `MainActivity.java`, used by `components/NativeBridge.tsx`:
  - `window.print()` opens Android's print dialog (printer or *Save as PDF*).
  - PDFs the pages generate (passbook, repayment schedule) are saved to **Downloads** and opened.
- Hardware back button goes back in the app's history; on the first screen it closes the app.
- Links to other sites open in the phone's browser.

## Requirements

- Node.js 20+ (for the Capacitor CLI)
- JDK 17 (`JAVA_HOME`)
- Android SDK with *Platform 34* and *Build-Tools 34* (Android Studio installs these),
  path set in `android/local.properties` as `sdk.dir=…` or via `ANDROID_HOME`

## Build

```bash
npm install
npx cap sync android      # after changing capacitor.config.json or www/
npm run icons             # after changing ../resources/mark.svg
npm run apk:release       # → android/app/build/outputs/apk/release/app-release.apk
npm run apk:debug         # → android/app/build/outputs/apk/debug/app-debug.apk
```

Or open `android/` in Android Studio and use *Build → Build APK(s)*.

Bump `versionCode` / `versionName` in `android/app/build.gradle` for each release
so phones accept the update.

## Release signing

`npm run apk:release` signs with the key described in `android/keystore.properties`:

```properties
storeFile=../../keystore/grihsevak-release.jks
storePassword=…
keyAlias=grihsevak
keyPassword=…
```

Both files are git-ignored. **Back up the keystore and its password** — Android
only installs an update if it is signed with the same key as the installed app.
Without `keystore.properties` the release APK is built unsigned.

## Changing the server

Edit `server.url` and `server.allowNavigation` in `capacitor.config.json` (and the
two URLs in `www/`), then `npx cap sync android` and rebuild.
