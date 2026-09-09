
import React from 'react';
import { 
  MapIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ShoppingBagIcon,
  HomeIcon,
  TicketIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { ElderType, PowerType, Achievement } from './types';

// Every image below is imported (not referenced by a hardcoded /public path).
// Vite content-hashes imported assets at build time -- e.g.
// comfy_loafers.png becomes /assets/comfy_loafers-a1b2c3d4.png -- so any time
// the source PNG's pixels change, the built URL automatically changes too.
// No manual "_v2" renaming and no risk of a browser/CDN cache serving stale
// bytes under an unchanged filename, ever again. When adding or replacing
// game art going forward: drop the file in game-assets/<category>/, import
// it here, done -- never edit a file already referenced in public/.
import bingoWarriorStage1 from './game-assets/elders/bingo_warrior_stage1.png';
import grumpyGardenerStage1 from './game-assets/elders/grumpy_gardener_stage1.png';
import knittingNinjaStage1 from './game-assets/elders/knitting_ninja_stage1.png';
import mallWalkerStage1 from './game-assets/elders/mall_walker_stage1.png';
import storytellerStage1 from './game-assets/elders/storyteller_stage1.png';
import techWizardStage1 from './game-assets/elders/tech_wizard_stage1.png';

import bingoLuckCharmImg from './game-assets/items/bingo_luck_charm.png';
import branMuffinImg from './game-assets/items/bran_muffin.png';
import comfyLoafersImg from './game-assets/items/comfy_loafers.png';
import goodLuckCharmImg from './game-assets/items/good_luck_charm.png';
import hardCandyImg from './game-assets/items/hard_candy.png';
import hearingAidImg from './game-assets/items/hearing_aid.png';
import lostRetainerImg from './game-assets/items/lost_retainer.png';
import pocketWatchImg from './game-assets/items/pocket_watch.png';
import readingGlassesImg from './game-assets/items/reading_glasses.png';
import sunhatImg from './game-assets/items/sunhat.png';
import transistorRadioImg from './game-assets/items/transistor_radio.png';
import treasureMapImg from './game-assets/items/treasure_map.png';
import walkerTennisBallImg from './game-assets/items/walker_tennis_ball.png';

import bingoBlitzHallImg from './game-assets/structures/bingo_blitz_hall.png';
import communityGardenImg from './game-assets/structures/community_garden.png';
import farmersMarketImg from './game-assets/structures/farmers_market.png';
import grandShuffleCourtImg from './game-assets/structures/grand_shuffle_court.png';
import mallCircuitImg from './game-assets/structures/mall_circuit.png';
import potluckPavilionImg from './game-assets/structures/potluck_pavilion.png';
import silverSpringsRehabImg from './game-assets/structures/silver_springs_rehab.png';

import gardenPlotImg from './game-assets/parcels/garden_plot.png';
import parkBenchSponsorImg from './game-assets/parcels/park_bench_sponsor.png';
import bingoHallEquityImg from './game-assets/parcels/bingo_hall_equity.png';
import shuttleVanFleetImg from './game-assets/parcels/shuttle_van_fleet.png';
import theGoldenWingImg from './game-assets/parcels/the_golden_wing.png';
import parkDirectorshipImg from './game-assets/parcels/park_directorship.png';

import playerMarkerImg from './game-assets/player/player_marker.png';
export const PLAYER_MARKER_IMG = playerMarkerImg;

import earlyBirdImg from './game-assets/achievements/early_bird.png';
import communityPillarImg from './game-assets/achievements/community_pillar.png';
import debateChampionImg from './game-assets/achievements/debate_champion.png';
import wealthyPensionerImg from './game-assets/achievements/wealthy_pensioner.png';

// Keyed by id -- INITIAL_ACHIEVEMENTS items are read directly from this array
// and only ever have `.completed` toggled, never cloned with a new id.
export const ACHIEVEMENT_ICON_ASSETS: Record<string, string> = {
  a1: earlyBirdImg,
  a2: communityPillarImg,
  a3: debateChampionImg,
  a4: wealthyPensionerImg,
};

export const GAME_VERSION = '1.7.0';
export const TEAM_SIZE_LIMIT = 6;
export const BASE_POPULATION_LIMIT = 100;
export const WITHDRAWAL_MINIMUM = 10.00;
export const INITIAL_PENSION_RATE = 0.00005;
export const AD_REVENUE_PAYOUT = 0.10; 
export const MAX_ADS_PER_HOUR = 50;
export const DIVIDEND_COOLDOWN = 15 * 60 * 1000; 

export const XP_FOR_LEVEL_UP = 1000;
export const SEASON_XP_PER_LEVEL = 1000;

export const TRAINING_BASE_COST = 50; 
export const STAT_BONUS_PER_LEVEL = 5;

// ─── Elder progression (evolution spec, Phases 2-4) ───────────────────────────
// Elder XP uses a separate, smaller threshold than the player's XP_FOR_LEVEL_UP
// so the two curves can be tuned independently (multiple Elders level up per
// activity, so their curve needs to be shallower).
export const ELDER_XP_FOR_LEVEL_UP = 150;

// Base comfortGeneration is now rarity-scaled instead of a flat 0.0001 for
// every Elder (see getBaseComfortGeneration below).
export const BASE_COMFORT_GENERATION = 0.0001;
export const ELDER_COMFORT_RARITY_MULTIPLIER: Record<'Common' | 'Rare' | 'Epic' | 'Legendary', number> = {
  Common: 1, Rare: 1.5, Epic: 2.5, Legendary: 5,
};
export function getBaseComfortGeneration(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'): number {
  return BASE_COMFORT_GENERATION * ELDER_COMFORT_RARITY_MULTIPLIER[rarity];
}

// Evolution: stage 0 -> 1 is level-gated only (open to every rarity). Stage
// 1 -> 2 is level-gated for everyone, but costs far more Tickets unless the
// Elder is Epic/Legendary rarity -- the "hybrid" model: never a hard rarity
// wall, but rarity is the cheaper path.
export const ELDER_EVOLUTION_STAGE1_LEVEL = 10;
export const ELDER_EVOLUTION_STAGE2_LEVEL = 25;
export const ELDER_EVOLUTION_STAGE2_ELITE_RARITIES: Array<'Epic' | 'Legendary'> = ['Epic', 'Legendary'];
export const EVOLUTION_STAGE1_COST = TRAINING_BASE_COST * 10;       // 500 Tickets
export const EVOLUTION_STAGE2_COST = TRAINING_BASE_COST * 20;       // 1000 Tickets (Epic/Legendary)
export const EVOLUTION_STAGE2_STEEP_COST = TRAINING_BASE_COST * 50; // 2500 Tickets (Common/Rare grind path)
// Multiplier applied once, at the moment of evolving, to stats/comfortGeneration.
export const EVOLUTION_STAT_MULTIPLIER: Record<1 | 2, number> = { 1: 1.3, 2: 1.75 };

export const REVENUE_SPLIT = {
  player: 0.70,     
  community: 0.20,  
  developer: 0.10   
};

export const PASSIVE_TICK_MS         = 30 * 1000;
export const ELDER_COMFORT_RATE      = 0.000008;
export const PARCEL_RENT_RATE        = 0.000005;
export const AD_BOOST_MULTIPLIER     = 2.0;
export const AD_BOOST_DURATION_MS    = 60 * 60 * 1000;
export const MAX_NEARBY_ITEMS       = 14;      // hard cap on items visible on the map at once
export const INITIAL_ITEM_SEED      = 5;       // items placed immediately on entering a new area, so the map isn't empty
export const ITEM_SPAWN_INTERVAL_MS = 45 * 1000; // trickle: one new item added at most this often, only while under the cap
export const SCRAP_BASE_TICKETS      = 4;    // Tickets earned per level x rarity multiplier when scrapping — PP-free, see App.tsx handleScrapElder
export const GUIDE_SUCCESS_RATE: Record<'Common' | 'Rare' | 'Epic' | 'Legendary', number> = {
  Common: 0.85, Rare: 0.65, Epic: 0.45, Legendary: 0.25,
};
export const SCRAP_RARITY_MULTIPLIER: Record<'Common' | 'Rare' | 'Epic' | 'Legendary', number> = {
  Common: 1, Rare: 2, Epic: 4, Legendary: 8,
};
export const OFFLINE_CAP_MS          = 8 * 60 * 60 * 1000;

// ─── Pending Yield conversion (economic sustainability addendum, 9-7-26) ──────
// The passive tick credits pendingYield, not pensionBalance directly — it's an
// uncapped "earning power" number, not a cash liability, so it can accrue
// freely. Converting it into real PP happens through one of two player-chosen
// paths in the Bank panel:
export const RESERVE_HEALTHY_THRESHOLD = 5.00;  // reserve level at/above which Cash Out pays 1:1
export const MIN_CASHOUT_EXCHANGE_RATE = 0.25;  // floor rate when the reserve is thin, never zero
export const REINVEST_YIELD_TO_RATE    = 40000; // PP of yield spent per +1 pensionRate unit when reinvesting
                                                 // (more generous than the cheapest Investment Tier's
                                                 // ~50,000:1, since reinvesting never touches the reserve)

// Cash Out rate scales linearly with reserve health between the floor and 1:1,
// so a thin reserve is communicated as a lower rate rather than a hidden cap.
export function getYieldExchangeRate(reserve: number): number {
  if (reserve <= 0) return MIN_CASHOUT_EXCHANGE_RATE;
  return Math.min(1, Math.max(MIN_CASHOUT_EXCHANGE_RATE, reserve / RESERVE_HEALTHY_THRESHOLD));
}
export const SHUFFLEBOARD_KING_BOOST = 1.5;
export const LEVEL_UP_TICKET_REWARD  = 10;    // Tickets reward per level gained — PP-free, see App.tsx level-up effect
export function isImagePath(src: string): boolean {
  return /^(\/|https?:|data:)/.test(src);
}

export const RANK_TIERS: { minLevel: number, title: string, icon: string }[] = [
  { minLevel: 1,  title: 'Newcomer', icon: '🌱' },
  { minLevel: 5,  title: 'Regular',  icon: '🎯' },
  { minLevel: 10, title: 'Veteran',  icon: '🏅' },
  { minLevel: 15, title: 'Champion', icon: '🏆' },
  { minLevel: 20, title: 'Legend',   icon: '👑' },
  { minLevel: 30, title: 'Park Icon', icon: '⭐' },
];
export function getRankForLevel(level: number): { title: string, icon: string } {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (level >= tier.minLevel) rank = tier;
  }
  return rank;
}

