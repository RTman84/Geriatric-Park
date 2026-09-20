# Geriatric Park — Android app (Capacitor) setup

The Android app is the existing web game wrapped in a native shell (Capacitor 8), with
Google AdMob rewarded video as the ONLY thing that pays PP. `compileSdk` / `targetSdk` are 36
(Android 16), which Google Play requires for new apps since 2026-08-31.

## What already exists in the repo
- `android/` — the native project. `capacitor.config.ts` — app id + settings.
- `npm run build:native` — builds the web bundle for the app (strips the AdSense script,
  reads `.env.native`). `npm run android:sync` — build + copy into `android/`.
- `services/rewardedAds.ts` — one entry point for ads: AdMob in the app, a 5-second simulated
  "test sponsor" on the web (no real ad), or nothing if `VITE_ADS_MODE=off`.
- `.github/workflows/android-debug.yml` — builds an installable debug APK in the cloud.
- The app calls the deployed backend via `VITE_API_BASE_URL` (in `.env.native`), and network
  calls go through Capacitor's native HTTP so browser CORS rules don't block them.

## Try it on your phone (no Android Studio needed)
1. GitHub → the repo → **Actions** → **Android debug build** → **Run workflow** (or just push).
2. When it finishes (about 5-10 minutes), open the run and download **geriatric-park-debug-apk**.
3. Unzip it, copy `app-debug.apk` to your phone, and open it (allow "install unknown apps").
4. The sponsor button plays Google's TEST ad (labelled "Test Ad"). Nothing real is earned.

## Before a real Play release (each is a manual step for you)
1. **Google Play Console** developer account ($25 one-time) and identity verification.
2. **AdMob account** (admob.google.com) -> Apps -> Add app (Android, "not yet on Google Play"
   is fine) -> copy the **App ID** (`ca-app-pub-...~...`). Add a **Rewarded** ad unit -> copy its
   **Ad unit ID** (`ca-app-pub-.../...`). AdMob also needs a payments profile before it pays.
3. Put the App ID in `android/app/src/main/AndroidManifest.xml` (the `APPLICATION_ID` meta-data,
   currently Google's test id) and set `VITE_ADMOB_REWARDED_ID` + `VITE_ADMOB_PRODUCTION=true`
   in `.env.native`. Until then the app only ever serves test ads.
4. **Confirm the app id** `com.geriatricpark.game` (capacitor.config.ts). It is permanent once
   uploaded to Play.
5. **Release signing**: create an upload keystore (never commit it or its passwords), enrol in
   Play App Signing, then build a signed `.aab`. (The debug workflow above is not a release build.)
6. **Play Console forms**: privacy policy at a permanent HTTPS URL (must now mention AdMob and
   location), Data Safety, content rating (chance/Bingo mechanics), ads declaration = yes.
7. **Backend URL**: after `main` includes the phase2 backend, point `VITE_API_BASE_URL` at the
   production URL.

## Known gaps (not done yet)
- **Google sign-in inside the app**: Google blocks OAuth in embedded WebViews. Email/password and
  magic link work; Google OAuth needs a native flow (browser + deep link). Not built.
- **Android back button**: currently exits the app; should close open panels first.
- **Tailwind CDN**: styling loads Tailwind from a CDN, so the app needs internet to look right.
  Bundle Tailwind locally before release.
- **Server-side reward verification** (AdMob SSV) needs the server ledger (Bundle F) — until then
  rewards are granted client-side after the ad's Dismissed+Rewarded events.
- **iOS**: not set up (Steam is not possible for ad rewards; see ECONOMY.md 4c).
- **Web production**: set `VITE_ADS_MODE=off` on the production web deploy before public launch
  so the simulated sponsor can't grant PP without real ad revenue behind it.
