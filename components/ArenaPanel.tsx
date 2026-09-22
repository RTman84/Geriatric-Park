import React, { useState } from 'react';
import { Elder, ElderType } from '../types';
import {
  ELDER_AVATARS, ElderAvatarImg, FACTIONS, factionById, FactionId, getElderPower,
  ARENA_MAX_SLOTS, ARENA_MAX_PER_PLAYER, ARENA_MAX_ATTACKS_PER_DAY, ARENA_ATTACK_COOLDOWN_MIN, ARENA_FACTION_LOCK_DAYS, arenaAttackCost,
} from '../constants';
import type { ArenaInfo, ArenaMe, ArenaDefender } from '../services/arenaService';
import type { ArenaSite } from '../services/worldMap';

interface ArenaPanelProps {
  isDark: boolean;
  site: ArenaSite;
  info?: ArenaInfo;
  me: ArenaMe | null;
  elders: Elder[];
  stationedAt: Record<string, string>;
  tokens: number;
  busy: boolean;
  onClose: () => void;
  onPickFaction: (f: FactionId) => void;
  onStation: (elder: Elder) => void;
  onRecall: () => void;
  onAttack: () => void;
  onClaimDues: () => void;
}

const minsLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 60000)) : 0);

const DefenderAvatar: React.FC<{ d: ArenaDefender }> = ({ d }) => {
  const known = d.elder && Object.prototype.hasOwnProperty.call(ELDER_AVATARS, d.elder.type);
  const stage = Math.min(2, Math.max(0, Math.floor(Number(d.elder?.evolutionStage) || 0)));
  return known
    ? <ElderAvatarImg type={d.elder.type as ElderType} stage={stage} size={44} />
    : <div className="w-11 h-11 rounded-full bg-slate-500/30 flex items-center justify-center text-xl">👴</div>;
};

