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

// To add a new card later, just add an entry here --
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
    description: "Elders earn XP from battles and Court play. As they level up they get stronger and more Comfortable -- Comfort makes your park's working buildings produce more, and at certain levels you can evolve them into an even better form using Tickets.",
    icon: <SparklesIcon className="w-12 h-12 text-pink-500" />
  },
  {
    title: "Friends, Battles & Mail",
    description: "Add friends with your friend code, visit their Grounds for Materials once a day, or challenge their squad in Friend Battle. Win and you collect the rewards. Lose and your friend gets the defender's bounty. When someone battles you, a note arrives in your Mailbox (the bell icon).",
    icon: <EnvelopeIcon className="w-12 h-12 text-rose-500" />
  },
  {
    title: "Arenas & Factions",
    description: "Community Arenas 🏟️ sit in the same spots on the map for every player. Join a faction, station an Elder to claim or defend an Arena alongside your faction-mates, and attack Arenas held by the other factions. Wins pay Tickets and Building Materials, and stationed Elders earn daily Dues by Mailbox. A stationed Elder leaves your squad until you recall it. Arenas never pay PP.",
    icon: <TrophyIcon className="w-12 h-12 text-rose-500" />
  },
  {
    title: "Visitors' Lodge & Resident Exchange",
    description: "Send a benched Elder to stay in a friend's park for 8, 12 or 24 hours. It earns Elder XP while away and your friend gets a gift you choose. Tap the Lodge in your Park (or use the Lodge button) to see who is away and who is visiting you. Upgrade the Lodge to host more visitors and give them more XP. You do not need to build it to use the Exchange.",
    icon: <HomeIcon className="w-12 h-12 text-sky-500" />
  },
  {
    title: "Tinker's Workshop",
    description: "Upgrade, salvage and hand out gear in one place. Sort and filter your gear, or use Multi-salvage to scrap a pile at once. Building and upgrading the Workshop makes gear upgrades cheaper and salvage pay more, and also adds room and XP for visiting Elders. It is optional: everything works without it at the normal price.",
    icon: <WrenchScrewdriverIcon className="w-12 h-12 text-amber-600" />
  },
  {
    title: "TV Dinners & the PvP Shop",
    description: "TV Dinners are earned only by playing against other people: Friend Battles, Arenas, Raids and the Court Ladder (up to 40 a day). Spend them in the PvP Shop on daily antiques, PvP-only gear and passes that waive Ticket fees. Each antique unlocks an icon and a title.",
    icon: <TrophyIcon className="w-12 h-12 text-amber-500" />
  },
  {
    title: "Mementos",
    description: "Mementos are the premium currency. They are bought in the Mementos Shop, or you can convert some of your PP into them (one way only). They buy extra roster rooms and weekly keepsakes. PP itself can never be sold or bought, and everything in the game is still playable for free.",
    icon: <SparklesIcon className="w-12 h-12 text-pink-400" />
  },
  {
    title: "Boards, Brackets & Titles",
    description: "Your Squad Power puts you in one of 10 brackets, so you compete against players near your strength in every mode. Each mode has its own weekly or daily board, and the top 3 in a bracket earn rewards and a permanent title. Tap your profile to choose any icon or title you have earned.",
    icon: <TrophyIcon className="w-12 h-12 text-blue-500" />
  },
  {
    title: "Seasonal Events",
    description: "Holidays and seasons bring limited-time events with three goals each, tracked automatically from what you play. Goals pay Tickets, Materials and XP as you finish them, and completing all three earns a permanent event title and icon for that year. Check the Tasks tab to see what is running and what is coming next.",
    icon: <SparklesIcon className="w-12 h-12 text-orange-500" />
  },
  {
    title: "Wild Residents & Rarity",
    description: "Tap a wild resident to see its level, rarity and power before you fight. A rarer Elder is stronger in every way: Common, Rare, Epic, then Legendary. A resident you guide home joins exactly as strong as you fought it.",
    icon: <SparklesIcon className="w-12 h-12 text-purple-500" />
  },
  {
    title: "Court Ladders",
    description: "Every power bracket has its own top-10 Grand Shuffle Court ladder. Challenge up to 3 ranks above you, 3 times a day. The top 3 earn a daily Ticket purse and a permanent bracket title: Champion, Runner-Up or Third Place.",
    icon: <TrophyIcon className="w-12 h-12 text-amber-500" />
  },
  {
    title: "Find Opponents",
    description: "In Friends, Find Opponents lists players who opted in to random matching, mostly near your power. Refresh has a short cooldown. Each opponent has their own battle cooldown, so attacking one never stops you from attacking another.",
    icon: <UserGroupIcon className="w-12 h-12 text-rose-500" />
  },
  {
    title: "Visits & Squad Loans",
    description: "Leave a benched Elder with a friend for 8, 12 or 24 hours. Your Elder earns XP, and your friend gets the gift you pick: Materials, progress on one of their quests, or extra output from one of their buildings. A Squad Loan lets a friend use your Elder in Battles and Court games instead. Away & Visiting in the Park shows it all.",
    icon: <HomeIcon className="w-12 h-12 text-sky-500" />
  },
  {
    title: "Goals, Badges & Titles",
    description: "The Goals tab in Tasks tracks lifetime progress in every mode. Each tier pays a one-time reward and unlocks a badge and title you can pick in your profile. You can only wear what you have earned.",
    icon: <TrophyIcon className="w-12 h-12 text-emerald-500" />
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
    <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
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
