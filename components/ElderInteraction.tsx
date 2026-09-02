
import React, { useState, useEffect } from 'react';
import { Elder } from '../types';
import { generateElderBio } from '../services/geminiService';
import { ELDER_AVATARS, ElderAvatarImg, GUIDE_SUCCESS_RATE } from '../constants';

interface ElderInteractionProps {
  elder: Elder;
  onSuccess: (updatedElder: Elder) => void;
  onFail: () => void;
  onClose: () => void;
}

// The "Guide to Geriatric Park" screen — shown after WINNING a battle. Winning the fight
// just means the resident is defeated (they're already off the map by this point); this is
// the separate, non-guaranteed step that decides whether they actually join the park, the
// same way beating a raid boss in Pokemon Go doesn't guarantee the catch that follows.
const ElderInteraction: React.FC<ElderInteractionProps> = ({ elder, onSuccess, onFail, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [step, setStep] = useState(0); // 0: intro, 1: guiding..., 2: success, 3: wandered off

  useEffect(() => {
    const fetchBio = async () => {
      const b = await generateElderBio(elder.type, elder.name);
      setBio(b);
      setLoading(false);
    };
    fetchBio();
  }, [elder]);

  const attemptGuide = () => {
    setStep(1);
    setTimeout(() => {
      const chance = GUIDE_SUCCESS_RATE[elder.rarity];
      const success = Math.random() < chance;
      if (success) {
        setStep(2);
        setTimeout(() => onSuccess({ ...elder, bio, captured: true }), 1500);
      } else {
        setStep(3);
        setTimeout(() => onFail(), 1500);
      }
    }, 1200);
  };

  const letThemGo = () => {
    setStep(3);
    setTimeout(() => onFail(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500">
        {step === 0 && (
          <>
            <div className="h-48 bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white"
              >
                ✕
              </button>
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/20 rounded-full text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
                🧭 Guide to Geriatric Park
              </div>
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner animate-pulse overflow-hidden">
                <ElderAvatarImg type={elder.type} fill />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 text-white">
                <h2 className="text-2xl font-bold">{elder.name}</h2>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs backdrop-blur-sm">{elder.type}</span>
                  <span className={`px-2 py-0.5 rounded text-xs backdrop-blur-sm ${
                    elder.rarity === 'Legendary' ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20'
                  }`}>
                    {elder.rarity}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div>
                </div>
              ) : (
                <p className="text-slate-600 italic text-lg leading-relaxed mb-4">
                  "{bio}"
                </p>
              )}

              <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-4">
                You won the argument — now guide them to the park. {Math.round(GUIDE_SUCCESS_RATE[elder.rarity] * 100)}% chance they agree to join.
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Pension Contribution</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-600">+{elder.comfortGeneration.toFixed(3)} PP</span>
                  <span className="text-xs text-slate-500">/tick</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={attemptGuide}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  Guide to the Park
                </button>
                <button
                  onClick={letThemGo}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl"
                >
                  Let Them Go
                </button>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce">
              🧭
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Guiding...</h2>
            <p className="text-slate-500">Walking {elder.name} toward the park.</p>
          </div>
        )}

        {step === 2 && (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce">
              ✔️
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Joined the Park!</h2>
            <p className="text-slate-500">{elder.name} is moving into your park.</p>
          </div>
        )}

        {step === 3 && (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-4xl mb-6">
              🚶
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Wandered Off</h2>
            <p className="text-slate-500">{elder.name} decided to stay put. Better luck next time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElderInteraction;