// A cosmetic is one unlocked {icon, title} pair the player can pick from --
// currently sourced from rank tiers already reached (ranks are never "lost"
// on further leveling) and completed achievements. Icon and title are chosen
// independently in the profile picker, so `key` identifies one axis at a time
// (e.g. a player can show the Legend rank icon with the Early Bird title).
export interface UnlockedCosmetic { key: string; icon: string; title: string; }

export function getUnlockedCosmetics(level: number, achievements: Achievement[]): UnlockedCosmetic[] {
  const rankUnlocks: UnlockedCosmetic[] = RANK_TIERS
    .filter(t => level >= t.minLevel)
    .map(t => ({ key: `rank:${t.title}`, icon: t.icon, title: t.title }));
  const achievementUnlocks: UnlockedCosmetic[] = achievements
    .filter(a => a.completed)
    .map(a => ({ key: `achievement:${a.id}`, icon: ACHIEVEMENT_ICON_ASSETS[a.id] || a.icon, title: a.title }));
  return [...rankUnlocks, ...achievementUnlocks];
}

// Resolves what to actually show in the header: the player's chosen icon/title
// if they picked one and it's still unlocked, otherwise falls back to their
// current rank -- so an unset or since-invalidated selection never breaks.
export function resolveProfileDisplay(
  level: number,
  achievements: Achievement[],
  selectedAccountIcon: string,
  selectedTitle: string
): { icon: string; title: string } {
  const unlocked = getUnlockedCosmetics(level, achievements);
  const rank = getRankForLevel(level);
  const iconMatch = unlocked.find(c => c.key === selectedAccountIcon);
  const titleMatch = unlocked.find(c => c.key === selectedTitle);
  return {
    icon: iconMatch ? iconMatch.icon : rank.icon,
    title: titleMatch ? titleMatch.title : rank.title,
  };
}

