import React, { useCallback, useEffect, useState } from 'react';
import { POWER_BRACKETS } from '../constants';
import { fetchCourtState, challengeThrone, claimThronePurse, type CourtState } from '../services/courtService';

// Bracket thrones: one reigning Grand Shuffle Court champion per power bracket.
const ThronesPanel: React.FC<{ isDark: boolean; onClose: () => void; onPurse: (tickets: number) => void; notify: (m: string, kind?: 'good' | 'bad') => void }> = ({ isDark, onClose, onPurse, notify }) => {
  const [state, setState] = useState<CourtState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    try { setState(await fetchCourtState()); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the thrones.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { notify(e instanceof Error ? e.message : 'Something went wrong.', 'bad'); } setBusy(false); await load(); };
  const left = (iso: string) => { const ms = new Date(iso).getTime() - tick; const h = Math.floor(ms / 3600000); return h > 0 ? `${h}h ${Math.floor((ms % 3600000) / 60000)}m left` : `${Math.max(0, Math.floor(ms / 60000))}m left`; };
  const myThrone = state?.thrones.find(t => t.mine);

  return (
    <div className="fixed inset-0 z-[1900] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className={`w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] p-5 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black uppercase">👑 Champion Thrones</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg font-black bg-slate-200 text-slate-700">Close</button>
        </div>
        <p className="text-[12px] opacity-70 mb-3">One reigning champion per power bracket. You can only challenge the throne in your own bracket, using your own squad's power. A reign lasts 24 hours and pays a Ticket purse once. The purse grows with the bracket.</p>
        {error && <p className="text-[13px] font-bold text-red-500 mb-3">{error}</p>}
        {!state && !error && <p className="opacity-60 italic">Loading...</p>}
        {state && (
          <>
            <div className={`p-3 rounded-2xl mb-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <p className="text-[14px] font-black uppercase">You: Bracket {state.myBracket} {POWER_BRACKETS[state.myBracket - 1].name} · PWR {state.myPower}</p>
              <p className="text-[12px] opacity-70">Challenges left today: {state.challengesLeft}/{state.dailyChallenges}</p>
              <div className="flex gap-2 mt-2">
                <button disabled={busy || state.challengesLeft <= 0 || !!myThrone && myThrone.bracket === state.myBracket}
                  onClick={() => act(async () => { const r = await challengeThrone(); notify(r.result === 'lost' ? 'The champion held the throne. Try again!' : r.result === 'claimed' ? 'You claimed the empty throne! 👑' : `You dethroned ${r.previousChampion || 'the champion'}! 👑`, r.result === 'lost' ? 'bad' : 'good'); })}
                  className="flex-1 py-2 rounded-xl bg-[var(--accent-600)] text-white font-black uppercase text-[13px] disabled:opacity-40">
                  {myThrone ? 'You reign!' : 'Challenge my bracket'}
                </button>
                {myThrone && !myThrone.purse_claimed && (
                  <button disabled={busy} onClick={() => act(async () => { const r = await claimThronePurse(); onPurse(r.tickets); notify(`Champion's purse: +${r.tickets} 🎟️`, 'good'); })}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-black uppercase text-[13px] disabled:opacity-40">Collect +{myThrone.purse} 🎟️</button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {POWER_BRACKETS.map(b => {
                const t = state.thrones.find(x => x.bracket === b.n);
                return (
                  <div key={b.n} className={`p-3 rounded-xl flex items-center justify-between gap-2 ${b.n === state.myBracket ? (isDark ? 'bg-slate-700' : 'bg-amber-50 border border-amber-200') : (isDark ? 'bg-slate-800' : 'bg-slate-50')}`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black uppercase">{b.n}. {b.name} <span className="opacity-50">({b.min}+)</span></p>
                      <p className="text-[12px] opacity-80 truncate">{t ? `${t.mine ? 'You' : (t.display_name || 'Park Visitor')} · PWR ${t.power} · ${left(t.expires_at)}` : 'Vacant - claim it!'}</p>
                    </div>
                    <span className="text-[11px] font-black opacity-60 whitespace-nowrap">Purse {t?.purse ?? Math.round(45 * (1 + (b.n - 1) * 0.25))}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ThronesPanel;
