// Rewarded ads, one entry point for every platform.
//
//  - Native Android app  -> Google AdMob rewarded video (the ONLY place real ads pay PP).
//  - Web                 -> no real ad: a simulated timer for pre-launch testing, or nothing at all.
//
// Why: AdSense forbids rewarding people for viewing its ads, and Steam forbids ad rewards
// entirely, so AdSense display ads must never sit behind a reward. See ECONOMY.md section 4c.
import { Capacitor } from '@capacitor/core';

export type AdsMode = 'admob' | 'simulated' | 'off';

// 'off'       : web shows "available in the app" (set VITE_ADS_MODE=off on the PRODUCTION web deploy
//               before any public launch, so nothing is rewarded without real ad revenue behind it)
// 'simulated' : web/dev/preview testing only -- a short countdown, no ad, grants the reward
export function getAdsMode(): AdsMode {
  if (Capacitor.isNativePlatform()) return 'admob';
  return import.meta.env.VITE_ADS_MODE === 'off' ? 'off' : 'simulated';
}

// Google's official AdMob TEST ids. Real ids come from the AdMob console (see ANDROID_SETUP.md);
// they are not secret, but they must not be used until the account and app are approved.
const TEST_REWARDED_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';
const rewardedAdUnit = (import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined) || TEST_REWARDED_AD_UNIT;
const useTestAds = import.meta.env.VITE_ADMOB_PRODUCTION !== 'true';

export interface RewardedAdResult {
  completed: boolean;   // true ONLY if the player earned the reward (watched enough of the ad)
  error?: string;       // human-readable reason when not completed
}

let adMobReady: Promise<void> | null = null;

async function ensureAdMobReady(): Promise<void> {
  if (!adMobReady) {
    adMobReady = (async () => {
      const { AdMob, AdmobConsentStatus } = await import('@capacitor-community/admob');
      await AdMob.initialize({ initializeForTesting: useTestAds });
      // User consent (UMP): required in some regions, harmless elsewhere.
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          await AdMob.showConsentForm();
        }
      } catch (e) {
        console.warn('[Ads] consent check failed, continuing', e);
      }
    })().catch(e => { adMobReady = null; throw e; });
  }
  return adMobReady;
}

export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (getAdsMode() !== 'admob') return { completed: false, error: 'Sponsor rewards are only available in the Android app.' };
  try {
    await ensureAdMobReady();
    const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
    await AdMob.prepareRewardVideoAd({ adId: rewardedAdUnit, isTesting: useTestAds });

    return await new Promise<RewardedAdResult>(async (resolve) => {
      let rewarded = false;
      let settled = false;
      const handles: Array<{ remove: () => Promise<void> }> = [];
      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        handles.forEach(h => { void h.remove(); });
        resolve(result);
      };
      handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }));
      // The reward is granted when the player closes the ad, and only if they earned it.
      handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        finish(rewarded ? { completed: true } : { completed: false, error: 'Watch the whole video to earn the reward.' });
      }));
      handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e) => {
        finish({ completed: false, error: `Couldn't show the ad (${e?.message ?? 'unknown error'}).` });
      }));
      AdMob.showRewardVideoAd().catch(e => finish({ completed: false, error: `Couldn't show the ad (${e?.message ?? 'unknown error'}).` }));
      // Safety net so the UI can never hang forever.
      setTimeout(() => finish(rewarded ? { completed: true } : { completed: false, error: 'The ad timed out. Please try again.' }), 5 * 60 * 1000);
    });
  } catch (e: any) {
    return { completed: false, error: `No ad available right now (${e?.message ?? 'unknown error'}). Try again in a bit.` };
  }
}
