// Shared world: every player sees the SAME map buildings at the SAME real-world spots.
//
// The map is cut into a fixed grid of cells (~2 km). Each cell's buildings come from a
// seeded pseudo-random generator keyed only by (WORLD_SEED, cell x, cell y, slot) -- so any
// phone, any session, any player computes identical results with no server needed.
//
// NEVER change WORLD_SEED, WORLD_CELL_DEG or STRUCTURES_PER_CELL after launch: doing so
// moves every building for every player. Add new building types (e.g. Arena/Gym) by
// extending STRUCTURE_TEMPLATES, or add a separate seeded "landmark" pass below that keys
// off a coarser grid (e.g. one Arena per 4x4 cells) so they stay rare and shared.
import { Structure } from '../types';
import { STRUCTURE_TEMPLATES } from '../constants';

export const WORLD_SEED = 20260920;
export const WORLD_CELL_DEG = 0.02;
const STRUCTURES_PER_CELL = 3;

function hash32(a: number, b: number, c: number): number {
  let h = (WORLD_SEED ^ Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b) ^ Math.imul(c | 0, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

// mulberry32
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function worldCellKey(lat: number, lng: number): string {
  return `${Math.floor(lng / WORLD_CELL_DEG)}_${Math.floor(lat / WORLD_CELL_DEG)}`;
}

/** All buildings in the player's cell plus the ring of cells around it. */
export function getWorldStructures(lat: number, lng: number, ring = 1): Structure[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const cx0 = Math.floor(lng / WORLD_CELL_DEG);
  const cy0 = Math.floor(lat / WORLD_CELL_DEG);
  const out: Structure[] = [];
  for (let cy = cy0 - ring; cy <= cy0 + ring; cy++) {
    for (let cx = cx0 - ring; cx <= cx0 + ring; cx++) {
      for (let i = 0; i < STRUCTURES_PER_CELL; i++) {
        const rand = rng(hash32(cx, cy, i));
        const template = STRUCTURE_TEMPLATES[Math.floor(rand() * STRUCTURE_TEMPLATES.length)];
        // Keep buildings 10% away from cell edges so neighbours never stack on a border.
        const sLat = (cy + 0.1 + rand() * 0.8) * WORLD_CELL_DEG;
        const sLng = (cx + 0.1 + rand() * 0.8) * WORLD_CELL_DEG;
        out.push({ id: `w_${cx}_${cy}_${i}`, ...template, lat: sLat, lng: sLng } as Structure);
      }
    }
  }
  return out;
}
