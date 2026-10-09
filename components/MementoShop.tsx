import React from 'react';
import { Gfx, EmojiText } from './Gfx';
import { MEMENTO_PACKS, MEMENTOS_PER_PP, PP_TO_MEMENTOS_MIN, MEMENTO_ITEMS, MEMENTO_CYCLE_WEEKS, PREMIUM_ROOM_MAX, premiumRoomPrice, mementoItemsForWeek, mementoWeekIndex, weeksUntilMemento } from '../constants';

// Mementos Shop: the premium currency. Convenience and cosmetics only, nothing that raises PP, passive income or
// PvP/Arena/Raid power. Mementos are bought with real money in the store build (not available yet).
const MementoShop: React.FC<{
  packPrices?: Record<string, string>; canBuy?: boolean; buying?: boolean; onBuyPack?: (id: string) => void;
  isDark: boolean; pp: number; onConvertPp: (amount: number) => void; mementos: number; rooms: number; owned: string[];
  onBuyRoom: () => void; onBuyItem: (id: string) => void; onClose: () => void;
}> = ({ packPrices = {}, canBuy = false, buying = false, onBuyPack, isDark, pp, onConvertPp, mementos, rooms, owned, onBuyRoom, onBuyItem, onClose }) => {
  const week = mementoWeekIndex();
  const thisWeek = mementoItemsForWeek(week);
  const ownedSet = new Set(owned);
  const roomPrice = premiumRoomPrice(rooms);
  const card = `p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const btn = (ok: boolean) => `px-3 py-2 rounded-xl font-black uppercase text-[13px] ${ok ? 'bg-[var(--accent-600)] text-white active:scale-95' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Mementos Shop</h2>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-[var(--accent-600)] text-white text-[13px] font-black uppercase">✕ Close</button>
        </div>
        <div className={`p-3 rounded-2xl mb-2 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div>
            <div className="text-[12px] font-black uppercase opacity-60">Your Mementos</div>
            <div className="text-xl font-black text-amber-500">{mementos} <Gfx e="💛" /></div>
          </div>
          
        </div>
        <p className="text-[12px] opacity-70 mb-4">Mementos can be bought in the Google Play version of the game (coming) or converted from your PP below. Nothing here raises your earnings or your battle power: it is convenience and keepsakes only.</p>

        <h3 className="font-black uppercase text-[13px] opacity-60 mb-2">Buy Mementos</h3>
        <div className="space-y-2 mb-5">
          {MEMENTO_PACKS.map(p => (
            <div key={p.id} className={`${card} flex items-center gap-3`}>
              <div className="text-3xl"><Gfx e="💛" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-black uppercase text-[15px] truncate">{p.label}</div>
                <div className="text-[12px] opacity-70">{p.mementos} Mementos</div>
              </div>
              <button disabled={!canBuy || buying} onClick={() => onBuyPack?.(p.id)} className={btn(canBuy && !buying)}>{packPrices[p.id] ?? `$${p.usd.toFixed(2)}`}</button>
            </div>
          ))}
          {!canBuy && <p className="text-[12px] opacity-70">Packs can be bought in the Android app while signed in to your account. Nothing here is sold on the web.</p>}
        </div>

        <h3 className="font-black uppercase text-[13px] opacity-60 mb-2">Convert PP</h3>
        <div className={`${card} mb-5`}>
          <div className="text-[13px] opacity-80 mb-2">Spend earned PP on Mementos: 1 PP = {MEMENTOS_PER_PP} <Gfx e="💛" />. One way only, Mementos can never be turned back into PP. You have <b>{pp.toFixed(2)} PP</b>.</div>
          <div className="flex gap-2 flex-wrap">
            {[0.05, 0.1, 0.25, 0.5].map(a => (
              <button key={a} disabled={pp + 1e-9 < a} onClick={() => onConvertPp(a)} className={btn(pp + 1e-9 >= a)}>{a.toFixed(2)} PP → {Math.floor(a * MEMENTOS_PER_PP)} <Gfx e="💛" /></button>
            ))}
            <button disabled={pp < PP_TO_MEMENTOS_MIN} onClick={() => onConvertPp(Math.floor(pp * 100) / 100)} className={btn(pp >= PP_TO_MEMENTOS_MIN)}>All</button>
          </div>
        </div>

        <h3 className="font-black uppercase text-[13px] opacity-60 mb-2">Convenience</h3>
        <div className={`${card} flex items-center gap-3 mb-5`}>
          <div className="text-3xl">🏠</div>
          <div className="flex-1">
            <div className="font-black uppercase text-[15px]">Extra Roster Room</div>
            <div className="text-[12px] opacity-70">+1 Elder room · {rooms}/{PREMIUM_ROOM_MAX} bought · price rises with each room</div>
          </div>
          <button disabled={rooms >= PREMIUM_ROOM_MAX || mementos < roomPrice} onClick={onBuyRoom} className={btn(rooms < PREMIUM_ROOM_MAX && mementos >= roomPrice)}>{<EmojiText text={rooms >= PREMIUM_ROOM_MAX ? 'Maxed' : `${roomPrice} 💛`} />}</button>
        </div>

        <h3 className="font-black uppercase text-[13px] opacity-60 mb-1">Keepsakes of the week</h3>
        <p className="text-[12px] opacity-70 mb-2">Two keepsakes go on sale each week (each unlocks an icon and title). All {MEMENTO_ITEMS.length} rotate through every {MEMENTO_CYCLE_WEEKS} weeks or more.</p>
        <div className="space-y-3 mb-5">
          {thisWeek.map(m => {
            const has = ownedSet.has(m.id);
            return (
              <div key={m.id} className={`${card} flex items-center gap-3`}>
                <div className="text-4xl">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase text-[15px] truncate">{m.name}</div>
                  <div className="text-[12px] opacity-70">Title: {m.title}</div>
                </div>
                <button disabled={has || mementos < m.price} onClick={() => onBuyItem(m.id)} className={has ? 'px-3 py-2 rounded-xl font-black uppercase text-[13px] bg-emerald-600 text-white' : btn(mementos >= m.price)}>{<EmojiText text={has ? 'Owned' : `${m.price} 💛`} />}</button>
              </div>
            );
          })}
        </div>

        <h3 className="font-black uppercase text-[13px] opacity-60 mb-2">All keepsakes</h3>
        <div className="grid grid-cols-3 gap-2">
          {MEMENTO_ITEMS.map(m => {
            const has = ownedSet.has(m.id);
            const w = has ? 0 : weeksUntilMemento(m.id, week);
            return (
              <div key={m.id} className={`p-2 rounded-xl border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} ${has ? '' : 'opacity-60'}`}>
                <div className="text-2xl">{has ? m.icon : '❔'}</div>
                <div className="text-[11px] font-black uppercase leading-tight truncate">{has ? m.name : 'Keepsake'}</div>
                <div className="text-[10px] font-bold opacity-70">{has ? 'Owned' : w === 0 ? 'On sale now' : `Back in ${w}w`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default MementoShop;
