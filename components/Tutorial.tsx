
import React, { useState } from 'react';
import { 
  MapIcon, UserGroupIcon, HomeIcon, 
  ClipboardDocumentListIcon, CurrencyDollarIcon,
  XMarkIcon, ChevronRightIcon
} from '@heroicons/react/24/solid';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: TutorialStep[] = [
  {
    title: "Welcome to the Park!",
    description: "You are the manager of Geriatric Park. Your goal is to find, help, and recruit the neighborhood's most legendary elders.",
    icon: <HomeIcon className="w-12 h-12 text-indigo-500" />
  },
  {
    title: "The Neighborhood Map",
    description: "Explore your surroundings to find wild residents and collectible items like Dentures or Coffee for boosts.",
    icon: <MapIcon className="w-12 h-12 text-emerald-500" />
  },
  {
    title: "Start an Argument",
    description: "Tap on a wild resident to enter a battle. Use your active team's logic and grit to win the debate and recruit them!",
    icon: <UserGroupIcon className="w-12 h-12 text-orange-500" />
  },
  {
    title: "The Pension Fund",
    description: "Each resident contributes to your Pension Fund. Reach $10.00 to withdraw real value or spend tokens to upgrade your park.",
    icon: <CurrencyDollarIcon className="w-12 h-12 text-yellow-500" />
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
      <div className={`w-full max-w-sm rounded-[3rem] p-8 flex flex-col items-center text-center shadow-2xl border-2 transition-colors duration-500 ${isDark ? 'bg-slate-900 border-indigo-500/30 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="mb-6 p-6 bg-slate-100/10 rounded-full animate-bounce">
          {step.icon}
        </div>
        
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">{step.title}</h2>
        <p className={`text-sm leading-relaxed mb-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{step.description}</p>
        
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'}`} />
          ))}
        </div>

        <button 
          onClick={next}
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20 active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? 'Start Playing' : 'Next Tip'}
          <ChevronRightIcon className="w-5 h-5" />
        </button>

        <button onClick={onComplete} className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Skip Intro</button>
      </div>
    </div>
  );
};
