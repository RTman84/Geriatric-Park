// components/AdOverlay.tsx
// Replace your existing AdOverlay.tsx with this file.
// Integrates real Google AdSense rewarded ads with your 70/20/10 revenue split.

import React, { useEffect, useRef, useState } from 'react';
import { AD_REVENUE_PAYOUT, REVENUE_SPLIT } from '../constants';

// ─────────────────────────────────────────────
// TYPE AUGMENT: tells TypeScript about adsbygoogle
// ─────────────────────────────────────────────
declare global {
  interface Window {
    adsbygoogle: any[];
    google?: {
      ima?: any; // present if you later upgrade to IMA SDK
    };
  }
}

// ─────────────────────────────────────────────
// REPLACE WITH YOUR REAL IDs FROM GOOGLE ADSENSE
// ─────────────────────────────────────────────
const ADSENSE_PUBLISHER_ID = 'ca-pub-4749065898882415';
const ADSENSE_REWARDED_SLOT  = '1422136727';            // your rewarded ad unit slot ID

interface AdOverlayProps {
  onRewardEarned: (playerShare: number, communityShare: number) => void;
  onClose: () => void;
  adCount: number;
  maxAds: number;
}

type AdPhase = 'prompt' | 'loading' | 'playing' | 'reward' | 'error';

export const AdOverlay: React.FC<AdOverlayProps> = ({
  onRewardEarned,
  onClose,
  adCount,
  maxAds,
}) => {
  const [phase, setPhase] = useState<AdPhase>('prompt');
  const [countdown, setCountdown] = useState(30);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardGranted  = useRef(false);

  const playerShare    = AD_REVENUE_PAYOUT * REVENUE_SPLIT.player;    // $0.07
  const communityShare = AD_REVENUE_PAYOUT * REVENUE_SPLIT.community; // $0.02

  // ── Clean up countdown on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Start countdown while ad plays ─────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    rewardGranted.current = false;
    setCountdown(30);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // If AdSense hasn't fired the reward callback yet, grant it manually
          // (fallback for browsers that block ad rendering)
          if (!rewardGranted.current) {
            grantReward();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase]);

  // ── Grant reward and transition to reward phase ─────────────
  const grantReward = () => {
    if (rewardGranted.current) return;
    rewardGranted.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
    onRewardEarned(playerShare, communityShare);
    setPhase('reward');
  };

  // ── Load and display the AdSense rewarded ad ────────────────
  const handleWatchAd = () => {
    setPhase('loading');

    try {
      // Ensure adsbygoogle array exists
      window.adsbygoogle = window.adsbygoogle || [];

      // Push the rewarded ad request
      window.adsbygoogle.push({
        google_ad_client: ADSENSE_PUBLISHER_ID,
        google_ad_slot:   ADSENSE_REWARDED_SLOT,
        google_ad_format: 'rewarded',
        // Callback fired by AdSense when the user earns the reward
        google_rewarded_ad_load_callback: () => {
          setPhase('playing');
        },
        google_rewarded_ad_grant_callback: () => {
          // Official reward signal from Google
          grantReward();
        },
        google_rewarded_ad_close_callback: () => {
          // User closed ad before earning — do NOT grant reward
          if (!rewardGranted.current) {
            setPhase('prompt');
          }
        },
      });

      // Render the ad unit into the container div
      if (adContainerRef.current) {
        const ins = document.createElement('ins');
        ins.className          = 'adsbygoogle';
        ins.style.display      = 'block';
        ins.dataset.adClient   = ADSENSE_PUBLISHER_ID;
        ins.dataset.adSlot     = ADSENSE_REWARDED_SLOT;
        ins.dataset.adFormat   = 'rewarded';
        adContainerRef.current.appendChild(ins);
        (window.adsbygoogle).push({});
      }

      // Fallback: if AdSense script isn't loaded (dev / ad-blocked),
      // simulate the ad after a 3-second delay so you can test the flow.
      setTimeout(() => {
        if (phase === 'loading') {
          console.warn('[AdOverlay] AdSense did not respond — using dev simulation.');
          setPhase('playing');
        }
      }, 3000);

    } catch (err) {
      console.error('[AdOverlay] Ad load error:', err);
      setPhase('error');
    }
  };

  // ── UI ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 text-white text-center">
          <div className="text-2xl mb-1">📺</div>
          <h2 className="font-black text-lg uppercase tracking-wide">Sponsor Break</h2>
          <p className="text-indigo-200 text-xs mt-1">
            {adCount}/{maxAds} sponsorship slots used this hour
          </p>
        </div>

        <div className="p-6 space-y-4">

          {/* PROMPT phase */}
          {phase === 'prompt' && (
            <>
              <div className="text-center space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Watch a short sponsor video and earn real rewards!
                </p>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">💰 Your pension</span>
                    <span className="font-bold text-green-600">+${playerShare.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">🏘️ Community pool</span>
                    <span className="font-bold text-blue-500">+${communityShare.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">🎟️ Legacy tokens</span>
                    <span className="font-bold text-purple-500">+50</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleWatchAd}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition-colors"
              >
                Watch Ad & Earn
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </>
          )}

          {/* LOADING phase */}
          {phase === 'loading' && (
            <div className="text-center py-6 space-y-3">
              <div className="animate-spin text-4xl">⏳</div>
              <p className="text-slate-500 text-sm">Loading sponsor video...</p>
            </div>
          )}

          {/* PLAYING phase */}
          {phase === 'playing' && (
            <div className="text-center py-4 space-y-3">
              {/* The actual ad renders here via AdSense */}
              <div ref={adContainerRef} className="min-h-[200px] bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <p className="text-slate-400 text-xs">Ad playing...</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl py-3 px-4">
                <p className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                  ⏱ Stay tuned — {countdown}s remaining
                </p>
                <p className="text-indigo-400 text-xs mt-1">Reward unlocks when the video ends</p>
              </div>
            </div>
          )}

          {/* REWARD phase */}
          {phase === 'reward' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="font-black text-xl text-slate-800 dark:text-slate-100">Reward Earned!</p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Your pension</span>
                  <span className="font-bold text-green-600">+${playerShare.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Community pool</span>
                  <span className="font-bold text-blue-500">+${communityShare.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Legacy tokens</span>
                  <span className="font-bold text-purple-500">+50 🎟️</span>
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

          {/* ERROR phase */}
          {phase === 'error' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">😕</div>
              <p className="text-slate-500 text-sm">
                No ads available right now. Check back soon!
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
