import React, { useMemo, useState } from 'react';
import { PASS_PRICE, PASS_HOLD_MAX, ANTIQUES, ANTIQUE_CYCLE_DAYS, PVP_GEAR, DINERS_DAILY_CAP, antiqueDayIndex, antiquesForDay, daysUntilAntique, GEAR_RARITY_COLOR, GEAR_SLOT_STAT_SHORT, gearSlotKey } from '../constants';

// PvP Shop: TV Dinners (earned only from Friend Battles, Arena, Raids and Court Ladder wins) buy antiques that
// rotate daily and gear that is only sold here. Never PP, never passive income.
const PvpShop: React.FC<{
  isDark: boolean; diners: number; earnedToday: number; owned: string[];
  onBuyAntique: (id: string) => void; onBuyGear: (id: string) => void; onClose: () => void;
  passes: { arena: number; raid: number }; onBuyPass: (kind: 'arena' | 'raid') => void;
}> = ({ isDark, diners, earnedToday, owned, onBuyAntique, onBuyGear, onClose, passes, onBuyPass }) => {
  const [tab, setTab] = useState<'antiques' | 'gear' | 'boosts' | 'collection'>('antiques');
  const day = antiqueDayIndex();
  const today = useMemo(() => antiquesForDay(day), [day]);
  const ownedSet = new Set(owned);
  const hoursLeft = Math.max(1, Math.ceil(((day + 1) * 86400000 - Date.now()) / 3600000));
  const card = `p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const tabBtn = (id: typeof tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2 rounded-xl text-[13px] font-black uppercase ${tab === id ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
  );
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">PvP Shop</h2>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-[var(--accent-600)] text-white text-[13px] font-black uppercase">✕ Close</button>
        </div>
        <div className={`p-3 rounded-2xl mb-3 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div>
            <div className="text-[12px] font-black uppercase opacity-60">Your TV Dinners</div>
            <div className="text-xl font-black text-[var(--accent-500)]">{diners} 🍽️</div>
          </div>
          <div className="text-right text-[12px] font-bold opacity-70">Earned today: {Math.min(earnedToday, DINERS_DAILY_CAP)}/{DINERS_DAILY_CAP}<br />From Friend Battles, Arenas, Raids and Court Ladders</div>
        </div>
        <div className="flex gap-2 mb-3">{tabBtn('antiques', 'Antiques')}{tabBtn('gear', 'Gear')}{tabBtn('boosts', 'Boosts')}{tabBtn('collection', 'Collection')}</div>

        {tab === 'antiques' && (
          <div className="space-y-3">
            <p className="text-[13px] opacity-70">Four antiques are on sale each day and change in about {hoursLeft}h. Each one unlocks a profile icon and title. Miss one and you wait for it to come back around, since all {ANTIQUES.length} cycle through in {ANTIQUE_CYCLE_DAYS} days or more.</p>
            {today.map(a => {
              const has = ownedSet.has(a.id);
              return (
                <div key={a.id} className={`${card} flex items-center gap-3`} style={{ borderColor: GEAR_RARITY_COLOR[a.rarity] }}>
                  <div className="text-4xl">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black uppercase text-[15px] truncate">{a.name}</div>
                    <div className="text-[12px] font-black" style={{ color: GEAR_RARITY_COLOR[a.rarity] }}>{a.rarity} · title: {a.title}</div>
                  </div>
                  <button disabled={has || diners < a.price} onClick={() => onBuyAntique(a.id)} className={`px-3 py-2 rounded-xl font-black uppercase text-[13px] ${has ? 'bg-emerald-600 text-white' : diners >= a.price ? 'bg-[var(--accent-600)] text-white active:scale-95' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>
                    {has ? 'Owned' : `${a.price} 🍽️`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'gear' && (
          <div className="space-y-3">
            <p className="text-[13px] opacity-70">Gear sold only here, stronger than most drops. It goes to your Park Hub inventory; the slot decides which stat it boosts.</p>
            {PVP_GEAR.map(g => (
              <div key={g.id} className={`${card} flex items-center gap-3`} style={{ borderColor: GEAR_RARITY_COLOR[g.rarity] }}>
                <div className="text-3xl">{g.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase text-[15px] truncate">{g.name}</div>
                  <div className="text-[12px] font-black" style={{ color: GEAR_RARITY_COLOR[g.rarity] }}>{g.rarity} · {g.slot} slot · +{g.boost} {GEAR_SLOT_STAT_SHORT[gearSlotKey(g.slot)]}</div>
                </div>
                <button disabled={diners < g.price} onClick={() => onBuyGear(g.id)} className={`px-3 py-2 rounded-xl font-black uppercase text-[13px] ${diners >= g.price ? 'bg-[var(--accent-600)] text-white active:scale-95' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>{g.price} 🍽️</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'boosts' && (
          <div className="space-y-3">
            <p className="text-[13px] opacity-70">One-use passes that pay a Ticket fee for you. They never raise the daily attempt limits and never change power or rewards. You can hold up to {PASS_HOLD_MAX} of each.</p>
            {([
              { kind: 'arena' as const, icon: '🎫', name: 'Attack Pass', desc: 'Waives the Ticket fee on one paid Arena attack (after your 5 free ones).' },
              { kind: 'raid' as const, icon: '🎟️', name: 'Rally Pass', desc: 'Waives the Ticket fee on one extra Raid attempt (after your 2 free ones).' },
            ]).map(b => (
              <div key={b.kind} className={`${card} flex items-center gap-3`}>
                <div className="text-3xl">{b.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase text-[15px]">{b.name} <span className="opacity-60">· held {passes[b.kind]}/{PASS_HOLD_MAX}</span></div>
                  <div className="text-[12px] opacity-70">{b.desc}</div>
                </div>
                <button disabled={diners < PASS_PRICE[b.kind] || passes[b.kind] >= PASS_HOLD_MAX} onClick={() => onBuyPass(b.kind)} className={`px-3 py-2 rounded-xl font-black uppercase text-[13px] ${diners >= PASS_PRICE[b.kind] && passes[b.kind] < PASS_HOLD_MAX ? 'bg-[var(--accent-600)] text-white active:scale-95' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>{PASS_PRICE[b.kind]} 🍽️</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'collection' && (
          <div>
            <p className="text-[13px] opacity-70 mb-3">You own {owned.length} of {ANTIQUES.length} antiques. Missing ones show when they next go on sale.</p>
            <div className="grid grid-cols-3 gap-2">
              {ANTIQUES.map(a => {
                const has = ownedSet.has(a.id);
                const d = has ? 0 : daysUntilAntique(a.id, day);
                return (
                  <div key={a.id} className={`p-2 rounded-xl border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} ${has ? '' : 'opacity-60'}`} style={has ? { borderColor: GEAR_RARITY_COLOR[a.rarity] } : undefined}>
                    <div className="text-2xl">{has ? a.icon : '❔'}</div>
                    <div className="text-[11px] font-black uppercase leading-tight truncate">{has ? a.name : a.rarity}</div>
                    <div className="text-[10px] font-bold opacity-70">{has ? 'Owned' : d === 0 ? 'On sale today' : `Back in ${d}d`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PvpShop;
