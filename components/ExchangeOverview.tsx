import React, { useEffect, useState } from 'react';
import { ElderAvatarImg, getElderPower } from '../constants';
import type { Elder } from '../types';
import type { ResidentExchangeRow } from '../services/residentExchangeService';
import { exchangeSummary } from './FriendsPanel';

// One window for everything leaving or visiting the park: your Elders out at friends' parks (with details, what each
// side gets, time left, Recall) and friends' Elders currently at yours.
const ExchangeOverview: React.FC<{
  isDark: boolean; elders: Elder[]; mine: ResidentExchangeRow[]; hosting: ResidentExchangeRow[];
  onRecall: (placementId: string) => void; onClose: () => void;
}> = ({ isDark, elders, mine, hosting, onRecall, onClose }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const left = (iso: string) => { const ms = new Date(iso).getTime() - now; if (ms <= 0) return 'returning...'; const h = Math.floor(ms / 3600000); return `${h}h ${Math.floor((ms % 3600000) / 60000)}m left`; };
  const card = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const snapPower = (r: ResidentExchangeRow) => r.snapshot ? r.snapshot.strength + r.snapshot.wit + r.snapshot.tenacity : null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className={`rounded-[2.5rem] p-5 w-full max-w-md max-h-[88vh] overflow-y-auto shadow-2xl border-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black uppercase italic tracking-tighter">🏡 Away & Visiting</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg font-black bg-slate-200 text-slate-700">Close</button>
        </div>

        <h3 className="text-[13px] font-black uppercase tracking-widest opacity-70 mb-2">Your Elders away ({mine.length})</h3>
        <div className="space-y-2 mb-5">
          {mine.length === 0 && <p className="text-[13px] italic opacity-60">None. Leave a Folk with a friend from the Friends panel.</p>}
          {mine.map(r => {
            const e = elders.find(x => x.id === r.elder_id);
            return (
              <div key={r.id} className={`p-3 rounded-2xl ${card}`}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"><ElderAvatarImg type={(e?.type ?? r.elder_type) as any} stage={(e?.evolutionStage ?? r.elder_evolution_stage ?? 0) as any} fill /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[14px] uppercase truncate">{r.elder_name} {r.mode === 'loan' ? '🤝' : '🏡'}</p>
                    <p className="text-[12px] font-bold opacity-70">{e ? `Lv ${e.level} ${e.rarity} · PWR ${getElderPower(e)}` : 'Details unavailable'}</p>
                    <p className="text-[12px] font-bold opacity-70">At {r.host?.display_name || 'a friend'}'s park · {left(r.ends_at)}</p>
                  </div>
                  <button onClick={() => onRecall(r.id)} className="px-3 py-2 rounded-xl bg-[var(--accent-600)] text-white font-black uppercase text-[12px]">Recall</button>
                </div>
                <p className="text-[11px] opacity-70 mt-2 leading-snug">{exchangeSummary(r, 'mine')}</p>
              </div>
            );
          })}
        </div>

        <h3 className="text-[13px] font-black uppercase tracking-widest opacity-70 mb-2">Visiting your park ({hosting.length})</h3>
        <div className="space-y-2">
          {hosting.length === 0 && <p className="text-[13px] italic opacity-60">Nobody is visiting right now.</p>}
          {hosting.map(r => {
            const p = snapPower(r);
            return (
              <div key={r.id} className={`p-3 rounded-2xl ${card}`}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"><ElderAvatarImg type={r.elder_type as any} stage={(r.elder_evolution_stage ?? 0) as any} fill /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[14px] uppercase truncate">{r.elder_name} {r.mode === 'loan' ? '🤝' : '🏡'}</p>
                    <p className="text-[12px] font-bold opacity-70">{r.snapshot ? `Lv ${r.snapshot.level} ${r.snapshot.rarity} · PWR ${p}` : `${String(r.elder_type)}${(r.elder_evolution_stage ?? 0) > 0 ? ` · Stage ${r.elder_evolution_stage}` : ''}`}</p>
                    <p className="text-[12px] font-bold opacity-70">From {r.owner?.display_name || 'a friend'} · {left(r.ends_at)}</p>
                  </div>
                </div>
                <p className="text-[11px] opacity-70 mt-2 leading-snug">{exchangeSummary(r, 'hosting')}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExchangeOverview;
