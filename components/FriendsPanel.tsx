import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon, CheckCircleIcon, XCircleIcon, UserMinusIcon, ClipboardDocumentIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { GEAR_RARITY_COLOR, ElderAvatarImg, getRankForLevel, AMENITIES, VISIT_COOLDOWN_MS, VISIT_MATERIALS_REWARD, FRIEND_BATTLE_COOLDOWN_MS, FRIEND_BATTLE_DAILY_ATTACK_CAP, getBracket, getElderPower, exchangeGiftMaterials, exchangeGiftQuestPoints, exchangeGiftBoostHours, EXCHANGE_OWNER_XP_PER_HOUR } from '../constants';
import ParkScene from './ParkScene';
import type { FriendsData, PlayerProfileSnapshot } from '../services/socialService';
import { sendFriendRequestByUserId } from '../services/socialService';
import type { ResidentExchangeRow } from '../services/residentExchangeService';
import type { Elder } from '../types';

interface FriendsPanelProps {
  notify?: (text: string, tone?: 'good' | 'bad') => void;
  isDark: boolean;
  data: FriendsData | null;
  loading: boolean;
  error: string | null;
  lastVisitedFriends: Record<string, number>;
  onClose: () => void;
  onRefresh: () => void;
  onSendRequest: (code: string) => Promise<string>;
  onRespond: (requestId: string, accept: boolean) => Promise<void>;
  onRemove: (friendUserId: string) => Promise<void>;
  onRandomMatch: () => Promise<string>;
  onToggleOpenToRandom: (value: boolean) => Promise<void>;
  onVisit: (friendUserId: string) => void;
  nearby: PlayerProfileSnapshot[];
  nearbyBusy: boolean;
  nearbyError: string | null;
  nearbyReadyAt: number;
  onRefreshNearby: () => void;
  mySquadPower: number;
  onBattle: (friendUserId: string) => string;
  friendBattle: { lastByFriend?: Record<string, number>; attackDay?: string; attacksToday?: number };
  elders: Elder[];
  stationedIds?: string[]; // Elders defending an Arena can't be sent away
  residentExchangeMine: ResidentExchangeRow[];
  residentExchangeHosting: ResidentExchangeRow[];
  onPlaceResident: (hostId: string, elder: Elder, durationHours: 8 | 12 | 24, giftType: 'materials' | 'quest' | 'boost', asLoan?: boolean, target?: { id: string; label: string }) => void;
  onRecallResident: (placementId: string) => void;
  hasSquad: boolean;
}

// Friends' custom icon/title picks (achievement-based keys especially) can't
// be safely re-resolved here without their full achievements array, which
// isn't synced server-side (only counts are, see api/account/save.ts) --
// falls back to a plain rank-based title/icon from level alone. Good enough
// for "who is this person" at a glance; not a loss of anything the friend
// themselves sees on their own profile.
function friendDisplay(profile: PlayerProfileSnapshot) {
  const rank = getRankForLevel(profile.level);
  return { icon: rank.icon, title: rank.title };
}

// One line telling BOTH sides what an exchange is for and what each will get (amounts shown for a full stay).
export const exchangeSummary = (r: ResidentExchangeRow, side: 'mine' | 'hosting'): string => {
  const hrs = r.duration_hours;
  const owner = `${r.elder_name} earns up to ${hrs * EXCHANGE_OWNER_XP_PER_HOUR} Elder XP`;
  if (r.mode === 'loan') {
    return side === 'mine'
      ? `Squad Loan: ${r.host?.display_name || 'your friend'} can use ${r.elder_name} in Battles and Court. ${owner}. Your friend gets the combat help.`
      : `Squad Loan: ${r.elder_name} fights on your squad (Battles and Court only). ${r.owner?.display_name || 'Your friend'} earns the XP; you get the help.`;
  }
  const where = r.target_label ? ` -> ${r.target_label}` : ' (host picks the target)';
  const gift = r.gift_type === 'quest' ? `${exchangeGiftQuestPoints(hrs)} Quest progress${where}`
    : r.gift_type === 'boost' ? `${exchangeGiftBoostHours(hrs)}h building output${where}`
    : `${exchangeGiftMaterials(hrs)} Building Materials`;
  return side === 'mine' ? `Visit: ${owner}. Host receives ${gift}. Rewards scale down if recalled early.` : `Visit: you receive ${gift} when ${r.elder_name} heads home. ${r.owner?.display_name || 'Your friend'} earns up to ${hrs * EXCHANGE_OWNER_XP_PER_HOUR} Elder XP.`;
};

