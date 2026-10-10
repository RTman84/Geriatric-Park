import React, { useState } from 'react';
import type { Elder, Gear } from '../types';
import {
  ItemIcon, ElderAvatarImg, gearSlotKey, getGearMaxLevel, getGearUpgradeCost, getGearSellValue, getEffectiveGearBoost,
  applyUpgradeDiscount, applySalvageBonus, GEAR_RARITY_COLOR, rarityCardStyle,
} from '../constants';
import { Gfx } from './Gfx';

// Tinker's Workshop window: everything to do with gear in one place (upgrade, salvage, equip).
// The building is optional -- without it the same actions work at the base prices; its level discounts upgrades
// and boosts salvage (see workshopUpgradeDiscountPct / workshopSalvageBonusPct in constants.tsx).
interface Props {
  isDark: boolean; inventory: Gear[]; elders: Elder[]; tokens: number; materials: number;
  built: boolean; level: number; upgradeDiscountPct: number; salvageBonusPct: number;
  onUpgrade: (id: string) => void; onSell: (id: string) => void; onSellMany: (ids: string[]) => void; onEquip: (elderId: string, item: Gear) => void; onClose: () => void;
}
const SLOT_STAT: Record<string, string> = { head: 'Wit', body: 'Tenacity', accessory: 'Strength', charm: 'Agility' };

