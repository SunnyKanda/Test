# Handover: getting Nikke Bol's closed test live on Google Play

You're taking over helping me (Sunny) publish my Android app on Google Play. I'm not technical. Explain each step in plain words, do the clicking in Play Console with me, and **stop and ask me before** anything that can't be undone or that I must personally agree to: legal declarations, payments, deleting things, sending for review.

## The app

- **Name:** Nikke Bol: Learn Punjabi (ਨਿੱਕੇ ਬੋਲ). **Package:** `com.nikkebol.app`. **Developer account:** "Mini-Hub" (personal account) in Google Play Console.
- A Punjabi learning app for babies, children and families: word cards with built-in Punjabi recordings, a learning path, reading and writing Gurmukhi, games, streaks, stickers and a daily reminder.
- **Free download.** One in-app purchase, `nikkebol.unlock` (one-time, non-consumable), unlocks the rest. The purchase screen sits behind a grown-ups check.
- **No ads. No accounts or sign-in. No analytics. Collects no data**: progress and recordings stay on the phone. Works offline.
- **Permissions:** microphone (only when the user taps record; recordings stay on the device), notifications (a local daily reminder a parent switches on), billing.
- Minimum Android 7 (API 24); targets Android 16 (API 36).

## Where we are

- The app is created in Play Console. Status: **Draft**.
- Testers group: `nikke-bol-testers@googlegroups.com` (anyone can join).
- The **Closed testing** track has that group as its testers. A release was uploaded: `app-release.aab` from GitHub Actions run #4 (version code 4), built after fixing the minimum SDK to 24.
- **I'm stuck:** I opened the app in Closed testing but can't see or install it, and there may be errors.
- Personal developer accounts need a closed test with **at least 12 testers opted in for 14 days in a row** before Google allows a production release.

## What to do, in this order

1. **Find what's blocking.** Check:
   - **Publishing overview**: changes not yet sent for review? Is *Managed publishing* on (approved changes then wait for me to press Publish)?
   - **Test and release → Testing → Closed testing**: the track's status, and the release's **errors** versus **warnings**. Warnings (for example about debug symbols) can wait; errors must be fixed.
   - **Dashboard → Finish setting up your app**: the unfinished tasks.
   - **Inbox** and **Policy status**.

   Tell me plainly what each problem means before fixing it.

2. **Policy and programs → App content.** Use these answers, and show me each before submitting:
   - **Privacy policy:** `https://[my domain]/privacy.html`. Ask me for my domain and check the page loads. At the bottom it still says `[contact email]`: ask me which email to show, then help me change it in SiteGround (Site Tools → Site → File Manager → `public_html` → `privacy.html` → Edit).
   - **App access:** all functionality is available without special access (no login). The grown-ups check is a simple multiplication shown on screen.
   - **Ads:** the app has no ads.
   - **Content rating (IARC questionnaire):** an education app. No violence, sexual content, bad language, drugs or gambling. Users can't chat or share content with other users. It doesn't share location. It does offer digital purchases. Expected result: Everyone / PEGI 3.
   - **Target audience:** ages 5 and under, 6–8, and 18 and over (parents learning alongside). It's made for children, so the Families policy applies: no ads, no data collected, the purchase behind a parental gate.
   - **Data safety:** the app does not collect or share any user data. Recordings and progress stay on the device; purchases are handled by Google Play.
   - **Advertising ID:** not used.
   - **News app:** no. **Government app:** no. **Financial features:** none. **Health:** no.

3. **Grow users → Store presence → Main store listing.**
   - **App name:** Nikke Bol: Learn Punjabi
   - **Short description:** Learn Punjabi with a real voice: words, reading Gurmukhi, writing and games.
   - **Full description:** from [store/LISTING.md](https://github.com/SunnyKanda/Test/blob/ccr-32122064-gefoo2/nikke-bol-app/store/LISTING.md) (open it while I'm logged in to GitHub).
   - **Graphics**, in the [store folder](https://github.com/SunnyKanda/Test/tree/ccr-32122064-gefoo2/nikke-bol-app/store) on GitHub. I'll download them and you tell me which goes where:
     - App icon 512 × 512: `play-icon-512.png`
     - Feature graphic 1024 × 500: `play-feature-graphic-1024x500.png`
     - Phone screenshots 1080 × 2400: `screenshots/android-phone-1-welcome.png` to `android-phone-8-stickers.png`
   - **Store settings:** category Education. Contact email: ask me. Website: my domain, if the site is live.

4. **Send for review.** When nothing is blocking, go to **Publishing overview** and, after asking me, click **Send changes for review**. Review of a new app's first closed test can take from a few hours to several days.

5. **Make sure testers can join.** Check the closed track's **Countries / regions** include at least the United Kingdom, India, Canada, the United States and Australia. Testers must:
   1. join the group at https://groups.google.com/g/nikke-bol-testers with the same Google account their Play Store uses;
   2. open https://play.google.com/apps/testing/com.nikkebol.app on Android and tap **Become a tester**;
   3. install Nikke Bol from the Play Store.

   Until the review is approved, that link says the app isn't available. That's normal. Try it with my own account first.

## Not now (ask me first)

- Creating the in-app product `nikkebol.unlock` needs a payments profile and bank details. Testing doesn't need it.
- Don't change the app from Free to Paid: Google won't let it change back.
- Leave **Play App Signing** on, and don't delete the app or any release.

If something needs a code change or a new app file, stop and tell me. My other Claude session (Claude Code) handles the code and the builds.
