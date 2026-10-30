import React, { useState, useMemo } from 'react';
import type { Elder, Gear } from '../types';
import {
  ItemIcon, gearSlotKey, getGearMaxLevel, getGearUpgradeCost, getEffectiveGearBoost, applyUpgradeDiscount,
  gearLevelScale, GEAR_RARITY_COLOR, GEAR_SLOT_STAT_SHORT,
} from '../constants';
import { Gfx } from './Gfx';

type SlotKey = 'head' | 'body' | 'accessory' | 'charm';
const STAT_NAME: Record<SlotKey, string> = { head: 'Wit', body: 'Tenacity', accessory: 'Strength', charm: 'Agility' };

// Shared "equipped gear" card used on EVERY screen (Team, Park Hub, ...): tap equipped gear to open it. It shows level, rarity and
// the REAL value at this Elder's level, a side-by-side compare against the best matching piece in the bag (automatic), and
// upgrade / swap / remove without unequipping first. Hover on desktop shows the same facts through EquippedGearSlot's tooltip.
export interface GearActions {
  inventory: Gear[]; tokens: number; materials: number; upgradeDiscountPct?: number;
  onUpgrade?: (itemId: string) => void;
  onUnequip?: (elderId: string, slot: SlotKey) => void;
  onEquip?: (elderId: string, item: Gear) => void;
}

const real = (item: Gear, elder: Elder) => Math.round(getEffectiveGearBoost(item) * gearLevelScale(elder.level));

