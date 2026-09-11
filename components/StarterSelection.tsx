
import React, { useState } from 'react';
import { Elder, ElderType, PowerType } from '../types';
import { ELDER_AVATARS, ElderAvatarImg, GAME_VERSION, getBaseComfortGeneration } from '../constants';
import { AdOverlay } from './AdOverlay';

interface StarterSelectionProps {
  onSelect: (elder) => void;
}

const StarterSelection: React.FC<StarterSelectionProps> = ({ onSelect }) => {
  const [showAd, setShowAd] = useState(false);
  const [adFinished, setAdFinished] = useState(false);

  const starters: Partial<Elder>[] = [
    { name: 'Gladys', type: ElderType.GRUMPY_GARDENER, powerType: PowerType.PHYSICAL, bio: 'Expert at yelling at squirrels and growing prize-winning tomatoes.' },
    { name: 'Clarence', type: ElderType.STORYTELLER, powerType: PowerType.SOCIAL, bio: 'His stories are so long, enemies literally fall asleep.' },
    { name: 'Edith', type: ElderType.TECH_WIZARD, powerType: PowerType.TECH, bio: 'Can fix a router with a paperclip and sheer frustration.' }
  ];

  const handleSelection = (template: Partial<Elder>) => {
    const elder: Elder = {
      id: 'starter_' + Math.random().toString(36).substr(2, 9),
      name: template.name!,
      type: template.type!,
      powerType: template.powerType!,
      level: 5,
      rarity: template.powerType === PowerType.LEGENDARY ? 'Legendary' : 'Rare',
      bio: template.bio!,
      comfortGeneration: getBaseComfortGeneration(template.powerType === PowerType.LEGENDARY ? 'Legendary' : 'Rare'),
      captured: true,
      xp: 0,
      evolutionStage: 0,
      lat: 40.7128, lng: -74.0060,
      happiness: 100,
      hp: 100, maxHp: 100, strength: 15, wit: 15, agility: 10, tenacity: 10,
      equipment: {},
      status: 'Team',
      isRoaming: true
    };
    onSelect(elder);
  };

  const handleAdComplete = () => {
    setShowAd(false);
    setAdFinished(true);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-green-50 flex flex-col items-center p-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div className="w-full max-w-md pt-12 pb-24 flex flex-col items-center">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-green-900 uppercase tracking-tighter italic leading-none mb-4 drop-shadow-sm">
            Geriatric<br/>Park
          </h1>
          <div className="inline-block px-4 py-1.5 bg-[var(--accent-600)] text-white text-[15px] font-black uppercase tracking-widest rounded-full mb-6 shadow-lg">
            Neighborhood watch just got serious.
          </div>
          <p className="text-slate-600 font-bold italic text-base">Select Your Lead Resident</p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full mb-8">
          {starters.map(s => (
            <button 
              key={s.name} 
              onClick={() => handleSelection(s)} 
              className="bg-white p-6 rounded-[32px] border-b-8 border-slate-200 hover:border-[var(--accent-600)] hover:bg-[var(--accent-50)] transition-all flex items-center gap-6 group text-left shadow-lg active:scale-95"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 overflow-hidden">
                <ElderAvatarImg type={s.type!} fill className="rounded-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-800 text-lg uppercase leading-none truncate">{s.name}</h3>
                <p className="text-[15px] text-slate-600 mt-2 leading-tight uppercase font-bold tracking-tight">{s.bio}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="w-full bg-white p-8 rounded-[32px] border-2 border-dashed border-[var(--accent-200)] text-center relative overflow-hidden shadow-xl mb-12">
          <div className="absolute top-0 right-0 p-2">
            <div className="px-2 py-0.5 bg-yellow-400 text-black text-[13px] rounded font-black animate-pulse">SPECIAL</div>
          </div>
          <h3 className="font-black text-[var(--accent-900)] text-base mb-2 uppercase tracking-tighter">Unlock Elite Starter</h3>
          <p className="text-[15px] text-slate-300 font-bold mb-6 uppercase">Watch a quick sponsor clip to start with 'Bingo Bob'</p>
          {adFinished ? (
            <button 
              onClick={() => handleSelection({ name: 'Bingo Bob', type: ElderType.BINGO_WARRIOR, powerType: PowerType.LEGENDARY, bio: 'The Legend. Unmatched in wits and endurance.' })} 
              className="bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white font-black py-4 px-8 rounded-2xl shadow-lg w-full uppercase active:scale-95 transition-all"
            >
              Claim Bingo Bob
            </button>
          ) : (
            <button 
              onClick={() => setShowAd(true)} 
              className="bg-slate-900 hover:bg-black text-white font-black py-4 px-8 rounded-2xl shadow-lg w-full flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="uppercase text-sm tracking-widest">Watch Ad to Unlock</span>
            </button>
          )}
        </div>
        
        <p className="text-[13px] text-slate-600 font-black uppercase tracking-widest text-center opacity-60 italic">
          v{GAME_VERSION} • Real Ad Revenue Enabled
        </p>
      </div>

{showAd && (
  <AdOverlay 
    onRewardEarned={() => handleAdComplete()}
    onClose={() => setShowAd(false)}
    adCount={0}
    maxAds={10}
  />
)}
    </div>
  );
};

export default StarterSelection;
