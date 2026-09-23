import React, { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  AMENITIES, getHousingCapacity, isImagePath, getBuildingLevel, buildingUpgradeMaterials, buildingUpgradeTickets,
  producerRatePerHour, producerStored, MAX_BUILDING_LEVEL, BUILDING_STORAGE_HOURS, type Amenity,
} from '../constants';

// True for any building whose level actually changes something -- used to decide whether to show a
// level badge / "Lv N" upgrade button, vs. a plain "Built" badge for something truly decorative.
function hasLevelEffect(a: Amenity): boolean {
  return a.capacityBonus !== undefined || !!a.producer || !!a.hpRegen || !!a.producerBoost || !!a.structureDiscount || !!a.scoreTrickle || !!a.courtPurseBonus;
}
// One short line describing what a level of this building is currently worth, for the non-producer,
// non-housing effect types added 2026-09-22.
function effectLine(a: Amenity, level: number): string | null {
  if (a.hpRegen) return `Heals Team Elders ${(a.hpRegen.basePerHour + a.hpRegen.perLevelPerHour * (level - 1)).toFixed(1)}% max HP/hr`;
  if (a.producerBoost) return `+${(a.producerBoost.basePct + a.producerBoost.perLevelPct * (level - 1)).toFixed(1)}% output on every other working building`;
  if (a.structureDiscount) return `${(a.structureDiscount.basePct + a.structureDiscount.perLevelPct * (level - 1)).toFixed(1)}% off every map-building price`;
  if (a.scoreTrickle) return `+${(a.scoreTrickle.basePerHour + a.scoreTrickle.perLevelPerHour * (level - 1)).toFixed(2)} ⭐/hr`;
  if (a.courtPurseBonus) return `+${a.courtPurseBonus.perLevel * level} 🎟️ added to the Court Champion purse`;
  return null;
}
// Same, but for what the NEXT level would give -- shown in the upgrade button.
function nextEffectPreview(a: Amenity, nextLevel: number): string {
  if (a.hpRegen) return `(${(a.hpRegen.basePerHour + a.hpRegen.perLevelPerHour * (nextLevel - 1)).toFixed(1)}%/hr heal)`;
  if (a.producerBoost) return `(+${(a.producerBoost.basePct + a.producerBoost.perLevelPct * (nextLevel - 1)).toFixed(1)}% to other buildings)`;
  if (a.structureDiscount) return `(${(a.structureDiscount.basePct + a.structureDiscount.perLevelPct * (nextLevel - 1)).toFixed(1)}% off prices)`;
  if (a.scoreTrickle) return `(+${(a.scoreTrickle.basePerHour + a.scoreTrickle.perLevelPerHour * (nextLevel - 1)).toFixed(2)} ⭐/hr)`;
  if (a.courtPurseBonus) return `(+${a.courtPurseBonus.perLevel * nextLevel} 🎟️ purse)`;
  return '';
}

interface GroundsPanelProps {
  isDark: boolean;
  parcelCount?: number;
  comfortBonus?: number; // +fraction of building output from Elder Comfort (0.12 = +12%)
  buildingMaterials: number;
  tickets: number;
  builtAmenityIds: string[];
  amenityLevels: Record<string, number>;
  amenityCollectedAt: Record<string, number>;
  totalRosterCount: number;
  onBuild: (amenityId: string) => void;
  onUpgrade: (amenityId: string) => void;
  onCollect: (amenityId: string) => void;
  onClose: () => void;
}

