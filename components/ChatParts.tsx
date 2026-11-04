import React, { useState } from 'react';
import { POSSE_CHAT_CATEGORIES, POSSE_CHAT_TEXT, STICKER_IDS } from '../services/posseChat';
import { CHAT_STICKER_ART } from '../game-assets/w7Art';

// Shared by the Posse chat and the friend chat: renders a preset (text or sticker) and the preset picker.
export const ChatBody: React.FC<{ preset: string }> = ({ preset }) => {
  if (preset.startsWith('st_')) {
    const art = CHAT_STICKER_ART[preset.slice(3)];
    return art ? <img src={art} alt="" className="w-24 h-24 object-contain" /> : <p className="text-[14px] font-semibold">...</p>;
  }
  return <p className="text-[14px] font-semibold">{POSSE_CHAT_TEXT[preset] ?? '...'}</p>;
};

export const ChatPicker: React.FC<{ isDark: boolean; disabled?: boolean; onSend: (presetId: string) => void }> = ({ isDark, disabled, onSend }) => {
  const [cat, setCat] = useState<string>('greet');
  const tab = (id: string, label: string) => (
    <button key={id} onClick={() => setCat(id)} className={`px-3 py-1.5 rounded-lg font-black uppercase text-[11px] whitespace-nowrap ${cat === id ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
  );
  const chip = isDark ? 'bg-slate-800' : 'bg-slate-100';
  return (
    <div>
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">{POSSE_CHAT_CATEGORIES.map(c => tab(c.id, c.label))}{tab('stickers', 'Stickers')}</div>
      <div className="flex flex-wrap gap-2 pb-2 max-h-[34dvh] overflow-y-auto">
        {cat === 'stickers'
          ? STICKER_IDS.map(id => (
              <button key={id} disabled={disabled} onClick={() => onSend(id)} className={`p-1 rounded-xl active:scale-95 disabled:opacity-50 ${chip}`}><img src={CHAT_STICKER_ART[id.slice(3)]} alt="" className="w-16 h-16 object-contain" /></button>
            ))
          : POSSE_CHAT_CATEGORIES.find(c => c.id === cat)?.presets.map(p => (
              <button key={p.id} disabled={disabled} onClick={() => onSend(p.id)} className={`px-3 py-2 rounded-xl text-[13px] font-bold text-left active:scale-95 disabled:opacity-50 ${chip}`}>{p.text}</button>
            ))}
      </div>
    </div>
  );
};
