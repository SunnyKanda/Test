# Nikke Bol for iOS and Android

This folder wraps the web app in `../nikke-bol` as native iOS and Android apps with [Capacitor](https://capacitorjs.com). The app itself lives in `../nikke-bol`; change it there, then sync.

## What you need

| | iPhone / iPad | Android |
|---|---|---|
| Developer account | [Apple Developer Program](https://developer.apple.com/programs/), $99 a year | [Google Play Console](https://play.google.com/console), $25 once |
| To build | A Mac with Xcode 16+ and CocoaPods (`brew install cocoapods`), or a cloud Mac service such as Codemagic | Android Studio (any OS) |
| Node.js | 20 or newer | 20 or newer |

## Build and run

```sh
cd nikke-bol-app
npm install
npm run ios       # copies the web app, syncs, opens Xcode
npm run android   # same, opens Android Studio
```

In Xcode: pick your team under *Signing & Capabilities*, choose a simulator or your phone, and press ▶.
In Android Studio: wait for Gradle, choose a device, and press ▶.

After changing anything in `../nikke-bol`, run `npm run sync` (or the `ios` / `android` command again).

## Releasing

**App Store**
1. In App Store Connect, create the app with bundle ID `com.nikkebol.app` (or change `appId` in `capacitor.config.json` first, then run `npx cap sync`).
2. Xcode → *Product* → *Archive* → *Distribute App* → *App Store Connect*.
3. Fill in the listing from `store/LISTING.md`, upload screenshots from `store/screenshots/`, choose the Kids category and submit.

**Google Play**
1. Android Studio → *Build* → *Generate Signed App Bundle*. Create an upload key and keep it safe (it's ignored by git).
2. In the Play Console, create the app, upload the `.aab` to *Internal testing* first, then *Production*.
3. Fill in the listing, Data safety and target audience from `store/LISTING.md`.

## Before you submit

- [ ] A native Punjabi speaker listens through the recordings and checks the words and grammar notes.
- [ ] Put your contact email in `../nikke-bol/privacy.html`, host it, and use that address as the privacy policy URL.
- [ ] Decide the bundle ID (`com.nikkebol.app` is a placeholder you can keep or change).
- [ ] Test recording on a real iPhone and Android phone (the microphone permission text is in `ios/App/App/Info.plist`).
- [ ] Bump `version` in `package.json`, the iOS *Version*/*Build* in Xcode, and `versionCode`/`versionName` in `android/app/build.gradle` for each release.

## Regenerating assets

- Icons and splash screens come from `resources/` (made by `scripts/render-assets.cjs`): `npm run assets`.
- Store screenshots: `PLAYWRIGHT=<path to playwright> node scripts/screenshots.cjs`.
