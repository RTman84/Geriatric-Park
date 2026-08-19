# Google Play deployment checklist

## What is already done in this branch

- [x] Removed the hard-coded Gemini API key from `index.html`.
- [x] Removed Vite configuration that injected `GEMINI_API_KEY` into the browser bundle.
- [x] Moved Gemini calls behind a same-origin server endpoint.
- [x] Added server-side input validation and output limits for Gemini requests.
- [x] Added production HTTP security headers.
- [x] Added server-only environment variable documentation.
- [x] Documented the client-authoritative economy as unsafe for real-money payouts.

## Required before submission

### 1. Revoke the exposed Gemini key

The old key was public in Git history. In Google Cloud:

1. Open the project that owns the Gemini API key.
2. Open API & Services > Credentials.
3. Revoke/delete the exposed key.
4. Create a replacement key with the narrowest practical API restrictions.
5. Store it only as `GEMINI_API_KEY` in the hosting provider's server-side environment variables.
6. Do not put it in `VITE_*`, `window.*`, HTML, source maps, or Android resources.

### 2. Deploy the server-side Gemini endpoint

For Vercel:

1. Import the repository into Vercel.
2. Set `GEMINI_API_KEY` as a Production secret.
3. Keep it unset in browser-visible variables.
4. Deploy the `main` branch only after the security branch is reviewed/merged.
5. Test `/api/gemini` using the game UI and verify the browser bundle contains no API key.

### 3. Decide the Google Play money model before building the Android app

The current app has a cash-denominated balance, chance-based Bingo, ad-derived rewards, and a withdrawal control. Do not ship real-money redemption in the ordinary game build until a policy/legal review confirms eligibility. Google Play generally restricts games that use real money or monetary-value items to obtain real-world monetary prizes, subject to its permitted programs and loyalty rules.

Safest initial Play release:

- Keep the gameplay economy virtual.
- Do not promise cash withdrawals.
- Do not expose a real-money payout CTA.
- Keep any future cash program behind a separately reviewed, authenticated backend.

### 4. Build a native Android wrapper

The repository is currently a Vite web application, not an Android project. Use a maintained WebView/native wrapper strategy such as Capacitor or a native Android project.

The Android project must have:

- a unique application ID/package name;
- release signing;
- Play App Signing configured;
- target API 36 or higher for new apps/updates submitted from August 31, 2026;
- HTTPS-only production endpoints;
- no debug credentials;
- no cleartext network traffic unless a specific, documented exception is necessary;
- only permissions required by the game;
- correct runtime handling for location permission;
- correct back navigation and WebView lifecycle handling;
- crash-safe handling when location permission is denied;
- adaptive icons and screenshots;
- 64-bit-compatible release artifacts where applicable.

### 5. Location disclosure and permission

The app uses browser geolocation continuously after play starts. Before requesting location on Android:

1. Explain in plain language why location is needed.
2. Request only the minimum scope needed.
3. Allow the game to remain usable when location is denied where feasible.
4. Declare location collection/use accurately in the Play Data safety form and privacy policy.
5. Review Google's current sensitive-permission/location policy before submission.

### 6. Privacy policy

The repository contains `privacy-policy.html`, but it must be hosted at a stable public HTTPS URL and accurately describe the actual production behavior, including location, advertising/SDKs, AI processing, saved game data, and any account/payment information.

Google Play requires the privacy policy both in Play Console and accessible from within the app.

### 7. Data safety form

In Play Console > App content > Data safety:

1. Inventory every data type collected by the app and every SDK.
2. Include precise/approximate location if collected.
3. Include advertising/analytics/AI data flows when applicable.
4. State whether data is shared with third parties.
5. State encryption in transit and other applicable security practices accurately.
6. Keep the form synchronized with the privacy policy and production build.

### 8. Ads

The app includes Google AdSense code in `index.html`. For an Android game, verify that the ad implementation is appropriate for the Android distribution and that the ad SDK, consent requirements, age targeting, and Data safety declarations are correct. Do not simply wrap a desktop web ad implementation and assume it is Play-compliant.

### 9. Content rating and audience

Complete Play Console's content-rating questionnaire. Review the audience/age-targeting rules carefully because real-money functionality can trigger age restrictions.

### 10. Account deletion

If an account system is added before release, provide an accessible account/data deletion mechanism and actually delete associated user data as required by Play policy.

### 11. Release testing

Use internal testing first, then closed testing as appropriate.

Test at minimum:

- fresh install;
- upgrade from previous build;
- offline launch;
- location denied/approximate/precise;
- app background/foreground;
- interrupted ads;
- AI endpoint unavailable;
- corrupted save import;
- rapid repeated taps;
- device rotation/resizing where supported;
- Android back button;
- low-memory process recreation;
- accessibility/text scaling;
- tablet/large-screen layout;
- release build with minification enabled;
- no secrets in APK/AAB or JavaScript bundles.

### 12. Play Console submission

Before production:

- [ ] Developer account verified.
- [ ] App package ID finalized.
- [ ] Store listing completed.
- [ ] Privacy policy URL added.
- [ ] Data Safety completed.
- [ ] Content rating completed.
- [ ] Target audience completed.
- [ ] Ads declaration completed.
- [ ] App access/reviewer instructions completed if applicable.
- [ ] AAB signed and uploaded.
- [ ] Target API 36+ confirmed.
- [ ] Internal test passed.
- [ ] Policy review completed.
- [ ] No real-money payout feature enabled unless separately approved/compliant.
