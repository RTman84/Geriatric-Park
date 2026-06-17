
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

const AD_VIDEOS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
];

interface AdOverlayProps {
  onComplete: () => void;
  onClose: () => void;
  isDark: boolean;
}

export const AdOverlay: React.FC<AdOverlayProps> = ({ onComplete, onClose, isDark }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [canClose, setCanClose] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVideoEnd = () => {
    setCanClose(true);
    setTimeLeft(0);
  };

  const handleFinish = () => {
    if (canClose) {
      onComplete();
    }
  };

  const handleVideoError = (e: any) => {
    console.warn("Video failed to load at index:", videoIndex, e);
    // Try the next video if the current one fails
    if (videoIndex < AD_VIDEOS.length - 1) {
      setVideoIndex(prev => prev + 1);
    } else {
      setError("Our sponsors are currently napping. (Ad loading failed)");
      // Allow closing even if the video fails so the user isn't stuck
      setTimeout(() => setCanClose(true), 2000);
    }
  };

  // Ensure video reloads when source index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoIndex]);

  return (
    <div className="fixed inset-0 z-[4000] bg-black flex flex-col items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-lg aspect-[9/16] bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Ad Video Player */}
        {!error ? (
          <video 
            ref={videoRef}
            autoPlay 
            muted={muted}
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            className="w-full h-full object-cover"
            playsInline
            src={AD_VIDEOS[videoIndex]}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-white">
            <span className="text-5xl mb-6">📺</span>
            <p className="font-black uppercase text-xs tracking-widest opacity-60 leading-relaxed px-4">
              {error}
            </p>
          </div>
        )}

        {/* UI Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-auto">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {timeLeft > 0 ? `Reward in ${timeLeft}s` : 'Reward Ready!'}
            </span>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setMuted(!muted)}
              className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              {muted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
            </button>
            <button 
              onClick={canClose ? handleFinish : onClose}
              className={`w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white active:scale-90 transition-transform ${!canClose ? 'opacity-30' : ''}`}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-6 right-6 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-xl p-5 rounded-3xl border border-white/10 text-white flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-700">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg">AD</div>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-tighter">Sponsored Message</h4>
              <p className="text-[8px] opacity-60 font-bold uppercase tracking-widest leading-none mt-1.5 italic">Helping build Geriatric Park</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
          <div 
            className="h-full bg-indigo-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
            style={{ width: `${((15 - Math.max(0, timeLeft)) / 15) * 100}%` }}
          />
        </div>
      </div>
      
      {!canClose && !error && (
        <p className="mt-6 text-[9px] text-white/40 font-black uppercase tracking-[0.3em] animate-pulse">
          Stay tuned for your reward
        </p>
      )}
    </div>
  );
};
