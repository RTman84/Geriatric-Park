import React from 'react';
import { ElderAvatarImg, GLYPH_ART, GEAR_RARITY_COLOR, rarityCardStyle } from '../constants';
import { Gfx } from './Gfx';

export interface VictoryElderRow { id: string; name: string; rarity: string; type: string; stage: number; levelBefore: number; levelAfter: number; xp: number }
export interface VictoryResult {
  opponent?: { name: string; rarity: string; level: number };
  playerXp: number; playerLevelBefore: number; playerLevelAfter: number;
  stars: number;
  elders: VictoryElderRow[];
}

// Results card shown after a map fight is won: what was gained, and every squad Elder that levelled (name, rarity colour, new level).
const VictoryCard: React.FC<{ result: VictoryResult; onClose: () => void }> = ({ result, onClose }) => {
  const levelled = result.elders.filter(e => e.levelAfter > e.levelBefore);
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm max-h-[88dvh] overflow-y-auto rounded-3xl border-2 border-amber-400 bg-slate-900 p-5 text-slate-100 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <img src={GLYPH_ART.tournament} alt="" className="mx-auto h-16 w-16 object-contain" />
          <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-amber-300">Victory!</h2>
          {result.opponent && (
            <p className="mt-1 text-sm font-semibold text-slate-300">
              <span style={{ color: GEAR_RARITY_COLOR[result.opponent.rarity as keyof typeof GEAR_RARITY_COLOR] ?? '#fff' }} className="font-black">{result.opponent.name}</span>
              {' '}(Lv {result.opponent.level} {result.opponent.rarity}) sat down and wandered off.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-1 rounded-2xl bg-slate-800 p-3 text-sm font-bold">
          <div className="flex justify-between"><span>Account XP</span><span className="text-emerald-400">+{result.playerXp.toLocaleString()}</span></div>
          {result.playerLevelAfter > result.playerLevelBefore && (
            <div className="flex justify-between text-amber-300"><span>Level up!</span><span>Lv {result.playerLevelBefore} → Lv {result.playerLevelAfter}</span></div>
          )}
          <div className="flex justify-between"><span>Park Stars</span><span className="text-amber-300">+{result.stars} <Gfx e="⭐" /></span></div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="text-[12px] font-black uppercase tracking-widest text-slate-400">Squad Elders</div>
          {result.elders.map(e => {
            const up = e.levelAfter > e.levelBefore;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl p-2" style={rarityCardStyle(e.rarity as any)}>
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/90"><ElderAvatarImg type={e.type as any} stage={e.stage as any} fill /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black" style={{ color: GEAR_RARITY_COLOR[e.rarity as keyof typeof GEAR_RARITY_COLOR] ?? '#fff' }}>{e.name}</div>
                  <div className="text-[12px] font-bold text-slate-200">{e.rarity} · {up ? <span className="text-amber-300">Level up! Lv {e.levelBefore} → Lv {e.levelAfter}</span> : <>Lv {e.levelAfter}</>}</div>
                </div>
                <div className="shrink-0 text-sm font-black text-emerald-400">+{e.xp} XP</div>
              </div>
            );
          })}
          {result.elders.length === 0 && <div className="text-sm text-slate-400">No squad Elders were listed for this fight.</div>}
        </div>

        {levelled.length > 0 && <p className="mt-3 text-center text-[12px] font-bold text-amber-300">{levelled.length} Elder{levelled.length > 1 ? 's' : ''} levelled up and healed fully.</p>}
        <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-green-500 py-3 text-lg font-black uppercase tracking-widest text-white shadow-[0_4px_0_#166534] active:translate-y-0.5">Continue</button>
      </div>
    </div>
  );
};

export default VictoryCard;