const FriendsPanel: React.FC<FriendsPanelProps> = ({ isDark, data, loading, error, lastVisitedFriends, onClose, onRefresh, onSendRequest, onRespond, onRemove, onRandomMatch, onToggleOpenToRandom, onVisit, onBattle, nearby, nearbyBusy, nearbyError, nearbyReadyAt, onRefreshNearby, mySquadPower, friendBattle, hasSquad, elders, stationedIds = [], residentExchangeMine, residentExchangeHosting, onPlaceResident, onRecallResident, notify }) => {
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 1000); return () => clearInterval(t); }, []);
  const nearbyWait = Math.max(0, nearbyReadyAt - nowTick);
  const [randomBusy, setRandomBusy] = useState(false);
  const [randomMessage, setRandomMessage] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);
  const [visitFeedback, setVisitFeedback] = useState<string | null>(null);
  // Every status line shows as the app-wide top-of-screen message instead of a line buried inside the panel.
  useEffect(() => { if (message) notify?.(message); }, [message]);
  useEffect(() => { if (randomMessage) notify?.(randomMessage); }, [randomMessage]);
  useEffect(() => { if (visitFeedback) notify?.(visitFeedback); }, [visitFeedback]);
  const [viewingParkFriendId, setViewingParkFriendId] = useState<string | null>(null);
  const [placingForFriendId, setPlacingForFriendId] = useState<string | null>(null);
  const [pickedElderId, setPickedElderId] = useState<string | null>(null);
  const [pickedDuration, setPickedDuration] = useState<8 | 12 | 24>(8);
  const [pickedLoan, setPickedLoan] = useState(false);
  const [pickedTargetId, setPickedTargetId] = useState<string>('');
  const [pickedGift, setPickedGift] = useState<'materials' | 'quest' | 'boost'>('materials');

  const placedElderIds = new Set(residentExchangeMine.map(r => r.elder_id));
  const stationedSet = new Set(stationedIds);
  // Only Elders that can actually leave: not already away, not defending an Arena, and not on your squad.
  const availableToSend = elders.filter(e => e.captured && !e.awayUntil && !placedElderIds.has(e.id) && !stationedSet.has(e.id) && e.status !== 'Team'); // squad members stay home; bench them first to send them out

  function timeLeftLabel(endsAtIso: string): string {
    const ms = Date.parse(endsAtIso) - Date.now();
    if (ms <= 0) return 'Ready now';
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }
  const [battleBusyId, setBattleBusyId] = useState<string | null>(null);
  const [battleFeedback, setBattleFeedback] = useState<{ friendId: string; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // The 5-minute cooldown is per opponent, so attacking one friend never blocks attacking another.
  const waitFor = (friendId: string) => Math.max(0, (friendBattle.lastByFriend?.[friendId] ?? 0) + FRIEND_BATTLE_COOLDOWN_MS - now);
  const labelFor = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const attacksToday = friendBattle.attackDay === new Date(now).toISOString().slice(0, 10) ? (friendBattle.attacksToday ?? 0) : 0;
  const dailyCapReached = attacksToday >= FRIEND_BATTLE_DAILY_ATTACK_CAP;

  const handleBattle = (friendUserId: string) => {
    if (battleBusyId || waitFor(friendUserId) > 0 || dailyCapReached || !hasSquad) return;
    setBattleBusyId(friendUserId);
    setBattleFeedback(null);
    setTimeout(() => {
      setBattleFeedback({ friendId: friendUserId, text: onBattle(friendUserId) });
      setBattleBusyId(null);
    }, 1200);
  };

  const handleSend = async () => {
    if (!codeInput.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const resultMessage = await onSendRequest(codeInput);
      setMessage(resultMessage);
      setCodeInput('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = () => {
    if (!data?.myCode) return;
    navigator.clipboard?.writeText(data.myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleRandomMatch = async () => {
    setRandomBusy(true);
    setRandomMessage(null);
    try {
      const resultMessage = await onRandomMatch();
      setRandomMessage(resultMessage);
    } catch (e) {
      setRandomMessage(e instanceof Error ? e.message : 'Could not find a match.');
    } finally {
      setRandomBusy(false);
    }
  };

  const handleToggle = async () => {
    if (!data) return;
    setToggleBusy(true);
    try {
      await onToggleOpenToRandom(!data.myOpenToRandom);
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md">
      <div className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Friends</h2>
          <button onClick={onClose} className="text-slate-300 p-2"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        {/* My friend code */}
        <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div>
            <p className={`text-[12px] font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your Friend Code</p>
            <p className="font-black text-xl tracking-[0.2em]">{data?.myCode || '········'}</p>
          </div>
          <button onClick={handleCopyCode} disabled={!data?.myCode} className="p-3 rounded-xl bg-[var(--accent-600)] text-white disabled:opacity-50">
            {copied ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Resident Exchange: Elders you've sent out, and friends' Elders staying at your park */}
        {(residentExchangeMine.length > 0 || residentExchangeHosting.length > 0) && (
          <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <p className={`text-[12px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Resident Exchange</p>
            {residentExchangeMine.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-[13px] font-bold truncate">{r.mode === 'loan' ? '🤝 ' : ''}{r.elder_name} <span className="opacity-50">@ {r.host?.display_name || 'a friend'}</span></span>
                <button
                  onClick={() => onRecallResident(r.id)}
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-[var(--accent-600)] text-white text-[11px] font-black uppercase"
                >
                  Recall · {timeLeftLabel(r.ends_at)}
                </button>
              </div>
            ))}
            {residentExchangeHosting.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 text-[13px] opacity-70">
                <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{r.owner?.display_name || 'A friend'}'s {r.elder_name} is {r.mode === 'loan' ? 'on loan to you' : 'visiting'} · {timeLeftLabel(r.ends_at)}</span>
              </div>
            ))}
            {residentExchangeHosting.map(r => (
              <p key={r.id + 'd'} className="text-[11px] opacity-70 -mt-1 mb-1.5 leading-snug">{exchangeSummary(r, 'hosting')}</p>
            ))}
          </div>
        )}

        {/* Add a friend */}
        <div className="mb-6">
          <p className={`text-[13px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Add a Friend</p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="8-character code"
              className={`flex-1 rounded-xl border p-3 text-base tracking-widest font-black ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-200'}`}
            />
            <button onClick={handleSend} disabled={busy || codeInput.trim().length !== 8} className="rounded-xl bg-[var(--accent-600)] px-4 text-white disabled:opacity-50">
              <UserPlusIcon className="w-5 h-5" />
            </button>
          </div>
          {message && !notify && <p className="text-[13px] font-bold mt-2 text-[var(--accent-500)]">{message}</p>}
        </div>

        {/* Random matching -- opt-in only */}
        <div className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[13px] font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Open to Random Matching</p>
            <button
              onClick={handleToggle}
              disabled={toggleBusy || !data}
              className={`w-12 h-6 rounded-full transition-colors relative disabled:opacity-50 ${data?.myOpenToRandom ? 'bg-[var(--accent-600)]' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${data?.myOpenToRandom ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <p className={`text-[12px] mb-3 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Off by default. When on, other players who also opt in can be matched with you.</p>
          <button
            onClick={handleRandomMatch}
            disabled={randomBusy || !data?.myOpenToRandom}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-600)] text-white font-black uppercase text-sm py-3 disabled:opacity-40"
          >
            <SparklesIcon className="w-4 h-4" /> Find a Random Friend
          </button>
          {randomMessage && !notify && <p className="text-[13px] font-bold mt-2 text-[var(--accent-500)]">{randomMessage}</p>}
        </div>

        {/* Near-power opponents: opted-in players mostly in your bracket (with a little randomness) */}
        <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="text-[15px] font-black uppercase">Find Opponents</h3>
            <span className="text-[12px] font-black opacity-70">You: Bracket {getBracket(mySquadPower).n} {getBracket(mySquadPower).name} · PWR {mySquadPower}</span>
          </div>
          <button
            onClick={onRefreshNearby}
            disabled={nearbyBusy || nearbyWait > 0}
            className="w-full rounded-xl bg-[var(--accent-600)] text-white font-black uppercase text-[14px] py-3 disabled:opacity-50"
          >
            {nearbyBusy ? 'Searching...' : nearbyWait > 0 ? `Refresh in ${Math.ceil(nearbyWait / 1000)}s` : nearby.length ? '🔄 Refresh list' : '🔍 Find players near my power'}
          </button>
          {nearbyError && <p className="text-[13px] font-bold mt-2 opacity-80">{nearbyError}</p>}
          <p className="text-[11px] opacity-60 mt-2">Only players who turned on "Open to random matching" are listed. Most are near your power; a few come from further away for variety.</p>
          <div className="space-y-2 mt-3">
            {nearby.map(p => {
              const br = getBracket(p.squad_power);
              const wait = waitFor(p.user_id);
              return (
                <div key={p.user_id} className={`p-3 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-[14px] uppercase truncate">{p.display_name || 'Park Visitor'}</p>
                      <p className="text-[12px] font-bold opacity-70">Lv {p.level} · PWR {p.squad_power} · Bracket {br.n} {br.name}</p>
                    </div>
                    <span className={`text-[11px] font-black uppercase ${p.squad_power > mySquadPower * 1.15 ? 'text-orange-500' : p.squad_power < mySquadPower * 0.85 ? 'text-emerald-500' : 'text-amber-400'}`}>
                      {p.squad_power > mySquadPower * 1.15 ? 'Tougher' : p.squad_power < mySquadPower * 0.85 ? 'Easier' : 'Even'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleBattle(p.user_id)}
                      disabled={wait > 0 || dailyCapReached || !hasSquad || battleBusyId !== null}
                      className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-black uppercase text-[12px] disabled:opacity-40"
                    >
                      {battleBusyId === p.user_id ? 'Battling...' : !hasSquad ? 'Need a squad' : dailyCapReached ? 'Daily limit' : wait > 0 ? `Ready ${labelFor(wait)}` : '⚔️ Battle'}
                    </button>
                    <button
                      onClick={() => { void sendFriendRequestByUserId(p.user_id).then(() => onRefresh()).catch(() => {}); }}
                      className={`px-3 py-2 rounded-lg font-black uppercase text-[12px] ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'}`}
                    >
                      + Friend
                    </button>
                  </div>
                  {battleFeedback?.friendId === p.user_id && <p className="text-[12px] font-bold mt-2 text-[var(--accent-500)]">{battleFeedback.text}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Incoming requests */}
        {data && data.incoming.length > 0 && (
          <div className="mb-6">
            <p className={`text-[13px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Requests</p>
            <div className="space-y-2">
              {data.incoming.map(req => (
                <div key={req.id} className={`flex items-center justify-between rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="font-bold text-sm truncate">{req.displayName || 'Park Visitor'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onRespond(req.id, true)} className="text-emerald-500"><CheckCircleIcon className="w-6 h-6" /></button>
                    <button onClick={() => onRespond(req.id, false)} className="text-rose-400"><XCircleIcon className="w-6 h-6" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing requests */}
        {data && data.outgoing.length > 0 && (
          <div className="mb-6">
            <p className={`text-[13px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Sent — Awaiting Reply</p>
            <div className="space-y-2">
              {data.outgoing.map(req => (
                <div key={req.id} className={`rounded-xl p-3 text-sm font-bold opacity-60 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>{req.displayName || 'Park Visitor'}</div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div>
          <p className={`text-[13px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            Friends {data ? `(${data.friends.length})` : ''}
          </p>
          {loading && <p className="text-[13px] italic opacity-50">Loading...</p>}
          {error && <p className="text-[13px] font-bold text-rose-400">{error} <button onClick={onRefresh} className="underline">Retry</button></p>}
          {!loading && !error && data && data.friends.length === 0 && (
            <p className="text-[13px] italic opacity-50">No friends yet — share your code or enter theirs above.</p>
          )}
          <div className="space-y-2">
            {data?.friends.map(friend => {
              const display = friendDisplay(friend);
              const isExpanded = expandedFriendId === friend.user_id;
              const lastVisit = lastVisitedFriends[friend.user_id] ?? 0;
              const onCooldown = Date.now() - lastVisit < VISIT_COOLDOWN_MS;
              const builtAmenities = AMENITIES.filter(a => friend.built_amenities?.includes(a.id));
              return (
                <div key={friend.user_id} className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <button onClick={() => setExpandedFriendId(isExpanded ? null : friend.user_id)} className="w-full flex items-center gap-3 p-3 text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-[var(--accent-500-a10)]">{display.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm uppercase truncate">{friend.display_name || 'Park Visitor'}</p>
                      <p className={`text-[12px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{display.title} · PWR {friend.squad_power}</p>
                    </div>
                    {friend.favorite_elders.length > 0 && (
                      <div className="flex -space-x-2 flex-shrink-0">
                        {friend.favorite_elders.map((e, i) => (
                          <div key={i} title={`${e.name}${e.rarity ? ' · ' + e.rarity : ''}${e.level ? ' · Lv.' + e.level : ''}`} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white dark:border-slate-800 relative" style={e.rarity ? { borderColor: GEAR_RARITY_COLOR[e.rarity] } : undefined}>
                            <ElderAvatarImg type={e.type as any} stage={e.evolutionStage} fill />
                            {(e.level || e.rarity) && <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-black leading-tight text-center">{e.level ? `Lv${e.level}` : ''}{e.rarity ? ` ${e.rarity[0]}` : ''}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 opacity-50" /> : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 opacity-50" />}
                  </button>
                  {isExpanded && (
                    <div className={`px-3 pb-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <p className={`text-[12px] font-black uppercase tracking-widest mt-3 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Their Park</p>
                      <button
                        onClick={() => setViewingParkFriendId(friend.user_id)}
                        className={`w-full mb-3 py-2 rounded-xl text-[12px] font-black uppercase ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                      >
                        🌳 View Park {builtAmenities.length > 0 ? `(${builtAmenities.length} built)` : '(nothing built yet)'}
                      </button>
                      <button
                        onClick={() => { setPlacingForFriendId(placingForFriendId === friend.user_id ? null : friend.user_id); setPickedElderId(null); }}
                        className={`w-full mb-3 py-2 rounded-xl text-[12px] font-black uppercase ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                      >
                        🏡 Leave a Folk Here
                      </button>
                      {placingForFriendId === friend.user_id && (
                        <div className={`rounded-xl p-3 mb-3 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                          {availableToSend.length === 0 ? (
                            <p className="text-[12px] italic opacity-50">No Elders free to send. Squad members and Arena defenders stay home.</p>
                          ) : (
                            <>
                              <select
                                value={pickedElderId ?? ''}
                                onChange={e => setPickedElderId(e.target.value || null)}
                                className={`w-full mb-2 p-2 rounded-lg text-[13px] font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                              >
                                <option value="">Choose an Elder…</option>
                                {availableToSend.map(e => <option key={e.id} value={e.id}>{e.name} · {e.type} · Lv.{e.level} {e.rarity} · PWR {getElderPower(e)}</option>)}
                              </select>
                              <div className="flex gap-2 mb-2">
                                {[8, 12, 24].map(h => (
                                  <button
                                    key={h}
                                    onClick={() => setPickedDuration(h as 8 | 12 | 24)}
                                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-black ${pickedDuration === h ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}
                                  >
                                    {h}h
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2 mb-2">
                                {([[false, '🏡 Visit'], [true, '🤝 Squad Loan']] as const).map(([v, label]) => (
                                  <button key={label} onClick={() => setPickedLoan(v)} className={`flex-1 py-1.5 rounded-lg text-[12px] font-black ${pickedLoan === v ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}>{label}</button>
                                ))}
                              </div>
                              {pickedLoan ? (
                                <p className="text-[11px] opacity-70 mb-2">Your friend borrows this Elder for Battles and Court games (not Arenas or Raids). They can borrow one Elder at a time. You still earn Elder XP while it is away.</p>
                              ) : (<>
                              <p className="text-[11px] font-black uppercase opacity-50 mb-1">Gift for your friend when it comes home</p>
                              <div className="flex gap-2 mb-1">
                                {([['materials', '🧱 Materials'], ['quest', '📋 Quest'], ['boost', '⚙️ Output']] as const).map(([g, label]) => (
                                  <button
                                    key={g}
                                    onClick={() => setPickedGift(g)}
                                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-black ${pickedGift === g ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[11px] opacity-60 mb-2">
                                {pickedGift === 'materials' ? `About ${Math.max(1, Math.round(pickedDuration * 0.5))} Building Materials.` : pickedGift === 'quest' ? `+${Math.max(1, Math.round(pickedDuration / 4))} progress on a Quest they choose.` : `+${Math.max(1, Math.round(pickedDuration / 4))}h of output on a working building they choose.`} Scales down if recalled early.
                              </p>
                              {(pickedGift === 'quest' || pickedGift === 'boost') && (() => {
                                const opts = pickedGift === 'quest'
                                  ? (friend.active_quests ?? []).map(q => ({ id: q.id, label: `${q.title} (${q.progress}/${q.target})` }))
                                  : AMENITIES.filter(a => a.producer && friend.built_amenities?.includes(a.id)).map(a => ({ id: a.id, label: a.name }));
                                return opts.length === 0 ? (
                                  <p className="text-[11px] opacity-60 mb-2">{pickedGift === 'quest' ? 'Your friend has no active quests to help with right now.' : 'Your friend has no working buildings to boost yet.'} They can pick when claiming instead.</p>
                                ) : (
                                  <select value={pickedTargetId} onChange={ev => setPickedTargetId(ev.target.value)} className={`w-full mb-2 rounded-lg px-2 py-2 text-[12px] font-black ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                    <option value="">{pickedGift === 'quest' ? 'Let them choose a quest' : 'Let them choose a building'}</option>
                                    {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                  </select>
                                );
                              })()}
                              </>)}
                              <button
                                disabled={!pickedElderId}
                                onClick={() => {
                                  const elder = elders.find(e => e.id === pickedElderId);
                                  if (!elder) return;
                                  const tgtOpts = pickedGift === 'quest' ? (friend.active_quests ?? []).map(q => ({ id: q.id, label: q.title })) : AMENITIES.filter(a => a.producer).map(a => ({ id: a.id, label: a.name }));
                                  const tgt = !pickedLoan && pickedTargetId ? tgtOpts.find(o => o.id === pickedTargetId) : undefined;
                                  onPlaceResident(friend.user_id, elder, pickedDuration, pickedGift, pickedLoan, tgt);
                                  setPickedTargetId('');
                                  setPlacingForFriendId(null);
                                }}
                                className="w-full py-2 rounded-lg bg-[var(--accent-600)] text-white text-[12px] font-black uppercase disabled:opacity-40"
                              >
                                Send for {pickedDuration}h
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => handleBattle(friend.user_id)}
                          disabled={waitFor(friend.user_id) > 0 || dailyCapReached || !hasSquad || battleBusyId !== null}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-black uppercase ${waitFor(friend.user_id) <= 0 && !dailyCapReached && hasSquad && battleBusyId === null ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          {battleBusyId === friend.user_id ? 'Battling…' : !hasSquad ? 'Need a squad' : dailyCapReached ? 'Daily limit reached' : waitFor(friend.user_id) > 0 ? `⏳ Ready in ${labelFor(waitFor(friend.user_id))}` : '⚔️ Battle'}
                        </button>
                      </div>
                      {battleFeedback?.friendId === friend.user_id && (
                        <p className="text-[13px] font-black text-[var(--accent-500)] text-center mb-2">{battleFeedback.text}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onVisit(friend.user_id);
                            setVisitFeedback(`+${VISIT_MATERIALS_REWARD} 🧱 Building Materials!`);
                            setTimeout(() => setVisitFeedback(null), 3000);
                          }}
                          disabled={onCooldown}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-black uppercase ${!onCooldown ? 'bg-[var(--accent-600)] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          {onCooldown ? 'Visited today' : `Visit (+${VISIT_MATERIALS_REWARD} 🧱)`}
                        </button>
                        <button onClick={() => onRemove(friend.user_id)} className="px-3 rounded-xl text-slate-300 hover:text-rose-400"><UserMinusIcon className="w-4 h-4" /></button>
                      </div>
                      {isExpanded && visitFeedback && !notify && (
                        <p className="text-[13px] font-black text-[var(--accent-500)] text-center mt-2">{visitFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {viewingParkFriendId && (() => {
        const friend = data?.friends.find(f => f.user_id === viewingParkFriendId);
        if (!friend) return null;
        return (
          <div className="fixed inset-0 z-[220] bg-black/80">
            <div className="max-w-lg mx-auto h-full overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur">
                <span className="text-white font-black uppercase text-sm truncate">{friend.display_name || 'Park Visitor'}'s Park</span>
                <button onClick={() => setViewingParkFriendId(null)} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-[12px] font-black uppercase">✕ Close</button>
              </div>
              <ParkScene
                isDark={isDark}
                builtAmenityIds={friend.built_amenities ?? []}
                amenityLevels={friend.amenity_levels ?? {}}
                amenityCollectedAt={{}}
                comfortBonus={0}
                rosterCount={0}
                capacity={0}
                materials={0}
                readOnly
                wanderers={[
                  ...friend.favorite_elders.map((e, i) => ({ key: `res_${friend.user_id}_${i}`, type: e.type, stage: e.evolutionStage, name: e.name, label: `${friend.display_name || 'Their'} resident`, level: e.level, rarity: e.rarity })),
                  ...(residentExchangeMine ?? []).filter(r => r.host_id === friend.user_id && (r.mode ?? 'visit') === 'visit').map(r => ({ key: 'mine_' + r.id, type: r.elder_type, stage: r.elder_evolution_stage ?? 0, name: r.elder_name, label: 'Yours (visiting)', level: r.snapshot?.level, rarity: r.snapshot?.rarity })),
                ]}
                title={`${friend.display_name || 'Park Visitor'}'s Park`}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FriendsPanel;
