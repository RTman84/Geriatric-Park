
import React, { useState, useEffect } from 'react';
import { Elder } from '../types';
import { generateElderBio } from '../services/geminiService';
// Fix: Import ELDER_AVATARS instead of non-existent ELDER_ICONS
import { ELDER_AVATARS } from '../constants';

interface ElderInteractionProps {
  elder: Elder;
  onSuccess: (updatedElder: Elder) => void;
  onClose: () => void;
}

const ElderInteraction: React.FC<ElderInteractionProps> = ({ elder, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [step, setStep] = useState(0); // 0: intro, 1: mission, 2: success

  useEffect(() => {
    const fetchBio = async () => {
      const b = await generateElderBio(elder.type, elder.name);
      setBio(b);
      setLoading(false);
    };
    fetchBio();
  }, [elder]);

  const handleRecruit = () => {
    setStep(2);
    setTimeout(() => {
      onSuccess({ ...elder, bio, captured: true });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500">
        {step < 2 ? (
          <>
            <div className="h-48 bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white"
              >
                ✕
              </button>
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-7xl shadow-inner animate-pulse">
                {/* Fix: Use ELDER_AVATARS and select the first emoji in the array */}
                {ELDER_AVATARS[elder.type][0]}
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
                <p className="text-slate-600 italic text-lg leading-relaxed mb-6">
                  "{bio}"
                </p>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Pension Contribution</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-600">+${elder.comfortGeneration.toFixed(3)}</span>
                  <span className="text-xs text-slate-500">/sec</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRecruit}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  Help Cross the Street (Recruit)
                </button>
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce">
              ✔️
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Recruited!</h2>
            <p className="text-slate-500">{elder.name} is moving into your park.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElderInteraction;
