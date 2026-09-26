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

// --- Arenas -----------------------------------------------------------------------------------------
// Shared like the buildings above: a cell holds an Arena with probability ARENA_CELL_CHANCE, at a fixed spot.
// THE SAME MATH IS DUPLICATED INSIDE api/arena.ts (shared imports are not bundled on Vercel here) -- if you
// change anything in this section, change it there too, or the server will reject Arenas the map shows.
export const ARENA_CELL_CHANCE = 0.4;
const ARENA_SALT = 1000;
export const ARENA_NAMES = [
  'Sunny Acres Clubhouse', 'Maple Court Rec Hall', 'Bingo Bluff Arena', 'Shady Oaks Lodge',
  'Lakeside Legends Hall', 'Golden Years Gym', 'Cedar Springs Pavilion', 'Old Timers Coliseum',
];
export interface ArenaSite { id: string; name: string; lat: number; lng: number }

export function getWorldArenas(lat: number, lng: number, ring = 1): ArenaSite[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const cx0 = Math.floor(lng / WORLD_CELL_DEG);
  const cy0 = Math.floor(lat / WORLD_CELL_DEG);
  const out: ArenaSite[] = [];
  for (let cy = cy0 - ring; cy <= cy0 + ring; cy++) {
    for (let cx = cx0 - ring; cx <= cx0 + ring; cx++) {
      const rand = rng(hash32(cx, cy, ARENA_SALT));
      if (rand() >= ARENA_CELL_CHANCE) continue;
      const aLat = (cy + 0.15 + rand() * 0.7) * WORLD_CELL_DEG;
      const aLng = (cx + 0.15 + rand() * 0.7) * WORLD_CELL_DEG;
      const name = ARENA_NAMES[Math.floor(rand() * ARENA_NAMES.length)];
      out.push({ id: `a_${cx}_${cy}`, name, lat: aLat, lng: aLng });
    }
  }
  return out;
}

// --- Raids -------------------------------------------------------------------------------------------
// A deterministic schedule: 3 daily windows (90 minutes each), and for each (Arena, window) a seeded
// roll decides whether it hosts a Raid this time, and if so, which of the 6 bosses (see RAID_BOSSES in
// constants.tsx for names/flavor/art -- only the numeric bits live here). No rows are written until
// someone actually hits it (api/arena.ts creates the row lazily on first hit) -- everyone computes the
// same upcoming schedule with no server round-trip, the same way Arena placement works above.
// THE SAME MATH IS DUPLICATED INSIDE api/arena.ts -- change both places together.
export const RAID_WINDOW_HOURS_UTC = [15, 19, 0];
export const RAID_WINDOW_MINUTES = 90;
// TEMP FOR LIVE TESTING (2026-09-25): raised from 0.12 to make raids land reliably during a
// testing session. REVERT TO 0.12 BEFORE LAUNCH -- keep in sync with api/arena.ts's copy.
export const RAID_CHANCE = 0.6;
const RAID_SALT = 2000;
// Two bosses per tier (index 0-5); HP multipliers differ per boss even within a tier, purely for
// texture, matching the ARENA_DESIGN.md flavor notes (the DMV Clerk's absurdly padded HP, etc.).
export const RAID_BASE_HP = [3000, 6000, 10000]; // by tier (1,2,3)
export const RAID_BOSS_HP_MULT = [1.0, 1.6, 1.0, 0.75, 1.0, 0.85]; // per boss_index 0-5

export interface RaidSlot { arenaId: string; slotStart: number; slotEnd: number; tier: number; bossIndex: number; maxHp: number; raidId: string }

function raidSlotStart(dayStartMs: number, hourUtc: number): number { return dayStartMs + hourUtc * 3600000; }

/** All Raid slots (past, current, or upcoming) for one Arena within +-2 days of `now`, for schedule display. */
export function getArenaRaidSlots(arenaId: string, now: number = Date.now()): RaidSlot[] {
  const m = ARENA_ID_RE_FOR_RAIDS.exec(arenaId);
  if (!m) return [];
  const cx = parseInt(m[1], 10), cy = parseInt(m[2], 10);
  const out: RaidSlot[] = [];
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const day = new Date(now); day.setUTCHours(0, 0, 0, 0); day.setUTCDate(day.getUTCDate() + dayOffset);
    const dayKey = day.toISOString().slice(0, 10);
    const dayStart = day.getTime();
    for (let slot = 0; slot < RAID_WINDOW_HOURS_UTC.length; slot++) {
      const hour = RAID_WINDOW_HOURS_UTC[slot];
      const slotStart = raidSlotStart(dayStart, hour);
      const rand = rng(hash32(cx, cy, RAID_SALT + slot * 10000 + dayOffset * 100000 + hashDay(dayKey)));
      if (rand() >= RAID_CHANCE) continue;
      const tier = 1 + Math.floor(rand() * 3);
      const bossInTier = rand() < 0.5 ? 0 : 1;
      const bossIndex = (tier - 1) * 2 + bossInTier;
      const maxHp = Math.round(RAID_BASE_HP[tier - 1] * RAID_BOSS_HP_MULT[bossIndex]);
      out.push({ arenaId, slotStart, slotEnd: slotStart + RAID_WINDOW_MINUTES * 60000, tier, bossIndex, maxHp, raidId: `${arenaId}_${dayKey}_${slot}` });
    }
  }
  return out.sort((a, b) => a.slotStart - b.slotStart);
}

const ARENA_ID_RE_FOR_RAIDS = /^a_(-?\d{1,7})_(-?\d{1,7})$/;
function hashDay(dayKey: string): number { let h = 0; for (let i = 0; i < dayKey.length; i++) h = (Math.imul(h, 31) + dayKey.charCodeAt(i)) | 0; return h >>> 0; }

/** The Raid this Arena is currently hosting, or the next upcoming one, or null. */
export function getActiveOrNextRaid(arenaId: string, now: number = Date.now()): RaidSlot | null {
  const slots = getArenaRaidSlots(arenaId, now);
  const active = slots.find(s => s.slotStart <= now && now < s.slotEnd);
  if (active) return active;
  return slots.find(s => s.slotStart > now) ?? null;
}
