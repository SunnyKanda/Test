# Nikke Bol for iOS and Android

This folder wraps the web app in `../nikke-bol` as native iOS and Android apps with [Capacitor](https://capacitorjs.com). The app itself lives in `../nikke-bol`; change it there, then sync.

## What you need

| | iPhone / iPad | Android |
|---|---|---|
| Developer account | [Apple Developer Program](https://developer.apple.com/programs/), $99 a year | [Google Play Console](https://play.google.com/console), $25 once |
| Minimum version | iOS 15 (StoreKit 2) | Android 6 (API 23) |
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

## Building for the stores without a Mac (GitHub Actions)

Two workflows in `.github/workflows/` build release copies in the cloud. Run them from the repo's **Actions** tab → pick the workflow → **Run workflow**, or push a tag such as `v1.0`. The build number goes up by itself each run.

**Android → `android-release.yml`** makes a signed `app-release.aab` (download it from the run's *Artifacts*). Upload it to Play Console → *Testing* → *Internal testing*. Secrets (repo *Settings* → *Secrets and variables* → *Actions*):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the upload key file, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_PASSWORD` | its password |
| `ANDROID_KEY_ALIAS` | `upload` |

When you create the app in Play Console, keep **Play App Signing** on (the default): Google holds the real signing key and this file is only the upload key. Builds on your own machine can use `android/keystore.properties` instead (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; git-ignored).

**iOS → `ios-release.yml`** builds on a cloud Mac, signs automatically and uploads to App Store Connect, where it appears under *TestFlight* after processing (10–30 minutes). Before the first run:
1. Create the app record in App Store Connect with bundle ID `com.nikkebol.app`.
2. *Users and Access* → *Integrations* → *App Store Connect API* → generate a key with **App Manager** access. Download the `.p8` (only once). If the first run stops with a signing or certificate permission error, make a new key with **Admin** access instead: creating the distribution certificate automatically can need it.
3. Add secrets: `APPLE_TEAM_ID` (Membership page), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (paste the whole `.p8` text).

Google Play requires new apps to target Android 16 (API 36) from 31 August 2026; the project targets 36.

## The one-off unlock (in-app purchase)

Part of the app is free; one purchase unlocks the rest. It uses [`@capgo/native-purchases`](https://github.com/Cap-go/capacitor-native-purchases) (StoreKit 2 on iOS, Google Play Billing 7 on Android) and lives in `../nikke-bol/unlock.js`.

| | |
|---|---|
| Product ID (both stores) | `nikkebol.unlock` |
| Type | Apple: **Non-Consumable**. Google: **one-time product** (in-app product) |
| Price | Set in each store. The app shows the store's price; it never hardcodes one. |
| Free | Word cards, the find-it game, the first 7 path units (to the first reading lesson), the vowel letters, stickers, calendar, progress, word of the day, one learner |
| Unlocked | The rest of the path, reading lessons, sound chart, writing, sentences, listen & say it, tones, review, more learners |

Change what's free with `FREE_UNITS`, `FREE_LESSONS` and `PAID_TILES` at the top of `unlock.js`.

**How it checks:** every start (and when the app comes back to the front), the app asks the store which purchases this Apple ID or Google account owns. Apple signs each purchase and the phone checks the signature; refunds come back revoked. On Android, any purchase not yet acknowledged is acknowledged straight away (Google refunds unacknowledged purchases after 3 days). The answer is saved on the phone so the app works offline. If the store later says "not owned", the app only relocks after two such answers at least 3 days apart, so a store hiccup never locks out a paying family. The unlock is not part of backups. There's no server: a jailbroken or rooted phone could fake it, which is an accepted risk.

The web version is a taster with the same padlocks (it points to the stores). `build-artifact.py` marks the Claude artifact as the full preview.

**App Store Connect**
1. *Business* (Agreements, Tax and Banking): accept the **Paid Apps Agreement** and add bank and tax details. Purchases don't load until it's active.
2. Your app → *Monetization* → *In-App Purchases* → **+** → *Non-Consumable*. Reference name "Unlock everything", product ID `nikkebol.unlock`. Pick the price, switch **Family Sharing** on, and add the display name and description from `store/LISTING.md`. For *Review information*, upload `store/iap-review-screenshot.png`.
3. The first in-app purchase must be submitted **with an app version**: on the version page, under *In-App Purchases*, add it before submitting.
4. In Xcode: *Signing & Capabilities* → **+ Capability** → *In-App Purchase*.
5. Join the [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/) (15% instead of 30%).

**Testing on iPhone**
- Without App Store Connect: drag `ios/App/NikkeBol.storekit` into the Xcode project, then *Product* → *Scheme* → *Edit Scheme* → *Run* → *Options* → *StoreKit Configuration* → `NikkeBol.storekit`. Run on a simulator or phone and buy for free. *Debug* → *StoreKit* → *Manage Transactions* lets you refund, and *Editor* → *Enable Ask to Buy* tests a child's account.
- Sandbox: *Users and Access* → *Sandbox* → add a tester. On the phone: *Settings* → *App Store* → *Sandbox Account*.

**Google Play Console**
1. *Settings* → *Payments profile*: set up the merchant account.
2. Upload a build to *Internal testing* first. Products can only be created once a build with the billing permission is uploaded.
3. *Monetize* → *Products* → *In-app products* (*One-time products*) → *Create*: product ID `nikkebol.unlock`, name, description and price from `store/LISTING.md`. **Activate** it.
4. *Settings* → *License testing*: add the Gmail accounts of your testers. They install from the internal testing link and pay with test cards: "always approves", "always declines", and "slow test card", which approves after a few minutes (tests a pending payment).
5. Enrol in Google Play's 15% service fee tier (done once in the Play Console; it isn't automatic).

## Before you submit

- [ ] A native Punjabi speaker listens through the recordings and checks the words and grammar notes.
- [ ] Put your contact email in `../nikke-bol/privacy.html`, host it, and use that address as the privacy policy URL.
- [ ] Decide the bundle ID (`com.nikkebol.app` is a placeholder you can keep or change).
- [ ] Test recording on a real iPhone and Android phone (the microphone permission text is in `ios/App/App/Info.plist`).
- [ ] Test the daily reminder: switch it on, set the time a couple of minutes ahead, close the app and wait.
- [ ] Test the unlock on a real iPhone (sandbox) and Android phone (licence tester): buy, cancel, delete and reinstall then *Restore purchase*, and a slow-card (pending) payment on Android.
- [ ] Check the price shows in your currency on the unlock page, and that the padlocks disappear for every learner after buying.
- [ ] Bump `version` in `package.json`, the iOS *Version*/*Build* in Xcode, and `versionName` in `android/app/build.gradle` and `MARKETING_VERSION` in Xcode for each release (build numbers are set automatically by the workflows).

## Regenerating assets

- Icons and splash screens come from `resources/` (made by `scripts/render-assets.cjs`): `npm run assets`.
- Store screenshots: `PLAYWRIGHT=<path to playwright> node scripts/screenshots.cjs`.
