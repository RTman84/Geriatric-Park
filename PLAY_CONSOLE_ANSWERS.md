# Play Console answer sheet (DRAFT, 2026-10-14)
Prepared from what the app and server actually do. Re-check each answer against Google's current form wording before submitting, and update it whenever features change. This is not legal advice.

## 0. Before anything else
- **New personal developer accounts must run a closed test with at least 12 testers opted in for 14 continuous days before applying for production access** (Google Play Console Help, "App testing requirements for new personal developer accounts"). Organization accounts are exempt. If the account is personal and created after 2023-11-13, start the closed test as early as possible (it is the longest lead-time item). Internal testing (up to 100 testers) does not count toward it.
- Package name is permanent once uploaded: `com.geriatricpark.game`.
- Pages that must be live on the PRODUCTION domain (production serves `main`, so merge phase2 -> main first): `/privacy-policy.html`, `/delete-account.html`, `/app-ads.txt`. Use the final domain in every URL below.

## 1. Store listing
Privacy policy URL: `https://<production domain>/privacy-policy.html` | Website: the production domain | Contact email: ReisunAbel@gmail.com.
Needed assets: 512x512 icon, 1024x500 feature graphic, at least 2 phone screenshots, short description (max 80 chars), full description (max 4000). Category: Games. Availability: United States only (matches the plan; set under Production -> Countries/regions).

## 2. App content declarations
- **Ads:** Yes, the app contains ads (AdMob rewarded video, opt-in only).
- **Advertising ID:** Yes, the app uses it, for advertising. (The AdMob SDK adds the AD_ID permission; the declaration must say Yes.)
- **App access:** the main game is playable without an account; social, cloud-save, Arena/Raid and purchase features need one. Create a reviewer account (email + password) and give Google those credentials under "App access".
- **Target audience:** 13+ (not children; matches the privacy policy). Do not opt into Designed for Families. Make sure AdMob is not set to child-directed treatment.
- **Government / news / health / financial-features apps:** No. **Real-money gambling or payouts:** No. Pension Points are virtual and have no cash value in the app. Do NOT add any cash-out feature or wording until a legal review and a policy check are done (see GOOGLE_PLAY_DEPLOYMENT.md).
- **Data deletion:** the app has an in-app "Delete account" (Settings -> Account & Display Name) and a web page: `https://<production domain>/delete-account.html`. Enter that URL in the Data safety form's account-deletion section.

## 3. Data safety form (draft answers)
Collected and processed on our servers (Supabase, hosted on Vercel; these are service providers acting for us, so not "sharing" in Google's sense):
| Google category | Data | Collected | Required? | Purpose |
|---|---|---|---|---|
| Personal info | Email address | Yes | Only if you create an account | Account management, app functionality |
| Personal info | Name (the display name the player chooses) | Yes | Optional | App functionality (shown to friends and on boards) |
| Personal info | User IDs (account id, friend code) | Yes | Account | App functionality, account management |
| App activity | App interactions (game progress, battles, scores, friend actions, Mailbox) | Yes | Account | App functionality, fraud prevention |
| Financial info | Purchase history (product, time, purchase token; no card details) | Yes | Only if you buy | App functionality, fraud prevention, accounting |
| Location | Approximate location (map-area ids of ~2 km cells sent when loading nearby Arenas) | Yes | Needed for Arenas | App functionality |

Precise GPS position is read to draw the map and kept on the device only (not sent to our servers); Google's guidance says data processed only on the device is not "collected". Re-check this if location features change.

Shared with a third party (Google AdMob, for advertising): **Device or other IDs (advertising ID)**, **approximate location (derived from IP by the ad SDK)**, and what the AdMob SDK reports about app interactions/diagnostics. Copy the exact rows from Google's current "AdMob data disclosure" table for the SDK version in the build, because the SDK's behavior is what Google compares your answers to.

Security practices: data is encrypted in transit (HTTPS): Yes. Users can request deletion: Yes (in app and via the web page above). Independent security review: No.

## 4. Content rating (IARC questionnaire)
Answer truthfully. Things this app should say yes to or flag: **simulated gambling** (the Bingo mini-game uses virtual currency with no real-money prize; expect this to raise the rating), **users can interact** (friends, Mailbox; there is no free-text chat), **in-app purchases** (Mementos packs), **location shared with other users: No** (location is not shown to other players), violence: cartoon, comedic battles between elder characters (no blood).

## 5. Monetization setup
Create the three managed (consumable) in-app products with these exact ids: `mementos_100` ($0.99), `mementos_550` ($4.99), `mementos_1150` ($9.99). Server-side verification needs the Google service account + env vars in ANDROID_SETUP.md. Payments profile and tax info are required by both Play and AdMob.

## 6. Release steps still needed
Release keystore + Play App Signing, a release build workflow (`npm run build:native:release`, uses the real AdMob unit), an internal then closed test track, and the AdMob server-side verification callback (needs the production domain).