const WorkshopPanel: React.FC<Props> = ({ isDark, inventory, elders, tokens, materials, built, level, upgradeDiscountPct, salvageBonusPct, onUpgrade, onSell, onSellMany, onEquip, onClose }) => {
  const [sel, setSel] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [sort, setSort] = useState<'rarity' | 'level' | 'power' | 'slot' | 'name'>('rarity');
  const [desc, setDesc] = useState(true);
  const [slotFilter, setSlotFilter] = useState<'All' | 'Head' | 'Body' | 'Accessory' | 'Charm'>('All');
  const [rarityFilter, setRarityFilter] = useState<'All' | 'Common' | 'Rare' | 'Epic' | 'Legendary'>('All');
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const RANK: Record<string, number> = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };
  const shown = inventory
    .filter(i => (slotFilter === 'All' || i.slot === slotFilter) && (rarityFilter === 'All' || (i.rarity ?? 'Common') === rarityFilter))
    .sort((a, b) => {
      const d = sort === 'rarity' ? RANK[a.rarity ?? 'Common'] - RANK[b.rarity ?? 'Common']
        : sort === 'level' ? (a.level ?? 1) - (b.level ?? 1)
        : sort === 'power' ? getEffectiveGearBoost(a) - getEffectiveGearBoost(b)
        : sort === 'slot' ? a.slot.localeCompare(b.slot)
        : a.name.localeCompare(b.name);
      return desc ? -d : d;
    });
  const pickedItems = inventory.filter(i => picked.includes(i.id));
  const pickedTotal = pickedItems.reduce((t, i) => { const v = applySalvageBonus(getGearSellValue(i), salvageBonusPct); return { tickets: t.tickets + v.tickets, materials: t.materials + v.materials }; }, { tickets: 0, materials: 0 });
  const togglePick = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const salvagePicked = () => {
    if (!pickedItems.length) return;
    if (pickedItems.some(i => (i.rarity ?? 'Common') === 'Epic' || (i.rarity ?? 'Common') === 'Legendary') && !window.confirm('Your selection includes Epic or Legendary gear. Salvage it anyway?')) return;
    onSellMany(pickedItems.map(i => i.id)); setPicked([]); setMulti(false);
  };
  const item = inventory.find(i => i.id === sel) ?? null;
  const card = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';
  const sub = isDark ? 'bg-slate-800' : 'bg-slate-100';
  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3">
      <div className={`w-full max-w-md h-[92vh] rounded-[2.5rem] border shadow-2xl p-5 flex flex-col ${card}`}>
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h2 className="text-[20px] font-black uppercase italic">Tinker's Workshop</h2>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-black uppercase text-[13px] active:scale-95">Close</button>
        </div>
        <div className={`p-3 rounded-2xl mb-3 text-[13px] font-bold flex-shrink-0 ${sub}`}>
          {built
            ? <>Workshop Lv {level}: <span className="text-green-500">-{upgradeDiscountPct}% upgrade cost</span>, <span className="text-green-500">+{salvageBonusPct}% salvage</span>. Level it up in Grounds for more.</>
            : <>No Workshop built yet. Build one in Grounds for cheaper upgrades and better salvage (it also adds room and XP for visiting Elders).</>}
          <div className="mt-1 opacity-80">You have {tokens} <Gfx e="🎟️" size={16} /> and {materials} <Gfx e="🧱" size={16} /></div>
        </div>
        {!item ? (
          <>
            <div className="flex gap-2 mb-2 flex-wrap flex-shrink-0">
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className={`flex-1 min-w-[7rem] rounded-xl px-2 py-2 text-[13px] font-black ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                <option value="rarity">Sort: Rarity</option><option value="level">Sort: Level</option><option value="power">Sort: Bonus</option><option value="slot">Sort: Slot</option><option value="name">Sort: Name</option>
              </select>
              <button onClick={() => setDesc(d => !d)} className={`px-3 py-2 rounded-xl text-[13px] font-black ${sub}`}>{desc ? 'High first' : 'Low first'}</button>
              <select value={slotFilter} onChange={e => setSlotFilter(e.target.value as typeof slotFilter)} className={`flex-1 min-w-[6rem] rounded-xl px-2 py-2 text-[13px] font-black ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {['All', 'Head', 'Body', 'Accessory', 'Charm'].map(x => <option key={x} value={x}>{x === 'All' ? 'All slots' : x}</option>)}
              </select>
              <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as typeof rarityFilter)} className={`flex-1 min-w-[6rem] rounded-xl px-2 py-2 text-[13px] font-black ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {['All', 'Common', 'Rare', 'Epic', 'Legendary'].map(x => <option key={x} value={x}>{x === 'All' ? 'All rarities' : x}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mb-2 flex-shrink-0">
              <button onClick={() => { setMulti(m => !m); setPicked([]); }} className={`flex-1 py-2 rounded-xl font-black uppercase text-[12px] active:scale-95 ${multi ? 'bg-rose-600 text-white' : sub}`}>{multi ? 'Cancel multi-salvage' : 'Multi-salvage'}</button>
              {multi && <button onClick={() => setPicked(shown.map(i => i.id))} className={`px-3 py-2 rounded-xl font-black uppercase text-[12px] active:scale-95 ${sub}`}>Select all shown</button>}
              {multi && picked.length > 0 && <button onClick={() => setPicked([])} className={`px-3 py-2 rounded-xl font-black uppercase text-[12px] active:scale-95 ${sub}`}>Clear</button>}
            </div>
            <div className="flex-1 overflow-y-auto">
              {shown.length === 0 ? <div className="text-center py-16 opacity-40 font-black uppercase text-sm">{inventory.length === 0 ? 'No gear to work on yet' : 'Nothing matches those filters'}</div> : (
                <div className="grid grid-cols-3 gap-2">
                  {shown.map(i => {
                    const on = picked.includes(i.id);
                    return (
                      <button key={i.id} onClick={() => multi ? togglePick(i.id) : (setSel(i.id), setPicking(false))} className={`relative p-2 aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 ${sub} ${on ? 'ring-4 ring-rose-500' : ''}`} style={rarityCardStyle(i.rarity)}>
                        {multi && <span className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 text-[12px] font-black flex items-center justify-center ${on ? 'bg-rose-500 border-white text-white' : 'border-slate-400'}`}>{on ? '\u2713' : ''}</span>}
                        <ItemIcon name={i.name} icon={i.icon} size={48} />
                        <span className="text-[11px] leading-tight font-black uppercase text-center line-clamp-2">{i.name}</span>
                        <span className="text-[10px] font-black opacity-60">Lv.{i.level ?? 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {multi && (
              <button onClick={salvagePicked} disabled={!picked.length} className={`mt-2 py-3 rounded-2xl font-black uppercase text-[13px] flex-shrink-0 active:scale-95 ${picked.length ? 'bg-rose-600 text-white' : 'opacity-40 border-2 border-slate-400'}`}>
                {picked.length ? <>Salvage {picked.length} items: +{pickedTotal.tickets} <Gfx e="🎟️" size={16} /> +{pickedTotal.materials} <Gfx e="🧱" size={16} /></> : 'Tap gear to select it'}
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => setSel(null)} className="mb-2 text-[13px] font-black uppercase opacity-70">&larr; All gear</button>
            <div className="flex items-center gap-3 mb-2">
              <ItemIcon name={item.name} icon={item.icon} size={52} />
              <div className="min-w-0">
                <div className="text-[16px] font-black uppercase truncate">{item.name}</div>
                <div className="text-[12px] font-black uppercase opacity-70">{item.rarity ?? 'Common'} - {item.slot} slot</div>
              </div>
            </div>
            {(() => {
              const lvl = item.level ?? 1, max = getGearMaxLevel(item), now = getEffectiveGearBoost(item);
              const next = lvl < max ? getEffectiveGearBoost({ ...item, level: lvl + 1 }) : null;
              const stat = SLOT_STAT[gearSlotKey(item.slot)];
              const cost = applyUpgradeDiscount(getGearUpgradeCost(item), upgradeDiscountPct);
              const ok = tokens >= cost.tickets && materials >= cost.materials;
              const sell = applySalvageBonus(getGearSellValue(item), salvageBonusPct);
              return (
                <>
                  <div className={`p-3 rounded-2xl mb-3 ${sub}`}>
                    <div className="flex items-baseline justify-between"><span className="text-[22px] font-black">+{now} {stat}</span><span className="text-[14px] font-black">Level {lvl} / {max}</span></div>
                    <div className="text-[13px] font-bold mt-1">{next !== null ? <>Next level: <span className="text-green-500">+{next} {stat}</span></> : 'Maximum level reached'}</div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {lvl < max && (
                      <button onClick={() => onUpgrade(item.id)} disabled={!ok} className={`flex-1 py-3 rounded-2xl font-black uppercase text-[12px] tracking-wide border-2 active:scale-95 ${ok ? 'bg-[var(--accent-500)] border-[var(--accent-400)] text-white' : 'opacity-40 border-slate-400'}`}>
                        Upgrade: {cost.tickets} <Gfx e="🎟️" size={16} /> + {cost.materials} <Gfx e="🧱" size={16} />
                      </button>
                    )}
                    <button onClick={() => { onSell(item.id); setSel(null); }} className="py-3 px-3 rounded-2xl font-black uppercase text-[12px] border-2 border-rose-300 text-rose-500 active:scale-95">
                      Salvage: {sell.tickets} <Gfx e="🎟️" size={16} /> + {sell.materials} <Gfx e="🧱" size={16} />
                    </button>
                  </div>
                  <button onClick={() => setPicking(p => !p)} className="w-full py-3 rounded-2xl font-black uppercase text-[13px] bg-emerald-600 text-white active:scale-95 mb-2">{picking ? 'Hide Elders' : 'Give to an Elder'}</button>
                  {picking && (
                    <div className="space-y-2">
                      {elders.filter(e => !e.awayUntil || e.awayUntil < Date.now()).map(e => {
                        const occ = e.equipment?.[gearSlotKey(item.slot)];
                        return (
                          <button key={e.id} onClick={() => { onEquip(e.id, item); setSel(null); setPicking(false); }} className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left active:scale-95 ${sub}`}>
                            <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} size={40} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[14px] font-black uppercase truncate">{e.name}</div>
                              <div className="text-[11px] font-black uppercase opacity-60">{occ ? `Replaces ${occ.name}` : `Empty ${item.slot} slot`}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
export default WorkshopPanel;
