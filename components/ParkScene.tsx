import React, { useEffect, useState } from 'react';
import { AMENITIES, producerStored } from '../constants';
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

interface ParkSceneProps {
  isDark: boolean;
  builtAmenityIds: string[];
  amenityLevels: Record<string, number>;
  amenityCollectedAt: Record<string, number>;
  comfortBonus: number;
  rosterCount: number;
  capacity: number;
  materials: number;
  onOpenGrounds: () => void;
  onOpenHub?: () => void;
  onCollect?: (amenityId: string) => void;
  readOnly?: boolean; // for visiting a friend's park later: no collect / hub buttons
  title?: string;
}

const pillBase: React.CSSProperties = {
  position: 'absolute', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 900,
  textTransform: 'uppercase', letterSpacing: 0.5, padding: '3px 9px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.85)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.35)', color: '#fff', lineHeight: 1.2,
};

const ParkScene: React.FC<ParkSceneProps> = ({
  isDark, builtAmenityIds, amenityLevels, amenityCollectedAt, comfortBonus, rosterCount, capacity, materials,
  onOpenGrounds, onOpenHub, onCollect, readOnly = false, title,
}) => {
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
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Sticky top bar: zero-height wrapper so it floats over the scene while scrolling */}
      <div style={{ position: 'sticky', top: 8, zIndex: 20, height: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', pointerEvents: 'none' }}>
          {readOnly || !onOpenHub
            ? <div style={{ ...barBtn, pointerEvents: 'none' }}>{title ?? 'Park'}</div>
            : <button onClick={onOpenHub} style={barBtn}>🏠 Park Hub</button>}
          <div style={{ ...barBtn, pointerEvents: 'none' }}>👥 {rosterCount}/{capacity}</div>
          <button onClick={onOpenGrounds} style={barBtn}>🏡 Grounds</button>
        </div>
      </div>

      <img src={backdrop} alt="" draggable={false} style={{ width: '100%', display: 'block', filter: isDark ? 'brightness(0.72) saturate(0.9)' : undefined }} />

      {SLOT_ORDER.map((id, i) => {
        const amenity = AMENITIES.find(a => a.id === id);
        if (!amenity) return null;
        const built = builtAmenityIds.includes(id);
        const level = amenityLevels[id] ?? 1;
        const { xc, y } = slotFor(i);
        const stored = built && amenity.producer
          ? producerStored(amenity, level, amenityCollectedAt[id], now, comfortBonus) : 0;
        const icon = amenity.producer?.output === 'tickets' ? '🎟️' : '🧱';
        const pillTop = `${((y + BH - 6) / BG_H) * 100}%`;
        const pillLeft = `${(xc / BG_W) * 100}%`;
        return (
          <React.Fragment key={id}>
            <button
              onClick={onOpenGrounds}
              aria-label={amenity.name}
              style={{
                position: 'absolute', left: `${((xc - BW / 2) / BG_W) * 100}%`, top: `${(y / BG_H) * 100}%`,
                width: `${(BW / BG_W) * 100}%`, padding: 0, border: 0, background: 'none', cursor: 'pointer',
              }}
            >
              <img src={ART[id]} alt={amenity.name} draggable={false} style={{
                width: '100%', display: 'block',
                filter: built ? 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' : 'grayscale(1) brightness(1.15) drop-shadow(0 4px 4px rgba(0,0,0,0.25))',
                opacity: built ? 1 : 0.42,
              }} />
            </button>
            {built && stored > 0 && !readOnly && onCollect ? (
              <button
                onClick={() => onCollect(id)}
                style={{ ...pillBase, top: pillTop, left: pillLeft, background: '#16a34a', cursor: 'pointer' }}
              >
                Collect {icon} {stored}
              </button>
            ) : built ? (
              <div style={{ ...pillBase, top: pillTop, left: pillLeft, background: 'rgba(30,30,30,0.78)' }}>Lv {level}</div>
            ) : (
              <button
                onClick={onOpenGrounds}
                style={{ ...pillBase, top: pillTop, left: pillLeft, background: materials >= amenity.cost ? '#2563eb' : 'rgba(90,90,90,0.85)', cursor: 'pointer' }}
              >
                Build · {amenity.cost} 🧱
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ParkScene;
