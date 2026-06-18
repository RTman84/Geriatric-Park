import React, { useState, useEffect, useCallback } from 'react';
import { Elder, Gear, Quest, Achievement, Season, ElderType, MailMessage } from '../types';
import { 
  ELDER_AVATARS, TEAM_SIZE_LIMIT, SHOP_ITEMS, SEASONAL_REWARDS, 
  SEASON_XP_PER_LEVEL, ELDER_TYPE_STYLING, DAILY_REWARDS, 
  MAX_ADS_PER_HOUR, DIVIDEND_COOLDOWN, INVESTMENT_TIERS,
  SHUFFLEBOARD_KING_BOOST
} from '../constants';
import { 
  HeartIcon, StarIcon, CheckCircleIcon, CurrencyDollarIcon, 
  ShoppingBagIcon, TicketIcon, BoltIcon as BoltSolid, 
  LightBulbIcon, LifebuoyIcon, ShieldCheckIcon as ShieldSolid,
  CalendarDaysIcon, GiftIcon, BellIcon, SparklesIcon,
  FireIcon, BeakerIcon, HandThumbUpIcon, VideoCameraIcon,
  BanknotesIcon, ClockIcon, ChartBarIcon, TrophyIcon,
  ArrowPathIcon, PlayIcon, UserGroupIcon
} from '@heroicons/react/24/solid';

// ─── Shared sub-components ────────────────────────────────────────────────────

const ElderInsignia: React.FC<{ type: ElderType }> = ({ type }) => {
  const style = ELDER_TYPE_STYLING[type];
  return (
    <div className={`px-2 py-0.5 rounded-md border ${style.bg} ${style.border} ${style.color} text-[8px] font-black uppercase tracking-tighter shadow-sm`}>
      {style.label}
    </div>
  );
};

const RarityBadge: React.FC<{ rarity: Elder['rarity'] }> = ({ rarity }) => {
  const styles = {
    Common: 'bg-slate-100 text-slate-500 border-slate-200',
    Rare: 'bg-blue-100 text-blue-600 border-blue-200',
    Epic: 'bg-purple-100 text-purple-600 border-purple-200',
    Legendary: 'bg-amber-100 text-amber-600 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
  };
  return (
    <div className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${styles[rarity]}`}>
      {rarity}
    </div>
  );
};

const HealthBar: React.FC<{ hp: number; maxHp: number; isDark: boolean }> = ({ hp, maxHp, isDark }) => {
  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="w-full mt-2">
      <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const StatsGrid: React.FC<{ elder: Elder, isDark: boolean }> = ({ elder, isDark }) => (
  <div className="grid grid-cols-2 gap-2 w-full mt-2">
    {[
      { label: 'Strength', val: elder.strength, color: 'text-orange-500', icon: BoltSolid },
      { label: 'Wit', val: elder.wit, color: 'text-blue-500', icon: LightBulbIcon },
      { label: 'Agility', val: elder.agility, color: 'text-emerald-500', icon: LifebuoyIcon },
      { label: 'Tenacity', val: elder.tenacity, color: 'text-purple-500', icon: ShieldSolid }
    ].map(s => (
      <div key={s.label} className={`flex items-center gap-2 p-2 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
        <s.icon className={`w-3 h-3 ${s.color}`} />
        <span className="text-[10px] font-black uppercase opacity-60 flex-1">{s.label}</span>
        <span className="text-[10px] font-black">{s.val}</span>
      </div>
    ))}
  </div>
);

// ─── Mailbox Panel ────────────────────────────────────────────────────────────