export const ArenaPanel: React.FC<ArenaPanelProps> = ({
  isDark, site, info, me, elders, stationedAt, tokens, busy, onClose, onPickFaction, onStation, onRecall, onAttack, onClaimDues,
}) => {
  const [choosing, setChoosing] = useState(false);
  const [pendingFaction, setPendingFaction] = useState<FactionId | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<FactionId | null>(null);
  const daysUntilSwitch = me?.factionChangedAt
    ? Math.max(0, Math.ceil((Date.parse(me.factionChangedAt) + ARENA_FACTION_LOCK_DAYS * 86400000 - Date.now()) / 86400000))
    : 0;
  const muted = isDark ? 'text-slate-300' : 'text-slate-600';
  const card = `p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;
  const holder = info?.faction ?? null;
  const holderFaction = factionById(holder);
  const myFaction = me?.faction ?? null;
  const defenders = info?.defenders ?? [];
  const myDefender = defenders.find(d => d.mine);
  const attacksLeft = me ? Math.max(0, ARENA_MAX_ATTACKS_PER_DAY - me.attacksToday) : 0;
  const attackCost = me ? arenaAttackCost(me.attacksToday) : 0;
  const shieldMins = minsLeft(info?.shieldUntil ?? null);
  const priorityMins = minsLeft(info?.priorityUntil ?? null);
  const priorityBlocks = !holder && priorityMins > 0 && info?.priorityFaction && info.priorityFaction !== myFaction;
  const squad = elders.filter(e => e.captured && e.status === 'Team');
  const candidates = elders
    .filter(e => e.captured && !stationedAt[e.id])
    .sort((a, b) => getElderPower(b) - getElderPower(a));
  const canStation = !!myFaction && !myDefender && !priorityBlocks && (!holder || holder === myFaction) && defenders.length < ARENA_MAX_SLOTS
    && (me?.defenders.length ?? 0) < ARENA_MAX_PER_PLAYER;
  const canAttack = !!myFaction && !!holder && holder !== myFaction && shieldMins === 0 && attacksLeft > 0 && (me?.squadPower ?? 0) > 0 && tokens >= attackCost;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`rounded-[2.5rem] p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border-4 ${isDark ? 'bg-slate-800 border-[var(--accent-500-a30)] text-white' : 'bg-white border-[var(--accent-100)] text-slate-900'}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter truncate">🏟️ {site.name}</h3>
            <p className={`text-[14px] font-black uppercase tracking-widest ${muted}`}>
              {holderFaction ? <span style={{ color: holderFaction.color }}>{holderFaction.icon} Held by {holderFaction.name}</span> : 'Neutral — up for grabs'}
            </p>
          </div>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-xl text-[14px] font-black uppercase ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Close</button>
        </div>

        {!me ? (
          <p className={`text-[15px] font-bold ${muted}`}>Loading Arena…</p>
        ) : !myFaction ? (
          <div className="space-y-3">
            <p className={`text-[15px] font-bold ${muted}`}>Choose your faction. You'll defend Arenas with your faction-mates and attack the others. You can change once every 30 days.</p>
            {FACTIONS.map(f => (
              <button key={f.id} disabled={busy} onClick={() => setPendingFaction(f.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 flex items-center gap-3 active:scale-95 transition-all ${pendingFaction === f.id ? 'border-[var(--accent-500)]' : isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className="text-3xl">{f.icon}</span>
                <span><span className="block font-black uppercase" style={{ color: f.color }}>{f.name}</span><span className={`block text-[14px] ${muted}`}>{f.blurb}</span></span>
              </button>
            ))}
            <button disabled={busy || !pendingFaction} onClick={() => pendingFaction && onPickFaction(pendingFaction)}
              className={`w-full py-4 rounded-2xl font-black uppercase text-[15px] ${pendingFaction && !busy ? 'bg-[var(--accent-600)] text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
              {pendingFaction ? `Join the ${factionById(pendingFaction)?.name}` : 'Pick a faction'}
            </button>
          </div>
        ) : (
          <>
            <div className={`${card} mb-4`}>
              <div className="flex items-center justify-between">
                <span className="font-black uppercase text-[14px]" style={{ color: factionById(myFaction)?.color }}>{factionById(myFaction)?.icon} You: {factionById(myFaction)?.name}</span>
                <span className={`text-[13px] font-black uppercase ${muted}`}>Attacks left: {attacksLeft}/{ARENA_MAX_ATTACKS_PER_DAY}</span>
              </div>
              {!switching ? (
                <button disabled={busy} onClick={() => setSwitching(true)} className={`mt-2 text-[13px] font-black uppercase underline ${muted}`}>
                  Switch faction
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-500/30">
                  {me.defenders.length > 0 ? (
                    <p className="text-[13px] font-bold text-amber-500">Recall every Elder you have stationed (in every Arena) before switching factions.</p>
                  ) : daysUntilSwitch > 0 ? (
                    <p className={`text-[13px] font-bold ${muted}`}>You can switch factions again in {daysUntilSwitch} day{daysUntilSwitch === 1 ? '' : 's'}.</p>
                  ) : (
                    <>
                      <p className={`text-[13px] font-bold mb-2 ${muted}`}>Switching locks you into the new faction for {ARENA_FACTION_LOCK_DAYS} days.</p>
                      <div className="flex gap-2">
                        {FACTIONS.filter(f => f.id !== myFaction).map(f => (
                          <button key={f.id} disabled={busy} onClick={() => setSwitchTarget(f.id)}
                            className={`flex-1 py-2 rounded-xl text-[13px] font-black uppercase border-2 ${switchTarget === f.id ? '' : isDark ? 'border-slate-700' : 'border-slate-200'}`}
                            style={switchTarget === f.id ? { borderColor: f.color, color: f.color } : undefined}>
                            {f.icon} {f.name}
                          </button>
                        ))}
                      </div>
                      <button disabled={busy || !switchTarget} onClick={() => { if (switchTarget) { onPickFaction(switchTarget); setSwitching(false); setSwitchTarget(null); } }}
                        className={`mt-2 w-full py-2.5 rounded-xl font-black uppercase text-[13px] ${switchTarget && !busy ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                        Confirm switch ({ARENA_FACTION_LOCK_DAYS}-day lock)
                      </button>
                    </>
                  )}
                  <button onClick={() => { setSwitching(false); setSwitchTarget(null); }} className={`mt-2 text-[12px] font-bold underline ${muted}`}>Cancel</button>
                </div>
              )}
            </div>

            {shieldMins > 0 && <p className="text-[14px] font-black uppercase text-sky-500 mb-3">🛡️ New holders are shielded for {shieldMins} more min</p>}
            {priorityBlocks && <p className="text-[14px] font-black uppercase text-amber-500 mb-3">{factionById(info?.priorityFaction)?.icon} {factionById(info?.priorityFaction)?.name} have first claim for {priorityMins} more min</p>}

            <p className={`text-[14px] font-black uppercase tracking-widest mb-2 ${muted}`}>Defenders ({defenders.length}/{ARENA_MAX_SLOTS})</p>
            <div className="space-y-2 mb-4">
              {Array.from({ length: ARENA_MAX_SLOTS }).map((_, i) => {
                const d = defenders[i];
                if (!d) return <div key={i} className={`p-3 rounded-2xl border border-dashed text-[14px] font-bold ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>Open slot</div>;
                return (
                  <div key={d.id} className={`p-3 rounded-2xl border flex items-center gap-3 ${d.mine ? 'border-[var(--accent-500)]' : isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                    <DefenderAvatar d={d} />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[15px] uppercase truncate">{d.elder?.name ?? 'Elder'}{d.mine && <span className="text-[var(--accent-500)]"> · yours</span>}</p>
                      <p className={`text-[13px] font-bold truncate ${muted}`}>{d.owner} · Lv {d.elder?.level ?? '?'} {d.elder?.rarity ?? ''}</p>
                    </div>
                    <span className="font-black text-[15px] shrink-0">⚔ {d.power}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {holder && holder !== myFaction && (
                <>
                  <button disabled={busy || !canAttack} onClick={onAttack}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-[15px] active:scale-95 transition-all ${canAttack && !busy ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                    {busy ? 'Fighting…' : `⚔️ Attack (${attackCost === 0 ? 'free' : `${attackCost} 🎟️`})`}
                  </button>
                  <p className={`text-[13px] font-bold ${muted}`}>
                    Your Squad Power: {me.squadPower}. Each defender you beat weakens you a little for the next fight. {ARENA_ATTACK_COOLDOWN_MIN}-minute cooldown per Arena.
                    {shieldMins === 0 && me.squadPower <= 0 ? ' Put an Elder on your squad first.' : ''}
                    {attackCost > tokens ? ' Not enough Tickets for the next attack.' : ''}
                  </p>
                </>
              )}
              {(!holder || holder === myFaction) && !myDefender && (
                <button disabled={busy || !canStation} onClick={() => setChoosing(true)}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[15px] active:scale-95 transition-all ${canStation && !busy ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {holder ? '🛡️ Station an Elder here' : '🚩 Claim this Arena'}
                </button>
              )}
              {myDefender && (
                <button disabled={busy} onClick={onRecall} className={`w-full py-3 rounded-2xl font-black uppercase text-[14px] ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  Recall {myDefender.elder?.name ?? 'my Elder'}
                </button>
              )}
              {(me.defenders.length >= ARENA_MAX_PER_PLAYER && !myDefender && (!holder || holder === myFaction)) && (
                <p className={`text-[13px] font-bold ${muted}`}>You already defend {ARENA_MAX_PER_PLAYER} Arenas — recall one first.</p>
              )}
            </div>

            {me.defenders.length > 0 && (
              <div className={`${card} mt-4`}>
                <p className="font-black uppercase text-[14px] mb-1">Arena Dues</p>
                {me.defenders.length > 1 && (
                  <p className={`text-[13px] font-bold mb-2 ${muted}`}>
                    One claim covers every Elder you have stationed, across all {me.defenders.length} of your Arenas — not just this one.
                  </p>
                )}
                <p className={`text-[14px] font-bold ${muted}`}>
                  {me.duesClaimedToday ? 'Already collected today (from any Arena) — new Dues keep building for tomorrow.' : `Ready: ${me.dues.tickets} 🎟️ · ${me.dues.materials} 🧱 across all your stationed Elders (${me.dues.hours}h combined, max 12h per Elder). A freshly stationed Elder starts at 0 and builds up hourly. Sent to your Mailbox.`}
                </p>
                <button disabled={busy || me.duesClaimedToday || (me.dues.tickets <= 0 && me.dues.materials <= 0)} onClick={onClaimDues}
                  className={`mt-3 w-full py-3 rounded-2xl font-black uppercase text-[14px] ${!busy && !me.duesClaimedToday && (me.dues.tickets > 0 || me.dues.materials > 0) ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {me.duesClaimedToday ? 'Collected for today' : 'Collect Dues (once a day, all Arenas)'}
                </button>
              </div>
            )}
          </>
        )}

        {choosing && (
          <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={() => setChoosing(false)}>
            <div onClick={e => e.stopPropagation()} className={`w-full max-w-md max-h-[75vh] overflow-y-auto rounded-[2rem] p-5 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
              <p className="font-black uppercase text-lg mb-1">Choose a defender</p>
              <p className={`text-[13px] font-bold mb-3 ${muted}`}>It leaves your squad and can't be scrapped until recalled or knocked out.</p>
              {candidates.length === 0 && <p className={`text-[14px] font-bold ${muted}`}>You have no free Elders.</p>}
              <div className="space-y-2">
                {candidates.map(e => {
                  const leavesEmpty = e.status === 'Team' && squad.length <= 1;
                  return (
                    <button key={e.id} disabled={busy || leavesEmpty} onClick={() => { setChoosing(false); onStation(e); }}
                      className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 ${leavesEmpty ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'} ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                      <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-black text-[15px] uppercase truncate">{e.name}</span>
                        <span className={`block text-[13px] font-bold ${muted}`}>Lv {e.level} {e.rarity}{e.status === 'Team' ? ' · on squad' : ''}{leavesEmpty ? ' · keep one on your squad' : ''}</span>
                      </span>
                      <span className="font-black text-[15px] shrink-0">⚔ {getElderPower(e)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