const GroundsPanel: React.FC<GroundsPanelProps> = ({
  isDark, buildingMaterials, tickets, builtAmenityIds, amenityLevels, amenityCollectedAt, totalRosterCount, parcelCount = 0, comfortBonus = 0,
  onBuild, onUpgrade, onCollect, onClose,
}) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const housing = AMENITIES.filter(a => a.category === 'housing');
  const working = AMENITIES.filter(a => a.category === 'production');
  const decorations = AMENITIES.filter(a => a.category === 'decoration');
  const capacity = getHousingCapacity(builtAmenityIds, amenityLevels, parcelCount);

  const body = isDark ? 'text-slate-200' : 'text-slate-700';
  const strong = isDark ? 'text-white' : 'text-slate-900';
  const card = `p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`;
  const disabledBtn = isDark ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-600 cursor-not-allowed';

  const renderIcon = (amenity: Amenity) => (
    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl">
      {isImagePath(amenity.icon) ? <img src={amenity.icon} alt={amenity.name} className="w-full h-full object-cover" /> : amenity.icon}
    </div>
  );

  const renderUpgrade = (amenity: Amenity) => {
    const level = getBuildingLevel(amenityLevels, amenity.id);
    if (level >= MAX_BUILDING_LEVEL) {
      return <p className={`text-[12px] font-black uppercase mt-2 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Max level</p>;
    }
    const mats = buildingUpgradeMaterials(amenity, level);
    const tix = buildingUpgradeTickets(level);
    const can = buildingMaterials >= mats && tickets >= tix;
    let preview = '';
    if (amenity.capacityBonus !== undefined) preview = `(+${amenity.capacityPerLevel ?? 0} capacity)`;
    else if (amenity.producer) preview = `(${producerRatePerHour(amenity, level + 1)}/hr)`;
    else preview = nextEffectPreview(amenity, level + 1);
    return (
      <button
        onClick={() => onUpgrade(amenity.id)}
        disabled={!can}
        className={`mt-2 w-full px-3 py-2 rounded-xl text-[12px] font-black uppercase ${can ? 'bg-[var(--accent-600)] text-white' : disabledBtn}`}
      >
        Upgrade to Lv {level + 1}: {mats} 🧱 + {tix} 🎟️ {preview}
      </button>
    );
  };

  const renderBuildButton = (amenity: Amenity) => {
    const canAfford = buildingMaterials >= amenity.cost;
    return (
      <button
        onClick={() => onBuild(amenity.id)}
        disabled={!canAfford}
        className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase flex-shrink-0 ${canAfford ? 'bg-[var(--accent-600)] text-white' : disabledBtn}`}
      >
        {amenity.cost} 🧱
      </button>
    );
  };

  const renderCard = (amenity: Amenity) => {
    const built = builtAmenityIds.includes(amenity.id);
    const level = getBuildingLevel(amenityLevels, amenity.id);
    const isHousing = amenity.category === 'housing';
    const isWorking = !!amenity.producer;
    const levels = hasLevelEffect(amenity);
    const otherEffect = !isHousing && !isWorking ? effectLine(amenity, level) : null;
    const stored = isWorking && built ? producerStored(amenity, level, amenityCollectedAt[amenity.id], now, comfortBonus) : 0;
    const rate = isWorking ? producerRatePerHour(amenity, level) * (1 + comfortBonus) : 0;
    const cap = Math.floor(rate * BUILDING_STORAGE_HOURS);
    const unit = amenity.producer?.output === 'tickets' ? '🎟️' : '🧱';
    const cottageBonus = isHousing ? (amenity.capacityBonus ?? 0) + (amenity.capacityPerLevel ?? 0) * (level - 1) : 0;
    const accent = isDark ? 'text-[var(--accent-300)]' : 'text-[var(--accent-700)]';

    return (
      <div key={amenity.id} className={card}>
        <div className="flex items-center gap-3">
          {renderIcon(amenity)}
          <div className="flex-1 min-w-0">
            <p className={`font-black text-sm uppercase flex items-center gap-2 ${strong}`}>
              <span className="truncate">{amenity.name}</span>
              {built && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              {built && levels && <span className={`text-[12px] font-black flex-shrink-0 ${accent}`}>Lv {level}</span>}
            </p>
            <p className={`text-[13px] ${body}`}>{amenity.flavor}</p>
            {isHousing && (
              <p className={`text-[13px] font-black mt-1 ${accent}`}>
                {built ? `+${cottageBonus} roster capacity now` : `+${amenity.capacityBonus} roster capacity`}
              </p>
            )}
            {isWorking && (
              <p className={`text-[13px] font-black mt-1 ${accent}`}>
                Makes {rate}{unit}/hr · holds up to {cap}{unit}
              </p>
            )}
            {otherEffect && built && (
              <p className={`text-[13px] font-black mt-1 ${accent}`}>{otherEffect}</p>
            )}
          </div>
          {!built && renderBuildButton(amenity)}
          {built && !levels && <span className={`text-[12px] font-black uppercase flex-shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Built</span>}
        </div>

        {built && isWorking && (
          <div className="mt-3">
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}>
              <div className="h-full bg-[var(--accent-500)] rounded-full transition-all" style={{ width: `${cap > 0 ? Math.min(100, (stored / cap) * 100) : 0}%` }} />
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className={`text-[13px] font-black ${body}`}>Holding {stored} / {cap} {unit}</p>
              <button
                onClick={() => onCollect(amenity.id)}
                disabled={stored <= 0}
                className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase ${stored > 0 ? 'bg-emerald-500 text-white' : disabledBtn}`}
              >
                Collect
              </button>
            </div>
          </div>
        )}
        {built && levels && renderUpgrade(amenity)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <div className={`rounded-[3rem] p-8 w-full max-w-sm flex flex-col shadow-2xl border-4 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${strong}`}>My Grounds</h2>
          <button onClick={onClose} className={`p-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div>
            <p className={`text-[12px] font-black uppercase tracking-widest ${body}`}>Building Materials</p>
            <p className={`font-black text-xl ${strong}`}>{buildingMaterials} 🧱</p>
          </div>
          <div className="text-right">
            <p className={`text-[12px] font-black uppercase tracking-widest ${body}`}>Residents</p>
            <p className={`font-black text-xl ${totalRosterCount >= capacity ? 'text-amber-500' : strong}`}>{totalRosterCount}/{capacity}</p>
          </div>
        </div>
        {totalRosterCount >= capacity && (
          <p className={`text-[13px] font-bold mb-4 -mt-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Your park is full, so you can't guide new residents in until you upgrade the Retirement Cottage or scrap a Folk. (Nobody already here is removed.)
          </p>
        )}

        <h3 className={`text-[15px] font-black uppercase tracking-[0.2em] mb-1 ${body}`}>Housing</h3>
        <p className={`text-[13px] mb-3 ${body}`}>Room for residents: {capacity} total. Every Parcel you own on the map adds +1 (up to +10), and the Retirement Cottage adds more with each level.</p>
        <div className="space-y-2 mb-8">{housing.map(renderCard)}</div>

        <h3 className={`text-[15px] font-black uppercase tracking-[0.2em] mb-1 ${body}`}>Working Buildings</h3>
        <p className={`text-[13px] mb-3 ${body}`}>They make a limited amount of Tickets or Building Materials. Collect regularly, since they stop at {BUILDING_STORAGE_HOURS} hours of output. Your Elders' Comfort adds <span className="font-black">+{Math.round(comfortBonus * 100)}%</span> to everything they make.</p>
        <div className="space-y-2 mb-8">{working.map(renderCard)}</div>

        <h3 className={`text-[15px] font-black uppercase tracking-[0.2em] mb-1 ${body}`}>Amenities</h3>
        <p className={`text-[13px] mb-3 ${body}`}>Purely for show. Friends see these when they visit.</p>
        <div className="space-y-2">{decorations.map(renderCard)}</div>
      </div>
    </div>
  );
};

export default GroundsPanel;