export const MailboxPanel: React.FC<{ messages: MailMessage[], onClaim: (id: string) => void, isDark: boolean }> = ({ messages, onClaim, isDark }) => (
  <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
    <div className={`p-8 rounded-[3rem] border shadow-sm mb-8 flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className="min-w-0 flex-1">
        <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>Mailbox</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Park Administration</p>
      </div>
      <BellIcon className={`w-10 h-10 ${isDark ? 'text-slate-700' : 'text-slate-100'}`} />
    </div>
    <div className="space-y-4">
      {messages.length > 0 ? messages.slice().reverse().map(msg => (
        <div key={msg.id} className={`p-6 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${msg.claimed ? 'opacity-50' : ''}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="block text-[8px] font-black text-indigo-500 uppercase mb-1">From: {msg.sender}</span>
              <h4 className={`font-black text-sm uppercase leading-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{msg.subject}</h4>
            </div>
            {!msg.claimed && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
          </div>
          <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">{msg.body}</p>
          {msg.reward && !msg.claimed && (
            <button onClick={() => onClaim(msg.id)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-indigo-500/20">
              <GiftIcon className="w-4 h-4" /> Claim {msg.reward.type === 'Tokens' ? `${msg.reward.value} 🎟️` : (msg.reward.value as Gear).name}
            </button>
          )}
          {msg.claimed && <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-dashed border-slate-200 pt-4">Reward Claimed</div>}
        </div>
      )) : <div className="text-center py-20 opacity-30 italic text-xs uppercase font-black tracking-widest">Inbox is empty</div>}
    </div>
  </div>
);

// ─── Bank Panel ───────────────────────────────────────────────────────────────

export const BankPanel: React.FC<{ 
  balance: number, reserve: number, breakdown: any, rate: number, 
  onWithdraw: () => void, adCount: number, onWatchAdTrigger: () => void, 
  onInvest: (item: any) => void, isDark: boolean,
  onWatchAd?: (playerShare: number, communityShare: number) => void
}> = ({ balance, reserve, breakdown, rate, onWithdraw, adCount, onWatchAdTrigger, onInvest, isDark }) => {
  const adsLeft = MAX_ADS_PER_HOUR - adCount;
  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <div className={`rounded-[3rem] p-10 text-white shadow-2xl mb-8 relative italic overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-indigo-950'}`}>
        <h2 className="text-[11px] font-black opacity-60 uppercase mb-3 tracking-widest relative z-10">Your Pension Fund</h2>
        <div className="text-5xl font-black tracking-tighter mb-8 tabular-nums relative z-10">${balance.toFixed(2)}</div>
        <button onClick={onWithdraw} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform relative z-10">
          <CurrencyDollarIcon className="w-4 h-4" /> Withdraw Personal Balance
        </button>
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 relative z-10">
          <div>
            <span className="block text-[8px] font-black opacity-40 uppercase truncate mb-1">Rate/hr</span>
            <span className="text-xs font-black tabular-nums block">${(rate * 3600).toFixed(4)}</span>
          </div>
          <div>
            <span className="block text-[8px] font-black opacity-40 uppercase truncate mb-1">Passive</span>
            <span className="text-xs font-black tabular-nums block">${breakdown.passive.toFixed(4)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black opacity-40 uppercase truncate mb-1">Sponsorship</span>
            <span className="text-xs font-black tabular-nums block">${breakdown.sponsorship.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Community Reserve */}
      <div className={`p-6 rounded-[2.5rem] border shadow-sm mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className={`text-sm font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Community Reserve</h3>
          <span className="text-emerald-500 font-black text-sm">${reserve.toFixed(3)}</span>
        </div>
        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">20% of all ad revenue funds the weekly prize pool</p>
      </div>

      {/* Sponsorship Slots */}
      <div className={`p-8 rounded-[3rem] border shadow-sm mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`text-sm font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Sponsorship Slots</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">70/20/10 revenue split per view</p>
          </div>
          <VideoCameraIcon className={`w-8 h-8 ${adsLeft > 0 ? 'text-indigo-500 animate-pulse' : 'text-slate-300'}`} />
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-2">
            <span className="opacity-60">Hourly Availability</span>
            <span className={adsLeft > 0 ? "text-indigo-500" : "text-rose-500"}>{adsLeft} / {MAX_ADS_PER_HOUR} Slots</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(adsLeft / MAX_ADS_PER_HOUR) * 100}%` }} />
          </div>
        </div>
        <button 
          onClick={onWatchAdTrigger} 
          disabled={adsLeft <= 0}
          className={`w-full font-black py-4 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl transition-all ${adsLeft > 0 ? 'bg-indigo-600 text-white active:scale-95' : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'}`}
        >
          {adsLeft > 0 ? 'Watch Local Sponsor (+$0.07 Net + 2x Passive Boost!)' : 'Slots Recharging...'}
        </button>
        <p className="mt-4 text-[7px] text-slate-400 font-black uppercase text-center leading-relaxed italic">
          Watching an ad also activates 2x passive income for 1 hour!
        </p>
      </div>

      {/* Investment Tiers */}
      <div className="mb-10">
        <div className="flex items-center justify-between px-4 mb-6">
          <h3 className={`text-[12px] font-black uppercase ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Park Asset Portfolio</h3>
          <div className="flex items-center gap-1.5 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <ChartBarIcon className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Reinvest Earnings</span>
          </div>
        </div>
        <div className="space-y-10">
          {INVESTMENT_TIERS.map(tier => (
            <div key={tier.category}>
              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 px-4">{tier.category}</h4>
              <div className="grid grid-cols-1 gap-4 px-2">
                {tier.items.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => onInvest(item)}
                    disabled={balance < item.cost}
                    className={`p-6 rounded-[2.5rem] border flex items-center gap-6 text-left transition-all active:scale-95 ${balance >= item.cost ? 'bg-white border-slate-100 shadow-sm hover:border-indigo-500' : 'opacity-40 grayscale bg-slate-50 border-slate-200 cursor-not-allowed'}`}
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h5 className="font-black text-sm uppercase text-slate-800 truncate">{item.name}</h5>
                        <span className="text-indigo-600 font-black text-xs">${item.cost.toFixed(2)}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">+${(item.rateBoost * 3600).toFixed(4)}/hr passive</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Shuffleboard Panel ───────────────────────────────────────────────────────

interface ShuffleboardProps {
  isDark: boolean;
  elders: Elder[];
  tokens: number;
  shuffleboardKing: any;
  heldStructureIds: string[];
  onPassiveResult: (won: boolean, tokensEarned: number) => void;
  onTournamentPlay: (score: number) => void;
  onChallenge: (stakeTokens: number, won: boolean) => void;
  tournamentScore: number;
  tournamentEndsAt: number;
  passiveMatchAt: number;
}

export const ShuffleboardPanel: React.FC<ShuffleboardProps> = ({
  isDark, elders, tokens, shuffleboardKing, heldStructureIds,
  onPassiveResult, onTournamentPlay, onChallenge,
  tournamentScore, tournamentEndsAt, passiveMatchAt
}) => {
  const [activeMode, setActiveMode] = useState<'passive' | 'tournament' | 'challenge'>('passive');
  const [stakeAmount, setStakeAmount] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [timeToMatch, setTimeToMatch] = useState(0);
  const [timeToTournament, setTimeToTournament] = useState(0);

  const team = elders.filter(e => e.status === 'Team' && e.captured);
  const teamStrength = team.reduce((sum, e) => sum + e.strength + e.tenacity + e.wit, 0);
  const isKing = shuffleboardKing?.id === 'player';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeToMatch(Math.max(0, passiveMatchAt - Date.now()));
      setTimeToTournament(Math.max(0, tournamentEndsAt - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [passiveMatchAt, tournamentEndsAt]);

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePassiveCollect = () => {
    if (timeToMatch > 0) return;
    setIsPlaying(true);
    setTimeout(() => {
      const difficulty = 40 + Math.random() * 60;
      const won = teamStrength > difficulty;
      const tokensEarned = won ? Math.floor(15 + Math.random() * 25) : 5;
      onPassiveResult(won, tokensEarned);
      setLastResult(won 
        ? `Your Elders won the match! +${tokensEarned} 🎟️` 
        : `Tough match — consolation prize: +${tokensEarned} 🎟️`);
      setIsPlaying(false);
    }, 1500);
  };

  const handleTournamentPlay = () => {
    if (team.length === 0) return;
    setIsPlaying(true);
    setTimeout(() => {
      const score = Math.floor(teamStrength * (0.5 + Math.random()));
      onTournamentPlay(score);
      setLastResult(`Tournament throw scored ${score} pts! ${score > tournamentScore ? '🏆 New personal best!' : ''}`);
      setIsPlaying(false);
    }, 1500);
  };

  const handleChallenge = () => {
    if (tokens < stakeAmount || team.length === 0) return;
    setIsPlaying(true);
    setTimeout(() => {
      const difficulty = 30 + Math.random() * 70;
      const won = teamStrength > difficulty;
      onChallenge(stakeAmount, won);
      setLastResult(won 
        ? `Challenge won! +${stakeAmount} 🎟️ stolen!` 
        : `Challenge lost! -${stakeAmount} 🎟️`);
      setIsPlaying(false);
    }, 1500);
  };

  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className={`rounded-[3rem] p-8 text-white shadow-2xl mb-6 relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-indigo-950'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Grand Shuffle Court</h2>
            <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1">🥏 Compete · Defend · Earn</p>
          </div>
          {isKing && (
            <div className="bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[9px] font-black uppercase animate-pulse">
              👑 KING
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[8px] opacity-40 uppercase mb-1">Squad Power</span>
            <span className="font-black text-lg">{teamStrength}</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[8px] opacity-40 uppercase mb-1">Tournament</span>
            <span className="font-black text-lg">{tournamentScore}pts</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[8px] opacity-40 uppercase mb-1">Court Boost</span>
            <span className="font-black text-lg">{isKing ? '1.5x' : '—'}</span>
          </div>
        </div>
        {isKing && (
          <div className="mt-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl p-3 text-center">
            <p className="text-[9px] font-black text-amber-300 uppercase tracking-widest">
              👑 You hold the court! Passive income boosted {SHUFFLEBOARD_KING_BOOST}x
            </p>
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className={`flex rounded-2xl p-1 mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {(['passive', 'tournament', 'challenge'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => { setActiveMode(mode); setLastResult(null); }}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${activeMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
          >
            {mode === 'passive' ? '🤖 Auto' : mode === 'tournament' ? '🏆 Daily' : '⚔️ Challenge'}
          </button>
        ))}
      </div>

      {lastResult && (
        <div className={`p-4 rounded-2xl mb-4 text-center text-sm font-black border ${lastResult.includes('won') || lastResult.includes('best') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {lastResult}
        </div>
      )}

      {/* Passive Mode */}
      {activeMode === 'passive' && (
        <div className={`p-8 rounded-[2.5rem] border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🤖</div>
            <h3 className={`font-black text-lg uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>Auto-Play Mode</h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">Your Elders compete automatically every 10 minutes while you roam the map</p>
          </div>
          <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex justify-between text-[10px] font-black uppercase mb-2">
              <span className="opacity-60">Next Match</span>
              <span className={timeToMatch > 0 ? 'text-amber-500' : 'text-green-500'}>
                {timeToMatch > 0 ? formatTime(timeToMatch) : 'READY!'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="opacity-60">Win Reward</span>
              <span className="text-indigo-500">15–40 🎟️</span>
            </div>
          </div>
          {team.length === 0 ? (
            <div className="text-center text-[10px] font-black text-slate-400 uppercase py-4">
              Assign Elders to your squad first!
            </div>
          ) : (
            <button
              onClick={handlePassiveCollect}
              disabled={timeToMatch > 0 || isPlaying}
              className={`w-full font-black py-5 rounded-2xl uppercase text-[11px] transition-all active:scale-95 ${timeToMatch <= 0 && !isPlaying ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isPlaying ? 'Match in progress...' : timeToMatch > 0 ? `Next match in ${formatTime(timeToMatch)}` : 'Collect Match Results'}
            </button>
          )}
          {/* Elder lineup */}
          <div className="mt-6 space-y-2">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Lineup</p>
            {team.slice(0, 3).map(e => (
              <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <span className="text-2xl">{ELDER_AVATARS[e.type][0]}</span>
                <span className="text-[10px] font-black uppercase flex-1">{e.name}</span>
                <span className="text-[9px] text-indigo-500 font-black">PWR {e.strength + e.tenacity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournament Mode */}
      {activeMode === 'tournament' && (
        <div className={`p-8 rounded-[2.5rem] border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className={`font-black text-lg uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>Daily Tournament</h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">Leaderboard resets every 24hrs. Top scorer gets 1.5x passive income bonus all next day!</p>
          </div>
          <div className={`p-4 rounded-2xl mb-6 space-y-2 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="opacity-60">Your Best Score</span>
              <span className="text-indigo-500">{tournamentScore} pts</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="opacity-60">Resets In</span>
              <span className="text-amber-500">{formatTime(timeToTournament)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="opacity-60">Top Prize</span>
              <span className="text-emerald-500">1.5x passive all day</span>
            </div>
          </div>

          {/* Simulated leaderboard */}
          <div className="mb-6 space-y-2">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Today's Leaderboard</p>
            {[
              { name: 'BingoQueen47', score: Math.max(tournamentScore + 150, 380) },
              { name: 'GrumpyGus', score: Math.max(tournamentScore + 80, 310) },
              { name: 'You', score: tournamentScore },
              { name: 'MallWalker99', score: Math.max(tournamentScore - 30, 180) },
            ].sort((a, b) => b.score - a.score).map((entry, i) => (
              <div key={entry.name} className={`flex items-center gap-3 p-3 rounded-xl ${entry.name === 'You' ? 'bg-indigo-50 border border-indigo-200' : isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <span className="text-[10px] font-black w-5">{i + 1}.</span>
                <span className="text-[10px] font-black flex-1 uppercase">{entry.name}</span>
                <span className="text-[10px] font-black text-indigo-500">{entry.score} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleTournamentPlay}
            disabled={isPlaying || team.length === 0}
            className={`w-full font-black py-5 rounded-2xl uppercase text-[11px] transition-all active:scale-95 ${!isPlaying && team.length > 0 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {isPlaying ? 'Throwing...' : team.length === 0 ? 'Assign squad first!' : '🥏 Throw for Score'}
          </button>
        </div>
      )}

      {/* Challenge Mode */}
      {activeMode === 'challenge' && (
        <div className={`p-8 rounded-[2.5rem] border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">⚔️</div>
            <h3 className={`font-black text-lg uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>Elder Challenge</h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">Stake tokens and challenge a rival Elder. Winner takes all!</p>
          </div>

          <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Set Your Stake</p>
            <div className="flex gap-2">
              {[10, 20, 50, 100].map(amt => (
                <button
                  key={amt}
                  onClick={() => setStakeAmount(amt)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${stakeAmount === amt ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}
                >
                  {amt}🎟️
                </button>
              ))}
            </div>
          </div>

          {/* Rival Elder */}
          <div className={`p-4 rounded-2xl mb-6 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Your Rival</p>
            <div className="flex items-center gap-4">
              <span className="text-4xl">👴</span>
              <div>
                <p className="font-black text-sm uppercase">Shuffleboard Steve</p>
                <p className="text-[9px] text-slate-400">Power: {Math.floor(teamStrength * 0.8 + Math.random() * 20)}</p>
              </div>
              <div className="ml-auto text-center">
                <span className="block text-[8px] uppercase text-slate-400">Prize Pool</span>
                <span className="font-black text-indigo-500">{stakeAmount * 2} 🎟️</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleChallenge}
            disabled={isPlaying || team.length === 0 || tokens < stakeAmount}
            className={`w-full font-black py-5 rounded-2xl uppercase text-[11px] transition-all active:scale-95 ${!isPlaying && team.length > 0 && tokens >= stakeAmount ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {isPlaying ? 'Dueling...' : tokens < stakeAmount ? 'Not enough tokens!' : team.length === 0 ? 'Assign squad first!' : `⚔️ Challenge! (Stake ${stakeAmount} 🎟️)`}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Shop Panel ───────────────────────────────────────────────────────────────

const EXTENDED_SHOP_ITEMS = [
  // Gear
  { id: 's1', name: 'High-Fiber Muffin', icon: '🧁', price: 50, description: 'Instantly restores 50 HP to your lead Elder.', category: 'Consumable' },
  { id: 's2', name: 'Tennis Ball Walker', icon: '🎾', price: 250, description: 'Increases Tenacity by 6.', slot: 'Body', boost: 6, category: 'Gear' },
  { id: 's3', name: 'Reading Glasses', icon: '👓', price: 150, description: 'Increases Wit by 4.', slot: 'Head', boost: 4, category: 'Gear' },
  { id: 's4', name: 'Bingo Lucky Charm', icon: '🍀', price: 300, description: 'Boosts competitive spirit.', slot: 'Accessory', boost: 5, category: 'Gear' },
  // Passive boosters
  { id: 's5', name: 'Rocking Chair Upgrade', icon: '🪑', price: 500, description: 'Boosts passive income rate for 2 hours.', category: 'Booster', rateBoost: 0.00005, duration: 2 * 60 * 60 * 1000 },
  { id: 's6', name: 'Early Bird Special', icon: '🌅', price: 200, description: 'Doubles next ad reward payout.', category: 'Booster' },
  { id: 's7', name: 'Bingo Dauber XL', icon: '🖊️', price: 400, description: '+20 to all Elder stats for 1 hour.', category: 'Booster' },
  // Shuffleboard power-ups
  { id: 's8', name: 'Waxed Puck', icon: '🥏', price: 150, description: '+30% shuffleboard score on next throw.', category: 'Shuffleboard' },
  { id: 's9', name: 'Lucky Lane Oil', icon: '🛢️', price: 100, description: 'Opponent slips — guaranteed next challenge win.', category: 'Shuffleboard' },
  { id: 's10', name: 'Court Reservations', icon: '📋', price: 350, description: 'Hold the shuffleboard court for 30 mins automatically.', category: 'Shuffleboard' },
];

export const ShopPanel: React.FC<{ tokens: number, onBuy: (item: any) => void, isDark: boolean }> = ({ tokens, onBuy, isDark }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categories = ['All', 'Gear', 'Consumable', 'Booster', 'Shuffleboard'];
  const filtered = activeCategory === 'All' ? EXTENDED_SHOP_ITEMS : EXTENDED_SHOP_ITEMS.filter(i => i.category === activeCategory);

  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <div className={`mb-6 p-6 rounded-[2.5rem] border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className={`text-2xl font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Commissary</div>
        <div className={`p-4 rounded-2xl flex items-center justify-between mt-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <span className="text-[10px] font-black uppercase opacity-60">Balance</span>
          <span className="text-xl font-black text-indigo-500">{tokens} 🎟️</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((item) => (
          <button 
            key={item.id} 
            onClick={() => onBuy(item)} 
            disabled={tokens < item.price}
            className={`p-5 rounded-[2.5rem] border flex items-center gap-6 text-left transition-all active:scale-95 ${tokens >= item.price ? isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-500 shadow-sm' : 'opacity-40 grayscale cursor-not-allowed bg-slate-50 border-slate-200'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h4 className={`font-black text-sm uppercase truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.name}</h4>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                  item.category === 'Gear' ? 'bg-blue-100 text-blue-600' :
                  item.category === 'Booster' ? 'bg-green-100 text-green-600' :
                  item.category === 'Shuffleboard' ? 'bg-purple-100 text-purple-600' :
                  'bg-amber-100 text-amber-600'
                }`}>{item.category}</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight mb-2">{item.description}</p>
              <div className="text-indigo-500 font-black text-xs">{item.price} 🎟️</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Elder Pass Panel ─────────────────────────────────────────────────────────

export const ElderPassPanel: React.FC<{ season: Season, isDark: boolean }> = ({ season, isDark }) => {
  const currentLevel = Math.floor(season.xp / SEASON_XP_PER_LEVEL) + 1;
  const levelXP = season.xp % SEASON_XP_PER_LEVEL;
  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <div className={`rounded-[40px] p-10 text-white shadow-2xl mb-8 relative overflow-hidden italic ${isDark ? 'bg-slate-800' : 'bg-indigo-950'}`}>
        <h2 className="text-[12px] font-black text-indigo-400 uppercase tracking-widest mb-2">PASS RANK {currentLevel}</h2>
        <h1 className="text-5xl font-black uppercase leading-none italic tracking-tighter">Elder Pass</h1>
        <div className="mt-8 w-full h-5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(levelXP / SEASON_XP_PER_LEVEL) * 100}%` }}></div>
        </div>
        <p className="text-[9px] opacity-40 uppercase tracking-widest mt-3">{levelXP} / {SEASON_XP_PER_LEVEL} XP to next rank</p>
      </div>
      <div className="space-y-4">
        {SEASONAL_REWARDS.map((reward, i) => (
          <div key={i} className={`p-6 rounded-[2.5rem] border flex items-center justify-between shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${reward.level > currentLevel ? 'opacity-40 grayscale' : ''}`}>
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl">{reward.icon}</div>
              <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Rank {reward.level}</span>
                <span className={`text-[11px] font-black uppercase truncate block ${isDark ? 'text-white' : 'text-slate-800'}`}>{reward.free}</span>
              </div>
            </div>
            {reward.level <= currentLevel && <CheckCircleIcon className="w-7 h-7 text-emerald-500" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Quest Panel ──────────────────────────────────────────────────────────────

export const QuestPanel: React.FC<{ 
  quests: Quest[], achievements: Achievement[], parkScore: number, 
  onClaim: (id: string) => void, isDark: boolean 
}> = ({ quests, achievements, parkScore, onClaim, isDark }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievements'>('daily');
  const daily = quests.filter(q => q.type === 'Daily');
  const weekly = quests.filter(q => q.type === 'Weekly');

  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <div className={`p-8 rounded-[3rem] border shadow-sm mb-6 flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="min-w-0 flex-1">
          <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>The Tasks</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Daily Patrol & Weekly Missions</p>
        </div>
        <div className="text-3xl font-black text-indigo-500 ml-4 flex items-center">{parkScore} <StarIcon className="w-6 h-6 text-yellow-400 ml-2" /></div>
      </div>

      {/* Tab selector */}
      <div className={`flex rounded-2xl p-1 mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {(['daily', 'weekly', 'achievements'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
          >
            {tab === 'daily' ? '📅 Daily' : tab === 'weekly' ? '📆 Weekly' : '🏅 Feats'}
          </button>
        ))}
      </div>

      {/* Daily quests */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {daily.length === 0 && <div className="text-center py-20 opacity-30 italic text-xs uppercase font-black">No daily quests</div>}
          {daily.map(q => (
            <QuestCard key={q.id} quest={q} onClaim={onClaim} isDark={isDark} />
          ))}
        </div>
      )}

      {/* Weekly quests */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {weekly.length === 0 && <div className="text-center py-20 opacity-30 italic text-xs uppercase font-black">No weekly quests</div>}
          {weekly.map(q => (
            <QuestCard key={q.id} quest={q} onClaim={onClaim} isDark={isDark} />
          ))}
        </div>
      )}

      {/* Achievements */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          {achievements.map(a => (
            <div key={a.id} className={`p-6 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${a.completed ? '' : 'opacity-50 grayscale'}`}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1">
                  <h4 className={`font-black text-sm uppercase ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{a.title}</h4>
                  <p className="text-[10px] text-slate-500">{a.description}</p>
                </div>
                {a.completed && <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QuestCard: React.FC<{ quest: Quest, onClaim: (id: string) => void, isDark: boolean }> = ({ quest: q, onClaim, isDark }) => (
  <div className={`p-6 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${q.completed ? 'opacity-40 grayscale' : ''}`}>
    <div className="flex justify-between items-start mb-2">
      <div className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase mb-1">{q.type}</div>
      <div className="text-[9px] font-black text-emerald-500">+{q.rewardXP} XP / +{q.rewardTokens} 🎟️</div>
    </div>
    <h4 className={`font-black text-sm uppercase truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{q.title}</h4>
    <p className="text-[10px] text-slate-500 mb-4">{q.description}</p>
    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
      <span className="opacity-50">Progress</span>
      <span>{q.progress}/{q.target}</span>
    </div>
    <div className={`w-full h-3 rounded-full overflow-hidden mb-4 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}></div>
    </div>
    {q.progress >= q.target && !q.completed && (
      <button onClick={() => onClaim(q.id)} className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-indigo-500/20">
        <GiftIcon className="w-4 h-4" /> Claim Reward
      </button>
    )}
  </div>
);

// ─── Base Panel ───────────────────────────────────────────────────────────────

export const BasePanel: React.FC<{ 
  elders: Elder[], inventory: Gear[], tokens: number, 
  onHealAll: () => void, onEquipElder: (elderId: string, item: Gear) => void, 
  onDividendClaim: () => void, onMoveToTeam: (id: string) => void, 
  onMoveToStandby: (id: string) => void, lastCheckIn?: number, 
  onCheckIn: () => void, streak: number, lastDividendClaim?: number, 
  isDark: boolean,
  shuffleboardKing?: any,
  passiveBreakdown?: { elders: number, parcels: number, base: number }
}> = ({ elders, inventory, tokens, onHealAll, onEquipElder, onDividendClaim, onMoveToTeam, onMoveToStandby, lastCheckIn, onCheckIn, streak, lastDividendClaim, isDark, shuffleboardKing, passiveBreakdown }) => {
  const [selectedItem, setSelectedItem] = useState<Gear | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const isKing = shuffleboardKing?.id === 'player';

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const timeSince = now - (lastDividendClaim || 0);
      setTimeRemaining(Math.max(0, DIVIDEND_COOLDOWN - timeSince));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastDividendClaim]);

  const canClaim = timeRemaining <= 0;
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      {/* Park Hub header */}
      <div className={`rounded-[3rem] p-8 text-white shadow-2xl mb-8 flex flex-col italic transition-all relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-indigo-950'}`}>
        <h2 className="text-3xl font-black uppercase leading-none italic tracking-tighter mb-4 relative z-10">Park Hub</h2>
        <div className="grid grid-cols-2 gap-3 relative z-10 mb-6">
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col justify-center text-center">
            <span className="text-[8px] font-black uppercase opacity-40 mb-1">Currency</span>
            <span className="text-lg font-black tabular-nums">{tokens} 🎟️</span>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col justify-center text-center">
            <span className="text-[8px] font-black uppercase opacity-40 mb-1">Residents</span>
            <span className="text-lg font-black tabular-nums">{elders.length}</span>
          </div>
        </div>

        {/* Passive income breakdown */}
        {passiveBreakdown && (
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-[8px] font-black uppercase opacity-40 mb-2 tracking-widest">Passive Income Sources</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black">
                <span className="opacity-60">Base Rate</span>
                <span>${(passiveBreakdown.base * 3600).toFixed(4)}/hr</span>
              </div>
              <div className="flex justify-between text-[9px] font-black">
                <span className="opacity-60">Elder Comfort</span>
                <span className="text-indigo-300">${(passiveBreakdown.elders * 3600).toFixed(4)}/hr</span>
              </div>
              <div className="flex justify-between text-[9px] font-black">
                <span className="opacity-60">Parcel Rent</span>
                <span className="text-emerald-300">${(passiveBreakdown.parcels * 3600).toFixed(4)}/hr</span>
              </div>
              {isKing && (
                <div className="flex justify-between text-[9px] font-black">
                  <span className="opacity-60">👑 Court Bonus</span>
                  <span className="text-amber-300">×{SHUFFLEBOARD_KING_BOOST}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={onHealAll} className="relative z-10 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">
          <BeakerIcon className="w-4 h-4" /> Silver Springs Rehab (25 🎟️)
        </button>
      </div>

      {/* Daily check-in */}
      <div className={`p-6 rounded-[2.5rem] border shadow-sm mb-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className={`text-sm font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Daily Check-In</h3>
            <p className="text-[9px] text-slate-500 uppercase font-bold">Streak: {streak} days 🔥</p>
          </div>
          <CalendarDaysIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <button
          onClick={onCheckIn}
          className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl uppercase text-[10px] active:scale-95 transition-all"
        >
          Check In for Day {streak + 1} Reward
        </button>
      </div>

      {/* Park Dividend */}
      <div className={`p-8 rounded-[3rem] border shadow-sm mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`text-sm font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Park Dividend</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Passive reward for management</p>
          </div>
          <StarIcon className={`w-8 h-8 ${canClaim ? 'text-amber-500' : 'text-slate-300'}`} />
        </div>
        <button 
          onClick={onDividendClaim}
          disabled={!canClaim}
          className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-xl font-black uppercase ${canClaim ? 'bg-amber-500 text-white active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          <span className="text-xs tracking-tighter">{canClaim ? 'Claim Park Bonus' : 'Recharging...'}</span>
          <span className="text-[9px] font-bold opacity-80 tracking-widest">
            {canClaim ? '(Pull from Reserve pool)' : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`}
          </span>
        </button>
      </div>

      {/* Inventory */}
      <div className="mb-10">
        <h3 className={`text-[12px] font-black uppercase px-4 mb-4 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Inventory</h3>
        <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-100'} shadow-sm`}>
          {inventory.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {inventory.map(item => (
                <button key={item.id} onClick={() => setSelectedItem(item)} className={`p-3 aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-90 ${selectedItem?.id === item.id ? 'bg-indigo-600 border-indigo-400 text-white' : isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>
                  <span className="text-3xl mb-1">{item.icon}</span>
                  <span className={`text-[7px] font-black uppercase truncate w-full text-center ${selectedItem?.id === item.id ? 'text-indigo-100' : 'opacity-60'}`}>{item.name}</span>
                </button>
              ))}
            </div>
          ) : <div className="text-center py-10 opacity-30 text-xs font-black uppercase">Storage is empty</div>}
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className={`w-full max-w-sm rounded-[3rem] p-10 flex flex-col border shadow-2xl max-h-[85vh] ${isDark ? 'bg-slate-900 border-indigo-500/20' : 'bg-white border-slate-100'}`}>
            <div className="text-6xl text-center mb-6 animate-bounce">{selectedItem.icon}</div>
            <h3 className={`text-xl font-black uppercase text-center mb-2 italic leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>Equip {selectedItem.name}</h3>
            <p className="text-[10px] text-center mb-4 text-indigo-400 uppercase font-black tracking-widest">{selectedItem.description}</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1">
              {elders.map(e => (
                <button key={e.id} onClick={() => { onEquipElder(e.id, selectedItem); setSelectedItem(null); }} className={`w-full p-5 rounded-[2rem] border flex items-center gap-5 active:scale-95 transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} hover:border-indigo-500`}>
                  <span className="text-4xl">{ELDER_AVATARS[e.type][0]}</span>
                  <div className="flex-1 text-left min-w-0 text-[12px] font-black uppercase text-slate-800">{e.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedItem(null)} className="mt-8 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[10px] active:scale-95 transition-transform">Cancel</button>
          </div>
        </div>
      )}

      {/* Park Registry */}
      <div className="mb-24">
        <h3 className={`text-[12px] font-black uppercase px-4 mb-4 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Park Registry</h3>
        <div className="space-y-6">
          {elders.map(e => (
            <div key={e.id} className={`p-6 rounded-[3rem] border shadow-sm flex flex-col gap-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>{ELDER_AVATARS[e.type][0]}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-lg uppercase leading-none truncate">{e.name}</h4>
                  <div className="flex gap-2 items-center flex-wrap mt-2"><ElderInsignia type={e.type} /><RarityBadge rarity={e.rarity} /></div>
                  <p className="text-[9px] text-slate-400 mt-1">Comfort: {e.comfortGeneration.toFixed(4)}/tick</p>
                  <div className="flex gap-2 mt-3">
                    {e.status === 'Team' 
                      ? <button onClick={() => onMoveToStandby(e.id)} className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>Bench</button> 
                      : <button onClick={() => onMoveToTeam(e.id)} className="flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase bg-indigo-600 text-white shadow-lg shadow-indigo-900/10">Assign to Squad</button>
                    }
                  </div>
                </div>
              </div>
              <HealthBar hp={e.hp} maxHp={e.maxHp} isDark={isDark} />
              <StatsGrid elder={e} isDark={isDark} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Team Panel ───────────────────────────────────────────────────────────────

export const TeamPanel: React.FC<{ elders: Elder[], onMoveToStandby: (id: string) => void, onMoveToTeam: (id: string) => void, onSetRoamer: (id: string) => void, isDark: boolean }> = ({ elders, onMoveToStandby, onMoveToTeam, onSetRoamer, isDark }) => {
  const team = elders.filter(e => e.status === 'Team');
  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <h2 className={`text-3xl font-black uppercase mb-8 italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>The Squad</h2>
      <div className="space-y-6">
        {team.map(e => (
          <div key={e.id} className={`p-6 rounded-[3rem] border-2 flex flex-col gap-4 shadow-lg mb-6 transition-all ${isDark ? 'bg-slate-800 border-indigo-500/20' : 'bg-white border-indigo-100'}`}>
            <div className="flex items-center gap-6">
              <div className="text-5xl flex-shrink-0 relative">{ELDER_AVATARS[e.type][0]}</div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-black text-base uppercase leading-none truncate">{e.name}</h4>
                <p className="text-[9px] text-slate-400 mt-1">Comfort Gen: {e.comfortGeneration.toFixed(4)}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onMoveToStandby(e.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Bench</button>
                  {!e.isRoaming && <button onClick={() => onSetRoamer(e.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-indigo-900/10">Neighborhood Lead</button>}
                </div>
              </div>
            </div>
            <HealthBar hp={e.hp} maxHp={e.maxHp} isDark={isDark} />
            <StatsGrid elder={e} isDark={isDark} />
          </div>
        ))}
        {team.length === 0 && <div className="text-center py-20 opacity-30 italic text-xs uppercase font-black tracking-widest leading-relaxed">Squad is empty. Assign elders in the Park Hub.</div>}
      </div>
    </div>
  );
};
