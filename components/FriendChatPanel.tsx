import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ChatBody, ChatPicker } from './ChatParts';
import { fetchFriendChat, sendFriendChat, markSeen, type FriendChatMessage } from '../services/friendChatService';

const FriendChatPanel: React.FC<{ isDark: boolean; friendId: string; friendName: string; onClose: () => void; onSeen?: () => void; notify?: (m: string, kind?: 'good' | 'bad') => void }> = ({ isDark, friendId, friendName, onClose, onSeen, notify }) => {
  const [msgs, setMsgs] = useState<FriendChatMessage[]>([]);
  const [cooling, setCooling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  const merge = useCallback((incoming: FriendChatMessage[]) => {
    if (!incoming.length) return;
    setMsgs(prev => {
      const seen = new Set(prev.map(m => m.id));
      const next = [...prev, ...incoming.filter(m => !seen.has(m.id))].slice(-100);
      lastId.current = next.length ? next[next.length - 1].id : 0;
      if (lastId.current) { markSeen(friendId, lastId.current); onSeen?.(); }
      return next;
    });
  }, [friendId, onSeen]);

  // Near-real-time: poll every 4 seconds while this chat is open.
  useEffect(() => {
    let stop = false;
    const tick = async () => { try { const r = await fetchFriendChat(friendId, lastId.current || undefined); if (!stop) { merge(r.messages); setError(null); } } catch (e) { if (!stop) setError(e instanceof Error ? e.message : 'Chat unavailable.'); } };
    void tick(); const t = window.setInterval(tick, 4000);
    return () => { stop = true; window.clearInterval(t); };
  }, [friendId, merge]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async (preset: string) => {
    if (cooling) return; setCooling(true); window.setTimeout(() => setCooling(false), 1200);
    try { const r = await sendFriendChat(friendId, preset, lastId.current || undefined); merge(r.messages); }
    catch (e) { const m = e instanceof Error ? e.message : 'Could not send.'; if (notify) notify(m, 'bad'); else setError(m); }
  };

  const card = isDark ? 'bg-slate-800' : 'bg-slate-100';
  return (
    <div className="fixed inset-0 z-[3600] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className={`rounded-[2rem] p-5 w-full max-w-lg h-[92dvh] max-h-[92dvh] flex flex-col shadow-2xl border-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-black uppercase italic tracking-tighter truncate">Chat with {friendName}</h2>
          <button onClick={onClose} className="text-slate-300 p-2" aria-label="Close"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        {error && <p className="text-[12px] font-bold text-red-500 mb-2">{error}</p>}
        <div className={`flex-1 min-h-[160px] overflow-y-auto rounded-2xl p-3 mb-3 ${card}`}>
          {msgs.length === 0 && <p className="text-[12px] opacity-60 italic">No messages yet. Tap a quick message below to say hi.</p>}
          {msgs.map(m => (
            <div key={m.id} className={`mb-2 flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.mine ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-700' : 'bg-white'}`}>
                <ChatBody preset={m.preset} />
                <p className="text-[10px] opacity-60 mt-0.5">{new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <ChatPicker isDark={isDark} disabled={cooling} onSend={send} />
      </div>
    </div>
  );
};
export default FriendChatPanel;
