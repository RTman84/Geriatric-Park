
import React, { useState, useEffect } from 'react';
import { Elder, Gear, Quest, Achievement, Season, ElderType, MailMessage } from '../types';
import { ELDER_AVATARS, TEAM_SIZE_LIMIT, SHOP_ITEMS, SEASONAL_REWARDS, SEASON_XP_PER_LEVEL, ELDER_TYPE_STYLING, DAILY_REWARDS, MAX_ADS_PER_HOUR, DIVIDEND_COOLDOWN, INVESTMENT_TIERS } from '../constants';
import { 
  HeartIcon, StarIcon, CheckCircleIcon, CurrencyDollarIcon, 
  ShoppingBagIcon, TicketIcon, BoltIcon as BoltSolid, 
  LightBulbIcon, LifebuoyIcon, ShieldCheckIcon as ShieldSolid,
  CalendarDaysIcon, GiftIcon, BellIcon, SparklesIcon,
  FireIcon, BeakerIcon, HandThumbUpIcon, VideoCameraIcon,
  BanknotesIcon, ClockIcon, ChartBarIcon
} from '@heroicons/react/24/solid';

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

export const BankPanel: React.FC<{ balance: number, reserve: number, breakdown: any, rate: number, onWithdraw: () => void, adCount: number, onWatchAdTrigger: () => void, onInvest: (item: any) => void, isDark: boolean }> = ({ balance, reserve, breakdown, rate, onWithdraw, adCount, onWatchAdTrigger, onInvest, isDark }) => {
  const adsLeft = MAX_ADS_PER_HOUR - adCount;
  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <div className={`rounded-[3rem] p-10 text-white shadow-2xl mb-8 relative italic overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-indigo-950'}`}>
        <h2 className="text-[11px] font-black opacity-60 uppercase mb-3 tracking-widest relative z-10">Your Pension Fund</h2>
        <div className="text-5xl font-black tracking-tighter mb-8 tabular-nums relative z-10">${balance.toFixed(2)}</div>
        <button onClick={onWithdraw} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform relative z-10">
          <CurrencyDollarIcon className="w-4 h-4" /> Withdraw Personal Balance
        </button>
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 relative z-10">
          <div>
            <span className="block text-[8px] font-black opacity-40 uppercase truncate mb-1">Portfolio Rate</span>
            <span className="text-xs font-black tabular-nums block">${(rate * 3600).toFixed(4)}/hr</span>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black opacity-40 uppercase truncate mb-1">Direct Gains</span>
            <span className="text-xs font-black tabular-nums block">${(breakdown.active + breakdown.sponsorship).toFixed(4)}</span>
          </div>
        </div>
      </div>

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
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Boosts Rate by +${(item.rateBoost * 3600).toFixed(4)}/hr</p>
                      </div>
                    </button>
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-8 rounded-[3rem] border shadow-sm mb-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`text-sm font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Sponsorship Slots</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Immediate cash flow split 70/20</p>
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
          {adsLeft > 0 ? 'Watch Local Sponsor (+$0.07 Net)' : 'Slots Recharging...'}
        </button>
        <p className="mt-4 text-[7px] text-slate-400 font-black uppercase text-center leading-relaxed italic">
          Every ad also contributes $0.02 to the Community Reserve shared pool.
        </p>
      </div>
    </div>
  );
};

export const ShopPanel: React.FC<{ tokens: number, onBuy: (item: any) => void, isDark: boolean }> = ({ tokens, onBuy, isDark }) => (
  <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
    <div className={`mb-8 p-6 rounded-[2.5rem] border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className={`text-2xl font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-800'}`}>Commissary</div>
      <div className={`p-4 rounded-2xl flex items-center justify-between mt-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
         <span className="text-[10px] font-black uppercase opacity-60">Balance</span>
         <span className="text-xl font-black text-indigo-500">{tokens} 🎟️</span>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4">
      {SHOP_ITEMS.map((item, idx) => (
        <button key={idx} onClick={() => onBuy(item)} className={`p-5 rounded-[2.5rem] border flex items-center gap-6 text-left transition-all active:scale-95 ${isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-500 shadow-sm'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>{item.icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-black text-sm uppercase truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.name}</h4>
            <p className="text-[9px] text-slate-500 leading-tight mb-2">{item.description}</p>
            <div className="text-indigo-500 font-black text-xs">{item.price} 🎟️</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

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

export const QuestPanel: React.FC<{ quests: Quest[], achievements: Achievement[], parkScore: number, onClaim: (id: string) => void, isDark: boolean }> = ({ quests, achievements, parkScore, onClaim, isDark }) => (
  <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
    <div className={`p-8 rounded-[3rem] border shadow-sm mb-8 flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className="min-w-0 flex-1">
        <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>The Tasks</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Daily Patrol</p>
      </div>
      <div className="text-3xl font-black text-indigo-500 ml-4 flex items-center">{parkScore} <StarIcon className="w-6 h-6 text-yellow-400 ml-2" /></div>
    </div>
    <div className="space-y-6">
      {quests.map(q => (
        <div key={q.id} className={`p-6 rounded-[2.5rem] border shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${q.completed ? 'opacity-40 grayscale' : ''}`}>
          <div className="flex justify-between items-start mb-2">
             <div className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase mb-1">{q.type}</div>
             <div className="text-[9px] font-black text-emerald-500">+{q.rewardXP} XP / +{q.rewardTokens} 🎟️</div>
          </div>
          <h4 className={`font-black text-sm uppercase truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{q.title}</h4>
          <p className="text-[10px] text-slate-500 mb-4">{q.description}</p>
          <div className={`w-full h-3 rounded-full overflow-hidden mb-4 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(q.progress / q.target) * 100}%` }}></div>
          </div>
          {q.progress >= q.target && !q.completed && (
            <button onClick={() => onClaim(q.id)} className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-indigo-500/20">Claim Reward</button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const BasePanel: React.FC<{ elders: Elder[], inventory: Gear[], tokens: number, onHealAll: () => void, onEquipElder: (elderId: string, item: Gear) => void, onDividendClaim: () => void, onMoveToTeam: (id: string) => void, onMoveToStandby: (id: string) => void, lastCheckIn?: number, onCheckIn: () => void, streak: number, lastDividendClaim?: number, isDark: boolean }> = ({ elders, inventory, tokens, onHealAll, onEquipElder, onDividendClaim, onMoveToTeam, onMoveToStandby, lastCheckIn, onCheckIn, streak, lastDividendClaim, isDark }) => {
  const [selectedItem, setSelectedItem] = useState<Gear | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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
        <button onClick={onHealAll} className="relative z-10 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">
          <BeakerIcon className="w-4 h-4" /> Silver Springs Rehab (25 🎟️)
        </button>
      </div>

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
                  <div className="flex gap-2 mt-3">
                    {e.status === 'Team' ? <button onClick={() => onMoveToStandby(e.id)} className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>Bench</button> : <button onClick={() => onMoveToTeam(e.id)} className="flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase bg-indigo-600 text-white shadow-lg shadow-indigo-900/10">Assign to Squad</button>}
                  </div>
                </div>
              </div>
              <HealthBar hp={e.hp} maxHp={e.maxHp} isDark={isDark} /><StatsGrid elder={e} isDark={isDark} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onMoveToStandby(e.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Bench</button>
                  {!e.isRoaming && <button onClick={() => onSetRoamer(e.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-indigo-900/10">Neighborhood Lead</button>}
                </div>
              </div>
            </div>
            <HealthBar hp={e.hp} maxHp={e.maxHp} isDark={isDark} /><StatsGrid elder={e} isDark={isDark} />
          </div>
        ))}
        {team.length === 0 && <div className="text-center py-20 opacity-30 italic text-xs uppercase font-black tracking-widest leading-relaxed">Squad is empty. Assign elders in the Park Hub.</div>}
      </div>
    </div>
  );
};
