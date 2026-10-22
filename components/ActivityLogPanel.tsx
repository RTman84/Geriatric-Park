import React, { useState } from 'react';
import { EmojiText } from './Gfx';
import { GLYPH_ART } from '../constants';

export interface ActivityEntry { t: number; kind: string; text: string }

const ago = (t: number, now: number): string => {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Activity log: the latest 20 things that happened (fights, raids, items, level-ups, purchases, mail...), "Show more" pages to 100.
const ActivityLogPanel: React.FC<{ entries: ActivityEntry[]; onClose: () => void }> = ({ entries, onClose }) => {
  const [shown, setShown] = useState(20);
  const now = Date.now();
  return (
    <div className="fixed inset-0 z-[185] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl border-2 border-slate-600 bg-slate-900 text-slate-100 shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-700 p-4">
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide"><img src={GLYPH_ART.activityLog} alt="" className="h-8 w-8 object-contain" />Activity Log</h2>
          <button onClick={onClose} className="rounded-full bg-slate-700 px-4 py-1.5 text-sm font-black uppercase">Close</button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {entries.length === 0 && <p className="p-6 text-center text-sm font-semibold text-slate-400">Nothing yet. Fights, raids, items, level-ups and purchases will show up here.</p>}
          {entries.slice(0, shown).map((e, i) => (
            <div key={`${e.t}-${i}`} className="rounded-xl bg-slate-800 px-3 py-2">
              <div className="whitespace-pre-line text-sm font-semibold leading-snug"><EmojiText text={e.text} /></div>
              <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{ago(e.t, now)}</div>
            </div>
          ))}
          {entries.length > shown && (
            <button onClick={() => setShown(s => Math.min(100, s + 30))} className="w-full rounded-xl border border-slate-600 py-2.5 text-sm font-black uppercase text-slate-200">Show more ({Math.min(entries.length, 100) - shown} older)</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPanel;
