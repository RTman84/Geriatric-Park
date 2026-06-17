// components/AdOverlay.tsx
// Updated to use Google AdSense Display ads (300x250)
// instead of rewarded video ads.

import React, { useEffect, useRef, useState } from 'react';
import { AD_REVENUE_PAYOUT, REVENUE_SPLIT } from '../constants';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// ─────────────────────────────────────────────────────────────
// YOUR REAL ADSENSE IDs — already updated with your publisher ID
// Replace XXXXXXXXXX with your Display ad slot ID from AdSense
// ─────────────────────────────────────────────────────────────
const ADSENSE_PUBLISHER_ID = 'ca-pub-4749065898882415';
const ADSENSE_DISPLAY_SLOT  = '1422136727'; // replace with your slot ID

interface AdOverlayProps {
  onRewardEarned: (playerShare: number, communityShare: number) => void;
  onClose: () => void;
  adCount: number;
  maxAds: number;
}

type AdPhase = 'prompt' | 'playing' | 'reward' | 'error';

export const AdOverlay: React.FC<AdOverlayProps> = ({
  onRewardEarned,
  onClose,
  adCount,
  maxAds,
}) => {
  const [phase, setPhase] = useState<AdPhase>('prompt');
  const [countdown, setCountdown] = useState(15);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const adPushed       = useRef(false);

  const playerShare    = AD_REVENUE_PAYOUT * REVENUE_SPLIT.player;    // $0.07
  const communityShare = AD_REVENUE_PAYOUT * REVENUE_SPLIT.community; // $0.02

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Inject the AdSense display ad and start countdown when playing
  useEffect(() => {
    if (phase !== 'playing') return;

    // Push the display ad into the container
    if (adContainerRef.current && !adPushed.current) {
      adPushed.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (e) {
        console.warn('[AdOverlay] AdSense push failed:', e);
      }
    }

    // 15 second countdown — then auto-grant reward
    setCountdown(15);
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

  const handleViewAd = () => {
    setPhase('playing');
  };

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

          {/* PROMPT */}
          {phase === 'prompt' && (
            <>
              <div className="text-center space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Support Geriatric Park and earn rewards!
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
                onClick={handleViewAd}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition-colors"
              >
                View Sponsor & Earn
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </>
          )}

          {/* PLAYING — display ad shown here */}
          {phase === 'playing' && (
            <div className="text-center space-y-3">
              <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">
                Sponsored Message
              </p>

              {/* AdSense display ad unit (300x250) */}
              <div
                ref={adContainerRef}
                className="mx-auto flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden"
                style={{ width: 300, height: 250 }}
              >
                <ins
                  className="adsbygoogle"
                  style={{ display: 'block', width: 300, height: 250 }}
                  data-ad-client={ADSENSE_PUBLISHER_ID}
                  data-ad-slot={ADSENSE_DISPLAY_SLOT}
                  data-ad-format="fixed"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl py-3 px-4">
                <p className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                  ⏱ Reward unlocks in {countdown}s
                </p>
                <p className="text-indigo-400 text-xs mt-1">
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

          {/* ERROR */}
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
