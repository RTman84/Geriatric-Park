# Google Play deployment checklist

## Done in this security branch

- [x] Removed hard-coded Gemini API key from `index.html`.
- [x] Removed Vite configuration that injected `GEMINI_API_KEY` into the browser bundle.
- [x] Moved Gemini generation behind a same-origin server endpoint with input validation and output limits.
- [x] Added production HTTP security headers.
- [x] Added server-only environment variable documentation.
- [x] Added security/build CI gates for TypeScript, production builds, dependency audit, and credential leakage.
- [x] Documented the client-authoritative economy as unsafe for real-money payouts.

## Required before Play submission

1. **Rotate the exposed Gemini key.** In Google Cloud > API & Services > Credentials, revoke/delete the old public key and create a replacement. Store it only as the server-side `GEMINI_API_KEY` deployment secret.
2. **Deploy the server endpoint.** Deploy to Vercel (or equivalent), set `GEMINI_API_KEY` as a server-side Production secret, and verify the browser bundle contains no credential.
3. **Resolve the money model.** The current app has a cash-denominated balance, withdrawal UI, chance-based Bingo, and ad rewards. Do not enable real-money redemption in the ordinary Play build until policy/legal eligibility is confirmed. Safest initial Play release: virtual-only economy.
4. **Create a native Android project/wrapper.** The current repository is a Vite web app, not an Android AAB project. Use Capacitor or a native Android project and configure a unique package ID, release signing, Play App Signing, HTTPS-only networking, minimal permissions, adaptive icons, and production error handling.
5. **Target API 36+.** New apps and updates submitted to Google Play from August 31, 2026 must target Android 16/API 36 or higher.
6. **Location.** The game uses geolocation after play starts. Explain the purpose before requesting permission, request the minimum scope, handle denial gracefully, and disclose the data use accurately in the privacy policy and Data Safety form.
7. **Privacy policy.** Host `privacy-policy.html` at a stable public HTTPS URL and link it in Play Console and from the app. It must match actual production data flows, including location, advertising/SDKs, AI processing, saved data, and any account/payment data.
8. **Data Safety.** Complete Play Console > App content > Data safety for every data type collected/shared by the app and its SDKs. Keep it synchronized with the privacy policy.
9. **Ads.** Verify the current web AdSense implementation is appropriate for the Android distribution and that consent, age targeting, SDK disclosures, and Data Safety declarations are correct.
10. **Content rating/audience.** Complete Play Console's content-rating and target-audience declarations accurately. Real-money functionality can trigger additional age restrictions.
11. **Account deletion.** If account creation is added, implement an accessible deletion process that deletes associated user data as required.
12. **Test internal release.** Test fresh install, upgrade, offline launch, location denied/approximate/precise, background/foreground, interrupted ads, unavailable AI, corrupted save import, rapid taps, back navigation, process recreation, accessibility/text scaling, large screens, and release builds.
13. **Release gate.** Confirm no secrets in the AAB/JS bundle, all high/critical dependency findings are resolved or accepted, and no real-money payout feature is enabled without a compliant backend and policy/legal approval.

Google Play's current User Data policy requires accurate Data Safety declarations and a privacy policy, and the current target API requirement is API 36 for new apps/updates from August 31, 2026.
