import React, { useCallback, useEffect, useState } from 'react';
import { POWER_BRACKETS, COURT_PLACE_LABELS, COURT_PLACE_ICONS } from '../constants';
import { fetchCourtState, challengeLadder, claimLadderPurse, type CourtState } from '../services/courtService';

// Bracket ladders: each power bracket has a top-10 ladder; ranks 1-3 earn titles and a daily Ticket purse.
const ThronesPanel: React.FC<{
  isDark: boolean; onClose: () => void; onPurse: (tickets: number) => void; onHonor: (key: string) => void; onWin?: () => void;
  notify: (m: string, kind?: 'good' | 'bad') => void;
}> = ({ isDark, onClose, onPurse, onHonor, onWin, notify }) => {
  const [state, setState] = useState<CourtState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((s: CourtState) => {
    setState(s); setError(null);
    if (s.mine && s.mine.rank <= 3) onHonor(`court:${s.mine.bracket}:${s.mine.rank}`); // permanent title once earned
  }, [onHonor]);
  const load = useCallback(async () => {
    try { apply(await fetchCourtState()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the ladders.'); }
  }, [apply]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return; setBusy(true);
    try { await fn(); } catch (e) { notify(e instanceof Error ? e.message : 'Something went wrong.', 'bad'); }
    setBusy(false);
  };
  const challenge = (targetRank?: number) => run(async () => {
    const r = await challengeLadder(targetRank);
    notify(r.result === 'joined' ? `You joined the ladder at rank ${r.rank}!` : r.result === 'won' ? `You beat ${r.beaten || 'your rival'} and moved up!` : `${r.beaten || 'Your rival'} held the spot. Try again!`, r.result === 'lost' ? 'bad' : 'good');
    if (r.result === 'won') onWin?.();
    if (r.view) apply(r.view); else await load();
  });

  const card = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const myIdx = state ? state.myBracket - 1 : 0;
  return (
    <div className="fixed inset-0 z-[1900] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className={`w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] p-5 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black uppercase">👑 Court Ladders</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg font-black bg-slate-200 text-slate-700">Close</button>
        </div>
        <p className="text-[12px] opacity-70 mb-3">Every power bracket has its own top-10 ladder. Challenge up to 3 ranks above you using your own squad's power. Ranks 1-3 earn a permanent bracket title and a daily Ticket purse. Spots are lost after 7 days away.</p>
        {error && <p className="text-[13px] font-bold text-red-500 mb-3">{error}</p>}
        {!state && !error && <p className="opacity-60 italic">Loading...</p>}
        {state && (
          <>
            <div className={`p-3 rounded-2xl mb-3 ${card}`}>
              <p className="text-[14px] font-black uppercase">Your bracket: {state.myBracket}. {POWER_BRACKETS[myIdx].name} · PWR {state.myPower}</p>
              <p className="text-[12px] opacity-70">{state.mine ? `You are rank ${state.mine.rank}.` : 'You are not on the ladder yet.'} Challenges left today: {state.challengesLeft}/{state.dailyChallenges}</p>
              {!state.mine && <button disabled={busy || state.challengesLeft <= 0} onClick={() => challenge()} className="w-full mt-2 py-2 rounded-xl bg-[var(--accent-600)] text-white font-black uppercase text-[13px] disabled:opacity-40">Join the ladder</button>}
              {state.mine?.purseAvailable && (
                <button disabled={busy} onClick={() => run(async () => { const r = await claimLadderPurse(); onPurse(r.tickets); notify(`Daily purse: +${r.tickets} 🎟️`, 'good'); await load(); })} className="w-full mt-2 py-2 rounded-xl bg-amber-500 text-white font-black uppercase text-[13px] disabled:opacity-40">Collect daily purse +{state.mine.purse} 🎟️</button>
              )}
            </div>
            <h3 className="text-[13px] font-black uppercase mb-2">Top 10 in your bracket</h3>
            <div className="space-y-1.5 mb-4">
              {state.myLadder.length === 0 && <p className="text-[13px] opacity-60 italic">Nobody here yet. Be the first!</p>}
              {state.myLadder.map(e => {
                const reach = !!state.mine && e.rank < state.mine.rank && e.rank >= state.mine.rank - state.challengeReach;
                return (
                  <div key={e.rank} className={`px-3 py-2 rounded-xl flex items-center gap-2 ${e.mine ? (isDark ? 'bg-slate-700' : 'bg-amber-50 border border-amber-200') : card}`}>
                    <span className="w-7 text-[14px] font-black">{e.rank <= 3 ? COURT_PLACE_ICONS[e.rank - 1] : `#${e.rank}`}</span>
                    <span className="flex-1 min-w-0 text-[13px] font-black truncate">{e.mine ? 'You' : (e.display_name || 'Park Visitor')} <span className="opacity-60 font-bold">· PWR {e.power}</span></span>
                    {reach && <button disabled={busy || state.challengesLeft <= 0} onClick={() => challenge(e.rank)} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-black uppercase text-[11px] disabled:opacity-40">Challenge</button>}
                    {state.mine === null && e.rank === 10 && state.myLadder.length >= 10 && <button disabled={busy || state.challengesLeft <= 0} onClick={() => challenge(10)} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-black uppercase text-[11px] disabled:opacity-40">Challenge</button>}
                  </div>
                );
              })}
            </div>
            <h3 className="text-[13px] font-black uppercase mb-2">Champions of every bracket</h3>
            <div className="space-y-1.5">
              {POWER_BRACKETS.map(b => {
                const t3 = state.top3.find(x => x.bracket === b.n)?.entries ?? [];
                return (
                  <div key={b.n} className={`px-3 py-2 rounded-xl ${card}`}>
                    <p className="text-[12px] font-black uppercase">{b.n}. {b.name} <span className="opacity-50">({b.min}+)</span></p>
                    <p className="text-[12px] opacity-80 truncate">{t3.length ? t3.map(e => `${COURT_PLACE_ICONS[e.rank - 1]} ${e.mine ? 'You' : (e.display_name || 'Park Visitor')}`).join('   ') : 'Vacant'}</p>
                    {t3.length > 0 && <p className="text-[10px] opacity-50">{COURT_PLACE_LABELS.slice(0, t3.length).join(' · ')} titles</p>}
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
