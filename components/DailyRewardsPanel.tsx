import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { claimDaily, spinWheel, claimMilestone, MementosError, type Faucets, type MementosState } from '../services/mementosService';

// Daily login + free spin + level milestones. All amounts are decided and paid by the server (api/mementos.ts).
const DailyRewardsPanel: React.FC<{
  isDark: boolean; faucets: Faucets; onClose: () => void;
  onState: (m: MementosState) => void; notify: (m: string, kind?: 'good' | 'bad') => void;
}> = ({ isDark, faucets, onClose, onState, notify }) => {
  const [busy, setBusy] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const card = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const btn = 'px-4 py-3 rounded-2xl font-black uppercase text-[13px] active:scale-95 disabled:opacity-40';
  const run = async (fn: () => Promise<MementosState>, afterMsg?: (m: MementosState) => string | null) => {
    if (busy) return; setBusy(true);
    try { const m = await fn(); onState(m); const msg = afterMsg?.(m); if (msg) notify(msg, 'good'); }
    catch (e) { if (e instanceof MementosError && e.state) onState(e.state); notify(e instanceof Error ? e.message : 'Could not claim that.', 'bad'); }
    setBusy(false);
  };
  const claimable = faucets.milestones.filter(m => m.claimable);
  const next = faucets.milestones.find(m => !m.claimed && !m.claimable);
  return (
    <div className="fixed inset-0 z-[3700] flex items-center justify-center p-3 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className={`rounded-[2rem] p-5 w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-2xl border-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Free Mementos</h2>
          <button onClick={onClose} className="text-slate-300 p-2" aria-label="Close"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <div className={`p-4 rounded-2xl mb-3 ${card}`}>
          <p className="text-[13px] font-black uppercase mb-2">Daily check-in</p>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {[1, 2, 3, 4, 5, 6, 7].map(d => {
              const done = faucets.canClaim ? d < faucets.streakDay : d <= faucets.streakDay;
              const today = faucets.canClaim && d === faucets.streakDay;
              return (
                <div key={d} className={`rounded-lg py-2 text-center ${done ? 'bg-emerald-600 text-white' : today ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <p className="text-[10px] font-bold opacity-70">Day {d}</p><p className="text-[13px] font-black">{done ? '\u2713' : `+${faucets.base + (d === 7 ? faucets.streakBonus : 0)}`}</p>
                </div>
              );
            })}
          </div>
          <button className={`${btn} w-full bg-[var(--accent-600)] text-white`} disabled={busy || !faucets.canClaim} onClick={() => run(claimDaily, m => `Claimed ${m.gained ?? faucets.rewardToday} Mementos!`)}>{faucets.canClaim ? `Claim ${faucets.rewardToday} Mementos` : 'Claimed today, come back tomorrow'}</button>
          <p className="text-[11px] opacity-60 mt-2">Miss a day and the streak starts over. Resets at midnight UTC.</p>
        </div>

        <div className={`p-4 rounded-2xl mb-3 ${card}`}>
          <p className="text-[13px] font-black uppercase mb-1">Free daily spin</p>
          <p className="text-[11px] opacity-60 mb-2">Prizes: {faucets.spinTable.map(e => e.amount).join(', ')} Mementos. The server rolls it, so nobody can cheat the wheel.</p>
          {spinResult !== null && <p className="text-[18px] font-black text-center mb-2 text-amber-500">You won {spinResult} Memento{spinResult === 1 ? '' : 's'}!</p>}
          <button className={`${btn} w-full ${faucets.canSpin ? 'bg-amber-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`} disabled={busy || !faucets.canSpin} onClick={() => run(spinWheel, m => { setSpinResult(m.gained ?? null); return null; })}>{faucets.canSpin ? 'Spin the wheel' : 'Spun today'}</button>
        </div>

        <div className={`p-4 rounded-2xl ${card}`}>
          <p className="text-[13px] font-black uppercase mb-1">Level milestones</p>
          <p className="text-[11px] opacity-60 mb-2">A one-time gift every 10 levels from level 100 (you are level {faucets.level}).</p>
          {claimable.length === 0 && next && <p className="text-[12px] font-bold mb-2">Next: level {next.level} for {next.amount} Mementos.</p>}
          {faucets.milestones.filter(m => m.claimable).map(m => (
            <div key={m.level} className="flex justify-between items-center mb-2">
              <p className="text-[13px] font-black uppercase">Level {m.level} &middot; {m.amount} Mementos</p>
              <button className={`${btn} bg-emerald-600 text-white py-2`} disabled={busy} onClick={() => run(() => claimMilestone(m.level), mm => `Claimed ${mm.gained ?? m.amount} Mementos!`)}>Claim</button>
            </div>
          ))}
          <p className="text-[11px] opacity-60">{faucets.milestones.filter(m => m.claimed).length} of {faucets.milestones.length} claimed.</p>
        </div>
      </div>
    </div>
  );
};
export default DailyRewardsPanel;
