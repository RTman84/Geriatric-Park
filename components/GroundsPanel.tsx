import React from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { AMENITIES, getHousingCapacity, type Amenity } from '../constants';

interface GroundsPanelProps {
  isDark: boolean;
  buildingMaterials: number;
  builtAmenityIds: string[];
  totalRosterCount: number;
  onBuild: (amenityId: string) => void;
  onClose: () => void;
}

const GroundsPanel: React.FC<GroundsPanelProps> = ({ isDark, buildingMaterials, builtAmenityIds, totalRosterCount, onBuild, onClose }) => {
  const housing = AMENITIES.filter(a => a.category === 'housing');
  const decorations = AMENITIES.filter(a => a.category === 'decoration');
  const capacity = getHousingCapacity(builtAmenityIds);

  const renderCard = (amenity: Amenity) => {
    const built = builtAmenityIds.includes(amenity.id);
    const canAfford = buildingMaterials >= amenity.cost;
    return (
      <div key={amenity.id} className={`p-4 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <span className="text-3xl flex-shrink-0">{amenity.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm uppercase truncate flex items-center gap-2">
            {amenity.name}
            {built && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
          </p>
          <p className={`text-[13px] ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{amenity.flavor}</p>
          {amenity.capacityBonus && <p className="text-[12px] font-bold text-[var(--accent-500)] mt-1">+{amenity.capacityBonus} roster capacity</p>}
        </div>
        {built ? (
          <span className="text-[12px] font-black uppercase text-emerald-500 flex-shrink-0">Built</span>
        ) : (
          <button
            onClick={() => onBuild(amenity.id)}
            disabled={!canAfford}
            className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase flex-shrink-0 ${canAfford ? 'bg-[var(--accent-600)] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {amenity.cost} 🧱
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <div className={`rounded-[3rem] p-8 w-full max-w-sm flex flex-col shadow-2xl border-4 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">My Grounds</h2>
          <button onClick={onClose} className="text-slate-300 p-2"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div>
            <p className={`text-[12px] font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Building Materials</p>
            <p className="font-black text-xl">{buildingMaterials} 🧱</p>
          </div>
          <div className="text-right">
            <p className={`text-[12px] font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Roster</p>
            <p className={`font-black text-xl ${totalRosterCount > capacity ? 'text-amber-500' : ''}`}>{totalRosterCount}/{capacity}</p>
          </div>
        </div>
        {totalRosterCount > capacity && (
          <p className="text-[13px] font-bold text-amber-500 mb-4 -mt-2">Your roster's grown past your housing — build a Cottage when you can, just for the sake of it (nothing's blocked).</p>
        )}

        <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Housing</h3>
        <div className="space-y-2 mb-8">{housing.map(renderCard)}</div>

        <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Amenities</h3>
        <p className={`text-[13px] mb-3 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Purely for show — friends see these when they visit. No passive bonus.</p>
        <div className="space-y-2">{decorations.map(renderCard)}</div>
      </div>
    </div>
  );
};

export default GroundsPanel;
