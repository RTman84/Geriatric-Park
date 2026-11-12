# AdMob server-side verification (SSV): owner setup guide (2026-11-07, account B)
Goal: when someone watches a rewarded video in the Android app, Google tells OUR server "this view really happened", and only then the server pays the Memento. This is also what personal funding (Economy v7, later) will rely on. Screens in AdMob change names now and then; if a label differs slightly, look for the closest one. Google's own page for reference: "Set up server-side verification" in the AdMob Help Center.

## What must be true first
1. **A final public domain.** Google calls `https://YOUR-DOMAIN/api/ledger`. Vercel *preview* URLs sit behind Deployment Protection and Google cannot reach them, so the callback must point at the **Production** domain. That means merging `phase2/account-backend-foundation-clean` into `main` and deploying Production (launch track item). Until then you can still test everything except Google's callback (see "Test without Google" below).
2. **Production environment variables** in Vercel (Production): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already used by the other routes). Do NOT set `ALLOW_SIMULATED_AD_REWARD` on Production.
3. **The real rewarded ad unit** is wired only in the release build: `npm run build:native:release` uses ad unit `ca-app-pub-4749065898882415/9578911384`. Debug builds always use Google's demo ads, and Google does not send SSV callbacks for demo ads.

## Step A: check the route is live (1 minute)
Open `https://YOUR-DOMAIN/api/ledger` in a browser. You should see a short message like `{"error":"Authentication required"}`. That means the route is deployed and refusing strangers, which is correct. A 404 means Production is not deployed yet.

## Step B: turn SSV on in AdMob
1. Go to admob.google.com and sign in.
2. Left menu: **Apps**, then pick **Geriatric Park** (the Android app).
3. Open **Ad units** and click your **rewarded** ad unit (ends in `...9578911384`).
4. Choose **Edit** (or the ad unit's settings).
5. Find **Server-side verification** (under the reward settings). Tick **Enable server-side verification**.
6. In **Callback URL** paste: `https://YOUR-DOMAIN/api/ledger` (no `?` and nothing after it).
7. Click **Verify URL** if the button is there. Google sends a signed test request; the route answers 200 and books nothing. If it fails, see Troubleshooting. Then **Save**.
The reward amount and item fields in AdMob can stay at their defaults (1 / "reward"); our server decides the payout.

## Step C: test with your own phone
1. In AdMob: **Settings, Test devices**, add your phone (this stops your own taps from being counted as invalid traffic and getting the account flagged). Never tap your own live ads otherwise.
2. Build and install the **release** build (or the signed AAB from the closed test) and sign in.
3. Watch one rewarded video. Within about 10 to 30 seconds the game should show "+1 Memento (sponsor confirmed)!" and your Mementos should rise by 1.
4. Double-check in Supabase (SQL Editor), both should show a fresh row for you:
   - `select nonce, status, created_at from ad_views order by created_at desc limit 5;` (status `verified`)
   - `select kind, amount, ref, created_at from memento_events where kind = 'ad' order by created_at desc limit 5;`

## Test without Google (Preview only)
For web or Preview testing there is no Google callback. In Vercel go to Settings, Environment Variables, add `ALLOW_SIMULATED_AD_REWARD` = `true` and tick **Preview only** (not Production), then Redeploy Preview with "Use existing build cache" unchecked. Now "Watch Local Sponsor" on the Preview site pays 1 Memento per view. Remove it when you are done. Production refuses this switch (answers 403), so real revenue and Mementos stay linked.

## Safety rules the server already enforces
One Memento per verified transaction (replays pay nothing); the view must belong to the same player and be fresh; 15 views a day per player; the callback is checked against Google's public keys (forged requests are rejected with 403); simulated rewards are off unless the Preview variable is set.

## Troubleshooting
- **Verify URL fails:** the Production domain is not deployed or Deployment Protection is on for it (Vercel, Settings, Deployment Protection: turn off for Production). Open Step A's URL to check.
- **Video watched but no Memento after a minute:** you are on a debug build (demo ads send no callback), the callback URL has a typo, or the ad unit's SSV box is not saved. Look at Vercel, Logs, filter `/api/ledger`.
- **"Invalid signature" in the logs:** the URL in AdMob has extra characters or a redirect (`www` vs no `www`): use the exact final domain with `https://` and no redirects.
- **Payments profile or ad unit pending:** AdMob can take a day after account approval before real ads fill.
