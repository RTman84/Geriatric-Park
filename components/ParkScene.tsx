import React, { useEffect, useState } from 'react';
import { AMENITIES, INVESTMENT_TIERS, producerStored, ElderAvatarImg, GEAR_RARITY_COLOR } from '../constants';
import backdrop from '../game-assets/park/park_backdrop.jpg';
import cottage from '../game-assets/park/cut/cottage.png';
import trail from '../game-assets/park/cut/trail.png';
import grocery from '../game-assets/park/cut/grocery.png';
import aerobics from '../game-assets/park/cut/aerobics.png';
import birdwatch from '../game-assets/park/cut/birdwatch.png';
import earlybird from '../game-assets/park/cut/earlybird.png';
import complaints from '../game-assets/park/cut/complaints.png';
import nappod from '../game-assets/park/cut/nappod.png';
import prunebar from '../game-assets/park/cut/prunebar.png';
import shuffleboard_deco from '../game-assets/park/cut/shuffleboard_deco.png';

// Cut-out (transparent background) versions of the amenity art, keyed by amenity id.
const ART: Record<string, string> = { cottage, trail, grocery, aerobics, birdwatch, earlybird, complaints, nappod, prunebar, shuffleboard_deco };

// The backdrop is four stitched sections (pond top, two plain middles, gate bottom), 1024 x 2992.
// Everything is positioned as a % of it, so the scene scales with the screen width. Buildings sit in
// two staggered columns either side of the path (the path never swings into either column).
// Only amenities with an entry here get a spot -- adding more buildings later means adding art
// height (another middle section) and extending SLOT_ORDER; they stay reachable through Grounds meanwhile.
const BG_W = 1024, BG_H = 2992, BW = 250, BH = 333;
const SLOT_ORDER = ['cottage', 'trail', 'grocery', 'aerobics', 'birdwatch', 'earlybird', 'complaints', 'nappod', 'prunebar', 'shuffleboard_deco'];
function slotFor(i: number) {
  const row = Math.floor(i / 2), col = i % 2;
  return { xc: col === 0 ? 190 : 835, y: (col === 0 ? 300 : 520) + row * 460 };
}

export interface Wanderer {
  key: string; type: string; stage: number; name: string;
  label: string; // e.g. "Yours", "Visiting from Ann", "Resident"
  level?: number; rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}
// ---- Decoration (Park Assets placed by the player) ----
export interface DecorPiece { id: string; x: number; y: number } // x, y in % of the scene
export interface DecorOption { id: string; icon: string; name: string; owned: number; placed: number }
// Only grass counts: not the central path (31-69% across, with a margin), not any building footprint (built or not,
// with a margin), not the pond at the top or the gate at the bottom.
export function isDecorSpotValid(xPct: number, yPct: number): boolean {
  if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return false;
  const x = (xPct / 100) * BG_W, y = (yPct / 100) * BG_H;
  if (x < 24 || x > BG_W - 24 || y < 300 || y > BG_H - 330) return false;
  if (x > 310 && x < 714) return false; // path
  for (let i = 0; i < SLOT_ORDER.length; i++) {
    const { xc, y: top } = slotFor(i);
    if (x > xc - BW / 2 - 14 && x < xc + BW / 2 + 14 && y > top - 14 && y < top + BH + 14) return false;
  }
  return true;
}
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

interface ParkSceneProps {
  isDark: boolean;
  builtAmenityIds: string[];
  amenityLevels: Record<string, number>;
  amenityCollectedAt: Record<string, number>;
  comfortBonus: number;
  rosterCount: number;
  capacity: number;
  materials: number;
  onOpenGrounds?: (amenityId?: string) => void;
  onOpenExchange?: () => void; // the Away & Visiting window
  onOpenHub?: () => void;
  onCollect?: (amenityId: string) => void;
  wanderers?: Wanderer[]; // Elders strolling the grounds: your own, visitors, and (in a friend's park) residents + your own visitor
  decor?: DecorPiece[]; // placed Park Assets
  decorOptions?: DecorOption[]; // what the player owns (own park only)
  onPlaceDecor?: (id: string, x: number, y: number) => void;
  onRemoveDecor?: (index: number) => void;
  onDecorInvalid?: () => void;
  readOnly?: boolean; // for visiting a friend's park later: no collect / hub buttons
  title?: string;
}

const pillBase: React.CSSProperties = {
  whiteSpace: 'nowrap', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5,
  padding: '3px 9px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.85)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.35)', color: '#fff', lineHeight: 1.2,
};
// Name plate drawn in the app's own type instead of relying on the (angled, sometimes unreadable) signs baked into the art.
const nameBar: React.CSSProperties = {
  fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4, color: '#fff', textAlign: 'center',
  background: 'rgba(45,30,15,0.88)', border: '2px solid rgba(255,255,255,0.85)', borderRadius: 10, padding: '3px 8px',
  lineHeight: 1.15, maxWidth: 124, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', cursor: 'pointer',
};

