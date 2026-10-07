import React, { useCallback, useEffect, useState } from 'react';
import { POWER_BRACKETS } from '../constants';
import { fetchBoard, BoardData, BoardMode } from '../services/boardsService';

const MODES: { id: BoardMode; label: string; icon: string; unit: string; blurb: string }[] = [
  { id: 'golden', label: 'Golden Games', icon: '🏆', unit: 'tier', blurb: 'Highest tier cleared (all time).' },
  { id: 'arena', label: 'Arenas', icon: '🏟️', unit: 'defenders beaten', blurb: 'Defenders beaten this week.' },
  { id: 'raid', label: 'Raids', icon: '🐲', unit: 'damage', blurb: 'Total Raid damage this week.' },
  { id: 'friend', label: 'Friend Battles', icon: '🆚', unit: 'wins', blurb: 'Player battle wins this week.' },
];

const BoardsPanel: React.FC<{ isDark: boolean; onClose: () => void }> = ({ isDark, onClose }) => {
  const [mode, setMode] = useState<BoardMode>('arena');
  const [bracket, setBracket] = useState<number | undefined>(undefined);
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (m: BoardMode, b?: number) => {
    setLoading(true); setError(null);
    try { const d = await fetchBoard(m, b); setData(d); if (b === undefined) setBracket(d.bracket); }
    catch (e) { setError((e as Error).message); setData(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(mode, bracket); }, [mode, bracket, load]);
  const info = MODES.find(m => m.id === mode)!;
  const bName = POWER_BRACKETS.find(b => b.n === (bracket ?? data?.bracket ?? 1))?.name ?? '';
  const tab = (active: boolean) => `px-3 py-2 rounded-xl text-[13px] font-black uppercase whitespace-nowrap ${active ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Leaderboards</h2>
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-[var(--accent-600)] text-white text-[13px] font-black uppercase">✕ Close</button>
        </div>
        <div className="flex gap-2 overflow-x-auto mb-3">
          {MODES.map(m => <button key={m.id} onClick={() => setMode(m.id)} className={tab(mode === m.id)}>{m.icon} {m.label}</button>)}
        </div>
        <div className={`p-3 rounded-2xl mb-3 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <button disabled={(bracket ?? 1) <= 1} onClick={() => setBracket(b => Math.max(1, (b ?? data?.bracket ?? 1) - 1))} className={tab(false)}>◀</button>
          <div className="text-center">
            <div className="text-[12px] font-black uppercase opacity-60">Bracket {bracket ?? data?.bracket ?? '…'}</div>
            <div className="text-[16px] font-black">{bName}</div>
          </div>
          <button disabled={(bracket ?? 1) >= 10} onClick={() => setBracket(b => Math.min(10, (b ?? data?.bracket ?? 1) + 1))} className={tab(false)}>▶</button>
        </div>
        <p className="text-[13px] opacity-75 mb-3">{info.blurb} Boards are split by squad-power bracket so you compete against similar squads. {data?.period && data.period !== 'all' ? `Week ${data.period}.` : ''}</p>
        {error && <p className="text-[14px] font-bold text-rose-400 mb-3">{error}</p>}
        {loading && !data && <p className="text-[14px] opacity-70">Loading…</p>}
        {data && (
          <div className="space-y-2">
            {data.top.length === 0 && <p className="text-[14px] opacity-70">No scores in this bracket yet. Be the first!</p>}
            {data.top.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${r.me ? 'border-[var(--accent-500)]' : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                <div className="w-8 text-center text-[16px] font-black">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                <div className="flex-1 min-w-0 text-[15px] font-black uppercase truncate">{r.display_name}{r.me ? ' (you)' : ''}</div>
                <div className="text-[15px] font-black text-[var(--accent-500)]">{r.score.toLocaleString()}</div>
              </div>
            ))}
            <div className={`p-3 rounded-2xl text-[14px] font-bold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              {data.mine ? (data.rank ? `You: rank #${data.rank} with ${data.mine.score.toLocaleString()} ${info.unit} in this bracket.` : `Your score (${data.mine.score.toLocaleString()}) is in bracket ${data.mine.bracket}.`) : 'You have no score here yet.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default BoardsPanel;
