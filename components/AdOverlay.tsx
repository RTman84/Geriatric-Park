// components/AdOverlay.tsx
// Sponsor Break. Real ads pay ONLY through AdMob rewarded video in the native app.
// (AdSense display ads may not be rewarded, so they are no longer shown behind a reward.)
// On the web this is a simulated timer for testing, or disabled -- see services/rewardedAds.ts.

import React, { useEffect, useRef, useState } from 'react';
import { AD_REVENUE_PAYOUT, REVENUE_SPLIT } from '../constants';
import { getAdsMode, showRewardedAd } from '../services/rewardedAds';

interface AdOverlayProps {
  onRewardEarned: (playerShare: number, communityShare: number) => void;
  onClose: () => void;
  adCount: number;
  maxAds: number;
}

type AdPhase = 'prompt' | 'loading' | 'playing' | 'reward' | 'error';

const SIMULATED_AD_SECONDS = 5;

export const AdOverlay: React.FC<AdOverlayProps> = ({
  onRewardEarned,
  onClose,
  adCount,
  maxAds,
}) => {
  const [phase, setPhase] = useState<AdPhase>('prompt');
  const [countdown, setCountdown] = useState(SIMULATED_AD_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const adsMode = getAdsMode();

  const playerPct = Math.round(REVENUE_SPLIT.player * 100);
  const communityPct = Math.round(REVENUE_SPLIT.community * 100);
  const devPct = Math.round(REVENUE_SPLIT.developer * 100);
  const playerShare    = AD_REVENUE_PAYOUT * REVENUE_SPLIT.player;    // e.g. 0.0056 PP at $0.008/view
  const communityShare = AD_REVENUE_PAYOUT * REVENUE_SPLIT.community; // e.g. 0.0016 PP at $0.008/view

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Simulated (web testing) countdown -- no ad is shown and nothing real is displayed.
  useEffect(() => {
    if (phase !== 'playing') return;
    setCountdown(SIMULATED_AD_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          grantReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase]);

  const grantReward = () => {
    onRewardEarned(playerShare, communityShare);
    setPhase('reward');
  };

  const handleViewAd = async () => {
    if (adsMode === 'off') {
      setErrorMessage('Sponsor rewards are available in the Android app.');
      setPhase('error');
      return;
    }
    if (adsMode === 'simulated') {
      setPhase('playing');
      return;
    }
    setPhase('loading');
    const result = await showRewardedAd();
    if (result.completed) grantReward();
    else { setErrorMessage(result.error ?? 'No ads available right now. Check back soon!'); setPhase('error'); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[var(--accent-600)] px-6 py-4 text-white text-center">
          <div className="text-2xl mb-1">📺</div>
          <h2 className="font-black text-lg uppercase tracking-wide">Sponsor Break</h2>
          <p className="text-[var(--accent-200)] text-sm mt-1">
            {adCount}/{maxAds} sponsorship slots used today
          </p>
        </div>

        <div className="p-6 space-y-4">

          {/* PROMPT */}
          {phase === 'prompt' && (
            <>
              <div className="text-center space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Support Geriatric Park and earn rewards!
                </p>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-base space-y-1">
                  <p className="text-[13px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 pb-1">
                    Each view's ad revenue is split three ways
                  </p>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">💰 You get {playerPct}%</span>
                    <span className="font-black text-green-700 dark:text-green-300">+{playerShare.toFixed(4)} PP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">🏘️ Community Reserve {communityPct}%</span>
                    <span className="font-black text-blue-700 dark:text-blue-300">+{communityShare.toFixed(4)} PP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">🛠️ Development {devPct}%</span>
                    <span className="font-black text-slate-600 dark:text-slate-300">keeps the park growing</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">⭐ Park Stars</span>
                    <span className="font-black text-purple-700 dark:text-purple-300">+10</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleViewAd}
                className="w-full bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white font-black py-3 rounded-xl transition-colors"
              >
                View Sponsor & Earn
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-300 text-base py-2 hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </>
          )}

          {/* LOADING (native AdMob) */}
          {phase === 'loading' && (
            <div className="text-center py-8 space-y-3">
              <div className="text-4xl animate-pulse">📺</div>
              <p className="text-slate-700 dark:text-slate-200 font-bold text-base">Loading sponsor…</p>
            </div>
          )}

          {/* PLAYING — simulated sponsor (web testing only) */}
          {phase === 'playing' && (
            <div className="text-center space-y-3">
              <p className="text-slate-600 text-sm uppercase tracking-wide font-semibold">
                Sponsored Message
              </p>

              {/* Simulated sponsor (testing only) */}
              <div
                className="mx-auto flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden text-center px-4"
                style={{ width: 300, height: 250 }}
              >
                <p className="text-slate-700 dark:text-slate-200 font-black uppercase tracking-wide text-sm">
                  Test sponsor<br />(real video ads run in the Android app)
                </p>
              </div>

              <div className="bg-[var(--accent-50)] dark:bg-[var(--accent-900-a30)] rounded-xl py-3 px-4">
                <p className="text-[var(--accent-700)] dark:text-[var(--accent-300)] font-bold text-base">
                  ⏱ Reward unlocks in {countdown}s
                </p>
                <p className="text-[var(--accent-400)] text-sm mt-1">
                  Stay on this screen to earn your reward
                </p>
              </div>
            </div>
          )}

          {/* REWARD */}
          {phase === 'reward' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="font-black text-xl text-slate-800 dark:text-slate-100">
                Reward Earned!
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-base space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">You get {playerPct}%</span>
                  <span className="font-black text-green-700 dark:text-green-300">+{playerShare.toFixed(4)} PP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Community Reserve {communityPct}%</span>
                  <span className="font-black text-blue-700 dark:text-blue-300">+{communityShare.toFixed(4)} PP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Park Stars</span>
                  <span className="font-black text-purple-700 dark:text-purple-300">+10 ⭐</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-colors"
              >
                Collect & Continue
              </button>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">😕</div>
              <p className="text-slate-700 dark:text-slate-200 font-bold text-base">
                {errorMessage ?? 'No ads available right now. Check back soon!'}
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-200 text-slate-600 font-bold py-3 rounded-xl"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