export const INVESTMENT_TIERS = [
  {
    category: 'Community Micro-Assets',
    items: [
      { id: 'i1', name: 'Garden Plot', cost: 0.50, rateBoost: 0.000005, icon: '🌱' },
      { id: 'i2', name: 'Park Bench Sponsor', cost: 1.00, rateBoost: 0.000012, icon: '🪑' }
    ]
  },
  {
    category: 'Neighborhood Portfolio',
    items: [
      { id: 'i3', name: 'Bingo Hall Equity', cost: 2.50, rateBoost: 0.000035, icon: '🎰' },
      { id: 'i4', name: 'Shuttle Van Fleet', cost: 5.00, rateBoost: 0.00008, icon: '🚐' }
    ]
  },
  {
    category: 'Legacy Investments',
    items: [
      { id: 'i5', name: 'The Golden Wing', cost: 15.00, rateBoost: 0.00025, icon: '🏛️' },
      { id: 'i6', name: 'Park Directorship', cost: 50.00, rateBoost: 0.001, icon: '🏆' }
    ]
  }
];

export const POWER_ADVANTAGE: Record<PowerType, PowerType> = {
  [PowerType.PHYSICAL]: PowerType.SOCIAL,
  [PowerType.SOCIAL]: PowerType.TECH,
  [PowerType.TECH]: PowerType.PHYSICAL,
  [PowerType.LEGENDARY]: PowerType.LEGENDARY,
};