export const GearInspector: React.FC<{ elder: Elder; slotKey: SlotKey; isDark: boolean; onClose: () => void } & GearActions> = ({
  elder, slotKey, isDark, onClose, inventory, tokens, materials, upgradeDiscountPct = 0, onUpgrade, onUnequip, onEquip,
}) => {
  // Look the equipped piece up live so an in-place upgrade updates the card immediately.
  const live: Gear | undefined = (elder.equipment as any)?.[slotKey];
  const candidates = useMemo(() => inventory.filter(i => gearSlotKey(i.slot) === slotKey).sort((a, b) => getEffectiveGearBoost(b) - getEffectiveGearBoost(a)), [inventory, slotKey]);
  const [pickId, setPickId] = useState<string | null>(null);
  const cand = candidates.find(c => c.id === pickId) ?? candidates[0] ?? null; // auto-compare against the best piece in the bag
  if (!live) return null;
  const stat = STAT_NAME[slotKey];
  const lvl = live.level ?? 1, max = getGearMaxLevel(live);
  const cost = applyUpgradeDiscount(getGearUpgradeCost(live), upgradeDiscountPct);
  const canAfford = tokens >= cost.tickets && materials >= cost.materials;
  const scale = gearLevelScale(elder.level);
  const bg = isDark ? 'bg-slate-900 border-[var(--accent-500-a20)] text-white' : 'bg-white border-slate-100 text-slate-800';
  const sub = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const Col: React.FC<{ title: string; item: Gear }> = ({ title, item }) => {
    const v = real(item, elder);
    const c = GEAR_RARITY_COLOR[(item.rarity ?? 'Common') as keyof typeof GEAR_RARITY_COLOR];
    return (
      <div className={`flex-1 min-w-0 p-2 rounded-2xl border-2 flex flex-col items-center text-center ${sub}`} style={{ borderColor: c }}>
        <div className="text-[10px] font-black uppercase opacity-60">{title}</div>
        <ItemIcon name={item.name} icon={item.icon} size={44} rarity={item.rarity} />
        <div className="text-[12px] font-black uppercase leading-tight line-clamp-2 w-full">{item.name}</div>
        <div className="text-[11px] font-black" style={{ color: c }}>{item.rarity ?? 'Common'}</div>
        <div className="text-[11px] font-bold opacity-80">Lv.{item.level ?? 1} / {getGearMaxLevel(item)}</div>
        <div className="text-[16px] font-black">+{v} {GEAR_SLOT_STAT_SHORT[slotKey]}</div>
      </div>
    );
  };
  const diff = cand ? real(cand, elder) - real(live, elder) : 0;
  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm max-h-full overflow-y-auto rounded-[2.5rem] border shadow-2xl p-5 ${bg}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-[15px] font-black uppercase italic truncate">{elder.name}'s {slotKey}</div>
            <div className="text-[12px] font-bold opacity-70">Boosts {stat}{scale > 1 ? ` · x${scale.toFixed(1)} at Elder level ${elder.level}` : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex-shrink-0 w-11 h-11 rounded-full bg-slate-200 text-slate-700 text-[20px] font-black active:scale-90">&#10005;</button>
        </div>
        <div className="flex gap-2 items-stretch mb-3">
          <Col title="Equipped" item={live} />
          {cand && <Col title="In your bag" item={cand} />}
        </div>
        {cand ? (
          <div className={`text-center text-[14px] font-black mb-2 ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-rose-500' : 'opacity-70'}`}>
            {diff > 0 ? `Swap gives +${diff} ${stat}` : diff < 0 ? `Swap loses ${-diff} ${stat}` : 'Same bonus'}
          </div>
        ) : <div className="text-center text-[13px] font-bold opacity-60 mb-2">No other {slotKey} gear in your bag to compare.</div>}
        {candidates.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {candidates.map(c => (
              <button key={c.id} onClick={() => setPickId(c.id)} className={`flex-shrink-0 p-1.5 rounded-xl border-2 ${cand?.id === c.id ? 'bg-[var(--accent-600)]' : sub}`} style={{ borderColor: GEAR_RARITY_COLOR[(c.rarity ?? 'Common') as keyof typeof GEAR_RARITY_COLOR] }}>
                <ItemIcon name={c.name} icon={c.icon} size={34} rarity={c.rarity} />
                <div className="text-[10px] font-black">Lv.{c.level ?? 1}</div>
              </button>
            ))}
          </div>
        )}
        <div className={`p-3 rounded-2xl mb-3 text-[13px] font-bold ${sub}`}>
          Base +{live.boost} · {lvl < max ? <>Next level: <span className="text-green-500">+{real({ ...live, level: lvl + 1 }, elder)} {GEAR_SLOT_STAT_SHORT[slotKey]}</span></> : 'Maximum level reached'}
        </div>
        <div className="flex flex-col gap-2">
          {onUpgrade && lvl < max && (
            <button onClick={() => onUpgrade(live.id)} disabled={!canAfford} className={`py-3 rounded-2xl font-black uppercase text-[13px] border-2 active:scale-95 ${canAfford ? 'bg-[var(--accent-500)] border-[var(--accent-400)] text-white' : 'opacity-40 border-slate-400'}`}>
              Upgrade in place: {cost.tickets} <Gfx e="🎟️" size={16} /> + {cost.materials} <Gfx e="🧱" size={16} />
            </button>
          )}
          {onEquip && cand && (
            <button onClick={() => { onEquip(elder.id, cand); onClose(); }} className="py-3 rounded-2xl font-black uppercase text-[13px] bg-emerald-600 text-white active:scale-95">Swap in {cand.name}</button>
          )}
          {onUnequip && (
            <button onClick={() => { onUnequip(elder.id, slotKey); onClose(); }} className="py-3 rounded-2xl font-black uppercase text-[13px] border-2 border-rose-300 text-rose-500 active:scale-95">Remove to bag</button>
          )}
        </div>
      </div>
    </div>
  );
};

// One equipped-gear slot button used everywhere: tap opens the inspector, desktop hover shows level, rarity and real value.
export const EquippedGearSlot: React.FC<{ elder: Elder; slotKey: SlotKey; isDark: boolean; children: (item: Gear | undefined) => React.ReactNode; className?: string; actions?: GearActions }> = ({ elder, slotKey, isDark, children, className = '', actions }) => {
  const [open, setOpen] = useState(false);
  const item: Gear | undefined = (elder.equipment as any)?.[slotKey];
  const tip = item ? `${item.name} · ${item.rarity ?? 'Common'} · Lv.${item.level ?? 1}/${getGearMaxLevel(item)} · +${real(item, elder)} ${GEAR_SLOT_STAT_SHORT[slotKey]} (tap to compare)` : `Empty ${slotKey} slot (boosts ${GEAR_SLOT_STAT_SHORT[slotKey]})`;
  return (
    <>
      <button type="button" disabled={!item} onClick={() => item && setOpen(true)} title={tip} className={className}>{children(item)}</button>
      {open && item && actions && <GearInspector elder={elder} slotKey={slotKey} isDark={isDark} onClose={() => setOpen(false)} {...actions} />}
    </>
  );
};
