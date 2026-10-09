import React from 'react';
import ticketImg from '../game-assets/icons/ticket.png';
import materialsImg from '../game-assets/icons/materials.png';
import ppImg from '../game-assets/icons/pp.png';
import tvDinnerImg from '../game-assets/icons/tvdinner.png';
import mementoImg from '../game-assets/icons/memento.png';
import passImg from '../game-assets/icons/pass.png';

// Emoji -> real art map. Drop a PNG in game-assets/icons/ and add one line here;
// until an entry exists the original emoji is shown, so nothing breaks mid-migration.
const ART: Record<string, string> = {
  '🎟️': ticketImg,
  '🧱': materialsImg,
  '💰': ppImg,
  '🍽️': tvDinnerImg,
  '💛': mementoImg,
  '🎫': passImg,
};

const norm = (s: string) => s.replace(/\ufe0f/g, '');
const LOOKUP: Record<string, string> = Object.fromEntries(Object.entries(ART).map(([k, v]) => [norm(k), v]));
const KEYS = Object.keys(LOOKUP);

/** Single icon: real art if mapped, else the emoji itself. */
export const Gfx: React.FC<{ e: string; className?: string; size?: number }> = ({ e, className = '', size = 20 }) => {
  const src = LOOKUP[norm(e)];
  if (!src) return <span className={className} aria-hidden>{e}</span>;
  return <img src={src} alt="" draggable={false} className={`inline-block object-contain align-[-0.2em] ${className}`} style={{ width: size, height: size }} />;
};

/** Text that may contain mapped emoji (e.g. "+12 🎟️"); swaps only the mapped ones. */
export const EmojiText: React.FC<{ text: any; size?: number }> = ({ text, size = 18 }) => {
  if (!KEYS.length || typeof text !== 'string') return <>{text}</>;
  const re = new RegExp(`(${KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\ufe0f?`, 'g');
  const out: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Gfx key={i++} e={m[1]} size={size} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
};