export const ELDER_TYPE_STYLING: Record<ElderType, { color: string; bg: string; border: string; label: string }> = {
  [ElderType.BINGO_WARRIOR]: { color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-300', label: 'BINGO' },
  [ElderType.GRUMPY_GARDENER]: { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', label: 'FLORA' },
  [ElderType.STORYTELLER]: { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', label: 'LORE' },
  [ElderType.TECH_WIZARD]: { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-300', label: 'BYTES' },
  [ElderType.MALL_WALKER]: { color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300', label: 'PACE' },
  [ElderType.KNITTING_NINJA]: { color: 'text-teal-700', bg: 'bg-teal-100', border: 'border-teal-300', label: 'STITCH' },
};

// Index 0 = base art, actively served from public/assets/elders/.
// Index 1/2 are evolution-stage art for backlog item 2 (not built yet, nothing
// reads these indices today). The source files live in /art-source/elders_evolution/
// (kept out of public/ so they aren't shipped to players unused) -- when evolution
// is implemented, move those two files per type into public/assets/elders/ first.
export const ELDER_AVATARS: Record<ElderType, string[]> = {
  [ElderType.BINGO_WARRIOR]: [bingoWarriorStage1, bingoWarriorStage1, bingoWarriorStage1],
  [ElderType.GRUMPY_GARDENER]: [grumpyGardenerStage1, grumpyGardenerStage1, grumpyGardenerStage1],
  [ElderType.STORYTELLER]: [storytellerStage1, storytellerStage1, storytellerStage1],
  [ElderType.TECH_WIZARD]: [techWizardStage1, techWizardStage1, techWizardStage1],
  [ElderType.MALL_WALKER]: [mallWalkerStage1, mallWalkerStage1, mallWalkerStage1],
  [ElderType.KNITTING_NINJA]: [knittingNinjaStage1, knittingNinjaStage1, knittingNinjaStage1],
};

// Shared avatar renderer so every call site gets the same img/rounding/fallback
// behavior instead of re-implementing <img> markup 9+ times.
// - fill=true: image fills its parent container (parent must set width/height).
// - fill=false: image uses the explicit `size` (px) itself.
export const ElderAvatarImg: React.FC<{
  type: ElderType;
  stage?: number;
  size?: number;
  fill?: boolean;
  className?: string;
}> = ({ type, stage = 0, size = 48, fill = false, className = '' }) => (
  <img
    src={ELDER_AVATARS[type][stage]}
    alt={type}
    draggable={false}
    className={`object-cover rounded-full select-none ${fill ? 'w-full h-full' : ''} ${className}`}
    style={fill ? undefined : { width: size, height: size, minWidth: size, minHeight: size }}
  />
);

// Keyed by item NAME, not id: SHOP_ITEMS ids (s1-s4) only exist in the shop
// browsing list -- once an item is purchased or collected from the map, App.tsx
// gives it a fresh runtime id ('shop_'+Date.now() / 'garden_'+Date.now()), so an
// id-keyed lookup would silently stop matching the moment it enters inventory.
// `name` is the one field that survives spawn -> purchase/collection -> inventory
// -> equip unchanged, and is unique across both SHOP_ITEMS and ITEM_POOL.
export const ITEM_ICON_ASSETS: Record<string, string> = {
  // SHOP_ITEMS (s1-s4)
  'High-Fiber Muffin': branMuffinImg,
  'Tennis Ball Walker': walkerTennisBallImg,
  'Straw Sunhat': sunhatImg,
  'Comfy Loafers': comfyLoafersImg,
  'Hearing Aid Plus': hearingAidImg,
  'Reading Glasses': readingGlassesImg,
  'Bingo Lucky Charm': bingoLuckCharmImg,
  // ITEM_POOL (map pickups / found items)
  'Hard Candy': hardCandyImg,
  'Vintage Radio': transistorRadioImg,
  'Lost Dentures': lostRetainerImg,
  'Old Map': treasureMapImg,
  'Garden Charm': goodLuckCharmImg,
  'Antique Pocket Watch': pocketWatchImg,
};

export const ItemIcon: React.FC<{
  name?: string;
  icon: string;
  size?: number;
  fill?: boolean;
  className?: string;
}> = ({ name, icon, size = 32, fill = false, className = '' }) => {
  const src = name ? ITEM_ICON_ASSETS[name] : undefined;
  if (!src) {
    return <span className={className} style={fill ? undefined : { fontSize: size }}>{icon}</span>;
  }
  return (
    <img
      src={src}
      alt={icon}
      draggable={false}
      className={`object-contain select-none ${fill ? 'w-full h-full' : ''} ${className}`}
      style={fill ? undefined : { width: size, height: size }}
    />
  );
};

// Keyed by `type` -- the one field on STRUCTURE_TEMPLATES that's stable and
// unique (unlike a runtime id, these templates are read directly from this
// array, never regenerated).
export const STRUCTURE_ICON_ASSETS: Record<string, string> = {
  Blitz: bingoBlitzHallImg,
  Heal: silverSpringsRehabImg,
  Shuffleboard: grandShuffleCourtImg,
  Market: farmersMarketImg,
  Garden: communityGardenImg,
  Walk: mallCircuitImg,
  Pavilion: potluckPavilionImg,
};

// Keyed by id -- INVESTMENT_TIERS items are read directly from this array
// (unlike shop/pool items, they never get a fresh runtime id), so id is safe.
export const PARCEL_ICON_ASSETS: Record<string, string> = {
  i1: gardenPlotImg,
  i2: parkBenchSponsorImg,
  i3: bingoHallEquityImg,
  i4: shuttleVanFleetImg,
  i5: theGoldenWingImg,
  i6: parkDirectorshipImg,
};

export const NAV_ITEMS = [
  { id: 'map', label: 'Map', icon: <MapIcon className="w-6 h-6" /> },
  { id: 'team', label: 'Team', icon: <UserGroupIcon className="w-6 h-6" /> },
  { id: 'base', label: 'Park', icon: <HomeIcon className="w-6 h-6" /> },
  { id: 'shop', label: 'Shop', icon: <ShoppingBagIcon className="w-6 h-6" /> },
  { id: 'quests', label: 'Tasks', icon: <ClipboardDocumentListIcon className="w-6 h-6" /> },
  { id: 'pass', label: 'Pass', icon: <TicketIcon className="w-6 h-6" /> },
  { id: 'bank', label: 'Bank', icon: <CurrencyDollarIcon className="w-6 h-6" /> },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Early Bird', description: 'Recruit your first Elder.', completed: false, rewardType: 'YieldBonus', rewardValue: 0.00001, icon: '🌅' },
  { id: 'a2', title: 'Community Pillar', description: 'Reach Park Community Score 100.', completed: false, rewardType: 'Tokens', rewardValue: 50, icon: '🏛️' },
  { id: 'a3', title: 'Debate Champion', description: 'Win 5 Wild Battles.', completed: false, rewardType: 'CommunityScore', rewardValue: 20, icon: '🗣️' },
  { id: 'a4', title: 'Wealthy Pensioner', description: 'Earn a total of 1.00 PP.', completed: false, rewardType: 'YieldBonus', rewardValue: 0.00005, icon: '💎' },
];

export const DAILY_REWARDS = [
  { day: 1, type: 'Tokens', value: 50, icon: '🎟️' },
  { day: 2, type: 'Tokens', value: 100, icon: '🎟️' },
  { day: 3, type: 'Item', value: 'Hard Candy', icon: '🍬' },
  { day: 4, type: 'Tokens', value: 200, icon: '🎟️' },
  { day: 5, type: 'Tokens', value: 300, icon: '🎟️' },
  { day: 6, type: 'Item', value: 'Old Map', icon: '🗺️' },
  { day: 7, type: 'Tokens', value: 1000, icon: '💰' },
];

const generateNeighborhoodPaths = () => {
  const paths = [];
  const startLat = 40.60;
  const endLat = 40.85;
  const startLng = -74.15;
  const endLng = -73.85;
  const step = 0.008;

  for (let lat = startLat; lat <= endLat; lat += step) {
    paths.push({
      id: `h_path_${lat.toFixed(4)}`,
      points: [
        { lat, lng: startLng },
        { lat, lng: endLng }
      ]
    });
  }
  for (let lng = startLng; lng <= endLng; lng += step) {
    paths.push({
      id: `v_path_${lng.toFixed(4)}`,
      points: [
        { lat: startLat, lng },
        { lat: endLat, lng }
      ]
    });
  }
  return paths;
};

export const WORLD_PATHS = generateNeighborhoodPaths();

export const STRUCTURE_TEMPLATES = [
  { 
    type: 'Blitz', 
    name: 'Bingo Blitz Hall', 
    icon: '🎰', 
    description: 'High-stakes Bingo. Each ticket fuels the community jackpot.',
    requirement: 'Cost: 10 Tokens'
  },
  { 
    type: 'Heal', 
    name: 'Silver Springs Rehab', 
    icon: '🏊‍♂️', 
    description: 'Restore full HP to your entire squad with therapeutic waters.',
    requirement: 'Cost: 25 Tokens'
  },
  { 
    type: 'Shuffleboard', 
    name: 'Grand Shuffle Court', 
    icon: '🥏', 
    description: 'Team King of the Hill. Hold the court to boost your passive income!',
    requirement: 'Cost: 20 Tokens'
  },
  { 
    type: 'Market', 
    name: 'Farmers Market', 
    icon: '🌽', 
    description: 'Team nutrition! Boost a random stat for your whole squad.',
    requirement: 'Cost: 30 Tokens'
  },
  { 
    type: 'Garden', 
    name: 'Community Garden', 
    icon: '🌻', 
    description: 'Scavenge for high-quality heirlooms and rare equipment.',
    requirement: 'Cost: 10 Tokens'
  },
  { 
    type: 'Walk', 
    name: 'Mall Circuit', 
    icon: '🛍️', 
    description: 'Stamina training. Gain a large XP boost for your whole squad.',
    requirement: 'Cost: 15 Tokens'
  },
  { 
    type: 'Pavilion', 
    name: 'Potluck Pavilion', 
    icon: '🥗', 
    description: 'Community gathering. Boost your Park Community Score significantly.',
    requirement: 'Cost: 10 Tokens'
  }
];

export const ITEM_POOL = [
  { name: 'Straw Sunhat', icon: '🧢', type: 'Equipment', boost: 2, slot: 'Head', description: 'Increases Wit by 2.' },
  { name: 'Comfy Loafers', icon: '🥿', type: 'Equipment', boost: 3, slot: 'Body', description: 'Increases Tenacity by 3.' },
  { name: 'Hearing Aid Plus', icon: '🔔', type: 'Equipment', boost: 2, slot: 'Accessory', description: 'Increases Strength and Agility.' },
  { name: 'Hard Candy', icon: '🍭', type: 'Snack', boost: 15, slot: 'Accessory', description: 'Restores 15 HP to a resident.' },
  { name: 'Vintage Radio', icon: '📻', type: 'Equipment', boost: 4, slot: 'Accessory', description: 'Increases stats via nostalgic vibes.' },
  { name: 'Lost Dentures', icon: '💎', type: 'LegacyToken', boost: 25, slot: 'Accessory', description: 'Worth 25 Tickets.' },
  { name: 'Old Map', icon: '🗺️', type: 'Snack', boost: 50, slot: 'Accessory', description: 'Grants 50 XP to the Park.' },
  { name: 'Garden Charm', icon: '🍀', type: 'Equipment', boost: 3, slot: 'Body', description: 'Increases Tenacity by 3.' },
  { name: 'Antique Pocket Watch', icon: '⏱️', type: 'Equipment', boost: 5, slot: 'Accessory', description: 'A classic piece that boosts efficiency.' }
];

export const SHOP_ITEMS = [
  { id: 's1', name: 'High-Fiber Muffin', icon: '🧁', price: 50, description: 'Instantly restores 50 HP.' },
  { id: 's2', name: 'Tennis Ball Walker', icon: '🎾', price: 250, description: 'Increases Tenacity by 6.', slot: 'Body', boost: 6 },
  { id: 's3', name: 'Reading Glasses', icon: '👓', price: 150, description: 'Increases Wit by 4.', slot: 'Head', boost: 4 },
  { id: 's4', name: 'Bingo Lucky Charm', icon: '🍀', price: 300, description: 'Boosts competitive spirit slightly.', slot: 'Accessory', boost: 5 }
];

export const SEASONAL_REWARDS = [
  { level: 1, icon: '🎟️', name: 'Starter Kit', free: '100 Tickets', tickets: 100 },
  { level: 2, icon: '🍭', name: 'Sweet Treat', free: '15 Tickets', tickets: 15 },
  { level: 3, icon: '🌅', name: 'Morning Badge', free: '20 Tickets', tickets: 20 },
  { level: 4, icon: '🥿', name: 'Fast Feet', free: '25 Tickets', tickets: 25 },
  { level: 5, icon: '💎', name: 'Ticket Cache', free: '500 Tickets', tickets: 500 },
  { level: 6, icon: '🧢', name: 'Sun Protection', free: '20 Tickets', tickets: 20 },
  { level: 7, icon: '📻', name: 'Broadcast', free: '30 Tickets', tickets: 30 },
  { level: 8, icon: '💎', name: 'Artifact', free: '40 Tickets', tickets: 40 },
  { level: 9, icon: '🍀', name: 'Crafting', free: '35 Tickets', tickets: 35 },
  { level: 10, icon: '🏆', name: 'Grand Prize', free: '1000 Tickets', tickets: 1000 }
];