const ParkScene: React.FC<ParkSceneProps> = ({
  isDark, builtAmenityIds, amenityLevels, amenityCollectedAt, comfortBonus, rosterCount, capacity, materials,
  onOpenGrounds, onOpenExchange, onOpenHub, onCollect, readOnly = false, title, wanderers = [], decor = [], decorOptions, onPlaceDecor, onRemoveDecor, onDecorInvalid,
}) => {
  const [decorMode, setDecorMode] = useState(false);
  const [decorPick, setDecorPick] = useState<string | null>(null);
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const decorIcons = Object.fromEntries((decorOptions ?? []).map(o => [o.id, o.icon]));
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const barBtn: React.CSSProperties = {
    pointerEvents: 'auto', background: 'rgba(20,20,20,0.72)', color: '#fff', border: '2px solid rgba(255,255,255,0.8)',
    borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6,
    backdropFilter: 'blur(4px)',
  };

  return (
    <div ref={sceneRef} style={{ position: 'relative', width: '100%' }}>
      {/* Sticky top bar: zero-height wrapper so it floats over the scene while scrolling */}
      <div style={{ position: 'sticky', top: 8, zIndex: 20, height: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', pointerEvents: 'none' }}>
          {readOnly || !onOpenHub
            ? <div style={{ ...barBtn, pointerEvents: 'none' }}>{title ?? 'Park'}</div>
            : <button onClick={onOpenHub} style={barBtn}>🏠 Park Hub</button>}
          <div style={{ ...barBtn, pointerEvents: 'none' }}>👥 {rosterCount}/{capacity}</div>
          {!readOnly && onOpenGrounds ? <button onClick={onOpenGrounds} style={barBtn}>🏡 Grounds</button> : <div style={{ width: 1 }} />}
        </div>
        {!readOnly && decorOptions && decorOptions.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, padding: '0 10px', pointerEvents: 'none' }}>
            <button onClick={() => { setDecorMode(m => !m); setDecorPick(null); }} style={barBtn}>{decorMode ? '✔ Done decorating' : '🎨 Decorate'}</button>
          </div>
        )}
        {decorMode && decorOptions && (
          <div style={{ margin: '6px 10px 0', padding: 8, borderRadius: 14, background: 'rgba(0,0,0,0.78)', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto' }}>
            <div style={{ width: '100%', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>
              {decorPick ? 'Now tap the grass to place it' : 'Pick an asset, then tap the grass. Tap a placed one to remove it.'}
            </div>
            {decorOptions.map(o => {
              const left = o.owned - o.placed;
              return (
                <button key={o.id} disabled={left <= 0} onClick={() => setDecorPick(decorPick === o.id ? null : o.id)}
                  style={{ padding: '6px 10px', borderRadius: 12, border: decorPick === o.id ? '3px solid #fbbf24' : '2px solid rgba(255,255,255,0.4)', background: left > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: '#fff', opacity: left > 0 ? 1 : 0.45, fontSize: 13, fontWeight: 900 }}>
                  {o.icon} {o.name} ×{Math.max(0, left)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <img src={backdrop} alt="" draggable={false} style={{ width: '100%', display: 'block', filter: isDark ? 'brightness(0.72) saturate(0.9)' : undefined }} />

      {/* Placed Park Assets (the player's own decoration; friends see them read-only) */}
      {decor.map((d, i) => (
        <div key={i} onClick={decorMode && onRemoveDecor ? (e) => { e.stopPropagation(); onRemoveDecor(i); } : undefined}
          style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)', fontSize: 'clamp(26px, 7vw, 44px)', lineHeight: 1, zIndex: 4, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.45))', cursor: decorMode ? 'pointer' : 'default', outline: decorMode ? '2px dashed rgba(255,255,255,0.8)' : undefined, borderRadius: 8, pointerEvents: decorMode ? 'auto' : 'none' }}>
          {decorIcons[d.id] ?? INVESTMENT_TIERS.flatMap(t => t.items).find(x => x.id === d.id)?.icon ?? '🌳'}
        </div>
      ))}
      {decorMode && (
        <div onClick={e => {
          if (!decorPick || !onPlaceDecor || !sceneRef.current) return;
          const r = sceneRef.current.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
          if (!isDecorSpotValid(x, y)) { onDecorInvalid?.(); return; }
          onPlaceDecor(decorPick, +x.toFixed(2), +y.toFixed(2));
        }} style={{ position: 'absolute', inset: 0, zIndex: 3, cursor: decorPick ? 'crosshair' : 'default' }} />
      )}

      <style>{`@keyframes gpStroll { 0% { transform: translateX(-9vw); } 50% { transform: translateX(9vw); } 100% { transform: translateX(-9vw); } }`}</style>
      {wanderers.slice(0, 12).map((w, i) => {
        const h = hash(w.key);
        // Elders keep to the central path (between the two building columns) and stroll side to side at their own pace.
        const left = 40 + (h % 20);                                   // 40-60% across
        const top = ((380 + ((h >> 5) % 2300)) / BG_H) * 100;          // spread down the whole scene
        const dur = 14 + (h % 16);
        const color = w.rarity ? GEAR_RARITY_COLOR[w.rarity] : '#fff';
        return (
          <div key={w.key} title={`${w.name} · ${w.label}${w.rarity ? ' · ' + w.rarity : ''}${w.level ? ' · Lv.' + w.level : ''}`} style={{
            position: 'absolute', left: `${left}%`, top: `${top}%`, width: '11%', zIndex: 3, pointerEvents: 'none',
            animation: `gpStroll ${dur}s ease-in-out ${-(h % dur)}s infinite`,
          }}>
            <div style={{ transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1', minWidth: 38, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${color}`, boxShadow: '0 3px 6px rgba(0,0,0,0.45)', background: '#fff' }}>
                <ElderAvatarImg type={w.type as any} stage={w.stage as any} fill />
              </div>
              <div style={{ ...nameBar, fontSize: 9, padding: '1px 6px', maxWidth: 110, cursor: 'default' }}>
                {w.name}{w.level ? ` · Lv${w.level}` : ''}<br /><span style={{ opacity: 0.85 }}>{w.label}</span>
              </div>
            </div>
          </div>
        );
      })}

      {SLOT_ORDER.map((id, i) => {
        const amenity = AMENITIES.find(a => a.id === id);
        if (!amenity) return null;
        const built = builtAmenityIds.includes(id);
        const level = amenityLevels[id] ?? 1;
        const { xc, y } = slotFor(i);
        const stored = built && amenity.producer
          ? producerStored(amenity, level, amenityCollectedAt[id], now, comfortBonus) : 0;
        const icon = amenity.producer?.output === 'tickets' ? '🎟️' : '🧱';
        return (
          <React.Fragment key={id}>
            <button
              onClick={readOnly ? undefined : () => onOpenGrounds?.(id)}
              aria-label={amenity.name}
              style={{
                position: 'absolute', left: `${((xc - BW / 2) / BG_W) * 100}%`, top: `${(y / BG_H) * 100}%`,
                width: `${(BW / BG_W) * 100}%`, padding: 0, border: 0, background: 'none', cursor: readOnly ? 'default' : 'pointer',
              }}
            >
              <img src={ART[id]} alt="" draggable={false} style={{
                width: '100%', display: 'block',
                filter: built ? 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' : 'grayscale(1) brightness(1.15) drop-shadow(0 4px 4px rgba(0,0,0,0.25))',
                opacity: built ? 1 : 0.42,
              }} />
              {built && (
                <span style={{
                  position: 'absolute', top: '6%', left: '4%', background: '#f59e0b', color: '#3b2400', border: '2px solid #fff',
                  borderRadius: 999, fontSize: 10, fontWeight: 900, padding: '1px 7px', boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
                }}>Lv {level}</span>
              )}
            </button>
            {/* Stacked labels under the building: name plate, then (only when there is something to do) an action pill */}
            <div style={{
              position: 'absolute', top: `${((y + BH - 6) / BG_H) * 100}%`, left: `${(xc / BG_W) * 100}%`,
              transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <button onClick={readOnly ? undefined : () => onOpenGrounds?.(id)} style={{ ...nameBar, opacity: built ? 1 : 0.85, cursor: readOnly ? 'default' : 'pointer' }}>{amenity.name}</button>
              {built && stored > 0 && !readOnly && onCollect ? (
                <button onClick={() => onCollect(id)} style={{ ...pillBase, background: '#16a34a', cursor: 'pointer' }}>
                  Collect {icon} {stored}
                </button>
              ) : !built && !readOnly ? (
                <button onClick={() => onOpenGrounds?.(id)} style={{ ...pillBase, background: materials >= amenity.cost ? '#2563eb' : 'rgba(90,90,90,0.85)', cursor: 'pointer' }}>
                  Build · {amenity.cost} 🧱
                </button>
              ) : !built && readOnly ? (
                <div style={{ ...pillBase, background: 'rgba(90,90,90,0.7)' }}>Not built</div>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ParkScene;
