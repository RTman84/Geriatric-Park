import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon, CheckCircleIcon, XCircleIcon, UserMinusIcon, ClipboardDocumentIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { ElderAvatarImg, getRankForLevel, AMENITIES, VISIT_COOLDOWN_MS, VISIT_MATERIALS_REWARD, isImagePath } from '../constants';
import type { FriendsData, PlayerProfileSnapshot } from '../services/socialService';

interface FriendsPanelProps {
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

const FriendsPanel: React.FC<FriendsPanelProps> = ({ isDark, data, loading, error, lastVisitedFriends, onClose, onRefresh, onSendRequest, onRespond, onRemove, onRandomMatch, onToggleOpenToRandom, onVisit }) => {
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [randomBusy, setRandomBusy] = useState(false);
  const [randomMessage, setRandomMessage] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);
  const [visitFeedback, setVisitFeedback] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <div className={`rounded-[3rem] p-8 w-full max-w-sm flex flex-col shadow-2xl border-4 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
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
          {message && <p className="text-[13px] font-bold mt-2 text-[var(--accent-500)]">{message}</p>}
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
          {randomMessage && <p className="text-[13px] font-bold mt-2 text-[var(--accent-500)]">{randomMessage}</p>}
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
                          <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white dark:border-slate-800">
                            <ElderAvatarImg type={e.type as any} stage={e.evolutionStage} fill />
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0 opacity-50" /> : <ChevronDownIcon className="w-4 h-4 flex-shrink-0 opacity-50" />}
                  </button>
                  {isExpanded && (
                    <div className={`px-3 pb-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <p className={`text-[12px] font-black uppercase tracking-widest mt-3 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Their Grounds</p>
                      {builtAmenities.length === 0 ? (
                        <p className="text-[13px] italic opacity-50 mb-3">Nothing built yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {builtAmenities.map(a => (
                            <div key={a.id} title={a.name} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                              <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                                {isImagePath(a.icon) ? <img src={a.icon} alt={a.name} className="w-full h-full object-cover" /> : <span>{a.icon}</span>}
                              </div>
                              <span>{a.name}</span>
                            </div>
                          ))}
                        </div>
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
                      {isExpanded && visitFeedback && (
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
    </div>
  );
};

export default FriendsPanel;
