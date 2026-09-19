import React, { useState } from 'react';
import {
  MapIcon, UserGroupIcon, HomeIcon, TicketIcon, SparklesIcon,
  WrenchScrewdriverIcon, TrophyIcon, EnvelopeIcon, ShoppingBagIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

// To add a new card later (e.g. Arena once it exists), just append an entry here --
// the dots, button labels, and Settings > How to Play all read from this array.
const STEPS: TutorialStep[] = [
  {
    title: "Welcome to the Park!",
    description: "You manage Geriatric Park. Find the neighborhood's most legendary Elders, grow them into stars, and build the park they deserve.",
    icon: <HomeIcon className="w-12 h-12 text-[var(--accent-500)]" />
  },
  {
    title: "The Neighborhood Map",
    description: "Walk around your real neighborhood to spot wild residents and collectible items. New items keep turning up over time, so check back often.",
    icon: <MapIcon className="w-12 h-12 text-emerald-500" />
  },
  {
    title: "Battles & Recruiting",
    description: "Tap a resident to start an argument. Winning sends them off, but to keep one, use Guide to Geriatric Park mid-battle. Rarer residents are harder to persuade. Not going well? Wheelchair Away escapes with no HP lost, and they'll still be around.",
    icon: <UserGroupIcon className="w-12 h-12 text-orange-500" />
  },
  {
    title: "Tickets 🎟️",
    description: "Tickets are your everyday currency. Earn them from battles, Tasks, Court matches, Bingo, level-ups, and scrapping Elders you no longer need. Spend them in the Shop, on evolving your Elders, and on Court stakes.",
    icon: <TicketIcon className="w-12 h-12 text-amber-500" />
  },
  {
    title: "Pension Points (PP)",
    description: "PP is special and can't be farmed. It comes only from watching sponsor ads, and from claiming your Dividend, which is paid out of the shared Community Reserve. Earn Stars from Tasks to boost your Dividend. PP is a virtual in-game currency.",
    icon: <SparklesIcon className="w-12 h-12 text-yellow-500" />
  },
  {
    title: "Building Materials 🧱",
    description: "Materials come from winning Golden Games, winning Friend Battles, defending against friends, and visiting friends' parks. Spend them on Amenities for your Grounds, like a Nature Trail or Prune Juice Bar. Housing like the Retirement Cottage raises how many Elders you can hold.",
    icon: <WrenchScrewdriverIcon className="w-12 h-12 text-stone-500" />
  },
  {
    title: "The Court",
    description: "Your Resident Squad plays Shuffleboard in the Court tab. Auto-Play earns while you're away, the Daily Tournament ranks you against real players, Challenge lets you stake Tickets, and Golden Games is a tower of tougher leagues. Stronger, higher-level, evolved Elders win more.",
    icon: <TrophyIcon className="w-12 h-12 text-blue-500" />
  },
  {
    title: "Grow Your Elders",
    description: "Elders earn XP from battles and Court play. As they level up they get stronger and produce more Comfort, and at certain levels you can evolve them into an even better form using Tickets.",
    icon: <SparklesIcon className="w-12 h-12 text-pink-500" />
  },
  {
    title: "Friends, Battles & Mail",
    description: "Add friends with your friend code, visit their Grounds for Materials once a day, or challenge their squad in Friend Battle. Win and you collect the rewards. Lose and your friend gets the defender's bounty. When someone battles you, a note arrives in your Mailbox (the bell icon).",
    icon: <EnvelopeIcon className="w-12 h-12 text-rose-500" />
  },
  {
    title: "Shop & Passes",
    description: "The Shop sells gear, boosters, and Court items for Tickets. The Elder Pass has seasonal rewards you claim as you progress.",
    icon: <ShoppingBagIcon className="w-12 h-12 text-teal-500" />
  }
];

export const TutorialOverlay: React.FC<{ onComplete: () => void; isDark: boolean }> = ({ onComplete, isDark }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className={`w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 flex flex-col items-center text-center shadow-2xl border-2 transition-colors duration-500 ${isDark ? 'bg-slate-900 border-[var(--accent-500-a30)] text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="mb-6 p-6 bg-slate-100/10 rounded-full animate-bounce">
          {step.icon}
        </div>

        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">{step.title}</h2>
        <p className={`text-base leading-relaxed mb-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{step.description}</p>

        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-8 bg-[var(--accent-500)]' : 'w-2 bg-slate-700'}`} />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[var(--accent-900-a20)] active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? 'Start Playing' : 'Next Tip'}
          <ChevronRightIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-6 mt-4">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep(currentStep - 1)} className="text-[15px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Back</button>
          )}
          <button onClick={onComplete} className="text-[15px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Skip Intro</button>
        </div>
      </div>
    </div>
  );
};
