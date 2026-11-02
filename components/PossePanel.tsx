import React, { useCallback, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { checkText, wordCheckMessage } from '../services/wordFilter';
import { POSSE_EMBLEM_ART } from '../game-assets/w7Art';
import {
  fetchPosse, createPosse, searchPosseByTag, requestToJoinPosse, invitePlayerToPosse, respondToPosseInvite, leavePosse, posseMemberAction,
  type PosseInfo, type PosseSearchResult, type PosseRosterEntry,
} from '../services/posseService';

const FACTION_LABEL: Record<string, string> = { early_birds: 'Early Birds', night_owls: 'Night Owls', sunday_drivers: 'Sunday Drivers' };
const FACTION_ICON: Record<string, string> = { early_birds: '\u{1F305}', night_owls: '\u{1F989}', sunday_drivers: '\u{1F697}' };
const EMBLEMS: { id: string; icon: string; label: string }[] = [
  { id: 'sunrise', icon: '\u{1F305}', label: 'Sunrise' }, { id: 'owl', icon: '\u{1F989}', label: 'Owl' }, { id: 'sedan', icon: '\u{1F697}', label: 'Sedan' },
  { id: 'bingo', icon: '\u{1F3B1}', label: 'Bingo' }, { id: 'cane', icon: '\u{1F9AF}', label: 'Cane' }, { id: 'teapot', icon: '\u{1FAD6}', label: 'Teapot' },
  { id: 'trophy', icon: '\u{1F3C6}', label: 'Trophy' }, { id: 'star', icon: '\u2B50', label: 'Star' }, { id: 'shield', icon: '\u{1F6E1}\uFE0F', label: 'Shield' },
  { id: 'skirmish', icon: '', label: 'Shuffleboard' }, { id: 'porch', icon: '', label: 'Rocking Chair' }, { id: 'knit', icon: '', label: 'Knitting' },
  { id: 'casserole', icon: '', label: 'Casserole' }, { id: 'gnome', icon: '', label: 'Garden Gnome' }, { id: 'swing', icon: '', label: 'Porch Swing' },
];
// Art emblems (W7-A). 'bingo' and 'cane' keep their old ids but now show art too; the other old ids stay emoji so existing Posses are unchanged.
const EMBLEM_ART: Record<string, string> = { skirmish: POSSE_EMBLEM_ART[0], bingo: POSSE_EMBLEM_ART[1], porch: POSSE_EMBLEM_ART[2], knit: POSSE_EMBLEM_ART[3], casserole: POSSE_EMBLEM_ART[4], gnome: POSSE_EMBLEM_ART[5], cane: POSSE_EMBLEM_ART[6], swing: POSSE_EMBLEM_ART[7] };
export const emblemIcon = (id: string): React.ReactNode => EMBLEM_ART[id]
  ? <img src={EMBLEM_ART[id]} alt="" className="inline-block w-[1.4em] h-[1.4em] object-contain align-middle" />
  : (EMBLEMS.find(e => e.id === id)?.icon ?? '\u{1F305}');
const ROLE_LABEL = { owner: 'Owner', co: 'Co-lead', member: 'Member' } as const;

const PossePanel: React.FC<{
  isDark: boolean; onClose: () => void; notify: (m: string, kind?: 'good' | 'bad') => void; onChanged?: () => void;
}> = ({ isDark, onClose, notify, onChanged }) => {
  const [info, setInfo] = useState<PosseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [emblem, setEmblem] = useState('sunrise');
  const [searchTag, setSearchTag] = useState('');
  const [results, setResults] = useState<PosseSearchResult[] | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [openMember, setOpenMember] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const d = await fetchPosse(); setInfo(d); setError(null); if (d.notice) notify(d.notice, 'bad'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your Posse.'); }
  }, [notify]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<PosseInfo | void>, okMsg?: string) => {
    if (busy) return; setBusy(true);
    try { const d = await fn(); if (d) setInfo(d); if (okMsg) notify(okMsg, 'good'); onChanged?.(); }
    catch (e) { notify(e instanceof Error ? e.message : 'Something went wrong.', 'bad'); }
    setBusy(false);
  };

  const card = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const input = `w-full rounded-xl px-3 py-2 font-bold text-[14px] outline-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`;
  const btn = 'px-4 py-2 rounded-xl font-black uppercase text-[12px] active:scale-95 disabled:opacity-40';
  const primary = `${btn} bg-[var(--accent-600)] text-white`;
  const quiet = `${btn} ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`;

  const nameVerdict = name ? checkText(name, { min: 3, max: 20, reserved: true }) : null;
  const tagVerdict = tag ? checkText(tag, { min: 2, max: 4, reserved: true }) : null;
  const canCreate = !!nameVerdict?.ok && !!tagVerdict?.ok && /^[A-Z0-9]{2,4}$/.test(tag) && /^[A-Za-z0-9][A-Za-z0-9 '_-]*$/.test(name.trim());
  const isOfficer = info?.myRole === 'owner' || info?.myRole === 'co';

  const memberButtons = (m: PosseRosterEntry) => {
    if (m.role === 'owner' || !info?.myRole) return null;
    const mine = info.myRole;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {mine === 'owner' && m.role === 'member' && <button className={quiet} disabled={busy} onClick={() => run(() => posseMemberAction('promote', m.userId), `${m.name} is now a co-lead.`)}>Make co-lead</button>}
        {mine === 'owner' && m.role === 'co' && <button className={quiet} disabled={busy} onClick={() => run(() => posseMemberAction('demote', m.userId), `${m.name} is a member again.`)}>Make member</button>}
        {mine === 'owner' && <button className={quiet} disabled={busy} onClick={() => { if (confirm(`Hand ownership of the Posse to ${m.name}? You become a co-lead.`)) void run(() => posseMemberAction('transfer_owner', m.userId), `${m.name} is the new owner.`); }}>Make owner</button>}
        {(mine === 'owner' || (mine === 'co' && m.role === 'member')) && <button className={`${btn} bg-red-600 text-white`} disabled={busy} onClick={() => { if (confirm(`Remove ${m.name} from the Posse?`)) void run(() => posseMemberAction('kick', m.userId), `${m.name} was removed.`); }}>Remove</button>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">The Old Gang</h2>
          <button onClick={onClose} className="text-slate-300 p-2" aria-label="Close"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        {error && <p className="text-[13px] font-bold text-red-500 mb-3">{error}</p>}
        {!info && !error && <p className="opacity-60 italic">Loading...</p>}

        {info && info.posse && (
          <>
            <div className={`p-4 rounded-2xl mb-3 ${card}`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{emblemIcon(info.posse.emblem)}</span>
                <div className="min-w-0">
                  <p className="text-xl font-black uppercase truncate">{info.posse.name} <span className="opacity-60">[{info.posse.tag}]</span></p>
                  <p className="text-[12px] font-bold opacity-70">{FACTION_ICON[info.posse.faction]} {FACTION_LABEL[info.posse.faction]} &middot; {info.posse.memberCount}/{info.posse.maxMembers} members &middot; You: {ROLE_LABEL[info.myRole!]}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[12px] font-black uppercase"><span>Weekly goal</span><span>{info.weekPoints ?? 0} / {info.weekGoal ?? 0}</span></div>
                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((info.weekPoints ?? 0) / Math.max(1, info.weekGoal ?? 1)) * 100)}%` }} /></div>
                <p className="text-[11px] opacity-60 mt-1">Posse Points from Arena, Raid and battle wins are coming in the next update. Your faction-mates can start joining now.</p>
              </div>
            </div>

            {isOfficer && (
              <div className={`p-3 rounded-2xl mb-3 ${card}`}>
                <p className="text-[13px] font-black uppercase mb-2">Invite a player</p>
                <div className="flex gap-2">
                  <input className={input} placeholder="Friend code (8 characters)" value={inviteCode} maxLength={8} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
                  <button className={primary} disabled={busy || inviteCode.length !== 8} onClick={() => run(async () => { const r = await invitePlayerToPosse(inviteCode); setInviteCode(''); notify(`Invitation sent to ${r.to}.`, 'good'); })}>Invite</button>
                </div>
                <p className="text-[11px] opacity-60 mt-1">They must be in your faction ({FACTION_LABEL[info.posse.faction]}). The invitation arrives in their Mailbox.</p>
              </div>
            )}

            <p className="text-[13px] font-black uppercase mb-2">Roster</p>
            <div className="space-y-2 mb-4">
              {(info.roster ?? []).map(m => (
                <div key={m.userId} className={`p-3 rounded-2xl ${card}`}>
                  <button className="w-full text-left" onClick={() => setOpenMember(openMember === m.userId ? null : m.userId)}>
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-black text-[14px] uppercase truncate">{m.name} <span className="text-[11px] opacity-60">{ROLE_LABEL[m.role]}</span></p>
                      <p className="text-[12px] font-bold opacity-70 whitespace-nowrap">Lv {m.level} &middot; {Math.round(m.squadPower).toLocaleString()} power</p>
                    </div>
                    {m.title && <p className="text-[11px] opacity-60 truncate">{m.title}</p>}
                  </button>
                  {openMember === m.userId && memberButtons(m)}
                </div>
              ))}
            </div>
            <button className={`${btn} bg-red-600 text-white w-full`} disabled={busy} onClick={() => { if (confirm(info.myRole === 'owner' && (info.roster?.length ?? 0) > 1 ? 'Leave the Posse? Ownership passes to the next co-lead or longest-standing member.' : 'Leave the Posse?')) void run(() => leavePosse(), 'You left the Posse.'); }}>Leave Posse</button>
          </>
        )}

        {info && !info.posse && (
          <>
            <p className="text-[12px] opacity-70 mb-3">A Posse is a group of up to 100 players, all in the same faction. {info.faction ? <>Your faction: <b>{FACTION_ICON[info.faction]} {FACTION_LABEL[info.faction]}</b>.</> : <b>Pick a faction at an Arena first &mdash; a Posse belongs to one faction.</b>}</p>

            {info.pendingInvites.length > 0 && (
              <div className="mb-3">
                <p className="text-[13px] font-black uppercase mb-2">Invitations</p>
                {info.pendingInvites.map(i => (
                  <div key={i.id} className={`p-3 rounded-2xl mb-2 ${card}`}>
                    <p className="font-black text-[14px] uppercase">{emblemIcon(i.posse.emblem)} {i.posse.name} [{i.posse.tag}]</p>
                    <p className="text-[12px] opacity-70">{i.kind === 'invite' ? `${i.fromName} invited you` : `${i.fromName} wants to join`} &middot; {i.posse.member_count}/100 members</p>
                    <div className="flex gap-2 mt-2">
                      <button className={`${btn} bg-emerald-600 text-white`} disabled={busy} onClick={() => run(() => respondToPosseInvite(i.id, true), 'Accepted!')}>Accept</button>
                      <button className={quiet} disabled={busy} onClick={() => run(() => respondToPosseInvite(i.id, false))}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {info.faction && (
              <>
                <div className={`p-3 rounded-2xl mb-3 ${card}`}>
                  <p className="text-[13px] font-black uppercase mb-2">Find a Posse by tag</p>
                  <div className="flex gap-2">
                    <input className={input} placeholder="Tag, e.g. OG" value={searchTag} maxLength={4} onChange={e => setSearchTag(e.target.value.toUpperCase())} />
                    <button className={primary} disabled={busy || searchTag.length < 2} onClick={() => run(async () => { const r = await searchPosseByTag(searchTag); setResults(r.results); })}>Search</button>
                  </div>
                  {results && results.length === 0 && <p className="text-[12px] opacity-70 mt-2">No open Posse in your faction has that tag.</p>}
                  {results?.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 mt-2">
                      <p className="font-black text-[13px] uppercase truncate">{emblemIcon(r.emblem)} {r.name} [{r.tag}] <span className="opacity-60">{r.member_count}/100</span></p>
                      <button className={primary} disabled={busy} onClick={() => run(async () => { await requestToJoinPosse(r.id); }, 'Request sent. The owner will see it in their Mailbox.')}>Ask to join</button>
                    </div>
                  ))}
                </div>

                <div className={`p-3 rounded-2xl mb-3 ${card}`}>
                  <p className="text-[13px] font-black uppercase mb-2">Start your own Posse</p>
                  <input className={`${input} mb-2`} placeholder="Posse name (3-20 characters)" value={name} maxLength={20} onChange={e => setName(e.target.value)} />
                  {nameVerdict && !nameVerdict.ok && <p className="text-[12px] font-bold text-red-500 mb-2">{wordCheckMessage(nameVerdict)}</p>}
                  <input className={`${input} mb-2`} placeholder="Tag (2-4 letters or numbers)" value={tag} maxLength={4} onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                  {tagVerdict && !tagVerdict.ok && <p className="text-[12px] font-bold text-red-500 mb-2">{wordCheckMessage(tagVerdict)}</p>}
                  <p className="text-[12px] font-black uppercase mb-1">Emblem</p>
                  <div className="grid grid-cols-9 gap-1 mb-3">
                    {EMBLEMS.map(e => (
                      <button key={e.id} title={e.label} onClick={() => setEmblem(e.id)} className={`aspect-square rounded-lg text-xl flex items-center justify-center ${emblem === e.id ? 'bg-[var(--accent-600)]' : isDark ? 'bg-slate-900' : 'bg-white'}`}>{emblemIcon(e.id)}</button>
                    ))}
                  </div>
                  <button className={`${primary} w-full`} disabled={busy || !canCreate} onClick={() => run(() => createPosse(name.trim(), tag, emblem), 'Your Posse is open!')}>Create Posse</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PossePanel;
