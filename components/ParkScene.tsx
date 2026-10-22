import React, { useEffect, useState } from 'react';
import { Gfx, EmojiText } from './Gfx';
import { AMENITIES, INVESTMENT_TIERS, producerStored, ElderAvatarImg, GEAR_RARITY_COLOR, UI_ART, PARCEL_ICON_ASSETS, GLYPH_ART } from '../constants';
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
import workshop from '../game-assets/park/cut/workshop.png';
import lodge from '../game-assets/park/cut/lodge.png';

// Cut-out (transparent background) versions of the amenity art, keyed by amenity id.
const ART: Record<string, string> = { cottage, trail, grocery, aerobics, birdwatch, earlybird, complaints, nappod, prunebar, shuffleboard_deco, workshop, lodge };

// The backdrop is four stitched sections (pond top, two plain middles, gate bottom), 1024 x 2992.
// Everything is positioned as a % of it, so the scene scales with the screen width. Buildings sit in
// two staggered columns either side of the path (the path never swings into either column).
// Only amenities with an entry here get a spot -- adding more buildings later means adding art
// height (another middle section) and extending SLOT_ORDER; they stay reachable through Grounds meanwhile.
const BG_W = 1024, BG_H = 2992, BW = 250, BH = 333;
const SLOT_ORDER = ['cottage', 'trail', 'grocery', 'aerobics', 'birdwatch', 'earlybird', 'complaints', 'nappod', 'prunebar', 'shuffleboard_deco', 'workshop', 'lodge'];
function slotFor(i: number) {
  if (i === 10) return { xc: 190, y: 2600 };  // Tinker's Workshop (the last free stretch of the scene)
  if (i === 11) return { xc: 835, y: 2655 };  // Visitors' Lodge
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
export interface DecorOption { id: string; icon: string; art?: string; name: string; owned: number; placed: number }
// The path winds, so it is checked against its real centre line (measured from the backdrop art) instead of one wide band.
// Everything else is allowed except building footprints (including the two reserved for the Tinker's Workshop and the
// Visitors' Lodge), the pond corner, and the gate.
const PATH_CENTER: [number, number][] = [[0, 505], [190, 553], [330, 543], [480, 510], [640, 430], [780, 470], [880, 485], [1000, 440], [1200, 490], [1400, 480], [1650, 465], [1950, 470], [2250, 470], [2600, 488], [2992, 480]];
const PATH_HALF_WIDTH = 150; // in backdrop pixels: path half-width plus a small margin
function pathCenterAt(y: number): number {
  for (let i = 1; i < PATH_CENTER.length; i++) {
    const [y0, x0] = PATH_CENTER[i - 1], [y1, x1] = PATH_CENTER[i];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / Math.max(1, y1 - y0);
  }
  return PATH_CENTER[PATH_CENTER.length - 1][1];
}
// Footprints reserved for the two planned buildings (no art yet): left column below the last building, right column
// squeezed in the last free stretch of the scene.
const RESERVED_SLOTS: { xc: number; y: number }[] = [];
// Player-chosen building positions (owner request 2026-10-20). Keys are 'b<index in SLOT_ORDER>' (short ids so the friend-sync
// sanitizer keeps them); x = building centre x and y = building top, in backdrop px. No entry = the default slot, so nothing
// moves for existing players. Friends see a layout through park_decor pieces with the same 'b<n>' ids (layoutFromDecor).
export type ParkLayout = Record<string, { x: number; y: number }>;
const LAYOUT_KEY = /^b\d{1,2}$/;
function posFor(i: number, layout?: ParkLayout) {
  const p = layout?.['b' + i];
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { xc: p.x, y: p.y } : slotFor(i);
}
export function layoutFromDecor(decor: { id: string; x: number; y: number }[] = []): ParkLayout {
  const out: ParkLayout = {};
  for (const d of decor) if (d && LAYOUT_KEY.test(d.id) && Number.isFinite(d.x) && Number.isFinite(d.y)) out[d.id] = { x: Math.round((d.x / 100) * BG_W), y: Math.round((d.y / 100) * BG_H) };
  return out;
}
export const isLayoutPiece = (d: { id: string }) => LAYOUT_KEY.test(d.id);
function allSlotRects(layout?: ParkLayout) {
  return [...SLOT_ORDER.map((_, i) => posFor(i, layout)), ...RESERVED_SLOTS];
}
// Placement uses a FOOTPRINT (a square in backdrop pixels centred on the tap), not a single point (owner rule 2026-10-20):
// the road is now allowed; the pond and the gate are still blocked but you may place right up against them (touching is fine);
// a footprint may never overlap a building or another placed asset. Used by the live green/red ghost and by the placement handler.
export const DECOR_FOOTPRINT = 84; // backdrop px (the sprite is ~92 px wide, a little forgiving)
type Rect = { x0: number; y0: number; x1: number; y1: number };
const POND_RECT: Rect = { x0: 700, y0: 0, x1: BG_W, y1: 380 };
const GATE_RECT: Rect = { x0: 350, y0: 2700, x1: 600, y1: BG_H };
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; // touching edges is allowed
const buildingRects = (layout?: ParkLayout): Rect[] => allSlotRects(layout).map(({ xc, y }) => ({ x0: xc - BW / 2, y0: y, x1: xc + BW / 2, y1: y + BH }));
export function decorRect(xPct: number, yPct: number): Rect {
  const cx = (xPct / 100) * BG_W, cy = (yPct / 100) * BG_H, h = DECOR_FOOTPRINT / 2;
  return { x0: cx - h, y0: cy - h, x1: cx + h, y1: cy + h };
}
export function isDecorSpotValid(xPct: number, yPct: number, existing: DecorPiece[] = [], ignoreIndex = -1, layout?: ParkLayout): boolean {
  if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return false;
  const r = decorRect(xPct, yPct);
  if (r.x0 < 10 || r.x1 > BG_W - 10 || r.y0 < 40 || r.y1 > BG_H - 40) return false;
  if (overlaps(r, POND_RECT) || overlaps(r, GATE_RECT)) return false;
  for (const b of buildingRects(layout)) if (overlaps(r, b)) return false;
  for (let i = 0; i < existing.length; i++) if (i !== ignoreIndex && overlaps(r, decorRect(existing[i].x, existing[i].y))) return false;
  return true;
}
// A building footprint (BW x BH, top-left from its centre x / top y) must stay in the scene, off the pond and the gate, and
// clear of every other building and every placed asset. Touching is fine. Used by the green/red ghost and by the move handler.
export function isBuildingSpotValid(index: number, xc: number, top: number, layout?: ParkLayout, decor: DecorPiece[] = []): boolean {
  if (!Number.isFinite(xc) || !Number.isFinite(top)) return false;
  const r: Rect = { x0: xc - BW / 2, y0: top, x1: xc + BW / 2, y1: top + BH };
  if (r.x0 < 0 || r.x1 > BG_W || r.y0 < 60 || r.y1 > BG_H) return false;
  if (overlaps(r, POND_RECT) || overlaps(r, GATE_RECT)) return false;
  const others = allSlotRects(layout);
  for (let i = 0; i < others.length; i++) {
    if (i === index) continue;
    const o = others[i];
    // The art has transparent margin top and bottom (the default Lodge/Shuffleboard slots overlap by ~38 px), so building-vs-building
    // checks use a footprint shrunk by 20 px top and bottom; the default layout therefore always stays valid.
    if (overlaps({ ...r, y0: r.y0 + 20, y1: r.y1 - 20 }, { x0: o.xc - BW / 2, y0: o.y + 20, x1: o.xc + BW / 2, y1: o.y + BH - 20 })) return false;
  }
  for (const d of decor) if (!isLayoutPiece(d) && overlaps(r, decorRect(d.x, d.y))) return false;
  return true;
}
// Elders can walk anywhere that is not a building footprint (path included).
function isWalkable(x: number, y: number, layout?: ParkLayout): boolean {
  if (x < 30 || x > BG_W - 30 || y < 120 || y > BG_H - 110) return false;
  if (x > 700 && y < 380) return false;
  for (const { xc, y: top } of allSlotRects(layout)) if (x > xc - BW / 2 && x < xc + BW / 2 && y > top && y < top + BH) return false;
  return true;
}
const seeded = (seed: number) => { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
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
  onOpenExchange?: () => void; // the Away & Visiting window (Visitors' Lodge)
  onOpenWorkshop?: () => void; // the gear window (Tinker's Workshop)
  onOpenHub?: () => void;
  onCollect?: (amenityId: string) => void;
  wanderers?: Wanderer[]; // Elders strolling the grounds: your own, visitors, and (in a friend's park) residents + your own visitor
  decor?: DecorPiece[]; // placed Park Assets
  decorOptions?: DecorOption[]; // what the player owns (own park only)
  onPlaceDecor?: (id: string, x: number, y: number) => void;
  onRemoveDecor?: (index: number) => void;
  onDecorInvalid?: () => void;
  layout?: ParkLayout; // own park: the saved building positions (friend view derives them from decor)
  onMoveBuilding?: (index: number, xc: number, top: number) => void;
  onResetLayout?: () => void;
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
  onOpenGrounds, onOpenExchange, onOpenWorkshop, onOpenHub, onCollect, readOnly = false, title, wanderers = [], decor: decorAll = [], decorOptions, onPlaceDecor, onRemoveDecor, onDecorInvalid, layout, onMoveBuilding, onResetLayout,
}) => {
  const decor = React.useMemo(() => decorAll.filter(d => !isLayoutPiece(d)), [decorAll]);
  const lay = React.useMemo<ParkLayout>(() => ({ ...layoutFromDecor(decorAll), ...(layout ?? {}) }), [decorAll, layout]);
  const [moveMode, setMoveMode] = useState(false);
  const [moveIdx, setMoveIdx] = useState<number | null>(null);
  const [bGhost, setBGhost] = useState<{ xc: number; top: number } | null>(null);
  const [decorMode, setDecorMode] = useState(false);
  const [decorPick, setDecorPick] = useState<string | null>(null);
  const [decorDock, setDecorDock] = useState<'top' | 'bottom'>('bottom');
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
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
            : <button onClick={onOpenHub} style={barBtn}><img src={GLYPH_ART.parkHub} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Park Hub</button>}
          <div style={{ ...barBtn, pointerEvents: 'none' }}><img src={GLYPH_ART.friends} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />{rosterCount}/{capacity}</div>
          {!readOnly && onOpenGrounds ? <button onClick={onOpenGrounds} style={barBtn}><img src={GLYPH_ART.grounds} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Grounds</button> : <div style={{ width: 1 }} />}
        </div>
        {!readOnly && (onOpenExchange || onOpenWorkshop || onMoveBuilding || (decorOptions && decorOptions.length > 0)) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6, padding: '0 10px', pointerEvents: 'none', flexWrap: 'wrap' }}>
            {onOpenExchange && <button onClick={onOpenExchange} style={barBtn}>Lodge</button>}
            {onOpenWorkshop && <button onClick={onOpenWorkshop} style={barBtn}><img src={UI_ART.workshop} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />Workshop</button>}
            {decorOptions && decorOptions.length > 0 && <button onClick={() => { setDecorMode(m => !m); setDecorPick(null); setMoveMode(false); setMoveIdx(null); setBGhost(null); }} style={barBtn}>{decorMode ? 'Done decorating' : 'Decorate'}</button>}
            {onMoveBuilding && <button onClick={() => { setMoveMode(m => !m); setMoveIdx(null); setBGhost(null); setDecorMode(false); setDecorPick(null); }} style={barBtn}>{moveMode ? 'Done arranging' : 'Rearrange'}</button>}
            {moveMode && onResetLayout && Object.keys(layout ?? {}).length > 0 && <button onClick={() => { onResetLayout(); setMoveIdx(null); setBGhost(null); }} style={barBtn}>Reset layout</button>}
          </div>
        )}
      </div>

      {decorMode && decorOptions && (
        // Compact one-row palette fixed to the screen edge, so it never covers a big part of the park; the arrow moves it
        // to the other edge when you want to place something underneath it.
        <div style={{ position: 'fixed', left: 8, right: 8, [decorDock === 'top' ? 'top' : 'bottom']: decorDock === 'top' ? 52 : 84, zIndex: 60, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 14, background: 'rgba(0,0,0,0.82)', overflowX: 'auto' } as React.CSSProperties}>
          <button onClick={() => setDecorDock(d => d === 'top' ? 'bottom' : 'top')} style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 900, fontSize: 14 }}>{decorDock === 'top' ? '⇩' : '⇧'}</button>
          <span style={{ flex: '0 0 auto', color: '#fff', fontSize: 11, fontWeight: 800, maxWidth: 110, lineHeight: 1.15 }}>{decorPick ? 'Green = OK, red = blocked. Tap to place.' : 'Pick one, then tap anywhere green. Tap a placed one to remove.'}</span>
          {decorOptions.map(o => {
            const left = o.owned - o.placed;
            return (
              <button key={o.id} disabled={left <= 0} onClick={() => setDecorPick(decorPick === o.id ? null : o.id)}
                style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: 12, border: decorPick === o.id ? '3px solid #fbbf24' : '2px solid rgba(255,255,255,0.4)', background: left > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: '#fff', opacity: left > 0 ? 1 : 0.45, fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>
                {o.art ? <img src={o.art} alt={o.name} style={{ width: 28, height: 28, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} /> : o.icon} ×{Math.max(0, left)}
              </button>
            );
          })}
          <button onClick={() => { setDecorMode(false); setDecorPick(null); }} style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: 10, background: '#059669', color: '#fff', fontWeight: 900, fontSize: 12 }}>Done</button>
        </div>
      )}

      <img src={backdrop} alt="" draggable={false} style={{ width: '100%', display: 'block', filter: isDark ? 'brightness(0.72) saturate(0.9)' : undefined }} />

      {/* Placed Park Assets (the player's own decoration; friends see them read-only) */}
      {decor.map((d, i) => (
        <div key={i} onClick={decorMode && onRemoveDecor ? (e) => { e.stopPropagation(); onRemoveDecor(i); } : undefined}
          style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)', fontSize: 'clamp(26px, 7vw, 44px)', lineHeight: 1, zIndex: 4, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.45))', cursor: decorMode ? 'pointer' : 'default', outline: decorMode ? '2px dashed rgba(255,255,255,0.8)' : undefined, borderRadius: 8, pointerEvents: decorMode ? 'auto' : 'none' }}>
          {PARCEL_ICON_ASSETS[d.id] ? <img src={PARCEL_ICON_ASSETS[d.id]} alt="" draggable={false} style={{ width: 'clamp(34px, 9vw, 56px)', height: 'clamp(34px, 9vw, 56px)', objectFit: 'contain', display: 'block' }} /> : (decorIcons[d.id] ?? INVESTMENT_TIERS.flatMap(t => t.items).find(x => x.id === d.id)?.icon ?? '🌳')}
        </div>
      ))}
      {decorMode && (
        <div
          onPointerMove={e => {
            if (!decorPick || !sceneRef.current) return;
            const r = sceneRef.current.getBoundingClientRect();
            setGhost({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onPointerLeave={() => setGhost(null)}
          onClick={e => {
          if (!decorPick || !onPlaceDecor || !sceneRef.current) return;
          const r = sceneRef.current.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
          setGhost({ x, y });
          if (!isDecorSpotValid(x, y, decor, -1, lay)) { onDecorInvalid?.(); return; }
          onPlaceDecor(decorPick, +x.toFixed(2), +y.toFixed(2));
        }} style={{ position: 'absolute', inset: 0, zIndex: 3, cursor: decorPick ? 'crosshair' : 'default', touchAction: 'pan-y' }} />
      )}
      {decorMode && decorPick && ghost && (() => {
        const ok = isDecorSpotValid(ghost.x, ghost.y, decor, -1, lay);
        const col = ok ? '#22c55e' : '#ef4444';
        const wPct = (DECOR_FOOTPRINT / BG_W) * 100, hPct = (DECOR_FOOTPRINT / BG_H) * 100;
        return (
          <div style={{ position: 'absolute', left: `${ghost.x}%`, top: `${ghost.y}%`, width: `${wPct}%`, height: `${hPct}%`, transform: 'translate(-50%, -50%)',
            border: `3px solid ${col}`, background: `${col}33`, borderRadius: 6, zIndex: 5, pointerEvents: 'none', boxShadow: `0 0 8px ${col}` }}>
            {PARCEL_ICON_ASSETS[decorPick] && <img src={PARCEL_ICON_ASSETS[decorPick]} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.55 }} />}
          </div>
        );
      })()}

      {moveMode && onMoveBuilding && (
        <>
          <div
            onPointerMove={e => {
              if (moveIdx === null || !sceneRef.current) return;
              const r = sceneRef.current.getBoundingClientRect();
              setBGhost({ xc: ((e.clientX - r.left) / r.width) * BG_W, top: ((e.clientY - r.top) / r.height) * BG_H - BH / 2 });
            }}
            onPointerLeave={() => setBGhost(null)}
            onClick={e => {
              if (!sceneRef.current) return;
              const r = sceneRef.current.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * BG_W, py = ((e.clientY - r.top) / r.height) * BG_H;
              if (moveIdx === null) {
                const hit = SLOT_ORDER.findIndex((_, i) => { const p = posFor(i, lay); return px >= p.xc - BW / 2 && px <= p.xc + BW / 2 && py >= p.y && py <= p.y + BH; });
                if (hit >= 0) setMoveIdx(hit);
                return;
              }
              const xc = Math.round(px), top = Math.round(py - BH / 2);
              setBGhost({ xc, top });
              if (!isBuildingSpotValid(moveIdx, xc, top, lay, decor)) { onDecorInvalid?.(); return; }
              onMoveBuilding(moveIdx, xc, top);
              setMoveIdx(null); setBGhost(null);
            }}
            style={{ position: 'absolute', inset: 0, zIndex: 4, cursor: moveIdx === null ? 'pointer' : 'crosshair', touchAction: 'pan-y' }} />
          <div style={{ position: 'fixed', left: 8, right: 8, bottom: 100, zIndex: 60, textAlign: 'center', padding: '8px 12px', borderRadius: 14, background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
            {moveIdx === null ? 'Tap a building to pick it up.' : `Tap where ${AMENITIES.find(a => a.id === SLOT_ORDER[moveIdx])?.name ?? 'the building'} should go. Green = ok, red = blocked.`}
            {moveIdx !== null && <button onClick={() => { setMoveIdx(null); setBGhost(null); }} style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>Cancel</button>}
          </div>
          {moveIdx !== null && bGhost && (() => {
            const ok = isBuildingSpotValid(moveIdx, bGhost.xc, bGhost.top, lay, decor);
            const col = ok ? '#22c55e' : '#ef4444';
            return (
              <div style={{ position: 'absolute', left: `${((bGhost.xc - BW / 2) / BG_W) * 100}%`, top: `${(bGhost.top / BG_H) * 100}%`, width: `${(BW / BG_W) * 100}%`, height: `${(BH / BG_H) * 100}%`,
                border: `3px solid ${col}`, background: `${col}33`, borderRadius: 8, zIndex: 6, pointerEvents: 'none', boxShadow: `0 0 10px ${col}` }}>
                <img src={ART[SLOT_ORDER[moveIdx]]} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.55 }} />
              </div>
            );
          })()}
        </>
      )}

      {/* Wandering Elders: each one follows its own seeded loop of waypoints across the whole park (path and grass,
          never through a building), at its own slow pace. Everyone present is shown, up to 40. */}
      {(() => {
        const list = wanderers.slice(0, 40);
        const css = list.map(w => {
          const rnd = seeded(hash(w.key));
          const pts: [number, number][] = [];
          let guard = 0;
          while (pts.length < 6 && guard++ < 400) {
            const x = 40 + rnd() * (BG_W - 80), y = 140 + rnd() * (BG_H - 280);
            if (isWalkable(x, y, lay)) pts.push([x, y]);
          }
          if (pts.length < 2) pts.push([512, 600], [512, 1400]);
          const frames = [...pts, pts[0]].map(([x, y], i, arr) => `${Math.round((i / (arr.length - 1)) * 100)}% { left: ${((x / BG_W) * 100).toFixed(2)}%; top: ${((y / BG_H) * 100).toFixed(2)}%; }`).join(' ');
          return `@keyframes gpw_${hash(w.key)} { ${frames} }`;
        }).join('\n');
        return (
          <>
            <style>{css}</style>
            {list.map(w => {
              const h = hash(w.key);
              const dur = 70 + (h % 70);
              const color = w.rarity ? GEAR_RARITY_COLOR[w.rarity] : '#fff';
              return (
                <div key={w.key} title={`${w.name} · ${w.label}${w.rarity ? ' · ' + w.rarity : ''}${w.level ? ' · Lv.' + w.level : ''}`} style={{
                  position: 'absolute', width: '9%', minWidth: 34, zIndex: 3, pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)', animation: `gpw_${h} ${dur}s linear ${-(h % dur)}s infinite`,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${color}`, boxShadow: '0 3px 6px rgba(0,0,0,0.45)', background: '#fff' }}>
                      <ElderAvatarImg type={w.type as any} stage={w.stage as any} fill />
                    </div>
                    <div style={{ ...nameBar, fontSize: 9, padding: '1px 6px', maxWidth: 120, cursor: 'default' }}>
                      {w.name}{w.level ? ` · Lv${w.level}` : ''}<br /><span style={{ opacity: 0.85 }}>{w.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}

      {SLOT_ORDER.map((id, i) => {
        const amenity = AMENITIES.find(a => a.id === id);
        if (!amenity) return null;
        const built = builtAmenityIds.includes(id);
        const level = amenityLevels[id] ?? 1;
        const { xc, y } = posFor(i, lay);
        const openBuilding = (bid: string, isBuilt: boolean) => {
          if (isBuilt && bid === 'lodge' && onOpenExchange) return onOpenExchange();
          if (isBuilt && bid === 'workshop' && onOpenWorkshop) return onOpenWorkshop();
          onOpenGrounds?.(bid);
        };
        const stored = built && amenity.producer
          ? producerStored(amenity, level, amenityCollectedAt[id], now, comfortBonus) : 0;
        const icon = amenity.producer?.output === 'tickets' ? '🎟️' : '🧱';
        return (
          <React.Fragment key={id}>
            <button
              onClick={readOnly ? undefined : () => openBuilding(id, built)}
              aria-label={amenity.name}
              style={{
                position: 'absolute', left: `${((xc - BW / 2) / BG_W) * 100}%`, top: `${(y / BG_H) * 100}%`,
                width: `${(BW / BG_W) * 100}%`, padding: 0, border: 0, background: 'none', cursor: readOnly ? 'default' : 'pointer',
                outline: moveMode ? (moveIdx === i ? '4px solid #facc15' : '2px dashed rgba(255,255,255,0.85)') : undefined, outlineOffset: -2,
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
              <button onClick={readOnly ? undefined : () => openBuilding(id, built)} style={{ ...nameBar, opacity: built ? 1 : 0.85, cursor: readOnly ? 'default' : 'pointer' }}>{amenity.name}</button>
              {built && stored > 0 && !readOnly && onCollect ? (
                <button onClick={() => onCollect(id)} style={{ ...pillBase, background: '#16a34a', cursor: 'pointer' }}>
                  Collect {icon} {stored}
                </button>
              ) : !built && !readOnly ? (
                <button onClick={() => onOpenGrounds?.(id)} style={{ ...pillBase, background: materials >= amenity.cost ? '#2563eb' : 'rgba(90,90,90,0.85)', cursor: 'pointer' }}>
                  Build · {amenity.cost} <Gfx e="🧱" />
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
