import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getWorldStructures, getWorldArenas, worldCellKey } from './services/worldMap';
import { ArenaPanel } from './components/ArenaPanel';
import { Gfx, EmojiText } from './components/Gfx';
import WorkshopPanel from './components/WorkshopPanel';
import { fetchArenas, chooseFaction, stationElder, recallElder, attackArena, claimArenaDues, raidHit, type ArenaInfo, type ArenaMe } from './services/arenaService';
import GameMap from './components/GameMap';
import BattleScreen from './components/BattleScreen';
import ThronesPanel from './components/ThronesPanel';
import ExchangeOverview from './components/ExchangeOverview';
import ElderInteraction from './components/ElderInteraction';
import StarterSelection from './components/StarterSelection';
import FriendsPanel from './components/FriendsPanel';
import GroundsPanel from './components/GroundsPanel';
import ParkScene, { isDecorSpotValid } from './components/ParkScene';
import { TutorialOverlay } from './components/Tutorial';
import { AdOverlay } from './components/AdOverlay';
import PvpShop from './components/PvpShop';
import { fetchMementos, buyRoom, buyKeepsake, convertPpToMementos, MementosError, type MementosState } from './services/mementosService';
import { buyPack, retryPendingPurchases, loadPackPrices, billingAvailable, type VerifiedPurchase } from './services/billing';
import BoardsPanel from './components/BoardsPanel';
import { submitBoardScore, fetchBoard, BoardMode } from './services/boardsService';
import MementoShop from './components/MementoShop';
import { TeamPanel, BankPanel, BasePanel, ElderPassPanel, QuestPanel, ShopPanel, MailboxPanel, ShuffleboardPanel } from './components/UIPanels';
import { audioManager } from './services/audioManager';
import {
  isCloudAccountsConfigured, supabase, getCurrentSession, updateDisplayName,
  startGoogleSignIn, signInWithEmail, signUpWithEmail, sendMagicLink, signOut as authSignOut,
  type AuthSession,
} from './services/authService';
import { fetchCloudSave, uploadCloudSave } from './services/cloudSaveService';
import { fetchLeaderboard, submitTournamentScore, LeaderboardData } from './services/leaderboardService';
import { fetchInbox, notifyFriendBattle, mergeInboxIntoMailbox, MAIL_ID_PREFIX } from './services/mailService';
import { fetchFriendsData, sendFriendRequest, sendFriendRequestByUserId, sendRandomMatchRequest, setOpenToRandomFriends, respondToFriendRequest, removeFriend, fetchNearbyPlayers, type FriendsData, type PlayerProfileSnapshot } from './services/socialService';
import { fetchResidentExchange, placeResident, recallResident, type ResidentExchangeRow } from './services/residentExchangeService';
import { 
  Cog6ToothIcon, XMarkIcon, EnvelopeIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ClipboardDocumentIcon, ArrowPathIcon, CheckCircleIcon, UserGroupIcon
} from '@heroicons/react/24/solid';
import { 
  Elder, 
  ElderType, 
  GameState, 
  MapItem,
  PowerType,
  Friend,
  Quest,
  Achievement,
  Season,
  Gear,
  MailMessage,
  Structure
} from './types';
import { 
  NAV_ITEMS, 
  INITIAL_PENSION_RATE, 
  ITEM_POOL,
  INITIAL_ACHIEVEMENTS,
  XP_FOR_LEVEL_UP,
  ELDER_AVATARS,
  STRUCTURE_PRICING,
  utcDayKey,
  utcWeekKey,
  DAILY_QUEST_POOL,
  WEEKLY_QUEST_POOL,
  generateQuests,
  ACHIEVEMENT_CONDITIONS,
  NEW_ACHIEVEMENTS,
  totalProducerBoost,
  totalHpRegenPerTick,
  totalScoreTricklePerTick,
  totalStructureDiscountPct,
  totalCourtPurseBonus,
  arenaAttackCost,
  RAID_FREE_ATTEMPTS,
  RAID_EXTRA_ATTEMPT_COST,
  factionById,
  type FactionId,
  getElderPower,
  GOLDEN_GAMES_DAILY_PAID_MATCHES,
  GOLDEN_GAMES_FIRST_CLEAR_MULT,
  GOLDEN_GAMES_UNPAID_XP_SHARE,
  goldenGamesMaterials,
  AUTO_PLAY_INTERVAL_MS,
  AUTO_PLAY_DAILY_PAID,
  AUTO_PLAY_UNPAID_XP_SHARE,
  TOURNAMENT_DAILY_THROWS,
  dailyCountToday,
  bumpDaily,
  ownedAssetCount,
  CHALLENGE_TIERS,
  CHALLENGE_MAX_TIERS,
  CHALLENGE_DAILY_PAID_WINS,
  CHALLENGE_FIRST_CLEAR_MULT,
  CHALLENGE_UNPAID_XP_SHARE,
  normalizeChallengeLadder,
  getStructurePrice,
  bumpStructureUses,
  WORLD_PATHS,
  TRAINING_BASE_COST,
  STAT_BONUS_PER_LEVEL,
  TEAM_SIZE_LIMIT,
  AD_REVENUE_PAYOUT,
  REVENUE_SPLIT,
  MAX_ADS_PER_DAY,
  xpForPlayerLevel,
  xpForElderLevel,
  MAX_PLAYER_LEVEL,
  ELDER_MAX_LEVEL,
  PASSIVE_TICKS_PER_HOUR,
  ECONOMY_VERSION,
  PP_SCALE_V2,
  DIVIDEND_BASE_PAYOUT,
  DIVIDEND_SCORE_BONUS,
  DIVIDEND_MAX_SCORE_BONUS,
  DIVIDEND_MAX_RESERVE_SHARE,
  DIVIDEND_MIN_RESERVE,
  DIVIDEND_TICKETS_BASE,
  DIVIDEND_TICKETS_PER_STARS,
  DIVIDEND_TICKETS_CAP,
  CASHOUT_MAX_RESERVE_SHARE,
  DIVIDEND_COOLDOWN,
  GAME_VERSION,
  ELDER_TYPE_STYLING,
  SHOP_ITEMS,
  SEASON_XP_PER_LEVEL,
  SEASONAL_REWARDS,
  WITHDRAWAL_MINIMUM,
  DAILY_REWARDS,
  INVESTMENT_TIERS,
  PASSIVE_TICK_MS,
  AD_BOOST_MULTIPLIER,
  AD_BOOST_DURATION_MS,
  OFFLINE_CAP_MS,
  COURT_CHAMPION_DURATION_MS,
  COURT_PURSE_TICKETS,
  isCourtChampion,
  comfortOutputBonus,
  MAX_NEARBY_ITEMS,
  INITIAL_ITEM_SEED,
  ITEM_SPAWN_INTERVAL_MS,
  SCRAP_RARITY_MULTIPLIER, parseCourtHonor, parseBoardHonor, modeKindKnown, MODE_MILESTONE_REWARDS, MODE_BADGES, MODE_BADGE_TIERS, modeCount, modeTierReached, GUIDE_SUCCESS_RATE, RARITY_STAT_MULTIPLIER, standardElderStats,
  LEVEL_UP_TICKET_REWARD,
  RANK_TIERS,
  getRankForLevel,
  getUnlockedCosmetics,
  getSquadPower,
  ElderAvatarImg,
  resolveProfileDisplay,
  isImagePath,
  SCRAP_BASE_TICKETS, SCRAP_LEVEL_CAP,
  getYieldExchangeRate,
  ELDER_XP_FOR_LEVEL_UP,
  getBaseComfortGeneration,
  ELDER_EVOLUTION_STAGE1_LEVEL,
  ELDER_EVOLUTION_STAGE2_LEVEL,
  ELDER_EVOLUTION_STAGE2_ELITE_RARITIES,
  EVOLUTION_STAGE1_COST,
  EVOLUTION_STAGE2_COST,
  EVOLUTION_STAGE2_STEEP_COST,
  EVOLUTION_STAT_MULTIPLIER,
  GOLDEN_GAMES_LEAGUES,
  GOLDEN_GAMES_COOLDOWN_MS,
  AMENITIES, BUILDING_STORAGE_HOURS,
  VISIT_COOLDOWN_MS,
  VISIT_MATERIALS_REWARD,
  getHousingCapacity,
  getBuildingLevel,
  buildingUpgradeMaterials,
  buildingUpgradeTickets,
  producerStored,
  MAX_BUILDING_LEVEL,
  FRIEND_BATTLE_COOLDOWN_MS, FRIEND_BATTLE_DAILY_ATTACK_CAP, NEARBY_REFRESH_COOLDOWN_MS,
  FRIEND_BATTLE_WIN_MATERIALS,
  MEMENTO_PACKS, MEMENTOS_PER_PP, PP_TO_MEMENTOS_MIN, PREMIUM_ROOM_MAX, premiumRoomPrice, MEMENTO_ITEMS, mementoItemsForWeek, mementoWeekIndex,
  GEAR_RARITY_COLOR, UNIFORM_GEAR_BASE, UNIFORM_GEAR_NAMES, PASS_PRICE, PASS_HOLD_MAX, PARK_ASSET_MAX_OWNED, parkAssetCost,
  DINERS_DAILY_CAP, DINERS_FRIEND_WIN, DINERS_ARENA_WIN, DINERS_RAID_HIT, DINERS_COURT_WIN, antiqueById, antiquesForDay, antiqueDayIndex, PVP_GEAR,
  FRIEND_BATTLE_DAILY_REWARDS,
  FRIEND_BATTLE_UNREWARDED_XP_SHARE,
  rollFriendBattle,
  FRIEND_BATTLE_WIN_ELDER_XP,
  FRIEND_BATTLE_LOSS_ELDER_XP,
  FRIEND_BATTLE_WIN_COMMUNITY_SCORE,
  UI_THEMES,
  DEFAULT_UI_THEME_ID,
  applyUITheme,
  rollGearRarity,
  getEffectiveGearBoost,
  getGearUpgradeCost,
  getGearSellValue,
  gearSlotKey,
  getGearMaxLevel,
  workshopUpgradeDiscountPct, workshopSalvageBonusPct, applyUpgradeDiscount, applySalvageBonus,
} from './constants';

// A reward that paid itself: shows a top alert AND leaves a claimed note in the Mailbox saying what it was from.
function rewardMail(sender: string, subject: string, body: string): MailMessage {
  return { id: 'auto_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), sender, subject, body, claimed: true, timestamp: Date.now() };
}

function calculatePassiveIncome(state: GameState, elapsedMs: number): number {
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const ticks    = cappedMs / PASSIVE_TICK_MS;
  let rate = INITIAL_PENSION_RATE + state.pensionRate;
  // Passive income comes ONLY from the base rate + Park Assets (pensionRate) and the ad boost.
  // Elder comfort, Parcels and the Court used to add to it; gameplay must never raise passive income,
  // so they now do other jobs (building output, housing, Ticket purse). See ECONOMY.md.
  const isAdBoosted = state.boostUntil > Date.now();
  if (isAdBoosted) rate *= AD_BOOST_MULTIPLIER;
  return rate * ticks;
}

const modeKindKnownMode = (m: string): boolean => MODE_BADGES.some(x => x.mode === m);
const bumpStat = (m: Record<string, number> | undefined, kind: string, n = 1): Record<string, number> => ({ ...(m ?? {}), [kind]: Math.min(1e9, (Number(m?.[kind]) || 0) + n) });
const SAVE_KEY = 'geriatric_park_v17_save';
const MALE_NAMES = ["Arthur", "Barnaby", "Harold", "Otis", "Clarence", "Mortimer", "Cecil"];
const FEMALE_NAMES = ["Ethel", "Mildred", "Gertrude", "Mabel", "Edith", "Gladys"];
// Hand-picked starter names ("Bingo Bob") aren't drawn randomly and don't live
// in the pools above, but migration still needs to know their gender so it
// doesn't mistake them for an unrecognized name (which it leaves alone) or,
// worse, a genuinely mismatched one.
const SPECIAL_NAME_GENDERS: Record<string, 'Male' | 'Female'> = { 'Bingo Bob': 'Male' };
// Gender is implicit in each type's art (evolution art pass, 9-9-26) -- this
// makes it explicit so names can be drawn from the matching pool instead of
// one ungendered list. Fixes wild Elders spawning with mismatched names
// (e.g. a Grumpy Gardener, drawn as an old woman, getting "Barnaby").
const ELDER_TYPE_GENDER: Record<ElderType, 'Male' | 'Female'> = {
  [ElderType.BINGO_WARRIOR]: 'Male',
  [ElderType.GRUMPY_GARDENER]: 'Female',
  [ElderType.STORYTELLER]: 'Male',
  [ElderType.TECH_WIZARD]: 'Female',
  [ElderType.MALL_WALKER]: 'Male',
  [ElderType.KNITTING_NINJA]: 'Female',
};
function getRandomElderName(type: ElderType): string {
  const pool = ELDER_TYPE_GENDER[type] === 'Male' ? MALE_NAMES : FEMALE_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
// Returns true if `name` is either gender-matched to `type` OR not a name we
// have an opinion about (unrecognized custom/imported names are left alone --
// only names we can confidently identify as the WRONG gender get corrected).
function isNameGenderMatched(name: string, type: ElderType): boolean {
  const expected = ELDER_TYPE_GENDER[type];
  const known = SPECIAL_NAME_GENDERS[name]
    ?? (MALE_NAMES.includes(name) ? 'Male' : FEMALE_NAMES.includes(name) ? 'Female' : undefined);
  if (!known) return true;
  return known === expected;
}

// Applies an XP gain and rolls over into level-ups, so every XP source
// uses identical leveling math (previously several handlers added XP
// without ever checking for a level-up, so the bar could fill without
// the level actually increasing).
function applyXpGain(
  xp: number, level: number, amount: number,
  thresholdFor: (lvl: number) => number = xpForPlayerLevel,
  maxLevel: number = MAX_PLAYER_LEVEL,
): { xp: number; level: number } {
  let nextXp = xp + amount;
  let nextLevel = level;
  while (nextLevel < maxLevel) {
    const needed = thresholdFor(nextLevel);
    if (!(needed > 0) || nextXp < needed) break;
    nextXp -= needed;
    nextLevel++;
  }
  // At the cap, XP stops piling up (bar stays just short of full).
  if (nextLevel >= maxLevel) nextXp = Math.min(nextXp, Math.max(0, thresholdFor(maxLevel) - 1));
  return { xp: nextXp, level: nextLevel };
}

// Grants Elder XP (reusing the same generic applyXpGain curve as the player,
// just with ELDER_XP_FOR_LEVEL_UP as its own independently-tunable threshold),
// and applies the previously-orphaned STAT_BONUS_PER_LEVEL on every level gained.
// Full-heals the Elder on level-up as part of the reward.
function grantElderXp(elder: Elder, amount: number): Elder {
  const { xp: nextXp, level: nextLevel } = applyXpGain(elder.xp ?? 0, elder.level, amount, xpForElderLevel, ELDER_MAX_LEVEL);
  const levelsGained = nextLevel - elder.level;
  if (levelsGained <= 0) return { ...elder, xp: nextXp };
  const statBonus = Math.round(STAT_BONUS_PER_LEVEL * levelsGained * (RARITY_STAT_MULTIPLIER[elder.rarity] ?? 1));
  const nextMaxHp = elder.maxHp + statBonus * 2;
  return {
    ...elder,
    xp: nextXp,
    level: nextLevel,
    strength: elder.strength + statBonus,
    wit: elder.wit + statBonus,
    agility: elder.agility + Math.ceil(statBonus / 2),
    tenacity: elder.tenacity + Math.ceil(statBonus / 2),
    maxHp: nextMaxHp,
    hp: nextMaxHp,
  };
}

// Grants Elder XP to every Elder currently on the active Team (the squad that
// "participated"), used by activities that don't pass an explicit roster
// (Shuffleboard Auto-Play/Tournament/Challenge).
// Saved/cloud counters are untrusted: anything that isn't a finite non-negative number counts as 0.
function safeCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function grantElderXpToTeam(elders: Elder[], amount: number): Elder[] {
  return elders.map(e => (e.status === 'Team' ? grantElderXp(e, amount) : e));
}

// Resident Exchange recall: the specific Elder is identified by id (it may be on Team or Standby),
// not "whichever Elders happen to be on Team right now" like grantElderXpToTeam.
function grantElderXpById(elders: Elder[], elderId: string, amount: number): Elder[] {
  return elders.map(e => (e.id === elderId ? grantElderXp(e, amount) : e));
}

// One-time rescale of every PP-denominated value in a save from the old simulated
// $0.10/ad scale to the $0.008/ad assumption (Economy v2). Runs on RAW save data
// before it is merged over INITIAL_STATE, and is idempotent via economyVersion.
function migrateEconomy(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  const from = typeof raw.economyVersion === 'number' ? raw.economyVersion : 1;
  if (from >= ECONOMY_VERSION) return raw;
  const scaled = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v * PP_SCALE_V2 : v);
  let out: any = { ...raw, economyVersion: ECONOMY_VERSION };
  if (from < 2) {
    for (const key of ['pensionBalance', 'pendingYield', 'communityReserve', 'pensionRate']) {
      if (key in raw) out[key] = scaled(raw[key]);
    }
    if (raw.earningsBreakdown && typeof raw.earningsBreakdown === 'object') {
      out.earningsBreakdown = {
        ...raw.earningsBreakdown,
        passive: scaled(raw.earningsBreakdown.passive),
        active: scaled(raw.earningsBreakdown.active),
        sponsorship: scaled(raw.earningsBreakdown.sponsorship),
      };
    }
    if (Array.isArray(raw.ownedParcels)) {
      out.ownedParcels = raw.ownedParcels.map((p: any) => (p && typeof p === 'object') ? { ...p, pensionBonus: scaled(p.pensionBonus) } : p);
    }
  }
  if (from < 3) {
    // Parcels no longer add passive income: take their baked-in bonus back out of pensionRate.
    const parcels = Array.isArray(out.ownedParcels) ? out.ownedParcels : [];
    const bonusSum = parcels.reduce((sum: number, p: any) => sum + (p && typeof p.pensionBonus === 'number' && Number.isFinite(p.pensionBonus) ? p.pensionBonus : 0), 0);
    if (typeof out.pensionRate === 'number' && Number.isFinite(out.pensionRate)) out.pensionRate = Math.max(0, out.pensionRate - bonusSum);
    out.ownedParcels = parcels.map((p: any) => (p && typeof p === 'object') ? { ...p, pensionBonus: 0 } : p);
  }
  if (from < 4) {
    // Park Asset yields were cut ~65x and ownership is capped at 5 per asset: rebuild the passive rate from what the
    // player owns at the new, sustainable yields (the old rate came from the old, unsustainable ones).
    const owned = out.parkAssets && typeof out.parkAssets === 'object' ? out.parkAssets : {};
    let rate = 0;
    for (const item of INVESTMENT_TIERS.flatMap(t => t.items)) rate += Math.min(PARK_ASSET_MAX_OWNED, ownedAssetCount(owned, item.id)) * item.rateBoost;
    out.pensionRate = rate;
  }
  return out;
}

const INITIAL_STATE: GameState = {
  version: GAME_VERSION,
  isLinkedToGoogle: false,
  googleEmail: undefined,
  pensionBalance: 0.00,
  economyVersion: ECONOMY_VERSION,
  lastCourtPurseClaim: 0,
  structureUses: { day: '', counts: {} },
  parkAssets: {},
  stationedAt: {},
  autoPlayPaid: { day: '', count: 0 },
  tournamentThrows: 0,
  challengeLadder: { highestCleared: -1, day: '', paidWins: 0 },
  pendingYield: 0.00,
  communityReserve: 0, // strictly player/ad-funded -- no free seed (was 5.00)
  earningsBreakdown: { passive: 0, active: 0, sponsorship: 0 },
  legacyTokens: 200,
  pensionRate: 0, // base rate is added separately in calculatePassiveIncome (this used to double it)
  level: 1,
  xp: 0,
  parkCommunityScore: 0,
  allElders: [],
  currentLocation: { lat: 40.7128, lng: -74.0060 },
  ownedParcels: [],
  nearbyFriends: [],
  nearbyItems: [],
  nearbyStructures: [],
  itemsLastSpawnedAt: 0,
  itemsLastSpawnLat: 0,
  itemsLastSpawnLng: 0,
  heldStructureIds: [],
  quests: [...generateQuests(DAILY_QUEST_POOL, 'Daily', utcDayKey(), 5), ...generateQuests(WEEKLY_QUEST_POOL, 'Weekly', utcWeekKey(), 3)],
  questsGeneratedDay: utcDayKey(),
  questsGeneratedWeek: utcWeekKey(),
  battleWins: 0,
  faction: null,
  achievements: [...INITIAL_ACHIEVEMENTS, ...NEW_ACHIEVEMENTS],
  favoriteElderIds: [],
  buildingMaterials: 0,
  tvDinners: 0, dinersDay: '', dinersToday: 0, antiquesOwned: [], mementoPurchaseIds: [], discoveredArenas: [], parkDecor: [], boardStats: { week: '', arena: 0, raid: 0, friend: 0 }, pvpPasses: { arena: 0, raid: 0 }, mementos: 0, mementoItemsOwned: [], premiumRooms: 0,
  builtAmenityIds: [],
  amenityLevels: {},
  amenityCollectedAt: {},
  lastVisitedFriends: {},
  season: { id: 1, name: "Autumn Gathering", xp: 0, isPremium: false, startDate: Date.now(), endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, claimedLevels: [] },
  hasStarted: false,
  inventory: [],
  friends: [],
  lastActiveTime: Date.now(),
  lastLoginTimestamp: undefined,
  lastDividendClaim: 0,
  boostUntil: 0,
  dailyBoostsCount: 0,
  skipAdCooldown: 0,
  adUsage: { count: 0, lastReset: Date.now() },
  profileColor: '#4f46e5',
  parkTheme: 'Classic',
  selectedAccountIcon: '',
  selectedTitle: '',
  mailbox: [
    { id: 'm1', sender: 'Park Admin', subject: 'Park Keys!', body: 'Welcome to the management team. Here is your starter bonus!', reward: { type: 'Tokens', value: 50 }, claimed: false, timestamp: Date.now() }
  ],
  bingoBlitz: { phase: 'Prep', pot: 0, participants: [], timer: 60 },
  shuffleboard: { currentKing: null },
  goldenGames: { highestLeagueCleared: -1, nextMatchAt: 0 },
  friendBattle: { nextMatchAt: 0 },
  settings: {
    darkTheme: true,
    altTheme: false,
    musicEnabled: true,
    sfxEnabled: true,
    uiTheme: DEFAULT_UI_THEME_ID,
  },
  tournamentScore: 0,
  tournamentEndsAt: Date.now() + 24 * 60 * 60 * 1000,
  passiveMatchAt: Date.now(),
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [nearbyPlayers, setNearbyPlayers] = useState<PlayerProfileSnapshot[]>([]);
  const [nearbyReadyAt, setNearbyReadyAt] = useState(0); // Refresh is on a short cooldown so the list can't be hammered
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [showThrones, setShowThrones] = useState(false);
  const [encounter, setEncounter] = useState<Elder | null>(null); // wild Elder preview shown before a fight
  const [battleOpponent, setBattleOpponent] = useState<{ elder: Elder } | null>(null);
  const [guideTarget, setGuideTarget] = useState<Elder | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingStuckLong, setLoadingStuckLong] = useState(false);
  // Independent of cloud config, so the escape hatch also appears for a genuinely stuck LOCAL load
  // (no cloud account involved at all), not only the cloud-sync case.
  useEffect(() => {
    const t = setTimeout(() => setLoadingStuckLong(true), 12000);
    return () => clearTimeout(t);
  }, []);
  const [wildElders, setWildElders] = useState<Elder[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Account/display-name state, lifted into App itself rather than the old
  // disconnected sibling-mounted <AccountPanel/> (was rendered outside App's
  // own tree in index.tsx, with no way to surface the signed-in identity
  // anywhere else in the game -- header, Settings, etc). components/AccountPanel.tsx
  // and its separate index.tsx mount point have both been removed entirely --
  // this is now the one and only account UI, integrated into Settings.
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  // Phase 2 social features: friends list state. Deliberately not part of
  // GameState/the save blob -- friend relationships live server-side in
  // Supabase (see api/friends.ts), fetched fresh like the leaderboard.
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  // Non-blocking toasts (replaces every native notify(), which froze the game and
  // won't exist on Steam/Electron/Capacitor the same way). Styled like the Court
  // result banner: green for good news, red for "can't do that" / problems.
  type Toast = { id: number; text: string; tone: 'good' | 'bad' };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const structureCellRef = useRef<string>('');
  const NEGATIVE_TOAST = /^(need |not enough|insufficient|invalid|failed|already|max squad|you can'?t|assign|no pending|minimum|community (reserve|pool) is|all sponsorship|this parcel|📭)|wandered off|\bneeds (to reach|\d)/i;
  const notify = useCallback((text: string, tone?: 'good' | 'bad') => {
    const resolved = tone ?? (NEGATIVE_TOAST.test(text) ? 'bad' : 'good');
    const id = ++toastIdRef.current;
    // Deferred a tick: some callers run inside another setState updater.
    setTimeout(() => {
      setToasts(prev => [...prev.slice(-2), { id, text, tone: resolved }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), resolved === 'bad' ? 6000 : 4500);
    }, 0);
  }, []);
  const showNotice = useCallback((message: string) => notify(message, 'bad'), [notify]);
  const [showGroundsPanel, setShowGroundsPanel] = useState(false);
  useEffect(() => { if (accountMessage) notify(accountMessage); }, [accountMessage, notify]);
  const [groundsFocusId, setGroundsFocusId] = useState<string | null>(null);
  const [showExchangeOverview, setShowExchangeOverview] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showParkHub, setShowParkHub] = useState(false);
  const [showPvpShop, setShowPvpShop] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const lastBoardSent = useRef<Record<string, number>>({});
  const [showMementoShop, setShowMementoShop] = useState(false);
  const [arenaInfo, setArenaInfo] = useState<Record<string, ArenaInfo>>({});
  const [arenaMe, setArenaMe] = useState<ArenaMe | null>(null);
  const [activeArenaId, setActiveArenaId] = useState<string | null>(null);
  const [arenaBusy, setArenaBusy] = useState(false);
  const [friendsData, setFriendsData] = useState<FriendsData | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [residentExchangeMine, setResidentExchangeMine] = useState<ResidentExchangeRow[]>([]);
  const [residentExchangeHosting, setResidentExchangeHosting] = useState<ResidentExchangeRow[]>([]);

  const refreshFriends = useCallback(async () => {
    if (!isCloudAccountsConfigured()) return;
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const data = await fetchFriendsData();
      setFriendsData(data);
    } catch (e) {
      console.error('Friends fetch failed', e);
      setFriendsError(e instanceof Error ? e.message : 'Could not load friends.');
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const recallRef = useRef<(id: string) => Promise<void>>(async () => {});
  const autoRecalling = useRef<Set<string>>(new Set());

  const refreshResidentExchange = useCallback(async () => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const { mine, hosting } = await fetchResidentExchange();
      setResidentExchangeMine(mine);
      setResidentExchangeHosting(hosting);
      // Keep local "away" flags in step with the server: fill in host names, and bring home any Elder
      // whose placement no longer exists (e.g. recalled from another device).
      setState(prev => {
        const byElder = new Map(mine.map(r => [r.elder_id, r]));
        let changed = false;
        const allElders = prev.allElders.map(e => {
          const row = byElder.get(e.id);
          if (row) {
            const hostName = row.host?.display_name || 'a friend';
            const until = new Date(row.ends_at).getTime();
            const isLoan = row.mode === 'loan';
            if (e.awayUntil === until && e.awayHost === hostName && !!e.awayLoan === isLoan) return e;
            changed = true;
            return { ...e, awayUntil: until, awayHost: hostName, awayLoan: isLoan, awayPrevStatus: e.awayPrevStatus ?? (e.status === 'Base' ? 'Base' : e.status), status: 'Base' as const };
          }
          if (e.awayUntil) {
            changed = true;
            const { awayUntil, awayHost, awayPrevStatus, awayLoan, ...rest } = e;
            return { ...rest, status: awayPrevStatus === 'Porch' ? 'Porch' as const : 'Base' as const };
          }
          return e;
        });
        return changed ? { ...prev, allElders } : prev;
      });
      // Auto-return: anyone whose timer has run out comes home and is paid without a manual tap.
      const now = Date.now();
      for (const r of mine) {
        if (new Date(r.ends_at).getTime() <= now && !autoRecalling.current.has(r.id)) {
          autoRecalling.current.add(r.id);
          void recallRef.current(r.id).finally(() => autoRecalling.current.delete(r.id));
        }
      }
    } catch (e) {
      console.error('Resident Exchange fetch failed', e);
    }
  }, []);

  const handlePlaceResident = useCallback(async (hostId: string, elder: Elder, durationHours: 8 | 12 | 24, giftType: 'materials' | 'quest' | 'boost' = 'materials', asLoan = false, target?: { id: string; label: string }) => {
    if (state.stationedAt?.[elder.id]) { notify('That Elder is defending an Arena — recall it first.', 'bad'); return; }
    if (elder.status === 'Team') { notify('Move this Elder off your squad before sending them out.', 'bad'); return; }
    try {
      await placeResident(hostId, elder.id, elder.name, elder.type, elder.evolutionStage ?? 0, durationHours, giftType,
        asLoan ? { level: elder.level, rarity: elder.rarity, powerType: String(elder.powerType), strength: elder.strength, wit: elder.wit, agility: elder.agility, tenacity: elder.tenacity, maxHp: elder.maxHp, hp: elder.maxHp } : undefined, target);
      setState(prev => ({
        ...prev,
        allElders: prev.allElders.map(e => e.id === elder.id
          ? { ...e, awayPrevStatus: e.status, awayUntil: Date.now() + durationHours * 3600000, awayLoan: asLoan, status: 'Base' as const }
          : e),
      }));
      setState(prev => ({ ...prev, modeStats: bumpStat(prev.modeStats, 'exchange_send'), quests: prev.quests.map(q => (!q.completed && q.kind === 'exchange_send') ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q) }));
      notify(asLoan ? `${elder.name} is on loan for ${durationHours}h!` : `${elder.name} is off visiting for ${durationHours}h!`, 'good');
      void refreshResidentExchange();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not place that Elder.', 'bad');
    }
  }, [notify, refreshResidentExchange, state.stationedAt, state.allElders]);

  const handleRecallResident = useCallback(async (placementId: string) => {
    try {
      const { elderId, xpEarned } = await recallResident(placementId);
      setState(prev => {
        const teamCount = prev.allElders.filter(e => e.status === 'Team').length;
        const allElders = grantElderXpById(prev.allElders, elderId, xpEarned).map(e => {
          if (e.id !== elderId) return e;
          const { awayUntil, awayHost, awayPrevStatus, awayLoan, ...rest } = e;
          const back = awayPrevStatus === 'Team' && teamCount < TEAM_SIZE_LIMIT ? 'Team' as const : awayPrevStatus === 'Porch' ? 'Porch' as const : 'Base' as const;
          return { ...rest, status: back };
        });
        return { ...prev, allElders };
      });
      notify(`Welcome home! +${xpEarned} Elder XP.`, 'good');
      void refreshResidentExchange();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not recall that Elder.', 'bad');
    }
  }, [notify, refreshResidentExchange]);
  recallRef.current = handleRecallResident;

  // Check for expired placements every minute while the app is open (timer end = automatic return).
  useEffect(() => {
    // Every minute: lets a friend's new loan appear on the borrower's Squad/Battle/Court screens, and brings expired Elders home.
    const t = setInterval(() => { void refreshResidentExchange(); }, 60000);
    const onVis = () => { if (document.visibilityState === 'visible') void refreshResidentExchange(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [refreshResidentExchange]);

  // Opening Squad, Court or the map battle screen always pulls the freshest loan data.
  useEffect(() => { if (activeTab === 'team' || activeTab === 'shuffleboard' || activeTab === 'map') void refreshResidentExchange(); }, [activeTab, refreshResidentExchange]);

  const handleOpenFriends = useCallback(() => {
    setShowFriendsPanel(true);
    void refreshFriends();
    void refreshResidentExchange();
  }, [refreshFriends, refreshResidentExchange]);

  const handleSendFriendRequest = useCallback(async (code: string): Promise<string> => {
    const { result } = await sendFriendRequest(code);
    await refreshFriends();
    return result === 'friends' ? "You're already friends — request accepted!" : 'Friend request sent!';
  }, [refreshFriends]);

  const handleRespondToFriendRequest = useCallback(async (requestId: string, accept: boolean) => {
    await respondToFriendRequest(requestId, accept);
    await refreshFriends();
  }, [refreshFriends]);

  const handleRemoveFriend = useCallback(async (friendUserId: string) => {
    await removeFriend(friendUserId);
    await refreshFriends();
  }, [refreshFriends]);

  const handleRandomMatch = useCallback(async (): Promise<string> => {
    const { result } = await sendRandomMatchRequest();
    await refreshFriends();
    return result === 'friends' ? "It's a match — you're already friends!" : 'Request sent to a random player!';
  }, [refreshFriends]);

  const handleToggleOpenToRandom = useCallback(async (value: boolean) => {
    await setOpenToRandomFriends(value);
    await refreshFriends();
  }, [refreshFriends]);

  // From the Daily Tournament leaderboard: add a player by their user_id,
  // no friend code needed since they're already visible on a public board.
  const handleAddFriendFromLeaderboard = useCallback(async (targetUserId: string) => {
    try {
      await sendFriendRequestByUserId(targetUserId);
    } catch (e) {
      console.error('Add friend from leaderboard failed', e);
    }
  }, []);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isEventPlaying, setIsEventPlaying] = useState(false);
  const [eventResult, setEventResult] = useState<string | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  // Shuffleboard tournament score/timers now live in `state` (see GameState)
  // so they persist across reloads and cloud sync instead of resetting.


  // Geolocation tracking
  useEffect(() => {
    if (!state.hasStarted) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState(prev => ({
          ...prev,
          currentLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [state.hasStarted]);

  const handleBuyParcel = useCallback(() => {
    const cost = 100;
    if (state.legacyTokens < cost) { notify("Need 100 Tokens to buy a parcel!"); return; }
    const { lat, lng } = state.currentLocation;
    const gridLat = Math.floor(lat * 10000) / 10000;
    const gridLng = Math.floor(lng * 10000) / 10000;
    const exists = state.ownedParcels.find(p => p.lat === gridLat && p.lng === gridLng);
    if (exists) { notify("This parcel is already owned!"); return; }
    const rarities: ('Common' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Rare', 'Epic', 'Legendary'];
    const weights = [0.7, 0.2, 0.08, 0.02];
    const rand = Math.random();
    let cumulative = 0;
    let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) { rarity = rarities[i]; break; }
    }
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens - cost,
      ownedParcels: [...prev.ownedParcels, {
        id: `parcel_${Date.now()}`, lat: gridLat, lng: gridLng,
        ownerId: 'player', type: rarity, pensionBonus: 0 // legacy field; parcels no longer add passive income
      }]
    }));
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    notify(`You bought a ${rarity} parcel! Pension rate increased.`);
  }, [state.currentLocation, state.legacyTokens, state.ownedParcels, state.settings.sfxEnabled]);

  // Passive income tick
  useEffect(() => {
    if (!state.hasStarted) return;
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const elapsedMs = now - prev.lastActiveTime;
        const accrued = calculatePassiveIncome(prev, elapsedMs);
        // Pending Yield split (economic plan addendum, 9-7-26): the passive
        // tick credits pendingYield, an uncapped "earning power" number that
        // isn't a cash liability, instead of pensionBalance directly. It only
        // becomes real, reserve-capped PP when the player chooses to Cash Out
        // (or spend it on Park Assets) from the Bank panel. This replaces
        // the earlier reserve-cap-on-accrual stopgap.
        // Water Aerobics Pool / Complaint Desk (2026-09-22): small, level-scaling quality-of-life
        // effects on the same tick as passive income. Neither is PP or a passive-income rate --
        // HP regen only helps Team Elders survive longer between heals, and the score trickle is a
        // slow, capped-by-nature nicety (Community Score has no cash value), so neither breaks the
        // "buildings never pay PP or raise passive income" rule.
        const hpRegenFrac = totalHpRegenPerTick(prev.builtAmenityIds, prev.amenityLevels);
        const scoreTrickle = totalScoreTricklePerTick(prev.builtAmenityIds, prev.amenityLevels);
        return {
          ...prev,
          pendingYield: prev.pendingYield + accrued,
          lastActiveTime: now,
          allElders: hpRegenFrac > 0
            ? prev.allElders.map(e => (e.status === 'Team' && e.hp < e.maxHp)
                ? { ...e, hp: Math.min(e.maxHp, e.hp + e.maxHp * hpRegenFrac) }
                : e)
            : prev.allElders,
          parkCommunityScore: prev.parkCommunityScore + scoreTrickle,
        };
      });
    }, PASSIVE_TICK_MS);
    return () => clearInterval(interval);
  }, [state.hasStarted]);

  // Offline catchup
  useEffect(() => {
    if (!state.hasStarted) return;
    setState(prev => {
      const now = Date.now();
      const elapsedMs = now - prev.lastActiveTime;
      if (elapsedMs < 60 * 1000) return prev;
      const accrued = calculatePassiveIncome(prev, elapsedMs);
      const offlineHours = Math.min(elapsedMs / (60 * 60 * 1000), 8).toFixed(1);
      console.log(`[Passive] Away ${offlineHours}hrs — accrued ${accrued.toFixed(5)} Pending Yield`);
      return {
        ...prev,
        pendingYield: prev.pendingYield + accrued,
        lastActiveTime: now,
      };
    });
  }, [state.hasStarted]);

  // Ad reset check
  useEffect(() => {
    const checkReset = setInterval(() => {
      setState(prev => {
        // Daily cap: resets when the local calendar day changes.
        if (new Date(prev.adUsage.lastReset).toDateString() !== new Date().toDateString()) {
          return { ...prev, adUsage: { count: 0, lastReset: Date.now() } };
        }
        return prev;
      });
    }, 10000);
    return () => clearInterval(checkReset);
  }, []);

  // Spawn Wild Elders
  useEffect(() => {
    if (!state.hasStarted || wildElders.length > 0) return;
    const { lat, lng } = state.currentLocation;
    const types = Object.values(ElderType);
    try {
      const newWilds = Array.from({ length: 25 }, (_, i) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const isVeryClose = i < 10;
        const searchRadius = isVeryClose ? 0.005 : 0.02;
        const nearbyPaths = (WORLD_PATHS || []).filter(p => {
          if (!p.points || p.points.length < 2) return false;
          const p1 = p.points[0];
          const midLat = (p1.lat + p.points[1].lat) / 2;
          const midLng = (p1.lng + p.points[1].lng) / 2;
          return Math.abs(midLat - lat) < searchRadius && Math.abs(midLng - lng) < searchRadius;
        });
        const selectedPath = nearbyPaths.length > 0 ? nearbyPaths[Math.floor(Math.random() * nearbyPaths.length)] : null;
        let spawnLat = lat + (Math.random() - 0.5) * searchRadius * 2;
        let spawnLng = lng + (Math.random() - 0.5) * searchRadius * 2;
        let pathId = undefined;
        let pathProgress = Math.random();
        if (selectedPath) {
          pathId = selectedPath.id;
          const p1 = selectedPath.points[0];
          const p2 = selectedPath.points[1];
          spawnLat = p1.lat + (p2.lat - p1.lat) * pathProgress;
          spawnLng = p1.lng + (p2.lng - p1.lng) * pathProgress;
        }
        const rr = Math.random();
        const wildRarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = rr > 0.97 ? 'Legendary' : rr > 0.85 ? 'Epic' : rr > 0.55 ? 'Rare' : 'Common';
        return {
          id: 'wild_' + Math.random().toString(36).substr(2, 9),
          name: getRandomElderName(type),
          type,
          powerType: [PowerType.PHYSICAL, PowerType.SOCIAL, PowerType.TECH][Math.floor(Math.random() * 3)],
          level: Math.floor(Math.random() * 5) + 1,
          rarity: wildRarity,
          bio: '', comfortGeneration: getBaseComfortGeneration(wildRarity), captured: false,
          xp: 0, evolutionStage: 0,
          lat: spawnLat, lng: spawnLng,
          happiness: 100, hp: 80, maxHp: 80, strength: 10, wit: 10, agility: 8, tenacity: 8,
          equipment: {}, status: 'Base', isRoaming: true, pathId, pathProgress,
          pathDirection: Math.random() > 0.5 ? 1 : -1
        } as Elder;
      });
      setWildElders(newWilds);
    } catch (err) { console.error("Failed to spawn wild elders", err); }
  }, [state.hasStarted, wildElders.length, state.currentLocation.lat, state.currentLocation.lng]);

  // Spawn Items and Structures
  useEffect(() => {
    if (!state.hasStarted) return;
    const { lat, lng } = state.currentLocation;
    if (state.nearbyItems.length > 0) {
      const firstItem = state.nearbyItems[0];
      const dist = Math.sqrt(Math.pow(firstItem.lat - lat, 2) + Math.pow(firstItem.lng - lng, 2));
      if (dist > 0.05) {
        setState(prev => ({ ...prev, nearbyItems: [], nearbyStructures: [], itemsLastSpawnedAt: 0 }));
        setWildElders([]);
        return;
      }
    }
    if (state.nearbyItems.length === 0 && state.itemsLastSpawnedAt === 0) {
      // First load, or just arrived in a fresh area — seed a small starter batch so the map
      // isn't empty. The rest trickles in gradually via the interval effect below, capped at
      // MAX_NEARBY_ITEMS, instead of dumping a big batch all at once.
      const seedItems = Array.from({ length: INITIAL_ITEM_SEED }, () => {
        const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
        const radius = 0.01;
        return { id: 'item_' + Math.random().toString(36).substr(2, 9), ...poolItem, lat: lat + (Math.random() - 0.5) * radius, lng: lng + (Math.random() - 0.5) * radius } as MapItem;
      });
      setState(prev => ({ ...prev, nearbyItems: seedItems, itemsLastSpawnedAt: Date.now(), itemsLastSpawnLat: lat, itemsLastSpawnLng: lng }));
    }
    // Buildings are a shared world: same real-world spots for every player (see services/worldMap.ts).
    const cellKey = worldCellKey(lat, lng);
    if (state.nearbyStructures.length === 0 || structureCellRef.current !== cellKey) {
      structureCellRef.current = cellKey;
      const worldStructures = getWorldStructures(lat, lng);
      setState(prev => ({ ...prev, nearbyStructures: worldStructures }));
    }
  }, [state.hasStarted, state.nearbyItems.length, state.itemsLastSpawnedAt, state.nearbyStructures.length, state.currentLocation.lat, state.currentLocation.lng]);

  // Trickle new items in one at a time, up to MAX_NEARBY_ITEMS, on a real timer — never a
  // sudden reappearance of a full batch. Runs independently of GPS jitter/collection events.
  useEffect(() => {
    if (!state.hasStarted) return;
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.nearbyItems.length >= MAX_NEARBY_ITEMS) return prev;
        if (prev.itemsLastSpawnedAt === 0) return prev; // area not seeded yet — handled by the effect above
        const sinceLastSpawn = Date.now() - prev.itemsLastSpawnedAt;
        if (sinceLastSpawn < ITEM_SPAWN_INTERVAL_MS) return prev;
        const { lat, lng } = prev.currentLocation;
        const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
        const radius = 0.015;
        const newItem = { id: 'item_' + Math.random().toString(36).substr(2, 9), ...poolItem, lat: lat + (Math.random() - 0.5) * radius, lng: lng + (Math.random() - 0.5) * radius } as MapItem;
        return { ...prev, nearbyItems: [...prev.nearbyItems, newItem], itemsLastSpawnedAt: Date.now(), itemsLastSpawnLat: lat, itemsLastSpawnLng: lng };
      });
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, [state.hasStarted]);

  // If the daily tournament window has expired, reset score and start a
  // fresh 24h window. Applied whenever state is loaded (local or cloud).
  const applyTournamentRollover = (s: GameState): GameState => {
    if (s.tournamentEndsAt <= Date.now()) {
      return { ...s, tournamentScore: 0, tournamentThrows: 0, tournamentEndsAt: Date.now() + 24 * 60 * 60 * 1000 };
    }
    return s;
  };

  const SEASON_NAMES = ["Autumn Gathering", "Winter Warmth", "Spring Bloom", "Summer Social"];
  const applySeasonRollover = (s: GameState): GameState => {
    // Guard against saves from before claimedLevels existed on Season.
    const season = s.season.claimedLevels ? s.season : { ...s.season, claimedLevels: [] };
    if (season.endDate <= Date.now()) {
      const nextId = season.id + 1;
      return {
        ...s,
        season: {
          id: nextId,
          name: SEASON_NAMES[(nextId - 1) % SEASON_NAMES.length],
          xp: 0,
          isPremium: false,
          startDate: Date.now(),
          endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          claimedLevels: [],
        },
      };
    }
    return { ...s, season };
  };

  // Safe-default Elder fields added after existing saves were created (xp,
  // evolutionStage) -- same pattern as the ...INITIAL_STATE spread for GameState
  // itself, just applied one level deeper since Elders live in an array.
  // Also re-rolls any Elder already on the roster whose name doesn't match
  // its type's implicit gender (e.g. a Grumpy Gardener named "Barnaby") --
  // one-time correction, per user request 9-9-26. Idempotent: once a name is
  // gender-matched it will never be touched again on future loads.
  // JSON.stringify turns NaN/Infinity into null, so one bad calculation that ever gets saved
  // comes back as `null` on the next load -- and the first `.toFixed()` on it (the PP balance
  // in the header runs on every screen) crashes the whole app to a white screen. Any top-level
  // number that isn't a finite number falls back to its starting default on load.
  const sanitizeNumericFields = (s: GameState): GameState => {
    const next: Record<string, unknown> = { ...s };
    for (const key of Object.keys(INITIAL_STATE)) {
      const fallback = (INITIAL_STATE as unknown as Record<string, unknown>)[key];
      if (typeof fallback === 'number' && !(typeof next[key] === 'number' && Number.isFinite(next[key]))) {
        console.warn(`[Load] "${key}" in the save was not a valid number (${String(next[key])}); reset to ${fallback}`);
        next[key] = fallback;
      }
    }
    // Untrusted save: keep only well-formed Court honor keys (court:<1-10>:<1-3>).
    next.courtHonors = Array.isArray(next.courtHonors) ? (next.courtHonors as unknown[]).filter((k): k is string => typeof k === 'string' && (parseCourtHonor(k) !== null || parseBoardHonor(k) !== null)).slice(0, 80) : [];
    // Untrusted save: lifetime counts must be finite non-negative numbers for known quest kinds only.
    const rawStats = (next.modeStats && typeof next.modeStats === 'object') ? next.modeStats as Record<string, unknown> : {};
    next.modeStats = Object.fromEntries(Object.entries(rawStats).filter(([k, v]) => modeKindKnown(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0).map(([k, v]) => [k, Math.min(1e9, Math.floor(v as number))]));
    next.tvDinners = typeof next.tvDinners === 'number' && Number.isFinite(next.tvDinners) && next.tvDinners > 0 ? Math.min(1e7, Math.floor(next.tvDinners)) : 0;
    next.dinersToday = typeof next.dinersToday === 'number' && Number.isFinite(next.dinersToday) && next.dinersToday > 0 ? Math.min(1000, Math.floor(next.dinersToday)) : 0;
    next.dinersDay = typeof next.dinersDay === 'string' ? next.dinersDay.slice(0, 40) : '';
    next.antiquesOwned = Array.isArray(next.antiquesOwned) ? Array.from(new Set((next.antiquesOwned as unknown[]).filter((k): k is string => typeof k === 'string' && !!antiqueById(k)))) : [];
    { const pp = (next.pvpPasses ?? {}) as { arena?: unknown; raid?: unknown }; const clean = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(PASS_HOLD_MAX, Math.floor(v)) : 0; next.pvpPasses = { arena: clean(pp.arena), raid: clean(pp.raid) }; }
    // One-time-safe: unequipped drops that used odd base boosts follow the uniform base (equipped gear is baked into Elder stats, so it is left alone).
    if (Array.isArray(next.inventory)) next.inventory = (next.inventory as any[]).map(it => it && UNIFORM_GEAR_NAMES.includes(it.name) && typeof it.boost === 'number' ? { ...it, boost: UNIFORM_GEAR_BASE, description: String(it.description ?? '').replace(/ by \d+\./, '.') } : it);
    { // Placed decoration: only what the player owns, only valid grass spots, at most 40 pieces.
      const left: Record<string, number> = {}; const kept: { id: string; x: number; y: number }[] = [];
      for (const d of (Array.isArray(next.parkDecor) ? next.parkDecor : []) as any[]) {
        if (!d || typeof d.id !== 'string' || !Number.isFinite(d.x) || !Number.isFinite(d.y) || kept.length >= 40) continue;
        if (!(d.id in left)) left[d.id] = ownedAssetCount(next.parkAssets, d.id);
        if (left[d.id] > 0 && isDecorSpotValid(d.x, d.y)) { left[d.id]--; kept.push({ id: d.id, x: d.x, y: d.y }); }
      }
      next.parkDecor = kept;
    }
    { const bs = (next.boardStats ?? {}) as { week?: unknown; arena?: unknown; raid?: unknown; friend?: unknown }; const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(1e9, Math.floor(v)) : 0;
      next.boardStats = { week: typeof bs.week === 'string' ? bs.week : '', arena: n(bs.arena), raid: n(bs.raid), friend: n(bs.friend) }; }
    next.discoveredArenas = (Array.isArray(next.discoveredArenas) ? next.discoveredArenas : []).filter((a: any) => a && typeof a.id === 'string' && /^a_-?\d+_-?\d+$/.test(a.id) && Number.isFinite(a.lat) && Number.isFinite(a.lng)).slice(0, 400).map((a: any) => ({ id: a.id, name: String(a.name ?? 'Arena').slice(0, 40), lat: a.lat, lng: a.lng }));
    next.mementoPurchaseIds = Array.isArray(next.mementoPurchaseIds) ? Array.from(new Set((next.mementoPurchaseIds as unknown[]).filter((k): k is string => typeof k === 'string').map(k => k.slice(0, 40)))).slice(-300) : [];
    next.mementos = typeof next.mementos === 'number' && Number.isFinite(next.mementos) && next.mementos > 0 ? Math.min(1e6, Math.floor(next.mementos)) : 0;
    next.premiumRooms = typeof next.premiumRooms === 'number' && Number.isFinite(next.premiumRooms) && next.premiumRooms > 0 ? Math.min(PREMIUM_ROOM_MAX, Math.floor(next.premiumRooms)) : 0;
    next.mementoItemsOwned = Array.isArray(next.mementoItemsOwned) ? Array.from(new Set((next.mementoItemsOwned as unknown[]).filter((k): k is string => typeof k === 'string' && MEMENTO_ITEMS.some(m => m.id === k)))) : [];
    next.claimedMilestones = Array.isArray(next.claimedMilestones) ? (next.claimedMilestones as unknown[]).filter((k): k is string => typeof k === 'string' && /^[a-z]+:[1-5]$/.test(k) && modeKindKnownMode(k.split(':')[0])).slice(0, 60) : [];
    return next as unknown as GameState;
  };

  const migrateElders = (s: GameState): GameState => sanitizeNumericFields({
    ...s,
    allElders: (s.allElders || []).map(e => {
      const withDefaults = {
        xp: 0,
        evolutionStage: 0 as 0 | 1 | 2,
        ...e,
      };
      if (!Number.isFinite(withDefaults.xp)) withDefaults.xp = 0;
      if (!Number.isFinite(withDefaults.level)) withDefaults.level = 1;
      if (!Number.isFinite(withDefaults.comfortGeneration)) withDefaults.comfortGeneration = 0;
      if (!withDefaults.equipment || typeof withDefaults.equipment !== 'object') withDefaults.equipment = {};
      // One-time migration: before the 4-slot split, an equipped Accessory item baked its boost in as
      // strength +ceil(b/2) / agility +floor(b/2). Accessory is now pure Strength (Charm owns Agility),
      // so move the agility half back to strength -- otherwise unequipping would subtract the full
      // boost from Strength and leave a stray Agility bonus behind.
      // One-time rarity bonus: rarer Elders now get a stat edge at their current level (added on top, so equipped
      // gear and evolution multipliers already baked into their stats are left alone).
      if (!withDefaults.rarityStatsV1) {
        if (withDefaults.rarity && withDefaults.rarity !== 'Common') {
          const rare = standardElderStats(withDefaults.level, withDefaults.rarity);
          const common = standardElderStats(withDefaults.level, 'Common');
          withDefaults.strength += rare.strength - common.strength;
          withDefaults.wit += rare.wit - common.wit;
          withDefaults.agility += rare.agility - common.agility;
          withDefaults.tenacity += rare.tenacity - common.tenacity;
          withDefaults.maxHp += rare.maxHp - common.maxHp;
          withDefaults.hp = Math.min(withDefaults.maxHp, withDefaults.hp + (rare.maxHp - common.maxHp));
        }
        withDefaults.rarityStatsV1 = true;
      }
      // Starters used to be created with flat 15/15/10/10 + 100 HP regardless of rarity -- well under even a Common
      // level-5 Elder (30/30/20/20 + 120 HP). Add the missing base once (growth per level was already correct).
      if (!withDefaults.starterStatsV2) {
        if (String(withDefaults.id).startsWith('starter_')) {
          withDefaults.strength += 15; withDefaults.wit += 15; withDefaults.agility += 10; withDefaults.tenacity += 10;
          withDefaults.maxHp += 20; withDefaults.hp = Math.min(withDefaults.maxHp, withDefaults.hp + 20);
        }
        withDefaults.starterStatsV2 = true;
      }
      if (!withDefaults.gearSlotsV2) {
        const acc = withDefaults.equipment.accessory;
        if (acc && Number.isFinite(acc.boost)) {
          const half = Math.floor(getEffectiveGearBoost(acc) / 2);
          withDefaults.strength += half;
          withDefaults.agility -= half;
        }
        withDefaults.gearSlotsV2 = true;
      }
      if (!isNameGenderMatched(withDefaults.name, withDefaults.type)) {
        return { ...withDefaults, name: getRandomElderName(withDefaults.type) };
      }
      return withDefaults;
    }),
  });

  // Bundle D (2026-09-21): Tasks moved from a fixed hand-written list to pools the game draws from (see
  // constants.tsx). Old saves have quest objects with no `kind` field, which the new progress-matching
  // logic needs -- replace any quest missing it with a fresh draw of its type (this forfeits in-progress,
  // unclaimed progress on that one save, once, but nothing already claimed). Achievements grew from 4 fixed
  // entries to 10; merge by id so completed status survives and new ones are added rather than replacing
  // the array outright.
  const migrateQuestsAndAchievements = (s: GameState): GameState => {
    const quests = Array.isArray(s.quests) && s.quests.every(q => typeof (q as any).kind === 'string')
      ? s.quests
      : [...generateQuests(DAILY_QUEST_POOL, 'Daily', s.questsGeneratedDay || utcDayKey(), 5), ...generateQuests(WEEKLY_QUEST_POOL, 'Weekly', s.questsGeneratedWeek || utcWeekKey(), 3)];
    const savedById = new Map((s.achievements || []).map(a => [a.id, a]));
    // Unfinished feats always use the current reward definition (rewards were rebalanced); finished ones are left alone.
    const achievements = [...INITIAL_ACHIEVEMENTS, ...NEW_ACHIEVEMENTS].map(def => { const saved = savedById.get(def.id); return saved ? (saved.completed ? saved : { ...saved, rewardType: def.rewardType, rewardValue: def.rewardValue, description: def.description }) : def; });
    return { ...s, quests, achievements };
  };

  // Load save
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const hydrated = migrateQuestsAndAchievements(migrateElders(applySeasonRollover(applyTournamentRollover({ ...INITIAL_STATE, ...migrateEconomy(parsed), settings: { ...INITIAL_STATE.settings, ...parsed.settings }, version: GAME_VERSION }))));
          prevLevelRef.current = hydrated.level; // restoring a save is not "leveling up"
          setState(hydrated);
        }
      }
    } catch (e) { console.error("Load failed", e); }
    finally { setIsLoaded(true); }
  }, []);

  // Level-up rewards: fires whenever state.level increases from ANY XP source,
  // rather than threading a payout through every individual handler. Guarded by
  // isLoaded so restoring a save at level 8 doesn't look like "leveling up". The
  // load/sync effects also directly set prevLevelRef.current the moment they hydrate
  // state, since local-storage load and cloud sync can each complete at different
  // times — without that, a later cloud restore bumping the level past whatever the
  // ref was left at (e.g. 1, from a fresh tab with no local save) would fire this as
  // if the player had just leveled up 20 times.
  // Tickets only — PP stays limited to ad-watch share + Dividend claims, so leveling
  // up (an XP-driven, unbounded-frequency event) never creates PP out of thin air.
  const prevLevelRef = useRef<number>(state.level);
  useEffect(() => {
    if (!isLoaded) return; // load/cloud-sync effects already set prevLevelRef.current themselves the moment they hydrate state -- touching it here too would clobber that with this effect's own stale pre-hydration closure value
    if (state.level > prevLevelRef.current) {
      const levelsGained = state.level - prevLevelRef.current;
      const ticketReward = LEVEL_UP_TICKET_REWARD * levelsGained;
      setState(prev => ({
        ...prev,
        legacyTokens: prev.legacyTokens + ticketReward,
      }));
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const rank = getRankForLevel(state.level);
      notify(`🎉 Level ${state.level}! ${rank.icon} ${rank.title}\n+${ticketReward} 🎟️`);
    }
    prevLevelRef.current = state.level;
  }, [state.level, isLoaded]);

  // Cloud save sync: pull the cloud save on sign-in (initial session or later),
  // and keep whichever copy (local vs cloud) has the higher revision number.
  const cloudRevisionRef = useRef<number>(Number(localStorage.getItem(`${SAVE_KEY}_rev`)) || 0);
  const [cloudCheckDone, setCloudCheckDone] = useState(!isCloudAccountsConfigured());
  // True once the cloud-save fetch has actually finished (success OR failure) -- distinct from
  // cloudCheckDone, which the 8s safety timeout can flip early. Mail must wait for this, because
  // hydrating a cloud save replaces the whole state (Mailbox included).
  const [cloudSyncSettled, setCloudSyncSettled] = useState(!isCloudAccountsConfigured());
  const syncFromCloud = useCallback(async () => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const cloudSave = await fetchCloudSave();
      if (cloudSave && cloudSave.client_revision > cloudRevisionRef.current) {
        cloudRevisionRef.current = cloudSave.client_revision;
        localStorage.setItem(`${SAVE_KEY}_rev`, String(cloudSave.client_revision));
        const cloudData = cloudSave.save_data as any;
        const hydrated = migrateQuestsAndAchievements(migrateElders(applySeasonRollover(applyTournamentRollover({ ...INITIAL_STATE, ...migrateEconomy(cloudData), settings: { ...INITIAL_STATE.settings, ...cloudData?.settings }, version: GAME_VERSION }))));
        prevLevelRef.current = hydrated.level; // restoring a save is not "leveling up"
        setState(hydrated);
      }
    } catch (e) { console.error('Cloud save fetch failed', e); }
    finally { setCloudCheckDone(true); setCloudSyncSettled(true); }
  }, []);

  // Friend Battle notifications: pull the server-side inbox and merge it into the
  // in-save Mailbox (deduped by row id). Silent when signed out / offline.
  const refreshMail = useCallback(async (report = false) => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const rows = await fetchInbox();
      setState(prev => {
        try {
          const nextMailbox = mergeInboxIntoMailbox(prev.mailbox, rows);
          return nextMailbox === prev.mailbox ? prev : { ...prev, mailbox: nextMailbox };
        } catch (mergeError) {
          console.error('Mail merge failed', mergeError);
          return prev;
        }
      });
    } catch (e) {
      // Background pulls stay quiet; a pull the player asked for (opening the
      // Mailbox) says so when something is genuinely wrong.
      console.error('Mail fetch failed', e);
      const msg = e instanceof Error ? e.message : '';
      if (report && !/sign-in required/i.test(msg)) showNotice(`📭 Couldn't check your Mailbox: ${msg || 'unknown error'}`);
    }
  }, [showNotice]);

  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled || !state.hasStarted) return;
    void refreshMail();
    const id = setInterval(() => void refreshMail(), 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshMail(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [isLoaded, cloudSyncSettled, state.hasStarted, refreshMail]);

  // Tell the player when NEW Mailbox messages arrive (friend battles etc.) with
  // a toast instead of making them open the tab to find out. The first snapshot
  // after load is the baseline; anything unseen after that is "new".
  const seenMailIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled) return;
    const box = Array.isArray(state.mailbox) ? state.mailbox : [];
    const ids = new Set(box.map(m => (m && typeof m.id === 'string') ? m.id : ''));
    const seen = seenMailIdsRef.current;
    seenMailIdsRef.current = ids;
    if (seen === null) return;
    const fresh = box.filter(m => m && typeof m.id === 'string' && m.id.startsWith(MAIL_ID_PREFIX) && !m.claimed && !seen.has(m.id));
    if (fresh.length === 1) notify(`📬 New mail: ${String(fresh[0].subject || 'Message from a friend')}`, 'good');
    else if (fresh.length > 1) notify(`📬 ${fresh.length} new Mailbox messages`, 'good');
  }, [state.mailbox, isLoaded, cloudSyncSettled, notify]);

  // ---- Arenas (shared-world gyms; see ARENA_DESIGN.md and api/arena.ts) ----------------------------------
  const arenaCellKey = worldCellKey(state.currentLocation.lat, state.currentLocation.lng);
  const arenaSites = useMemo(() => getWorldArenas(state.currentLocation.lat, state.currentLocation.lng), [arenaCellKey]);
  // Every Arena you have been near is remembered and stays on the map (held ones especially); only nearby ones can be fought.
  useEffect(() => {
    if (!isLoaded || arenaSites.length === 0) return;
    setState(prev => {
      const known = new Set((prev.discoveredArenas ?? []).map(a => a.id));
      const fresh = arenaSites.filter(a => !known.has(a.id));
      if (fresh.length === 0) return prev;
      return { ...prev, discoveredArenas: [...(prev.discoveredArenas ?? []), ...fresh.map(a => ({ id: a.id, name: a.name, lat: a.lat, lng: a.lng }))].slice(-400) };
    });
  }, [isLoaded, arenaSites]);
  const mapArenas = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; lat: number; lng: number }>();
    for (const a of state.discoveredArenas ?? []) byId.set(a.id, a);
    for (const a of arenaSites) byId.set(a.id, a);
    return Array.from(byId.values());
  }, [state.discoveredArenas, arenaSites]);
  const isArenaNearby = useCallback((id: string | null) => !!id && arenaSites.some(a => a.id === id), [arenaSites]);
  const refreshArenas = useCallback(async () => {
    if (!authSession || arenaSites.length === 0) return;
    try {
      // Nearby Arenas, the ones you hold, and the closest other discovered ones (so their faction colours and Raid badges stay current).
      const nearbyIds = arenaSites.map(a => a.id);
      const heldIds = Object.values(state.stationedAt ?? {});
      const cLat = state.currentLocation.lat, cLng = state.currentLocation.lng;
      const others = (state.discoveredArenas ?? []).filter(a => !nearbyIds.includes(a.id) && !heldIds.includes(a.id))
        .sort((a, b) => ((a.lat - cLat) ** 2 + (a.lng - cLng) ** 2) - ((b.lat - cLat) ** 2 + (b.lng - cLng) ** 2)).slice(0, 12).map(a => a.id);
      const { arenas, me } = await fetchArenas(Array.from(new Set([...nearbyIds, ...heldIds, ...others])));
      setArenaInfo(arenas);
      setArenaMe(me);
      // The server is the truth for which Elders are stationed (knocked-out Elders come home by themselves).
      const server: Record<string, string> = {};
      for (const d of me.defenders) if (d.elderId) server[d.elderId] = d.arenaId;
      setState(prev => {
        const cur = prev.stationedAt && typeof prev.stationedAt === 'object' ? prev.stationedAt : {};
        const same = Object.keys(server).length === Object.keys(cur).length && Object.keys(server).every(k => cur[k] === server[k]);
        return same ? prev : { ...prev, stationedAt: server };
      });
    } catch (e) {
      console.error('Arena refresh failed', e);
    }
  }, [authSession, arenaSites, state.discoveredArenas, state.stationedAt]);

  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled || !state.hasStarted || !authSession) return;
    void refreshArenas();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && (activeTab === 'map' || activeArenaId)) void refreshArenas();
    }, 75 * 1000);
    return () => clearInterval(id);
  }, [isLoaded, cloudSyncSettled, state.hasStarted, authSession, refreshArenas, activeTab, activeArenaId]);

  const runArenaAction = useCallback(async (label: string, fn: () => Promise<void>) => {
    if (arenaBusy) return;
    setArenaBusy(true);
    try { await fn(); }
    catch (e) { notify(e instanceof Error ? e.message : `${label} failed`, 'bad'); }
    finally { setArenaBusy(false); void refreshArenas(); }
  }, [arenaBusy, notify, refreshArenas]);

  const handleArenaPickFaction = useCallback((f: FactionId) => runArenaAction('Joining a faction', async () => {
    await chooseFaction(f);
    notify(`${factionById(f)?.icon ?? ''} You joined the ${factionById(f)?.name ?? 'faction'}!`, 'good');
    setState(prev => ({ ...prev, faction: f }));
  }), [runArenaAction, notify]);

  const handleArenaStation = useCallback((elder: Elder) => runArenaAction('Stationing', async () => {
    if (!activeArenaId) return;
    if (!isArenaNearby(activeArenaId)) { notify('Get closer to this Arena first. You can recall and collect Dues from anywhere.', 'bad'); return; }
    const res = await stationElder(activeArenaId, {
      id: elder.id, name: elder.name, type: elder.type, rarity: elder.rarity, level: elder.level, evolutionStage: elder.evolutionStage ?? 0,
    }, getElderPower(elder));
    setState(prev => ({
      ...prev,
      stationedAt: { ...(prev.stationedAt || {}), [elder.id]: activeArenaId },
      // A stationed Elder leaves the squad (it is locked until recalled or knocked out).
      allElders: prev.allElders.map(e => e.id === elder.id && e.status === 'Team' ? { ...e, status: 'Base' } : e),
    }));
    notify(res.claimed ? `🚩 ${elder.name} claimed the Arena!` : `🛡️ ${elder.name} is now defending the Arena.`, 'good');
  }), [runArenaAction, activeArenaId, notify, isArenaNearby]);

  const handleArenaRecall = useCallback((arenaId?: string) => runArenaAction('Recalling', async () => {
    const target = arenaId ?? activeArenaId;
    if (!target) return;
    const res = await recallElder(target);
    setState(prev => {
      const st = { ...(prev.stationedAt || {}) };
      delete st[res.elderId];
      return { ...prev, stationedAt: st };
    });
    notify('Your Elder is back home.', 'good');
  }), [runArenaAction, activeArenaId, notify]);

  // TV Dinners: earned only from competitive/social play, with one shared daily cap so nothing can be farmed.
  const dinersGrant = (prev: GameState, amount: number): { tvDinners: number; dinersDay: string; dinersToday: number; gained: number } => {
    const today = new Date().toDateString();
    const used = prev.dinersDay === today ? (prev.dinersToday ?? 0) : 0;
    const gained = Math.max(0, Math.min(amount, DINERS_DAILY_CAP - used));
    return { tvDinners: (prev.tvDinners ?? 0) + gained, dinersDay: today, dinersToday: used + gained, gained };
  };
  const earnDiners = useCallback((amount: number, label: string) => {
    setState(prev => { const { gained: _g, ...rest } = dinersGrant(prev, amount); return { ...prev, ...rest }; });
    // setState updaters can run later; announce from the same cap math on the current render's state.
    const today = new Date().toDateString();
    const used = state.dinersDay === today ? (state.dinersToday ?? 0) : 0;
    const will = Math.max(0, Math.min(amount, DINERS_DAILY_CAP - used));
    if (will > 0) notify(`🍽️ +${will} TV Dinners (${label})`, 'good');
  }, [state.dinersDay, state.dinersToday, notify]);
  const handleBuyAntique = useCallback((id: string) => {
    const a = antiqueById(id);
    if (!a) return;
    if (!antiquesForDay(antiqueDayIndex()).some(x => x.id === id)) { notify('That antique is not on sale today.', 'bad'); return; }
    if ((state.antiquesOwned ?? []).includes(id)) { notify('You already own that antique.', 'bad'); return; }
    if ((state.tvDinners ?? 0) < a.price) { notify(`You need ${a.price} 🍽️ TV Dinners.`, 'bad'); return; }
    setState(prev => (prev.antiquesOwned ?? []).includes(id) || (prev.tvDinners ?? 0) < a.price ? prev : { ...prev, tvDinners: (prev.tvDinners ?? 0) - a.price, antiquesOwned: [...(prev.antiquesOwned ?? []), id] });
    notify(`${a.icon} ${a.name} is yours! New icon and title unlocked in your profile.`, 'good');
  }, [state.antiquesOwned, state.tvDinners, notify]);
  // The server's Mementos are the real ones: whatever it says replaces the local copy (balance, extra rooms, keepsakes).
  const mementosSynced = useRef(false);
  const applyServerMementos = useCallback((m: MementosState, announce = false) => {
    setState(prev => {
      const lost = (prev.mementoItemsOwned ?? []).filter(id => !m.items.includes(id)).length;
      if (announce && mementosSynced.current && lost > 0) queueMicrotask(() => notify(`A refunded purchase was taken back: ${lost} keepsake${lost > 1 ? 's were' : ' was'} removed.`, 'bad'));
      if (prev.mementos === m.balance && prev.premiumRooms === m.premiumRooms && (prev.mementoItemsOwned ?? []).length === m.items.length && m.items.every(id => (prev.mementoItemsOwned ?? []).includes(id))) return prev;
      return { ...prev, mementos: m.balance, premiumRooms: m.premiumRooms, mementoItemsOwned: m.items };
    });
    mementosSynced.current = true;
  }, [notify]);
  const refreshMementos = useCallback(async () => { try { applyServerMementos(await fetchMementos(), true); } catch { /* offline or signed out: keep the last known copy */ } }, [applyServerMementos]);
  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled || !authSession) return;
    void refreshMementos();
    const id = setInterval(() => void refreshMementos(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isLoaded, cloudSyncSettled, authSession, refreshMementos]);
  const [packPrices, setPackPrices] = useState<Record<string, string>>({});
  const [buyingPack, setBuyingPack] = useState(false);
  useEffect(() => { if (billingAvailable()) void loadPackPrices(MEMENTO_PACKS.map(p => p.id)).then(setPackPrices); }, []);
  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled || !billingAvailable()) return;
    void retryPendingPurchases().then(list => { if (list.length) { void refreshMementos(); notify(`💛 Your earlier purchase was confirmed: +${list.reduce((t, v) => t + v.mementos, 0)} Mementos.`, 'good'); } });
  }, [isLoaded, cloudSyncSettled, refreshMementos, notify]);
  const handleBuyPack = useCallback(async (productId: string) => {
    if (buyingPack) return;
    setBuyingPack(true);
    try {
      const v = await buyPack(productId, authSession?.user?.id);
      await refreshMementos();
      notify(`💛 Thank you! +${v.mementos} Mementos added.`, 'good');
    } catch (e) { notify((e as Error).message || 'The purchase did not go through.', 'bad'); }
    finally { setBuyingPack(false); }
  }, [buyingPack, authSession, refreshMementos, notify]);
  const handleConvertPp = useCallback(async (amountPp: number) => {
    const amount = Math.round(amountPp * 100) / 100;
    if (!(amount >= PP_TO_MEMENTOS_MIN) || amount > state.pensionBalance + 1e-9) { notify('Not enough PP for that.', 'bad'); return; }
    try {
      const m = await convertPpToMementos(amount, 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      setState(prev => ({ ...prev, pensionBalance: Math.max(0, prev.pensionBalance - amount) }));
      applyServerMementos(m);
      notify(`💛 Converted ${amount.toFixed(2)} PP into ${Math.floor(amount * MEMENTOS_PER_PP)} Mementos.`, 'good');
    } catch (e) { if (e instanceof MementosError && e.state) applyServerMementos(e.state); notify((e as Error).message, 'bad'); }
  }, [state.pensionBalance, applyServerMementos, notify]);
  const handleBuyPremiumRoom = useCallback(async () => {
    try { const m = await buyRoom(); applyServerMementos(m); notify('🏠 +1 roster room added.', 'good'); }
    catch (e) { if (e instanceof MementosError && e.state) applyServerMementos(e.state); notify((e as Error).message, 'bad'); }
  }, [applyServerMementos, notify]);
  const handleBuyMementoItem = useCallback(async (id: string) => {
    const m = MEMENTO_ITEMS.find(x => x.id === id);
    try { const st = await buyKeepsake(id); applyServerMementos(st); if (m) notify(`${m.icon} ${m.name} is yours! New icon and title unlocked.`, 'good'); }
    catch (e) { if (e instanceof MementosError && e.state) applyServerMementos(e.state); notify((e as Error).message, 'bad'); }
  }, [applyServerMementos, notify]);
  const handleBuyPass = useCallback((kind: 'arena' | 'raid') => {
    const price = PASS_PRICE[kind];
    const held = state.pvpPasses?.[kind] ?? 0;
    if (held >= PASS_HOLD_MAX) { notify(`You can hold at most ${PASS_HOLD_MAX} passes.`, 'bad'); return; }
    if ((state.tvDinners ?? 0) < price) { notify(`You need ${price} 🍽️ TV Dinners.`, 'bad'); return; }
    setState(prev => ((prev.pvpPasses?.[kind] ?? 0) >= PASS_HOLD_MAX || (prev.tvDinners ?? 0) < price) ? prev : { ...prev, tvDinners: (prev.tvDinners ?? 0) - price, pvpPasses: { arena: (prev.pvpPasses?.arena ?? 0) + (kind === 'arena' ? 1 : 0), raid: (prev.pvpPasses?.raid ?? 0) + (kind === 'raid' ? 1 : 0) } });
    notify(kind === 'arena' ? '🎫 Attack Pass added.' : '🎫 Rally Pass added.', 'good');
  }, [state.pvpPasses, state.tvDinners, notify]);
  const handlePlaceDecor = useCallback((id: string, x: number, y: number) => {
    setState(prev => {
      const placed = (prev.parkDecor ?? []).filter(d => d.id === id).length;
      if (placed >= ownedAssetCount(prev.parkAssets, id) || (prev.parkDecor ?? []).length >= 40 || !isDecorSpotValid(x, y)) return prev;
      return { ...prev, parkDecor: [...(prev.parkDecor ?? []), { id, x, y }] };
    });
  }, []);
  const handleRemoveDecor = useCallback((index: number) => {
    setState(prev => ({ ...prev, parkDecor: (prev.parkDecor ?? []).filter((_, i) => i !== index) }));
  }, []);
  const handleBuyPvpGear = useCallback((id: string) => {
    const g = PVP_GEAR.find(x => x.id === id);
    if (!g) return;
    if ((state.tvDinners ?? 0) < g.price) { notify(`You need ${g.price} 🍽️ TV Dinners.`, 'bad'); return; }
    setState(prev => (prev.tvDinners ?? 0) < g.price ? prev : {
      ...prev, tvDinners: (prev.tvDinners ?? 0) - g.price,
      inventory: [...prev.inventory, { id: 'pvp_' + Math.random().toString(36).slice(2, 11), name: g.name, icon: g.icon, boost: g.boost, description: g.description, slot: g.slot, rarity: g.rarity, level: 1 }],
    });
    notify(`${g.name} added to your Park Hub inventory.`, 'good');
  }, [state.tvDinners, notify]);

  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled) return;
    // Only Golden Games is reported by the game; Arena, Raid and Friend Battle boards are counted by the server.
    const week = utcWeekKey();
    const wanted: [BoardMode, number][] = [['golden', (state.goldenGames?.highestLeagueCleared ?? -1) + 1]];
    const t = setTimeout(() => {
      for (const [mode, score] of wanted) {
        const key = mode + ':' + (mode === 'golden' ? 'all' : week);
        if (score > 0 && score > (lastBoardSent.current[key] ?? 0)) { lastBoardSent.current[key] = score; submitBoardScore(mode, score).catch(() => { lastBoardSent.current[key] = 0; }); }
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [isLoaded, cloudSyncSettled, state.goldenGames?.highestLeagueCleared]);

  const handleArenaAttack = useCallback(() => runArenaAction('Attacking', async () => {
    if (!isArenaNearby(activeArenaId)) { notify('Get closer to this Arena first. You can recall and collect Dues from anywhere.', 'bad'); return; }
    if (!activeArenaId) return;
    const hasArenaPass = (state.pvpPasses?.arena ?? 0) > 0;
    const upfront = hasArenaPass ? 0 : arenaAttackCost(arenaMe?.attacksToday ?? 0);
    if (state.legacyTokens < upfront) { notify(`You need ${upfront} 🎟️ for another attack today.`, 'bad'); return; }
    const { result } = await attackArena(activeArenaId);
    const fullCost = arenaAttackCost(result.attackNumber - 1); // price of THIS attack, from the server's count
    const usedPass = fullCost > 0 && hasArenaPass;
    const cost = usedPass ? 0 : fullCost;
    const lost = result.log.length > 0 && !result.log[result.log.length - 1].won;
    const elderXp = 25 * result.rewardedWins + (lost ? 6 : 0);
    if (state.settings.sfxEnabled) audioManager.playSFX(result.beaten > 0 ? 'victory' : 'hit');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, elderXp * 2);
      return {
        ...prev,
        legacyTokens: Math.max(0, prev.legacyTokens + result.tickets - cost),
        pvpPasses: usedPass ? { arena: Math.max(0, (prev.pvpPasses?.arena ?? 0) - 1), raid: prev.pvpPasses?.raid ?? 0 } : prev.pvpPasses,
        buildingMaterials: prev.buildingMaterials + result.materials,
        xp, level,
        allElders: elderXp > 0 ? grantElderXpToTeam(prev.allElders, elderXp) : prev.allElders,
      };
    });
    const bits = [`${result.beaten}/${result.total} defenders beaten`];
    if (result.tickets > 0 || result.materials > 0) bits.push(`+${result.tickets} 🎟️ +${result.materials} 🧱`);
    if (cost > 0) bits.push(`(-${cost} 🎟️ attack fee)`);
    if (usedPass) bits.push('(Attack Pass used: fee waived)');
    if (result.flipped) bits.push('The Arena is now neutral — station an Elder to claim it!');
    notify(`🏟️ ${result.arenaName}: ${bits.join(' · ')}`, result.beaten > 0 ? 'good' : 'bad');
    if (result.rewardedWins > 0) earnDiners(DINERS_ARENA_WIN, 'Arena win');
    setState(prev => ({ ...prev, modeStats: bumpStat(prev.modeStats, 'arena'), quests: prev.quests.map(q => (!q.completed && q.kind === 'arena') ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q) }));
  }), [runArenaAction, activeArenaId, arenaMe, state.legacyTokens, state.pvpPasses, state.settings.sfxEnabled, notify, isArenaNearby]);

  const handleArenaClaimDues = useCallback(() => runArenaAction('Collecting Dues', async () => {
    const r = await claimArenaDues();
    notify(`💰 Arena Dues sent to your Mailbox: ${r.tickets} 🎟️ ${r.materials} 🧱`, 'good');
    void refreshMail();
  }), [runArenaAction, notify, refreshMail]);

  const handleArenaRaidHit = useCallback(() => runArenaAction('Joining the fight', async () => {
    if (!isArenaNearby(activeArenaId)) { notify('Get closer to this Arena first. You can recall and collect Dues from anywhere.', 'bad'); return; }
    // Extra attempts (beyond RAID_FREE_ATTEMPTS) cost Tickets client-side, same pattern as the Arena
    // attack fee: the server enforces the attempt COUNT, the client owns the Tickets ledger.
    const priorAttempts = (activeArenaId ? arenaInfo[activeArenaId]?.raid?.myAttempts : undefined) ?? 0;
    const hasRaidPass = (state.pvpPasses?.raid ?? 0) > 0;
    const needsFee = priorAttempts >= RAID_FREE_ATTEMPTS;
    const usedPass = needsFee && hasRaidPass;
    const cost = needsFee && !usedPass ? RAID_EXTRA_ATTEMPT_COST : 0;
    if (state.legacyTokens < cost) { notify(`You need ${cost} 🎟️ to join this fight again today.`, 'bad'); return; }
    const { result } = await raidHit(activeArenaId!);
    if (state.settings.sfxEnabled) audioManager.playSFX(result.settled && result.defeated ? 'victory' : 'hit');
    setState(prev => ({ ...prev, legacyTokens: Math.max(0, prev.legacyTokens - cost), pvpPasses: usedPass ? { arena: prev.pvpPasses?.arena ?? 0, raid: Math.max(0, (prev.pvpPasses?.raid ?? 0) - 1) } : prev.pvpPasses }));
    const bits = [`+${result.damage.toLocaleString()} damage`];
    if (usedPass) bits.push('Rally Pass used: fee waived');
    if (result.settled) bits.push(result.defeated ? `${result.bossName} defeated!` : 'The window closed.');
    notify(`🐲 ${bits.join(' · ')}`, 'good');
    earnDiners(DINERS_RAID_HIT, 'Raid hit');
    if (result.settled) void refreshMail();
  }), [runArenaAction, activeArenaId, arenaInfo, state.legacyTokens, state.pvpPasses, state.settings.sfxEnabled, notify, refreshMail, isArenaNearby]);

  const handleArenaMarkerClick = useCallback((id: string) => {
    if (!authSession) { notify('Sign in to your account to join Arenas.', 'bad'); return; }
    setActiveArenaId(id);
  }, [authSession, notify]);

  // Real daily leaderboard — replaces the old simulated NPC list in ShuffleboardPanel.
  // Signed-out players simply see no leaderboard data (fetchLeaderboard throws on missing
  // auth token; caught and ignored here, since there's no stable cross-device identity to
  // rank an anonymous local player against others).
  const refreshLeaderboard = useCallback(async (bracket?: number) => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const data = await fetchLeaderboard(typeof bracket === 'number' ? bracket : undefined);
      setLeaderboard(data);
      setLeaderboardError(false);
    } catch (e) {
      console.error('Leaderboard fetch failed', e);
      setLeaderboardError(true);
    }
  }, []);

  useEffect(() => {
    if (!isCloudAccountsConfigured() || !supabase) return;
    void syncFromCloud();
    void refreshLeaderboard();
    void refreshFriends();
    void getCurrentSession().then(setAuthSession).catch(() => setAuthSession(null));
    // Safety net: never let a slow/hung cloud check trap the player on the
    // "Initializing..." screen forever — fall through to local/fresh state if it
    // takes too long, same as if no cloud save existed.
    const timeout = setTimeout(() => setCloudCheckDone(true), 8000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') { void syncFromCloud(); void refreshLeaderboard(); void refreshFriends(); void refreshResidentExchange(); }
      void getCurrentSession().then(setAuthSession).catch(() => setAuthSession(null));
    });
    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, [syncFromCloud, refreshLeaderboard, refreshFriends, refreshResidentExchange]);

  useEffect(() => {
    setDisplayNameInput(authSession?.user.displayName ?? '');
  }, [authSession?.user.displayName]);

  const handleAccountAction = useCallback(async (action: () => Promise<AuthSession | null>) => {
    setAccountBusy(true);
    setAccountMessage(null);
    try {
      const next = await action();
      setAuthSession(next);
      setAccountPassword('');
      setAccountMessage(next ? `Signed in as ${next.user.email || 'your account'}.` : 'Check your email to finish signing in.');
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : 'Account request failed.');
    } finally {
      setAccountBusy(false);
    }
  }, []);

  const handleSaveDisplayName = useCallback(async () => {
    setAccountBusy(true);
    setAccountMessage(null);
    try {
      const user = await updateDisplayName(displayNameInput);
      setAuthSession(prev => (user && prev ? { ...prev, user } : prev));
      setAccountMessage('Display name saved — this is what other players see on leaderboards.');
      // The display name lives in Supabase Auth, not GameState, so the
      // debounced autosave effect (which only fires on GameState changes)
      // wouldn't otherwise pick this up -- player_profiles (what friends
      // actually see) only syncs during a cloud save, so trigger one
      // immediately rather than leaving it stale until some unrelated
      // gameplay action happens to save next.
      // Same guard as the two autosave effects below (kept consistent even though this site can only
      // run while already signed in): never push, or bump the local revision counter, without a real session.
      if (isCloudAccountsConfigured() && cloudSyncSettled && authSession) {
        const revision = Date.now();
        cloudRevisionRef.current = revision;
        localStorage.setItem(`${SAVE_KEY}_rev`, String(revision));
        uploadCloudSave(1, revision, state as unknown as Record<string, unknown>).catch(e => console.error('Post-display-name-change save failed', e));
      }
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : 'Could not save display name.');
    } finally {
      setAccountBusy(false);
    }
  }, [displayNameInput, state]);

  const handleAccountSignOut = useCallback(async () => {
    setAccountBusy(true);
    try {
      await authSignOut();
      setAuthSession(null);
      setAccountMessage('Signed out. Local progress is untouched.');
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : 'Sign out failed.');
    } finally {
      setAccountBusy(false);
    }
  }, []);

  useEffect(() => {
    if (state.hasStarted) {
      audioManager.setMusicEnabled(state.settings.musicEnabled);
      audioManager.switchTrack(battleOpponent ? 'battle' : 'main');
    }
  }, [state.settings.musicEnabled, state.hasStarted, battleOpponent]);

  // BUG FOUND AND FIXED (2026-09-22): this effect used to push to the cloud whenever
  // `isLoaded && state.hasStarted` were true -- it did NOT wait for `cloudSyncSettled`. The 8-second
  // safety timeout a few effects up sets `cloudCheckDone` (unblocking the loading screen) WITHOUT
  // waiting for the real cloud fetch, specifically so a hung network request can never trap the
  // player. But that means: on a slow/hung connection, the player could see StarterSelection, pick a
  // starter (hasStarted becomes true), and 2 seconds later THIS effect would upload that brand-new,
  // near-empty save using `Date.now()` as the revision. Since a fresh timestamp is always numerically
  // greater than an old one, the server's "reject if clientRevision <= existing" check (see
  // api/account/save.ts) would ACCEPT it and silently overwrite a real, much larger save with a
  // blank one -- indistinguishable from an account reset, and with no confirmation or warning. This
  // is believed to be what happened to a real player's account on 2026-09-22.
  // Fix: never push to the cloud until `cloudSyncSettled` is true, i.e. until the real cloud fetch has
  // actually finished (success or failure) -- not just the 8-second bypass. Local (localStorage) saves
  // are unaffected and still happen immediately, so nothing is lost if the player keeps playing while
  // the cloud fetch is still catching up; once it resolves, syncFromCloud's own revision check (see
  // above) still applies and will correctly prefer real cloud progress over a few seconds of new play.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoaded && state.hasStarted) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
        catch (e) { console.error("Save failed", e); }

        // 2026-09-28 fix: this used to only check cloudSyncSettled, not authSession. cloudSyncSettled
        // becomes true almost immediately on mount even while signed out (see syncFromCloud's finally
        // block), so any local play on a NEW device -- even just the passive-income tick -- bumped
        // cloudRevisionRef to Date.now() before the player ever signed in. When they later signed in,
        // their real (older) cloud save's revision lost the ">" check below against that freshly-bumped
        // local one, and syncFromCloud silently skipped restoring it -- while the sign-in itself still
        // succeeded, so Settings/Mailbox (separate, always-authenticated fetches) looked fine and the
        // player was left thinking only their game progress specifically had failed to load. Requiring
        // authSession here means an unauthenticated device never touches the revision counter at all.
        if (isCloudAccountsConfigured() && cloudSyncSettled && authSession) {
          const revision = Date.now();
          cloudRevisionRef.current = revision;
          localStorage.setItem(`${SAVE_KEY}_rev`, String(revision));
          uploadCloudSave(1, revision, state as unknown as Record<string, unknown>)
            .catch(e => console.error('Cloud save upload failed', e));
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, isLoaded, cloudSyncSettled, authSession]);

  // Flush an immediate save when the tab is hidden/closed, so a quick
  // reload right after an action doesn't lose anything still waiting
  // on the 2s debounce above.
  useEffect(() => {
    const flush = () => {
      if (!isLoaded || !state.hasStarted) return;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      // Same fix as the debounced autosave above: never push, or bump the revision counter, without a real session.
      if (isCloudAccountsConfigured() && cloudSyncSettled && authSession) {
        const revision = Date.now();
        cloudRevisionRef.current = revision;
        localStorage.setItem(`${SAVE_KEY}_rev`, String(revision));
        uploadCloudSave(1, revision, state as unknown as Record<string, unknown>).catch(() => { /* ignore */ });
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [state, isLoaded, cloudSyncSettled, authSession]);

  const triggerTab = (id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setActiveTab(id);
    if (id === 'mailbox') void refreshMail(true);
  };

  // Updated quest progress tracking
  const handleQuestProgress = useCallback((kind: string, amount: number = 1) => {
    setState(prev => ({
      ...prev,
      modeStats: modeKindKnown(kind) ? bumpStat(prev.modeStats, kind, amount) : prev.modeStats,
      quests: prev.quests.map(q => (!q.completed && q.kind === kind) ? { ...q, progress: Math.min(q.target, q.progress + amount) } : q),
    }));
  }, []);

  // Task rotation (Bundle D): once a UTC day/week rolls over, replace the unclaimed quests of that type with
  // a fresh draw from the pool. Claimed quests already paid out, so only their SLOT is replaced -- nothing is
  // taken back. This runs as an effect (not inside handleQuestProgress) so it fires even on days with no play.
  useEffect(() => {
    const day = utcDayKey(); const week = utcWeekKey();
    if (state.questsGeneratedDay === day && state.questsGeneratedWeek === week) return;
    setState(prev => {
      const dayChanged = prev.questsGeneratedDay !== day;
      const weekChanged = prev.questsGeneratedWeek !== week;
      if (!dayChanged && !weekChanged) return prev;
      const kept = prev.quests.filter(q => (q.type === 'Daily' && !dayChanged) || (q.type === 'Weekly' && !weekChanged));
      const fresh = [
        ...(dayChanged ? generateQuests(DAILY_QUEST_POOL, 'Daily', day, 5) : []),
        ...(weekChanged ? generateQuests(WEEKLY_QUEST_POOL, 'Weekly', week, 3) : []),
      ];
      return { ...prev, quests: [...kept, ...fresh], questsGeneratedDay: day, questsGeneratedWeek: week };
    });
  }, [state.questsGeneratedDay, state.questsGeneratedWeek]);

  // Achievements ("Feats"): checked here, in one place, instead of never. Sticky -- an achievement already
  // marked completed is left alone even if the condition that earned it later stops being true.
  useEffect(() => {
    setState(prev => {
      let changed = false;
      let tokens = prev.legacyTokens, score = prev.parkCommunityScore, rate = prev.pensionRate, diners = prev.tvDinners ?? 0;
      const achievements = prev.achievements.map(a => {
        if (a.completed) return a;
        const check = ACHIEVEMENT_CONDITIONS[a.id];
        if (!check || !check(prev)) return a;
        changed = true;
        if (a.rewardType === 'Tokens') tokens += a.rewardValue;
        else if (a.rewardType === 'CommunityScore') score += a.rewardValue;
        else if (a.rewardType === 'Diners') diners += a.rewardValue;
        // (old 'YieldBonus' feats no longer raise the passive rate: gameplay never does)
        return { ...a, completed: true };
      });
      if (!changed) return prev;
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const newly = achievements.filter((a, i) => a.completed && !prev.achievements[i].completed);
      const note = (a: Achievement) => `${a.rewardType === 'Tokens' ? `+${a.rewardValue} 🎟️ Tickets` : a.rewardType === 'CommunityScore' ? `+${a.rewardValue} ⭐ Stars` : a.rewardType === 'Diners' ? `+${a.rewardValue} 🍽️ TV Dinners` : ''}`;
      const mail = newly.map(a => rewardMail('Feats', `Feat unlocked: ${a.title}`, `${a.description} Reward paid automatically: ${note(a)}.`));
      queueMicrotask(() => newly.forEach(a => notify(`🏆 Feat unlocked: ${a.title} (${note(a)})`, 'good')));
      return { ...prev, achievements, legacyTokens: tokens, parkCommunityScore: score, pensionRate: rate, tvDinners: diners, mailbox: [...mail, ...prev.mailbox] };
    });
  }, [state.allElders.length, state.parkCommunityScore, state.battleWins, state.pensionBalance, state.parkAssets, state.challengeLadder?.highestCleared, state.goldenGames?.highestLeagueCleared, state.stationedAt, state.faction]);

  const handleClaimSeasonReward = useCallback((level: number) => {
    const currentLevel = Math.min(Math.floor(state.season.xp / SEASON_XP_PER_LEVEL) + 1, SEASONAL_REWARDS.length);
    const reward = SEASONAL_REWARDS.find(r => r.level === level);
    if (!reward || level > currentLevel || state.season.claimedLevels.includes(level)) return;
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    notify(`🎖️ Elder Pass level ${level} reached (+${reward.tickets} 🎟️)`, 'good');
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens + reward.tickets,
      season: { ...prev.season, claimedLevels: [...prev.season.claimedLevels, level] },
      mailbox: [rewardMail('Elder Pass', `Pass level ${level} reward`, `You reached Elder Pass level ${level}. Reward paid automatically: +${reward.tickets} 🎟️ Tickets.`), ...prev.mailbox],
    }));
  }, [state.season, state.settings.sfxEnabled, notify]);



  // Milestones: one-time reward per mode-badge tier, claimed from the Tasks screen. Validated against lifetime counts.
  const handleClaimMilestone = useCallback((mode: string, tier: number) => {
    setState(prev => {
      const key = `${mode}:${tier}`;
      const reward = MODE_MILESTONE_REWARDS[tier - 1];
      if (!reward || !MODE_BADGES.some(m => m.mode === mode)) return prev;
      if ((prev.claimedMilestones ?? []).includes(key)) return prev;
      if (modeTierReached(modeCount(prev.modeStats, mode)) < tier) return prev;
      const badge = MODE_BADGES.find(m => m.mode === mode);
      const tierName = MODE_BADGE_TIERS[tier - 1]?.name ?? `Tier ${tier}`;
      return { ...prev, legacyTokens: prev.legacyTokens + reward.tickets, buildingMaterials: (prev.buildingMaterials ?? 0) + reward.materials, claimedMilestones: [...(prev.claimedMilestones ?? []), key],
        mailbox: [rewardMail('Milestones', `${badge?.name ?? mode}: ${tierName} milestone`, `Milestone reached. Reward paid automatically: +${reward.tickets} 🎟️ Tickets and +${reward.materials} 🧱 Materials.`), ...prev.mailbox] };
    });
    const b = MODE_BADGES.find(m => m.mode === mode);
    notify(`🏅 Milestone: ${b?.name ?? mode} ${MODE_BADGE_TIERS[tier - 1]?.name ?? ''} (+${MODE_MILESTONE_REWARDS[tier - 1]?.tickets ?? 0} 🎟️, +${MODE_MILESTONE_REWARDS[tier - 1]?.materials ?? 0} 🧱)`, 'good');
  }, [notify]);

  const handleClaimQuest = useCallback((id: string) => {
    const info = state.quests.find(x => x.id === id);
    if (!info || info.progress < info.target || info.completed) return;
    const rewardText = `+${info.rewardTokens} 🎟️ Tickets, +${info.rewardXP} XP${info.rewardStars ? `, +${info.rewardStars} ⭐` : ''}`;
    notify(`✅ ${info.type} task complete: ${info.title} (${rewardText})`, 'good');
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => {
      const q = prev.quests.find(x => x.id === id);
      if (!q || q.progress < q.target || q.completed) return prev;
      const { xp: nextXp, level: nextLevel } = applyXpGain(prev.xp, prev.level, q.rewardXP);
      return {
        ...prev, xp: nextXp, level: nextLevel,
        legacyTokens: prev.legacyTokens + q.rewardTokens,
        parkCommunityScore: prev.parkCommunityScore + q.rewardStars,
        season: { ...prev.season, xp: prev.season.xp + q.rewardXP },
        quests: prev.quests.map(x => x.id === id ? { ...x, completed: true } : x),
        mailbox: [rewardMail('Tasks', `${q.type} task complete: ${q.title}`, `You finished "${q.title}". Reward paid automatically: ${rewardText}.`), ...prev.mailbox],
      };
    });
  }, [state.quests, state.settings.sfxEnabled, notify]);

  // Everything that used to need a manual Claim now pays itself: finished Tasks, Milestones and Elder Pass levels.
  // (Each handler re-validates, so a repeat call can never double-pay.)
  const autoClaimedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled) return;
    for (const q of state.quests) {
      if (q.progress >= q.target && !q.completed && !autoClaimedRef.current.has('q:' + q.id)) { autoClaimedRef.current.add('q:' + q.id); handleClaimQuest(q.id); }
    }
    for (const m of MODE_BADGES) {
      const reached = modeTierReached(modeCount(state.modeStats, m.mode));
      for (let t = 1; t <= reached; t++) {
        const key = `${m.mode}:${t}`;
        if (!(state.claimedMilestones ?? []).includes(key) && !autoClaimedRef.current.has('m:' + key)) { autoClaimedRef.current.add('m:' + key); handleClaimMilestone(m.mode, t); }
      }
    }
    const curLevel = Math.min(Math.floor(state.season.xp / SEASON_XP_PER_LEVEL) + 1, SEASONAL_REWARDS.length);
    for (const r of SEASONAL_REWARDS) {
      if (r.level <= curLevel && !state.season.claimedLevels.includes(r.level) && !autoClaimedRef.current.has('s:' + state.season.id + ':' + r.level)) { autoClaimedRef.current.add('s:' + state.season.id + ':' + r.level); handleClaimSeasonReward(r.level); }
    }
  }, [isLoaded, cloudSyncSettled, state.quests, state.modeStats, state.claimedMilestones, state.season, handleClaimQuest, handleClaimMilestone, handleClaimSeasonReward]);

  const handleCollectItem = (item: MapItem) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    handleQuestProgress('collect');
    // Say what the pickup actually did -- items used to just vanish with no feedback.
    const collectMsg = item.type === 'LegacyToken' ? `${item.name}: +${item.boost || 25} 🎟️ Tickets`
      : item.type === 'Equipment' ? `${item.name} added to your Park Hub inventory (${item.slot || 'Accessory'} slot)`
      : item.type === 'StatBoost' ? `${item.name}: +1 Strength and Wit for a squad Elder`
      : item.name === 'Old Map' ? `${item.name}: +${(item.boost || 50) + 25} XP`
      : item.name === 'Hard Candy' ? `${item.name}: healed a squad Elder (+${item.boost || 15} HP)`
      : `${item.name} collected (+25 XP)`;
    notify(collectMsg, 'good');
    setState(prev => {
      let xpGain = 25;
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      let nextElders = [...prev.allElders];
      if (item.type === 'LegacyToken') {
        nextTokens += (item.boost || 25);
      } else if (item.type === 'Equipment') {
        nextInventory.push({ id: 'inv_' + Math.random().toString(36).substr(2, 9), name: item.name, icon: item.icon, boost: item.boost || 2, description: item.description || '', slot: item.slot || 'Accessory', rarity: rollGearRarity(), level: 1 });
      } else if (item.type === 'StatBoost') {
        const team = nextElders.filter(e => e.status === 'Team');
        if (team.length > 0) {
          const targetIdx = nextElders.indexOf(team[Math.floor(Math.random() * team.length)]);
          if (targetIdx !== -1) nextElders[targetIdx] = { ...nextElders[targetIdx], strength: nextElders[targetIdx].strength + 1, wit: nextElders[targetIdx].wit + 1 };
        }
      } else if (item.type === 'Snack') {
        if (item.name === 'Old Map') { xpGain += (item.boost || 50); }
        else if (item.name === 'Hard Candy') {
          const team = nextElders.filter(e => e.status === 'Team');
          const target = team.find(e => e.hp < e.maxHp) || team[0];
          if (target) { const ti = nextElders.indexOf(target); nextElders[ti] = { ...target, hp: Math.min(target.maxHp, target.hp + (item.boost || 15)) }; }
        }
      }
      const { xp: nextXp, level: nextLevel } = applyXpGain(prev.xp, prev.level, xpGain);
      return {
        ...prev, level: nextLevel, xp: nextXp, legacyTokens: nextTokens,
        inventory: nextInventory, allElders: nextElders,
        nearbyItems: prev.nearbyItems.filter(i => i.id !== item.id),
        season: { ...prev.season, xp: prev.season.xp + xpGain }
      };
    });
  };

  const handleClaimDividend = useCallback(() => {
    const now = Date.now();
    const timeSince = now - (state.lastDividendClaim || 0);
    if (timeSince < DIVIDEND_COOLDOWN) {
      const minutesLeft = Math.ceil((DIVIDEND_COOLDOWN - timeSince) / 60000);
      notify(`Community pool is still recharging. Check back in ${minutesLeft} minutes!`);
      return;
    }
    if (state.communityReserve <= DIVIDEND_MIN_RESERVE) { notify("Community Reserve is low! Watch local sponsor ads to fuel the shared pool."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    // Reserve-capped twice over: never more than the pool holds, and never more than
    // a small share of it per claim, so no single player can drain the shared pool.
    const basePayout = DIVIDEND_BASE_PAYOUT;
    const scoreBonus = Math.min(state.parkCommunityScore * DIVIDEND_SCORE_BONUS, DIVIDEND_MAX_SCORE_BONUS);
    const totalPayout = Math.min(state.communityReserve * DIVIDEND_MAX_RESERVE_SHARE, basePayout + scoreBonus);
    const tokenBonus = Math.min(DIVIDEND_TICKETS_BASE + Math.floor(state.parkCommunityScore / DIVIDEND_TICKETS_PER_STARS), DIVIDEND_TICKETS_CAP);
    setState(prev => ({
      ...prev, lastDividendClaim: now,
      pensionBalance: prev.pensionBalance + totalPayout,
      communityReserve: Math.max(0, prev.communityReserve - totalPayout),
      legacyTokens: prev.legacyTokens + tokenBonus,
      earningsBreakdown: { ...prev.earningsBreakdown, active: prev.earningsBreakdown.active + totalPayout }
    }));
    notify(`Successfully claimed a Park Dividend of ${totalPayout.toFixed(4)} PP and ${tokenBonus} 🎟️!`);
  }, [state.lastDividendClaim, state.communityReserve, state.parkCommunityScore, state.settings.sfxEnabled]);

  // Cash Out: converts Pending Yield into real, cash-eligible pensionBalance.
  // Reserve-capped exactly like handleClaimDividend — this is the only path
  // (besides Dividend) that ever touches communityReserve. When the reserve
  // is thin, getYieldExchangeRate returns a lower rate rather than silently
  // failing, so the shortfall is visible; any yield the rate/reserve couldn't
  // cover simply stays in pendingYield for next time, never lost.
  const handleCashOutYield = useCallback(() => {
    if (state.pendingYield <= 0) { notify("No Pending Yield to cash out yet — it builds up automatically over time."); return; }
    const rate = getYieldExchangeRate(state.communityReserve);
    // Capped by the pool AND by a per-cash-out share of it, so one player can't drain it.
    const maxPayout = state.communityReserve * CASHOUT_MAX_RESERVE_SHARE;
    const payout = Math.min(state.pendingYield * rate, maxPayout);
    const yieldConsumed = rate > 0 ? payout / rate : 0;
    if (payout <= 0) { notify("Community Reserve is empty right now — watch a local ad to help refill it, then try cashing out again."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      pendingYield: prev.pendingYield - yieldConsumed,
      pensionBalance: prev.pensionBalance + payout,
      communityReserve: Math.max(0, prev.communityReserve - payout),
      earningsBreakdown: { ...prev.earningsBreakdown, passive: prev.earningsBreakdown.passive + payout },
    }));
    const rateNote = rate < 1 ? ` (reserve is thin, so the rate was ${(rate * 100).toFixed(0)}%)` : '';
    notify(`Cashed out ${payout.toFixed(4)} PP${rateNote}.${yieldConsumed < state.pendingYield - 1e-12 ? ' The rest of your Pending Yield is still waiting.' : ''}`);
  }, [state.pendingYield, state.communityReserve, state.settings.sfxEnabled]);

  // Park Assets are the ONE way to raise your passive rate, and they are paid for with
  // Pending Yield (reinvesting earnings) -- not PP. That keeps PP purely "loose and ready
  // to redeem" and means investing never touches the Community Reserve or any cash liability.
  const handleInvest = useCallback((investment: any) => {
    const ownedNow = ownedAssetCount(state.parkAssets, investment.id);
    if (ownedNow >= PARK_ASSET_MAX_OWNED) { notify(`You already own the maximum (${PARK_ASSET_MAX_OWNED}) of this asset.`, 'bad'); return; }
    const price = parkAssetCost(investment.cost, ownedNow);
    if (state.pendingYield < price) { notify("Not enough Pending Yield yet — it builds up on its own, and watching a sponsor ad doubles the rate for an hour."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      pendingYield: prev.pendingYield - price,
      pensionRate: prev.pensionRate + investment.rateBoost,
      parkAssets: { ...(prev.parkAssets && typeof prev.parkAssets === 'object' ? prev.parkAssets : {}), [investment.id]: ownedAssetCount(prev.parkAssets, investment.id) + 1 },
      // Stars scale with the size of the investment (old formula was cost x 10 before the PP rescale)
      parkCommunityScore: prev.parkCommunityScore + Math.round((investment.cost / PP_SCALE_V2) * 10)
    }));
    notify(`Investment confirmed! Your passive rate rose by ${(investment.rateBoost * PASSIVE_TICKS_PER_HOUR).toFixed(6)} PP/hour.`);
  }, [state.pendingYield, state.parkAssets, state.settings.sfxEnabled]);

  const handleWatchAdWithLimit = useCallback(() => {
    if (state.adUsage.count >= MAX_ADS_PER_DAY) { notify("All of today's sponsorship slots are used — they reset at midnight."); return; }
    setShowAdOverlay(true);
  }, [state.adUsage.count]);

  const handleMoveToTeam = useCallback((id: string) => {
    if (state.allElders.find(e => e.id === id)?.awayUntil) { notify('That Elder is visiting a friend — wait for them to come home.', 'bad'); return; }
    if (state.stationedAt?.[id]) { notify('That Elder is defending an Arena — recall it first.', 'bad'); return; }
    setState(prev => {
      const teamCount = prev.allElders.filter(e => e.status === 'Team').length;
      if (teamCount >= TEAM_SIZE_LIMIT) { notify(`Max squad size is ${TEAM_SIZE_LIMIT}!`); return prev; }
      if (state.settings.sfxEnabled) audioManager.playSFX('click');
      return { ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Team' } : e) };
    });
  }, [state.settings.sfxEnabled, state.stationedAt, state.allElders, notify]);

  // Squad order = the order of Team Elders inside allElders (the first one leads in battles). Reordering keeps the
  // same set of array slots and just rearranges which squad Elder sits in each.
  const handleReorderTeam = useCallback((orderedIds: string[]) => {
    setState(prev => {
      const byId = new Map(prev.allElders.map(e => [e.id, e] as [string, Elder]));
      const ordered = orderedIds.map(id => byId.get(id)).filter((e): e is Elder => !!e && (e as Elder).status === 'Team');
      const slots = prev.allElders.map((e, i) => (e.status === 'Team' ? i : -1)).filter(i => i >= 0);
      if (ordered.length !== slots.length) return prev;
      const next = [...prev.allElders];
      slots.forEach((slot, n) => { next[slot] = ordered[n]; });
      return { ...prev, allElders: next };
    });
  }, []);

  const handleMoveToStandby = useCallback((id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setState(prev => ({ ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Base' } : e) }));
  }, [state.settings.sfxEnabled]);

  const handleScrapElder = useCallback((id: string) => {
    const elder = state.allElders.find(e => e.id === id);
    if (!elder) return;
    if (elder.awayUntil) { notify('That Elder is visiting a friend — recall them before scrapping.', 'bad'); return; }
    if (state.stationedAt?.[id]) { notify('That Elder is defending an Arena — recall it before scrapping.', 'bad'); return; }
    if (state.allElders.filter(e => e.status === 'Team').length <= 1 && elder.status === 'Team') {
      notify("You can't scrap your last active squad member!");
      return;
    }
    // Tickets only — PP stays strictly limited to ad-revenue-backed sources (ad-watch share +
    // Dividend claims), so scrapping an Elder never creates PP out of thin air.
    const scale = Math.min(elder.level, SCRAP_LEVEL_CAP) * SCRAP_RARITY_MULTIPLIER[elder.rarity]; // level counted up to a cap so high-level captures can't be a Ticket faucet
    const ticketPayout = Math.round(SCRAP_BASE_TICKETS * scale);
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens + ticketPayout,
      allElders: prev.allElders.filter(e => e.id !== id),
    }));
    notify(`${elder.name} was scrapped for ${ticketPayout} 🎟️.`);
  }, [state.allElders, state.stationedAt, state.settings.sfxEnabled]);

  // Early Bird Line (Park building) discounts every map-building price -- applied in ONE place so
  // every call site (7 handlers + 2 display spots) gets it automatically rather than each needing to
  // remember to apply the discount separately.
  const getDiscountedPrice = useCallback((type: string) => {
    const raw = getStructurePrice(state.structureUses, type);
    const discount = totalStructureDiscountPct(state.builtAmenityIds, state.amenityLevels);
    return discount > 0 && raw.cost > 0 ? { ...raw, cost: Math.max(1, Math.round(raw.cost * (1 - discount))) } : raw;
  }, [state.structureUses, state.builtAmenityIds, state.amenityLevels]);

  const eventPrice = getDiscountedPrice(activeEvent?.type ?? '');

  const handleHealSquad = useCallback(() => {
    const price = getDiscountedPrice('Heal');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({ ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Heal'), allElders: prev.allElders.map(e => ({ ...e, hp: e.maxHp })) }));
    notify("Squad restored!");
    setActiveEvent(null);
  }, [state.structureUses, state.legacyTokens, state.settings.sfxEnabled]);

  const handlePlayShuffleboard = useCallback(() => {
    const team = state.allElders.filter(e => e.status === 'Team');
    if (team.length === 0) return notify("Assign a squad first!");
    const price = getDiscountedPrice('Shuffleboard');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    if (!activeEvent) return;
    setIsEventPlaying(true);
    setTimeout(() => {
      const totalStrength = team.reduce((acc, e) => acc + e.strength + e.tenacity, 0);
      const challengeDifficulty = 50 + Math.random() * 50;
      const success = totalStrength > challengeDifficulty;
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'victory' : 'hit');
      setState(prev => {
        if (success) {
          const isAlreadyHeld = prev.heldStructureIds.includes(activeEvent.id);
          const { xp, level } = applyXpGain(prev.xp, prev.level, 100);
          return {
            ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Shuffleboard'), xp, level,
            heldStructureIds: isAlreadyHeld ? prev.heldStructureIds : [...prev.heldStructureIds, activeEvent.id],
            shuffleboard: { currentKing: { id: 'player', name: 'Your Squad', elderIcon: '🧑‍🦽', heldSince: Date.now(), teamIds: team.map(e => e.id) } }
          };
        } else {
          const { xp, level } = applyXpGain(prev.xp, prev.level, 25);
          return { ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Shuffleboard'), xp, level };
        }
      });
      handleQuestProgress('shuffleboard');
      setEventResult(success ? "Your squad holds the court!" : "The court kings were too tough!");
      setIsEventPlaying(false);
    }, 1500);
  }, [state.structureUses, state.legacyTokens, state.allElders, state.settings.sfxEnabled, activeEvent, handleQuestProgress]);

  // Shuffleboard panel handlers
  const handlePassiveShuffleResult = useCallback((won: boolean, tokensEarned: number): { tickets: number; paid: boolean } => {
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    // Auto-Play is background progress, so only AUTO_PLAY_DAILY_PAID collections a day pay Tickets/full XP.
    const paid = dailyCountToday(state.autoPlayPaid) < AUTO_PLAY_DAILY_PAID;
    const tickets = paid ? tokensEarned : 0;
    const share = paid ? 1 : AUTO_PLAY_UNPAID_XP_SHARE;
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, Math.round((won ? 100 : 25) * share));
      return {
        ...prev,
        legacyTokens: prev.legacyTokens + tickets,
        xp, level,
        allElders: grantElderXpToTeam(prev.allElders, Math.round((won ? 30 : 10) * share)),
        parkCommunityScore: prev.parkCommunityScore + (paid ? (won ? 15 : 5) : 0),
        passiveMatchAt: Date.now() + AUTO_PLAY_INTERVAL_MS,
        autoPlayPaid: paid ? bumpDaily(prev.autoPlayPaid) : prev.autoPlayPaid,
      };
    });
    handleQuestProgress('shuffleboard');
    return { tickets, paid };
  }, [state.settings.sfxEnabled, state.autoPlayPaid, handleQuestProgress]);

  const handleTournamentPlay = useCallback((score: number) => {
    // Fixed throws per tournament window: only the best throw counts on the leaderboard, so unlimited
    // throws would just reward whoever threw the most.
    if (safeCount(state.tournamentThrows) >= TOURNAMENT_DAILY_THROWS) { notify('No throws left in this tournament — a fresh round starts when the timer resets.'); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    const newBest = Math.max(state.tournamentScore, score);
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, 75);
      return {
        ...prev,
        tournamentScore: Math.max(prev.tournamentScore, score),
        tournamentThrows: safeCount(prev.tournamentThrows) + 1,
        xp, level,
        allElders: grantElderXpToTeam(prev.allElders, 20),
        legacyTokens: prev.legacyTokens + 10,
      };
    });
    handleQuestProgress('tournament');
    if (isCloudAccountsConfigured()) {
      submitTournamentScore(newBest).then(() => refreshLeaderboard()).catch(e => console.error('Leaderboard submit failed', e));
    }
  }, [state.settings.sfxEnabled, state.tournamentScore, state.tournamentThrows, handleQuestProgress, refreshLeaderboard]);

  // Elder Challenge (Rival Ladder, see CHALLENGE_TIERS in constants.tsx). The panel rolls the duel and reports
  // the outcome; the daily paid-win cap, first-clear bonus and all rewards are decided HERE so the panel can't
  // drift. Returns what happened so the panel can word its result message.
  const handleShuffleboardChallenge = useCallback((tierIndex: number, won: boolean): { paid: boolean; tickets: number; firstClear: boolean } => {
    const tier = CHALLENGE_TIERS[Math.max(0, Math.min(CHALLENGE_MAX_TIERS - 1, Math.floor(tierIndex) || 0))];
    const ladder = normalizeChallengeLadder(state.challengeLadder);
    const today = utcDayKey();
    const paidWinsToday = ladder.day === today ? ladder.paidWins : 0;
    const paid = paidWinsToday < CHALLENGE_DAILY_PAID_WINS;
    const firstClear = won && tier.index > ladder.highestCleared;
    let tickets = 0;
    if (won) tickets = firstClear ? tier.winTickets * CHALLENGE_FIRST_CLEAR_MULT : paid ? tier.winTickets : 0;
    else tickets = paid ? -tier.lossTickets : 0;
    const xpShare = paid ? 1 : CHALLENGE_UNPAID_XP_SHARE;
    const playerXpGain = Math.round((won ? tier.winPlayerXp : tier.winPlayerXp * 0.25) * xpShare);
    const elderXpGain = Math.round((won ? tier.winElderXp : tier.winElderXp * 0.25) * xpShare);
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, playerXpGain);
      return {
        ...prev,
        legacyTokens: Math.max(0, prev.legacyTokens + tickets),
        xp, level,
        allElders: elderXpGain > 0 ? grantElderXpToTeam(prev.allElders, elderXpGain) : prev.allElders,
        parkCommunityScore: prev.parkCommunityScore + (won && paid ? tier.winScore : 0),
        challengeLadder: {
          highestCleared: won ? Math.max(ladder.highestCleared, tier.index) : ladder.highestCleared,
          day: today,
          paidWins: paidWinsToday + (won && paid ? 1 : 0),
        },
      };
    });
    handleQuestProgress('challenge');
    return { paid, tickets, firstClear };
  }, [state.settings.sfxEnabled, state.challengeLadder, handleQuestProgress]);

  // Golden Games (Phase 5, evolution spec). leagueIndex is into
  // GOLDEN_GAMES_LEAGUES; ticketsEarned is pre-rolled by ShuffleboardPanel
  // using that league's win/loss ranges (same pattern as the other 3 modes,
  // which already resolve client-side and just report the outcome up).
  const handleGoldenGamesResult = useCallback((leagueIndex: number, won: boolean, ticketsRolled: number): { tickets: number; materials: number; paid: boolean; firstClear: boolean } => {
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    const league = GOLDEN_GAMES_LEAGUES[leagueIndex];
    if (!league) return { tickets: 0, materials: 0, paid: false, firstClear: false };
    // Longevity caps (see GOLDEN_GAMES_* in constants.tsx): the first GOLDEN_GAMES_DAILY_PAID_MATCHES matches
    // each UTC day pay; beyond that only a tier's first-ever win pays (3x, one time); anything else is friendly.
    const paid = dailyCountToday(state.goldenGames.paid) < GOLDEN_GAMES_DAILY_PAID_MATCHES;
    const firstClear = won && leagueIndex > state.goldenGames.highestLeagueCleared;
    const pays = paid || firstClear;
    const mult = firstClear ? GOLDEN_GAMES_FIRST_CLEAR_MULT : 1;
    const ticketsEarned = pays ? ticketsRolled * mult : 0;
    const materialsEarned = pays ? goldenGamesMaterials(leagueIndex, won) * mult : 0;
    const xpShare = pays ? 1 : GOLDEN_GAMES_UNPAID_XP_SHARE;
    const elderXp = Math.round((won ? league.winElderXp : league.lossElderXp) * xpShare);
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, Math.round((won ? league.winElderXp * 3 : league.lossElderXp) * xpShare));
      return {
        ...prev,
        legacyTokens: prev.legacyTokens + ticketsEarned,
        buildingMaterials: prev.buildingMaterials + materialsEarned,
        xp, level,
        allElders: grantElderXpToTeam(prev.allElders, elderXp),
        parkCommunityScore: prev.parkCommunityScore + (won && pays ? league.winCommunityScore : 0),
        goldenGames: {
          highestLeagueCleared: won ? Math.max(prev.goldenGames.highestLeagueCleared, leagueIndex) : prev.goldenGames.highestLeagueCleared,
          nextMatchAt: Date.now() + GOLDEN_GAMES_COOLDOWN_MS,
          paid: paid ? bumpDaily(prev.goldenGames.paid) : prev.goldenGames.paid,
        },
      };
    });
    return { tickets: ticketsEarned, materials: materialsEarned, paid, firstClear };
  }, [state.settings.sfxEnabled, state.goldenGames]);

  const handleFriendBattleResult = useCallback((won: boolean, ticketsRolled: number, friendUserId: string): { tickets: number; materials: number; rewarded: boolean } => {
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    // Only the first FRIEND_BATTLE_DAILY_REWARDS WINS each day pay Tickets/Materials/Stars (longevity cap).
    // A win pays the attacker; a loss pays the DEFENDER instead (server-side, via their Mailbox --
    // see api/mail.ts). The attacker keeps only the Elder XP.
    const today = new Date().toDateString();
    const usedToday = state.friendBattle.rewardDay === today ? (state.friendBattle.rewardsToday ?? 0) : 0;
    const rewarded = won && usedToday < FRIEND_BATTLE_DAILY_REWARDS;
    const materialsEarned = rewarded ? FRIEND_BATTLE_WIN_MATERIALS : 0;
    const ticketsToGrant = rewarded ? ticketsRolled : 0;
    const xpShare = won && !rewarded ? FRIEND_BATTLE_UNREWARDED_XP_SHARE : 1;
    const opponentName = friendsData?.friends.find(f => f.user_id === friendUserId)?.display_name || 'Park Visitor';
    notify(won
      ? (rewarded
          ? `⚔️ Victory over ${opponentName}!\n+${ticketsToGrant} 🎟️  +${materialsEarned} 🧱`
          : `⚔️ Victory over ${opponentName}!\nToday's battle rewards are used up — this one is for bragging rights.`)
      : `⚔️ ${opponentName}'s squad held their ground.\nYour Elders still earned XP.`,
      won ? 'good' : 'bad');
    handleQuestProgress('friend_battle');
    if (rewarded) earnDiners(DINERS_FRIEND_WIN, 'Friend Battle win');
    void notifyFriendBattle(friendUserId, won).catch(e => {
      console.error('Friend battle notification failed', e);
      showNotice(`📭 Battle counted, but your friend's Mailbox notice failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    });
    setState(prev => {
      const elderXp = Math.round((won ? FRIEND_BATTLE_WIN_ELDER_XP : FRIEND_BATTLE_LOSS_ELDER_XP) * xpShare);
      const { xp, level } = applyXpGain(prev.xp, prev.level, Math.round((won ? FRIEND_BATTLE_WIN_ELDER_XP * 3 : FRIEND_BATTLE_LOSS_ELDER_XP) * xpShare));
      const prevUsed = prev.friendBattle.rewardDay === today ? (prev.friendBattle.rewardsToday ?? 0) : 0;
      return {
        ...prev,
        legacyTokens: prev.legacyTokens + ticketsToGrant,
        buildingMaterials: prev.buildingMaterials + materialsEarned,
        xp, level,
        allElders: grantElderXpToTeam(prev.allElders, elderXp),
        parkCommunityScore: prev.parkCommunityScore + (rewarded ? FRIEND_BATTLE_WIN_COMMUNITY_SCORE : 0),
        friendBattle: {
          nextMatchAt: 0,
          rewardDay: today, rewardsToday: prevUsed + (rewarded ? 1 : 0),
          lastByFriend: { ...(prev.friendBattle.lastByFriend ?? {}), [friendUserId]: Date.now() },
          attackDay: today,
          attacksToday: (prev.friendBattle.attackDay === today ? (prev.friendBattle.attacksToday ?? 0) : 0) + 1,
        },
      };
    });
    return { tickets: ticketsToGrant, materials: materialsEarned, rewarded };
  }, [state.settings.sfxEnabled, state.friendBattle.rewardDay, state.friendBattle.rewardsToday, showNotice, notify, friendsData]);

  // Attack from the Friends list: same roll, same cooldown, same rewards and
  // same mail notice as the Court tab's Friend mode (both go through
  // rollFriendBattle + handleFriendBattleResult). Returns the result text.
  const handleRefreshNearby = useCallback(async () => {
    if (nearbyBusy || Date.now() < nearbyReadyAt) return;
    setNearbyBusy(true); setNearbyError(null);
    try {
      const { players } = await fetchNearbyPlayers();
      setNearbyPlayers(players);
      if (players.length === 0) setNearbyError('No opted-in players are around your level right now. Try again soon.');
    } catch (e) { setNearbyError(e instanceof Error ? e.message : 'Could not load players.'); }
    setNearbyReadyAt(Date.now() + NEARBY_REFRESH_COOLDOWN_MS);
    setNearbyBusy(false);
  }, [nearbyBusy, nearbyReadyAt]);

  const handleBattleFriendFromList = useCallback((friendUserId: string): string => {
    const friend = friendsData?.friends.find(f => f.user_id === friendUserId) ?? nearbyPlayers.find(f => f.user_id === friendUserId);
    if (!friend) return 'Could not find that friend — try refreshing.';
    const squad = state.allElders.filter(e => e.status === 'Team' && e.captured);
    if (squad.length === 0) return 'Put at least one Elder on your squad first.';
    const waitMs = (state.friendBattle.lastByFriend?.[friendUserId] ?? 0) + FRIEND_BATTLE_COOLDOWN_MS - Date.now();
    if (waitMs > 0) return `You just battled ${friend.display_name || 'that player'} - ready again in ${Math.ceil(waitMs / 60000)} min. Other players are fair game right now.`;
    const attacksToday = state.friendBattle.attackDay === new Date().toISOString().slice(0, 10) ? (state.friendBattle.attacksToday ?? 0) : 0;
    if (attacksToday >= FRIEND_BATTLE_DAILY_ATTACK_CAP) return `You've reached today's limit of ${FRIEND_BATTLE_DAILY_ATTACK_CAP} player battles. It resets at midnight UTC.`;
    const { won, ticketsEarned } = rollFriendBattle(getSquadPower(squad), friend.squad_power);
    const result = handleFriendBattleResult(won, ticketsEarned, friend.user_id);
    const name = friend.display_name || 'Park Visitor';
    return won
      ? (result.rewarded ? `You beat ${name}'s squad! +${result.tickets} 🎟️ +${result.materials} 🧱` : `You beat ${name}'s squad! Today's battle rewards are used up, so this one is for bragging rights.`)
      : `${name}'s squad held their ground — the defender's bounty goes to them this time. (+Elder XP for your squad)`;
  }, [friendsData, nearbyPlayers, state.allElders, state.friendBattle.lastByFriend, state.friendBattle.attackDay, state.friendBattle.attacksToday, handleFriendBattleResult]);

  // Court Champion purse: once per reign (a reign lasts COURT_CHAMPION_DURATION_MS after a win on the map).
  const handleClaimCourtPurse = useCallback(() => {
    const now = Date.now();
    const king = state.shuffleboard.currentKing;
    if (!isCourtChampion(king, now)) { notify("You're not the Court Champion right now — beat the Grand Shuffle Court on the map to take the title."); return; }
    if ((state.lastCourtPurseClaim ?? 0) >= (king?.heldSince ?? 0)) { notify("You've already collected this reign's purse. Win the court again after your title runs out."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    // Shuffleboard Court (Park building) adds a flat bonus to the purse per level.
    const purse = COURT_PURSE_TICKETS + totalCourtPurseBonus(state.builtAmenityIds, state.amenityLevels);
    setState(prev => ({ ...prev, legacyTokens: prev.legacyTokens + purse, lastCourtPurseClaim: now }));
    notify(`👑 Champion's purse collected! +${purse} 🎟️`);
  }, [state.shuffleboard.currentKing, state.lastCourtPurseClaim, state.settings.sfxEnabled, state.builtAmenityIds, state.amenityLevels]);

  const handleBuildAmenity = useCallback((amenityId: string) => {
    const amenity = AMENITIES.find(a => a.id === amenityId);
    if (!amenity) return;
    setState(prev => {
      if (prev.builtAmenityIds.includes(amenityId)) return prev; // one of each for now
      if (prev.buildingMaterials < amenity.cost) return prev;
      if (state.settings.sfxEnabled) audioManager.playSFX('collect');
      return {
        ...prev,
        buildingMaterials: prev.buildingMaterials - amenity.cost,
        builtAmenityIds: [...prev.builtAmenityIds, amenityId],
        amenityLevels: { ...(prev.amenityLevels ?? {}), [amenityId]: 1 },
        amenityCollectedAt: { ...(prev.amenityCollectedAt ?? {}), [amenityId]: Date.now() },
      };
    });
  }, [state.settings.sfxEnabled]);

  // Collect a working building's stored output (Tickets or Building Materials).
  const handleCollectAmenity = useCallback((amenityId: string) => {
    const amenity = AMENITIES.find(a => a.id === amenityId);
    if (!amenity?.producer || !state.builtAmenityIds.includes(amenityId)) return;
    const now = Date.now();
    const amount = producerStored(amenity, getBuildingLevel(state.amenityLevels, amenityId), state.amenityCollectedAt?.[amenityId], now, comfortOutputBonus(state.allElders) + totalProducerBoost(state.builtAmenityIds, state.amenityLevels));
    if (amount <= 0) { notify(`${amenity.name} has nothing to collect yet.`); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens + (amenity.producer!.output === 'tickets' ? amount : 0),
      buildingMaterials: prev.buildingMaterials + (amenity.producer!.output === 'materials' ? amount : 0),
      amenityCollectedAt: { ...(prev.amenityCollectedAt ?? {}), [amenityId]: now },
    }));
    notify(`Collected ${amount} ${amenity.producer.output === 'tickets' ? '🎟️' : '🧱'} from ${amenity.name}.`);
  }, [state.builtAmenityIds, state.amenityLevels, state.amenityCollectedAt, state.settings.sfxEnabled]);

  // Level a building up. Costs Building Materials + Tickets. A working building first pays out whatever it
  // is holding at its OLD rate, so upgrading can never be used to inflate stored output.
  const handleUpgradeAmenity = useCallback((amenityId: string) => {
    const amenity = AMENITIES.find(a => a.id === amenityId);
    if (!amenity || !state.builtAmenityIds.includes(amenityId)) return;
    const level = getBuildingLevel(state.amenityLevels, amenityId);
    if (level >= MAX_BUILDING_LEVEL) { notify(`${amenity.name} is already at max level.`); return; }
    const matCost = buildingUpgradeMaterials(amenity, level);
    const ticketCost = buildingUpgradeTickets(level);
    if (state.buildingMaterials < matCost) { notify(`Need ${matCost} 🧱 to upgrade ${amenity.name}.`); return; }
    if (state.legacyTokens < ticketCost) { notify(`Need ${ticketCost} 🎟️ to upgrade ${amenity.name}.`); return; }
    const now = Date.now();
    const pending = amenity.producer ? producerStored(amenity, level, state.amenityCollectedAt?.[amenityId], now, comfortOutputBonus(state.allElders) + totalProducerBoost(state.builtAmenityIds, state.amenityLevels)) : 0;
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      buildingMaterials: prev.buildingMaterials - matCost + (amenity.producer?.output === 'materials' ? pending : 0),
      legacyTokens: prev.legacyTokens - ticketCost + (amenity.producer?.output === 'tickets' ? pending : 0),
      amenityLevels: { ...(prev.amenityLevels ?? {}), [amenityId]: level + 1 },
      amenityCollectedAt: { ...(prev.amenityCollectedAt ?? {}), [amenityId]: now },
    }));
    notify(`${amenity.name} is now level ${level + 1}!${pending > 0 ? ` (Collected ${pending} stored ${amenity.producer!.output === 'tickets' ? '🎟️' : '🧱'} first.)` : ''}`);
  }, [state.builtAmenityIds, state.amenityLevels, state.amenityCollectedAt, state.buildingMaterials, state.legacyTokens, state.settings.sfxEnabled]);

  // Buildings that were built back when they were decoration have no output timer yet; start it now
  // (never retroactively -- no free stored output).
  useEffect(() => {
    if (!isLoaded) return;
    const missing = (state.builtAmenityIds ?? []).filter(id => AMENITIES.find(a => a.id === id)?.producer && !state.amenityCollectedAt?.[id]);
    if (missing.length === 0) return;
    const now = Date.now();
    setState(prev => ({ ...prev, amenityCollectedAt: { ...(prev.amenityCollectedAt ?? {}), ...Object.fromEntries(missing.map(id => [id, now])) } }));
  }, [isLoaded, state.builtAmenityIds, state.amenityCollectedAt]);

  const handleVisitFriend = useCallback((friendUserId: string) => {
    setState(prev => {
      const lastVisit = prev.lastVisitedFriends[friendUserId] ?? 0;
      if (Date.now() - lastVisit < VISIT_COOLDOWN_MS) return prev;
      if (state.settings.sfxEnabled) audioManager.playSFX('collect');
      return {
        ...prev,
        buildingMaterials: prev.buildingMaterials + VISIT_MATERIALS_REWARD,
        lastVisitedFriends: { ...prev.lastVisitedFriends, [friendUserId]: Date.now() },
      };
    });
  }, [state.settings.sfxEnabled]);

  const handleGardenScavenge = useCallback(() => {
    const price = getDiscountedPrice('Garden');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    setIsEventPlaying(true);
    setTimeout(() => {
      const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      const success = Math.random() > 0.3;
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'collect' : 'hit');
      setState(prev => {
        const nextInventory = success ? [...prev.inventory, { id: 'garden_' + Date.now(), name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2, slot: poolItem.slot as any || 'Accessory', description: poolItem.description || '', rarity: rollGearRarity(), level: 1 }] : prev.inventory;
        const { xp, level } = applyXpGain(prev.xp, prev.level, 50);
        return { ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Garden'), xp, level, inventory: nextInventory };
      });
      setEventResult(success ? `You found a ${poolItem.name}!` : "You only found some weeds today.");
      setIsEventPlaying(false);
      handleQuestProgress('garden');
    }, 1200);
  }, [state.structureUses, state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

  const handleMallWalk = useCallback(() => {
    const price = getDiscountedPrice('Walk');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    setIsEventPlaying(true);
    setTimeout(() => {
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const xpGain = 250;
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, xpGain);
        return { ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Walk'), xp, level };
      });
      setEventResult(`Great workout! Your squad gained ${xpGain} XP.`);
      setIsEventPlaying(false);
      handleQuestProgress('mall');
    }, 1500);
  }, [state.structureUses, state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

  const handlePavilionPotluck = useCallback(() => {
    const price = getDiscountedPrice('Pavilion');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    setIsEventPlaying(true);
    setTimeout(() => {
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const scoreGain = 50;
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, 50);
        return { ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Pavilion'), parkCommunityScore: prev.parkCommunityScore + scoreGain, xp, level };
      });
      setEventResult(`The potluck was a hit! Community Score +${scoreGain}.`);
      setIsEventPlaying(false);
      handleQuestProgress('potluck');
    }, 1500);
  }, [state.structureUses, state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

  const handleMarketVisit = useCallback(() => {
    const team = state.allElders.filter(e => e.status === 'Team');
    if (team.length === 0) return notify("Assign a squad first!");
    const price = getDiscountedPrice('Market');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    setIsEventPlaying(true);
    setTimeout(() => {
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const statNames: Record<'strength' | 'wit' | 'agility' | 'tenacity', string> = {
        strength: 'Strength', wit: 'Wit', agility: 'Agility', tenacity: 'Tenacity',
      };
      const boostedStat = (['strength', 'wit', 'agility', 'tenacity'] as const)[Math.floor(Math.random() * 4)];
      setState(prev => {
        const nextElders = prev.allElders.map(e => {
          if (e.status !== 'Team') return e;
          return { ...e, [boostedStat]: (e[boostedStat] as number) + 2 };
        });
        const { xp, level } = applyXpGain(prev.xp, prev.level, 75);
        return { ...prev, legacyTokens: prev.legacyTokens - price.cost, structureUses: bumpStructureUses(prev.structureUses, 'Market'), allElders: nextElders, xp, level };
      });
      setEventResult(`Fresh produce! Your whole squad's ${statNames[boostedStat]} +2.`);
      setIsEventPlaying(false);
      handleQuestProgress('market');
    }, 1500);
  }, [state.structureUses, state.legacyTokens, state.allElders, state.settings.sfxEnabled, handleQuestProgress]);

  const handlePlayBingo = useCallback(() => {
    const price = getDiscountedPrice('Blitz');
    if (price.soldOut) return notify("Come back tomorrow -- this building has reached its daily limit.");
    if (state.legacyTokens < price.cost) return notify(`Need ${price.cost} Tokens!`);
    setIsEventPlaying(true);
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setTimeout(() => {
      const success = Math.random() > 0.6;
      const prize = success ? 50 : 5;
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'victory' : 'hit');
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, success ? 100 : 20);
        return {
          ...prev, legacyTokens: prev.legacyTokens - price.cost + prize, structureUses: bumpStructureUses(prev.structureUses, 'Blitz'),
          xp, level,
          parkCommunityScore: prev.parkCommunityScore + (success ? 10 : 2)
        };
      });
      setEventResult(success ? `BINGO! You won ${prize} 🎟️ and boosted the park score!` : `No luck this time. You got a consolation prize of ${prize} 🎟️.`);
      setIsEventPlaying(false);
      handleQuestProgress('bingo');
    }, 2000);
  }, [state.structureUses, state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

  // PP is the real-money-shaped currency (WITHDRAWAL_MINIMUM = 10 PP), so it should only ever
  // be created by things traceable to real ad revenue: the ad-watch share below, and Dividend
  // claims (which are hard-capped by the Community Reserve, itself funded by that same revenue).
  // Ads reward PP + Stars here — Tickets deliberately are NOT part of the ad payout, so Tickets
  // stay tied to actual gameplay (Bingo, Shuffleboard, Tasks, Scrap) rather than passive watching.
  const handleWatchVideoReward = useCallback((playerShare: number, communityShare: number) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      pensionBalance: prev.pensionBalance + playerShare,
      communityReserve: prev.communityReserve + communityShare,
      earningsBreakdown: { ...prev.earningsBreakdown, sponsorship: prev.earningsBreakdown.sponsorship + playerShare },
      parkCommunityScore: prev.parkCommunityScore + 10,
      adUsage: { ...prev.adUsage, count: prev.adUsage.count + 1 },
      boostUntil: Math.max(Date.now(), prev.boostUntil) + AD_BOOST_DURATION_MS,
    }));
    handleQuestProgress('ad');
    setShowAdOverlay(false);
  }, [state.settings.sfxEnabled, handleQuestProgress]);

  const handleClaimMail = useCallback((id: string) => {
    setState(prev => {
      const msg = prev.mailbox.find(m => m.id === id);
      if (!msg || msg.claimed || msg.gift) return prev; // gift mail is claimed via handleClaimGift (needs a target)
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      const nextMaterials = prev.buildingMaterials + (msg.materials ?? 0);
      const nextDiners = (prev.tvDinners ?? 0) + (msg.diners ?? 0);
      if (msg.reward) {
        if (msg.reward.type === 'Tokens') nextTokens += msg.reward.value as number;
        else if (msg.reward.type === 'Gear') nextInventory.push(msg.reward.value as Gear);
      }
      if (prev.settings.sfxEnabled) audioManager.playSFX('collect');
      return { ...prev, legacyTokens: nextTokens, inventory: nextInventory, buildingMaterials: nextMaterials, tvDinners: nextDiners, mailbox: prev.mailbox.map(m => m.id === id ? { ...m, claimed: true } : m),
        modeStats: msg.exchangeHost ? bumpStat(prev.modeStats, 'exchange_host') : prev.modeStats,
        quests: msg.exchangeHost ? prev.quests.map(q => (!q.completed && q.kind === 'exchange_host') ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q) : prev.quests };
    });
  }, []);

  // Resident Exchange host gift: the player picks the target (a Quest or a working building) when claiming.
  // Weekly board rewards pay themselves the moment they arrive (alert + the claimed message stays in the Mailbox).
  useEffect(() => {
    if (!isLoaded || !cloudSyncSettled) return;
    for (const m of state.mailbox) {
      if (m?.auto && !m.claimed && !autoClaimedRef.current.has('mail:' + m.id)) {
        autoClaimedRef.current.add('mail:' + m.id);
        handleClaimMail(m.id);
        if (m.honor && parseBoardHonor(m.honor)) setState(prev => (prev.courtHonors ?? []).includes(m.honor!) ? prev : { ...prev, courtHonors: [...(prev.courtHonors ?? []), m.honor!].slice(-80) });
        notify(`🏅 ${m.subject}${m.diners ? ` (+${m.diners} 🍽️` : ' ('}${m.materials ? `${m.diners ? ', ' : '+'}${m.materials} 🧱` : ''})`, 'good');
      }
    }
  }, [isLoaded, cloudSyncSettled, state.mailbox, handleClaimMail, notify]);
  // Opening the game after a week ends nudges the server to settle last week's boards (idempotent).
  useEffect(() => { if (isLoaded && cloudSyncSettled) { fetchBoard('arena').then(() => refreshMail?.()).catch(() => {}); } }, [isLoaded, cloudSyncSettled]);

  const handleClaimGift = useCallback((id: string, targetId: string) => {
    setState(prev => {
      const msg = prev.mailbox.find(m => m.id === id);
      if (!msg || msg.claimed || !msg.gift) return prev;
      const amount = Math.max(0, Math.floor(Number(msg.gift.amount) || 0));
      let next = prev;
      if (msg.gift.type === 'quest') {
        const q = prev.quests.find(x => x.id === targetId && !x.completed);
        if (!q) return prev;
        next = { ...prev, quests: prev.quests.map(x => x.id === targetId ? { ...x, progress: Math.min(x.target, x.progress + amount) } : x) };
      } else {
        const a = AMENITIES.find(x => x.id === targetId);
        if (!a?.producer || !prev.builtAmenityIds.includes(targetId)) return prev;
        const now = Date.now();
        const current = prev.amenityCollectedAt?.[targetId] ?? now;
        // Backdating the last-collected time adds that many hours of stored output, never beyond the storage cap.
        const earliest = now - BUILDING_STORAGE_HOURS * 3600000;
        const shifted = Math.max(earliest, current - amount * 3600000);
        next = { ...prev, amenityCollectedAt: { ...(prev.amenityCollectedAt ?? {}), [targetId]: Math.min(current, shifted) } };
      }
      return { ...next, mailbox: next.mailbox.map(m => m.id === id ? { ...m, claimed: true } : m),
        modeStats: bumpStat(next.modeStats, 'exchange_host'),
        quests: next.quests.map(q => (!q.completed && q.kind === 'exchange_host') ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q) };
    });
    notify('Gift applied — thanks for hosting!', 'good');
  }, [notify]);

  const handleDailyCheckIn = useCallback(() => {
    const now = Date.now();
    const today = new Date(now).setHours(0,0,0,0);
    const last = state.lastLoginTimestamp ? new Date(state.lastLoginTimestamp).setHours(0,0,0,0) : 0;
    if (today === last) return notify("Already checked in today!");
    setState(prev => {
      const yesterday = today - 86400000;
      const newStreak = (last === yesterday) ? (prev.dailyBoostsCount % 7) + 1 : 1;
      const reward = DAILY_REWARDS[newStreak - 1];
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      if (reward.type === 'Tokens') nextTokens += reward.value as number;
      else {
        const poolItem = ITEM_POOL.find(i => i.name === reward.value);
        if (poolItem) nextInventory.push({ id: 'daily_' + Math.random().toString(36).substr(2, 9), name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2, description: poolItem.description || '', slot: poolItem.slot as any || 'Accessory', rarity: rollGearRarity(), level: 1 });
      }
      if (prev.settings.sfxEnabled) audioManager.playSFX('victory');
      return { ...prev, lastLoginTimestamp: now, dailyBoostsCount: newStreak, legacyTokens: nextTokens, inventory: nextInventory };
    });
    notify("Daily check-in successful!");
  }, [state.lastLoginTimestamp, state.settings.sfxEnabled]);

  const handleEquipElder = useCallback((elderId: string, item: Gear) => {
    setState(prev => {
      const nextInventory = prev.inventory.filter(i => i.id !== item.id);
      let bumpedItem: Gear | null = null;
      const slotKey = gearSlotKey(item.slot);
      const nextElders = prev.allElders.map(e => {
        if (e.id !== elderId) return e;
        const updated = { ...e, equipment: { ...e.equipment } };
        const current = updated.equipment[slotKey];
        if (current) {
          // Return the previously equipped item to inventory and undo its stat contribution --
          // exactly reversible since getEffectiveGearBoost depends only on the item itself.
          const oldBoost = getEffectiveGearBoost(current);
          if (slotKey === 'head') updated.wit -= oldBoost;
          if (slotKey === 'body') updated.tenacity -= oldBoost;
          if (slotKey === 'accessory') updated.strength -= oldBoost;
          if (slotKey === 'charm') updated.agility -= oldBoost;
          bumpedItem = current;
        }
        const newBoost = getEffectiveGearBoost(item);
        if (slotKey === 'head') updated.wit += newBoost;
        if (slotKey === 'body') updated.tenacity += newBoost;
        if (slotKey === 'accessory') updated.strength += newBoost;
        if (slotKey === 'charm') updated.agility += newBoost;
        updated.equipment[slotKey] = item;
        return updated;
      });
      return { ...prev, inventory: bumpedItem ? [...nextInventory, bumpedItem] : nextInventory, allElders: nextElders };
    });
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  }, [state.settings.sfxEnabled]);

  const handleRenameElder = useCallback((elderId: string, rawName: string) => {
    const name = rawName.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
    if (!name) { notify('Please enter a name.', 'bad'); return; }
    setState(prev => ({ ...prev, allElders: prev.allElders.map(e => e.id === elderId ? { ...e, name } : e) }));
    notify(`Renamed to ${name}.`, 'good');
  }, [notify]);

  const handleUnequipElder = useCallback((elderId: string, slotKey: 'head' | 'body' | 'accessory' | 'charm') => {
    setState(prev => {
      let freedItem: Gear | null = null;
      const nextElders = prev.allElders.map(e => {
        if (e.id !== elderId) return e;
        const current = e.equipment?.[slotKey];
        if (!current) return e;
        const updated = { ...e, equipment: { ...e.equipment } };
        const boost = getEffectiveGearBoost(current);
        if (slotKey === 'head') updated.wit -= boost;
        if (slotKey === 'body') updated.tenacity -= boost;
        if (slotKey === 'accessory') updated.strength -= boost;
        if (slotKey === 'charm') updated.agility -= boost;
        delete updated.equipment[slotKey];
        freedItem = current;
        return updated;
      });
      if (!freedItem) return prev;
      return { ...prev, inventory: [...prev.inventory, freedItem], allElders: nextElders };
    });
  }, []);

  const handleSellGear = useCallback((itemId: string) => {
    setState(prev => {
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;
      const value = applySalvageBonus(getGearSellValue(item), workshopSalvageBonusPct(prev.builtAmenityIds, prev.amenityLevels));
      notify(`Sold ${item.name} for ${value.tickets} 🎟️ + ${value.materials} 🧱`, 'good');
      return {
        ...prev,
        inventory: prev.inventory.filter(i => i.id !== itemId),
        legacyTokens: prev.legacyTokens + value.tickets,
        buildingMaterials: prev.buildingMaterials + value.materials,
      };
    });
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  }, [state.settings.sfxEnabled, notify]);

  const handleSellGearMany = useCallback((ids: string[]) => {
    setState(prev => {
      const items = prev.inventory.filter(i => ids.includes(i.id));
      if (!items.length) return prev;
      const pct = workshopSalvageBonusPct(prev.builtAmenityIds, prev.amenityLevels);
      const total = items.reduce((t, i) => { const v = applySalvageBonus(getGearSellValue(i), pct); return { tickets: t.tickets + v.tickets, materials: t.materials + v.materials }; }, { tickets: 0, materials: 0 });
      notify(`Salvaged ${items.length} items for ${total.tickets} 🎟️ + ${total.materials} 🧱`, 'good');
      return { ...prev, inventory: prev.inventory.filter(i => !ids.includes(i.id)), legacyTokens: prev.legacyTokens + total.tickets, buildingMaterials: prev.buildingMaterials + total.materials };
    });
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  }, [state.settings.sfxEnabled, notify]);

  const handleUpgradeGear = useCallback((itemId: string) => {
    setState(prev => {
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;
      const level = item.level ?? 1;
      if (level >= getGearMaxLevel(item)) { notify('Already at max level for its rarity.'); return prev; }
      const cost = applyUpgradeDiscount(getGearUpgradeCost(item), workshopUpgradeDiscountPct(prev.builtAmenityIds, prev.amenityLevels));
      if (prev.legacyTokens < cost.tickets || prev.buildingMaterials < cost.materials) {
        notify(`Need ${cost.tickets} Tickets + ${cost.materials} Materials to upgrade.`);
        return prev;
      }
      const nextInventory = prev.inventory.map(i => i.id === itemId ? { ...i, level: level + 1 } : i);
      return { ...prev, legacyTokens: prev.legacyTokens - cost.tickets, buildingMaterials: prev.buildingMaterials - cost.materials, inventory: nextInventory };
    });
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  }, [state.settings.sfxEnabled, notify]);

  // Evolution (Phase 4, 9-8-26 evolution spec). Stage 0->1 is level-gated only.
  // Stage 1->2 is level-gated for everyone, but Common/Rare pay a much steeper
  // Ticket cost than Epic/Legendary -- never a hard rarity wall, just a cheaper
  // path for rarer Elders. Art stays at stage-0 sprites until the evolution art
  // pass is done (ELDER_AVATARS[type][1]/[2] currently duplicate [0]); stats and
  // comfortGeneration update correctly regardless.
  const handleEvolveElder = useCallback((elderId: string) => {
    let evolved = false;
    setState(prev => {
      const elder = prev.allElders.find(e => e.id === elderId);
      if (!elder) return prev;
      const stage = elder.evolutionStage ?? 0;
      if (stage >= 2) { notify('Already fully evolved!'); return prev; }
      const nextStage = (stage + 1) as 1 | 2;

      if (nextStage === 1 && elder.level < ELDER_EVOLUTION_STAGE1_LEVEL) {
        notify(`${elder.name} needs to reach level ${ELDER_EVOLUTION_STAGE1_LEVEL} to evolve.`);
        return prev;
      }
      let cost = EVOLUTION_STAGE1_COST;
      if (nextStage === 2) {
        if (elder.level < ELDER_EVOLUTION_STAGE2_LEVEL) {
          notify(`${elder.name} needs to reach level ${ELDER_EVOLUTION_STAGE2_LEVEL} to evolve.`);
          return prev;
        }
        const isEliteRarity = (ELDER_EVOLUTION_STAGE2_ELITE_RARITIES as string[]).includes(elder.rarity);
        cost = isEliteRarity ? EVOLUTION_STAGE2_COST : EVOLUTION_STAGE2_STEEP_COST;
      }
      if (prev.legacyTokens < cost) {
        notify(`Evolving ${elder.name} needs ${cost} 🎟️ Tickets.`);
        return prev;
      }

      const multiplier = EVOLUTION_STAT_MULTIPLIER[nextStage];
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      evolved = true;
      return {
        ...prev,
        legacyTokens: prev.legacyTokens - cost,
        allElders: prev.allElders.map(e => {
          if (e.id !== elderId) return e;
          const nextMaxHp = Math.round(e.maxHp * multiplier);
          return {
            ...e,
            evolutionStage: nextStage,
            strength: Math.round(e.strength * multiplier),
            wit: Math.round(e.wit * multiplier),
            agility: Math.round(e.agility * multiplier),
            tenacity: Math.round(e.tenacity * multiplier),
            maxHp: nextMaxHp,
            hp: nextMaxHp,
            comfortGeneration: e.comfortGeneration * multiplier,
          };
        }),
      };
    });
    // handleQuestProgress is declared above this handler, so it is safe to reference here.
    if (evolved) handleQuestProgress('evolve');
  }, [state.settings.sfxEnabled, handleQuestProgress]);

  const handleExportSave = () => {
    const dataStr = JSON.stringify(state);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `geriatric_park_save_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  };

  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.version) { setState(parsed); notify("Save state loaded successfully!"); if (state.settings.sfxEnabled) audioManager.playSFX('victory'); }
        else notify("Invalid save file!");
      } catch (err) { notify("Failed to parse save file."); }
    };
    reader.readAsText(file);
  };

  const handleCopySyncCode = () => {
    try {
      const json = JSON.stringify(state);
      const code = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
      navigator.clipboard.writeText(code);
      notify("Sync Code copied to clipboard!");
      if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    } catch (e) { notify("Failed to generate Sync Code."); }
  };

  const handlePasteSyncCode = () => {
    const code = prompt("Paste your Sync Code here:");
    if (!code) return;
    try {
      const json = decodeURIComponent(atob(code).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const parsed = JSON.parse(json);
      if (parsed.version) { setState(parsed); notify("Progress restored from Sync Code!"); if (state.settings.sfxEnabled) audioManager.playSFX('victory'); }
      else notify("Invalid Sync Code!");
    } catch (err) { notify("Failed to decode Sync Code."); }
  };

  // Winning just means winning — the resident is defeated and comes off the map, same as a
  // Pokemon Go raid boss disappearing after the fight. Guiding them to the park is a
  // deliberate mid-battle action (the "Guide" button, see BattleScreen.tsx) — it's the ONLY
  // way to actually obtain a resident. Winning through combat alone does not add them; there's
  // no post-battle screen for it. (ElderInteraction.tsx / handleGuideSuccess still exist,
  // unused for now — kept as ready-made scaffolding for a future limited-time/seasonal
  // resident encounter that might want its own dedicated catch screen.)
  const handleBattleWin = useCallback((updatedTeam: Elder[]) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    const opponent = battleOpponent?.elder;
    setState(prev => {
      const { xp: nextXp, level: nextLevel } = applyXpGain(prev.xp, prev.level, 300);
      let nextAllElders = prev.allElders.map(e => {
        const updated = updatedTeam.find(ut => ut.id === e.id);
        return updated ? grantElderXp(updated, 40) : e;
      });
      return {
        ...prev, level: nextLevel, xp: nextXp, allElders: nextAllElders,
        parkCommunityScore: prev.parkCommunityScore + 10,
        season: { ...prev.season, xp: prev.season.xp + 300 },
      };
    });
    if (opponent) setWildElders(prev => prev.filter(e => e.id !== opponent.id));
    setBattleOpponent(null);
    handleQuestProgress('battle');
    setState(prev => ({ ...prev, battleWins: (prev.battleWins ?? 0) + 1 }));
    if (opponent) notify(`${opponent.name} had to sit down and wandered off. (Tip: use the Guide button during a fight to bring residents to the park!)`);
  }, [battleOpponent, state.settings.sfxEnabled, handleQuestProgress]);

  // A guided wild Elder joins exactly as it was fought: same level, stats and rarity (full HP). Rarely it arrives
  // already wearing a piece of gear, and that gear tends to be better than a typical drop.
  const CAPTURE_GEAR_CHANCE = 0.08;
  const finalizeCapturedElder = (e: Elder): Elder => {
    const captured: Elder = { ...e, hp: e.maxHp, obtainedAt: Date.now(), rarityStatsV1: true, equipment: { ...(e.equipment ?? {}) } };
    if (Math.random() < CAPTURE_GEAR_CHANCE) {
      const gearPool = ITEM_POOL.filter(i => i.type === 'Equipment');
      const pick = gearPool[Math.floor(Math.random() * gearPool.length)];
      if (pick) {
        const order = ['Common', 'Rare', 'Epic', 'Legendary'];
        const a = rollGearRarity(), b = rollGearRarity();
        const rarity = (order.indexOf(a) >= order.indexOf(b) ? a : b) as Gear['rarity']; // best of two rolls
        const slot = pick.slot as Gear['slot'];
        const item: Gear = { id: 'gear_' + Math.random().toString(36).slice(2, 11), name: pick.name, boost: pick.boost, description: pick.description, icon: pick.icon, slot, rarity, level: 1 };
        const key = gearSlotKey(slot);
        const boost = getEffectiveGearBoost(item);
        if (key === 'head') captured.wit += boost;
        if (key === 'body') captured.tenacity += boost;
        if (key === 'accessory') captured.strength += boost;
        if (key === 'charm') captured.agility += boost;
        captured.equipment[key] = item;
        captured.hp = captured.maxHp;
      }
    }
    return captured;
  };

  const handleGuideSuccess = useCallback((guidedElder: Elder) => {
    setState(prev => {
      if (prev.allElders.find(e => e.id === guidedElder.id)) return prev; // already added, guard against double-fire
      return { ...prev, allElders: [...prev.allElders, { ...finalizeCapturedElder(guidedElder), status: 'Base', isRoaming: false }] };
    });
    setGuideTarget(null);
  }, []);

  const handleGuideFail = useCallback(() => {
    setGuideTarget(null);
  }, []);

  // Mid-battle guide success (fight was skipped, not won) — adds the resident directly,
  // no post-battle modal needed since the guide already happened, and no combat-win rewards
  // since no combat was actually finished.
  const handleMidBattleGuideSuccess = useCallback((updatedTeam: Elder[]) => {
    const opponent = battleOpponent?.elder;
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => {
      const nextAllElders = prev.allElders.map(e => { const updated = updatedTeam.find(ut => ut.id === e.id); return updated || e; });
      if (opponent && !nextAllElders.find(e => e.id === opponent.id)) {
        nextAllElders.push({ ...finalizeCapturedElder(opponent), captured: true, status: 'Base', isRoaming: false });
      }
      return { ...prev, allElders: nextAllElders };
    });
    if (opponent) setWildElders(prev => prev.filter(e => e.id !== opponent.id));
    setBattleOpponent(null);
    if (opponent) notify(`You guided ${opponent.name} to the park!`);
  }, [battleOpponent, state.settings.sfxEnabled]);

  // Losing means the resident loses patience and wanders off — they're removed from the
  // map (not captured) and the player's team keeps whatever HP damage they took, so a loss
  // has a real cost. Distinct from fleeing, which is a clean retreat with no consequence.
  const handleBattleLose = useCallback((updatedTeam: Elder[]) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('hit');
    const opponent = battleOpponent?.elder;
    setState(prev => ({
      ...prev,
      allElders: prev.allElders.map(e => { const updated = updatedTeam.find(ut => ut.id === e.id); return updated || e; }),
    }));
    if (opponent) setWildElders(prev => prev.filter(e => e.id !== opponent.id));
    setBattleOpponent(null);
    if (opponent) notify(`${opponent.name} lost patience and wandered off!`);
  }, [battleOpponent, state.settings.sfxEnabled]);

  // Wheelchair Away: a deliberate mid-battle retreat. No HP consequence and the resident
  // stays put on the map — the player can come back and try again later.
  const handleBattleFlee = useCallback(() => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    const opponent = battleOpponent?.elder;
    setBattleOpponent(null);
    if (opponent) notify(`You wheeled away safely. ${opponent.name} is still nearby.`);
  }, [battleOpponent, state.settings.sfxEnabled]);

  // Elder movement
  useEffect(() => {
    const moveTimer = setInterval(() => {
      if (!state.hasStarted) return;
      const moveElderOnPath = (elder: Elder) => {
        if (!elder.isRoaming) return elder;
        let pathId = elder.pathId;
        let progress = elder.pathProgress ?? Math.random();
        let direction = elder.pathDirection ?? 1;
        const path = pathId ? WORLD_PATHS.find(p => p.id === pathId) : null;
        if (path) {
          progress += (0.0003 * direction);
          if (progress >= 1) { progress = 1; direction = -1; }
          else if (progress <= 0) { progress = 0; direction = 1; }
          const p1 = path.points[0];
          const p2 = path.points[1];
          return { ...elder, lat: p1.lat + (p2.lat - p1.lat) * progress, lng: p1.lng + (p2.lng - p1.lng) * progress, pathProgress: progress, pathDirection: direction as 1 | -1 };
        } else {
          return { ...elder, lat: elder.lat + (Math.random() - 0.5) * 0.0001, lng: elder.lng + (Math.random() - 0.5) * 0.0001 };
        }
      };
      setWildElders(prev => prev.map(moveElderOnPath));
      setState(prev => ({ ...prev, allElders: prev.allElders.map(moveElderOnPath) }));
    }, 1000);
    return () => clearInterval(moveTimer);
  }, [state.hasStarted]);

  const activeTeam = useMemo(() => state.allElders.filter(e => e.status === 'Team'), [state.allElders]);
  // Squad Loan: Elders friends have lent to us. Built from the lender's stat snapshot, never stored in the save,
  // and only added to Battle and Court (not Arenas/Raids/Friend Battle, which read your own saved squad).
  const borrowedElders = useMemo<Elder[]>(() => residentExchangeHosting
    .filter(r => r.mode === 'loan' && r.snapshot && new Date(r.ends_at).getTime() > Date.now())
    .map(r => {
      const sn = r.snapshot!;
      return {
        id: `loan_${r.id}`, name: r.elder_name, type: r.elder_type as ElderType, powerType: sn.powerType as PowerType,
        level: sn.level, rarity: sn.rarity, bio: 'On loan from a friend.', comfortGeneration: 0, captured: true, xp: 0,
        evolutionStage: (r.elder_evolution_stage ?? 0) as 0 | 1 | 2, lat: 0, lng: 0, equipment: {}, happiness: 100,
        hp: sn.maxHp, maxHp: sn.maxHp, strength: sn.strength, wit: sn.wit, agility: sn.agility, tenacity: sn.tenacity,
        status: 'Team' as const, borrowed: true, loanedBy: r.owner?.display_name || 'a friend',
      } as Elder;
    }), [residentExchangeHosting]);
  // Wild Elders scale to the player: power lands within roughly 85-115% of your strongest captured Elder (Common a bit
  // lower, Epic higher). Based on your best Elder, not the current squad, so swapping squads can't shrink opponents.
  const scaleWildElder = useCallback((w: Elder): Elder => {
    const mine = state.allElders.filter(e => e.captured && !e.borrowed);
    const topPower = Math.max(28, ...mine.map(e => getElderPower(e)));
    const topLevel = Math.max(1, ...mine.map(e => e.level));
    const tier = w.rarity === 'Legendary' ? 1.4 : w.rarity === 'Epic' ? 1.2 : w.rarity === 'Rare' ? 1.0 : 0.85;
    const spread = 0.6 + Math.random() * 0.9; // wide: from a pushover (60%) to a real threat (150%) of your best Elder
    const target = Math.max(28, topPower * tier * spread);
    const f = target / 28; // wild base stats are 10 / 10 / 8 / 8
    const maxHp = Math.max(80, Math.round(80 + (target - 28) * 1.5));
    const level = Math.min(100, Math.max(1, Math.round(topLevel * spread * Math.sqrt(tier))));
    return { ...w, level, strength: Math.round(10 * f), wit: Math.round(10 * f), tenacity: Math.round(8 * f), agility: Math.round(8 * f), maxHp, hp: maxHp };
  }, [state.allElders]);
  const battleTeam = useMemo(() => [...activeTeam, ...borrowedElders], [activeTeam, borrowedElders]);
  const roamingElders = useMemo(() => state.allElders.filter(e => e.isRoaming), [state.allElders]);
  const isDark = true; // the Light theme was removed (too bright); saves that had it simply use the dark base
  const altThemeId: 'teal' | 'purple' | '' = state.settings.altTheme === true || state.settings.altTheme === 'teal' ? 'teal' : state.settings.altTheme === 'purple' ? 'purple' : '';
  useEffect(() => {
    // Colour variants: remap the dark slate surfaces (all components already use slate-* for dark mode).
    const palettes = {
      teal:   { b950: '#031a1d', b900: '#06292d', b800: '#0a3a40', b700: '#0f4e56', c800: '#0f4e56', c700: '#17636d', c600: '#1d7681' },
      purple: { b950: '#140a22', b900: '#1d1033', b800: '#2b1a4a', b700: '#3d2766', c800: '#3d2766', c700: '#553a8a', c600: '#6b4aa8' },
    } as const;
    document.documentElement.dataset.altTheme = altThemeId;
    let el = document.getElementById('gp-alt-theme') as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = 'gp-alt-theme'; document.head.appendChild(el); }
    const c = altThemeId ? palettes[altThemeId] : null;
    const r = `html[data-alt-theme="${altThemeId}"]`;
    el.textContent = c ? `
      ${r}, ${r} body { background-color: ${c.b950} !important; }
      ${r} [class*="bg-slate-950"] { background-color: ${c.b950} !important; }
      ${r} [class*="bg-slate-900"] { background-color: ${c.b900} !important; }
      ${r} [class*="bg-slate-800"] { background-color: ${c.b800} !important; }
      ${r} [class*="bg-slate-700"] { background-color: ${c.b700} !important; }
      ${r} [class*="border-slate-800"] { border-color: ${c.c800} !important; }
      ${r} [class*="border-slate-700"] { border-color: ${c.c700} !important; }
      ${r} [class*="border-slate-600"] { border-color: ${c.c600} !important; }
    ` : '';
  }, [altThemeId]);
  const unreadMailCount = useMemo(() => state.mailbox.filter(m => !m.claimed).length, [state.mailbox]);

  // UI color theme: recolors the app's single brand/accent color (buttons,
  // active states, highlighted numbers) via CSS custom properties. See
  // applyUITheme in constants.tsx for why this is scoped to accent-only.
  useEffect(() => {
    applyUITheme(state.settings.uiTheme || DEFAULT_UI_THEME_ID);
  }, [state.settings.uiTheme]);

  const handleSetUITheme = useCallback((themeId: string) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, uiTheme: themeId } }));
  }, []);

  // Passive income breakdown for BasePanel/BankPanel.
  // Parcels' rate contribution is already folded into pensionRate at purchase
  // time (handleBuyParcel) -- there's no separate flat accrual anymore (Phase 1
  // fix, 9-8-26 evolution spec). The "parcels" line below is purely informational:
  // it's the sum of each owned parcel's individual pensionBonus, pulled back out
  // of pensionRate for display, so "base" + "elders" + "parcels" still adds up to
  // the real total rate without double-counting anything.
  const passiveBreakdown = useMemo(() => ({
    base: INITIAL_PENSION_RATE,
    assets: state.pensionRate,
  }), [state.pensionRate]);

  // BUG FOUND AND FIXED (2026-09-22): this button was visible, unlabeled as destructive, and
  // required no confirmation, on a screen shown for a moment on every single app launch. A stray or
  // curious tap here permanently wiped local progress with a single click. It's now hidden until the
  // loading screen has genuinely been stuck for a while (loadingStuckLong), relabeled to say plainly
  // what it does, and requires an explicit confirm before it does anything.
  if (!isLoaded || !cloudCheckDone) return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center text-white font-black uppercase tracking-widest gap-6 px-6 text-center">
      <div className="animate-pulse">Initializing...</div>
      {loadingStuckLong && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[13px] font-bold normal-case tracking-normal opacity-60 max-w-xs">
            Taking longer than usual. If this is stuck, you can reset LOCAL data on this device only —
            this does not touch your signed-in account's cloud save, but any progress made only on
            this device and never synced will be lost.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Reset local data on this device? This cannot be undone. Your signed-in cloud save (if any) is not affected.')) {
                // Also clear the local revision counter -- leaving it behind was a real bug: it made
                // this button ineffective for the exact case it exists to fix, since a stale high
                // revision from before the reset would still outrank a real cloud save on the next
                // sign-in and silently block the restore (see the authSession fix above, 2026-09-28).
                localStorage.removeItem(SAVE_KEY);
                localStorage.removeItem(`${SAVE_KEY}_rev`);
                window.location.reload();
              }
            }}
            className="text-[15px] opacity-70 hover:opacity-100 transition-opacity border border-white/20 px-4 py-2 rounded-xl normal-case tracking-normal"
          >
            Reset local data on this device
          </button>
        </div>
      )}
    </div>
  );

  if (!state.hasStarted) return <StarterSelection onSelect={(elder) => {
    setState(prev => ({ ...prev, hasStarted: true, allElders: [elder], xp: 100 }));
    setShowTutorial(true);
    setActiveTab('map');
  }} />;

  // Nav items with shuffleboard added
  const NAV_WITH_COURT = [
    ...NAV_ITEMS,
    { id: 'shuffleboard', label: 'Court', icon: <span className="text-xl">🥏</span> }
  ];

  return (
    <div className={`flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none items-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} onClick={() => audioManager.setMusicEnabled(state.settings.musicEnabled)}>
      <div className={`w-full max-w-lg h-full flex flex-col shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <header className={`pt-5 pb-3 px-3 sm:px-6 border-b z-[60] flex flex-wrap justify-between items-end gap-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {(() => {
              const display = resolveProfileDisplay(state.level, state.achievements, state.selectedAccountIcon, state.selectedTitle, state.courtHonors ?? [], state.modeStats, state.antiquesOwned ?? [], state.mementoItemsOwned ?? []);
              return (
                <>
                  <button
                    onClick={() => setShowProfilePicker(true)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg overflow-hidden ${isDark ? 'bg-[var(--accent-500)]' : 'bg-[var(--accent-600)]'}`}
                    title="Change profile icon & title"
                  >
                    {isImagePath(display.icon) ? <img src={display.icon} alt={display.title} className="w-full h-full object-cover" /> : display.icon}
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase">LVL {state.level}</span>
                      {authSession?.user.displayName && (
                        <span className="text-sm font-black uppercase text-[var(--accent-500)] truncate max-w-[84px] sm:max-w-[140px]" title={authSession.user.displayName}>{authSession.user.displayName}</span>
                      )}
                      <button onClick={() => setShowSettings(true)} className="p-1 text-slate-300 hover:text-[var(--accent-500)] transition-colors"><Cog6ToothIcon className="w-4 h-4" /></button>
                    </div>
                    <div className={`w-24 h-1 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full bg-[var(--accent-500)]" style={{ width: `${Math.min(100, (state.xp / xpForPlayerLevel(state.level)) * 100)}%` }}></div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleOpenFriends} className={`relative p-2 rounded-xl transition-all text-slate-300 hover:bg-slate-100`}>
              <UserGroupIcon className="w-6 h-6" />
              {(friendsData?.incoming.length ?? 0) > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-black text-white">{friendsData!.incoming.length}</div>}
            </button>
            <button onClick={() => triggerTab('mailbox')} className={`relative p-2 rounded-xl transition-all ${activeTab === 'mailbox' ? 'bg-[var(--accent-500)] text-white' : 'text-slate-300 hover:bg-slate-100'}`}>
              <EnvelopeIcon className="w-6 h-6" />
              {unreadMailCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-black text-white">{unreadMailCount}</div>}
            </button>
          </div>
          <div className="w-full flex items-center justify-between gap-2">
            <div className="text-[13px] font-black uppercase opacity-40 tracking-widest">v{GAME_VERSION}</div>
            <div className="flex items-center gap-x-3 gap-y-1 justify-end flex-wrap">
              <span className="text-[15px] font-black uppercase text-emerald-500 leading-none">{state.pensionBalance.toFixed(4)} <Gfx e="💰" size={20} /><span className="sr-only">PP</span></span>
              <span className="text-[15px] font-black uppercase text-[var(--accent-500)] leading-none">{state.legacyTokens} <Gfx e="🎟️" size={20} /></span>
              <span className="text-[15px] font-black uppercase text-amber-500 leading-none">{state.tvDinners ?? 0} <Gfx e="🍽️" size={20} /></span>
              <span className="text-[15px] font-black uppercase text-orange-500 leading-none">{Math.floor(state.buildingMaterials)} <Gfx e="🧱" size={20} /></span>
              <span className="text-[15px] font-black uppercase text-pink-400 leading-none">{state.mementos ?? 0} <Gfx e="💛" size={20} /></span>
            </div>
          </div>
        </header>

        <main className={`flex-1 relative ${activeTab === 'map' ? '' : 'overflow-y-auto overflow-x-hidden custom-scrollbar'}`}>
          {activeTab === 'map' && (
            <GameMap
              isDark={isDark} currentLocation={state.currentLocation} nearbyElders={wildElders}
              nearbyFriends={state.nearbyFriends} nearbyItems={state.nearbyItems}
              nearbyStructures={state.nearbyStructures} heldStructureIds={state.heldStructureIds}
              roamingElders={roamingElders} unreadMailCount={unreadMailCount}
              ownedParcels={state.ownedParcels} onBuyParcel={handleBuyParcel}
              onElderClick={(e) => { if (activeTeam.length === 0) return notify("Assign a squad first!"); setEncounter(scaleWildElder(e)); }}
              onItemClick={handleCollectItem} onEventClick={setActiveEvent} arenas={mapArenas} arenaFactions={Object.fromEntries((Object.entries(arenaInfo) as [string, ArenaInfo][]).map(([k, v]) => [k, v.faction]))} arenaRaids={Object.fromEntries((Object.entries(arenaInfo) as [string, ArenaInfo][]).map(([k, v]) => [k, v.raid]))} onArenaClick={handleArenaMarkerClick}
              onPlayerClick={() => triggerTab('base')} onMailClick={() => triggerTab('mailbox')}
            />
          )}
          {activeTab === 'team' && <TeamPanel isDark={isDark} onReorderTeam={handleReorderTeam} borrowed={borrowedElders} elders={state.allElders} onMoveToStandby={handleMoveToStandby} onMoveToTeam={handleMoveToTeam} onSetRoamer={id => setState(p => ({...p, allElders: p.allElders.map(e => ({...e, isRoaming: e.id === id}))}))} onEvolve={handleEvolveElder} legacyTokens={state.legacyTokens} />}
          {activeTab === 'base' && <ParkScene isDark={isDark} decor={state.parkDecor ?? []} decorOptions={INVESTMENT_TIERS.flatMap(t => t.items).map(it => ({ id: it.id, icon: it.icon, name: it.name, owned: ownedAssetCount(state.parkAssets, it.id), placed: (state.parkDecor ?? []).filter(d => d.id === it.id).length })).filter(o => o.owned > 0)} onPlaceDecor={handlePlaceDecor} onRemoveDecor={handleRemoveDecor} onDecorInvalid={() => notify('Place it on the grass, not on the path, a building or the pond.', 'bad')} wanderers={[
            ...state.allElders.filter(e => e.captured && !(e.awayUntil && e.awayUntil > Date.now())).slice(0, 30).map(e => ({ key: 'own_' + e.id, type: e.type, stage: e.evolutionStage ?? 0, name: e.name, label: 'Yours', level: e.level, rarity: e.rarity })),
            ...residentExchangeHosting.filter(r => (r.mode ?? 'visit') === 'visit').slice(0, 10).map(r => ({ key: 'vis_' + r.id, type: r.elder_type, stage: r.elder_evolution_stage ?? 0, name: r.elder_name, label: `Visiting from ${r.owner?.display_name || 'a friend'}`, level: r.snapshot?.level, rarity: r.snapshot?.rarity })),
          ]} builtAmenityIds={state.builtAmenityIds} amenityLevels={state.amenityLevels ?? {}} amenityCollectedAt={state.amenityCollectedAt ?? {}} comfortBonus={comfortOutputBonus(state.allElders) + totalProducerBoost(state.builtAmenityIds, state.amenityLevels)} rosterCount={state.allElders.filter(e => e.captured).length} capacity={getHousingCapacity(state.builtAmenityIds, state.amenityLevels, state.ownedParcels.length, state.premiumRooms ?? 0)} materials={state.buildingMaterials} onOpenGrounds={(id) => { setGroundsFocusId(id ?? null); setShowGroundsPanel(true); }} onOpenExchange={() => setShowExchangeOverview(true)} onOpenWorkshop={() => setShowWorkshop(true)} onOpenHub={() => setShowParkHub(true)} onCollect={handleCollectAmenity} />}
          {activeTab === 'shop' && <ShopPanel isDark={isDark} tokens={state.legacyTokens} diners={state.tvDinners ?? 0} onOpenPvpShop={() => setShowPvpShop(true)} mementos={state.mementos ?? 0} onOpenMementoShop={() => setShowMementoShop(true)} onBuy={item => {
            if (state.legacyTokens < item.price) return notify("Not enough tokens!");
            if (item.id === 's1') {
              const team = state.allElders.filter(e => e.status === 'Team');
              if (team.length > 0) {
                const target = team.find(e => e.hp < e.maxHp) || team[0];
                setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price, allElders: prev.allElders.map(e => e.id === target.id ? {...e, hp: Math.min(e.maxHp, e.hp + 50)} : e)}));
              }
            } else if (item.slot) {
              setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price, inventory: [...prev.inventory, { id: 'shop_'+Date.now(), name: item.name, icon: item.icon, boost: item.boost, slot: item.slot, description: item.description, rarity: 'Common', level: 1 }]}));
            } else {
              // Booster/shuffleboard items — just deduct tokens for now
              setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price}));
              notify(`${item.name} activated!`);
            }
          }} />}
          {activeTab === 'quests' && <QuestPanel isDark={isDark} quests={state.quests} achievements={state.achievements} parkScore={state.parkCommunityScore} onClaim={handleClaimQuest} modeStats={state.modeStats} claimedMilestones={state.claimedMilestones ?? []} onClaimMilestone={handleClaimMilestone} />}
          {activeTab === 'mailbox' && <MailboxPanel isDark={isDark} messages={state.mailbox} onClaim={handleClaimMail} onClaimGift={handleClaimGift} quests={state.quests} workingBuildings={state.builtAmenityIds.map(id => AMENITIES.find(a => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a && !!a.producer).map(a => ({ id: a.id, name: a.name }))} />}
          {activeTab === 'pass' && <ElderPassPanel isDark={isDark} season={state.season} onClaim={handleClaimSeasonReward} />}
          {activeTab === 'bank' && <BankPanel isDark={isDark} balance={state.pensionBalance} reserve={state.communityReserve} breakdown={state.earningsBreakdown} rate={passiveBreakdown.base + passiveBreakdown.assets} onWithdraw={() => {
            if (state.pensionBalance < WITHDRAWAL_MINIMUM) return notify(`Minimum redemption is ${WITHDRAWAL_MINIMUM.toFixed(2)} PP`);
            notify(`${state.pensionBalance.toFixed(4)} PP redeemed to your park account!`);
            setState(p => ({...p, pensionBalance: 0, earningsBreakdown: {passive: 0, active: 0, sponsorship: 0}}));
          }} onWatchAd={handleWatchVideoReward} adCount={state.adUsage.count} onWatchAdTrigger={handleWatchAdWithLimit} onInvest={handleInvest} boostUntil={state.boostUntil}
            pendingYield={state.pendingYield} onCashOutYield={handleCashOutYield}
            parkAssets={state.parkAssets} assetRatePerTick={state.pensionRate}
          />}
          {activeTab === 'shuffleboard' && isCloudAccountsConfigured() && (
            <button onClick={() => setShowThrones(true)} className="mx-6 mt-4 w-[calc(100%-3rem)] py-3 rounded-2xl font-black uppercase text-[14px] bg-amber-500 text-white shadow-lg active:scale-95 transition-transform">👑 Court Ladders (10 brackets)</button>
          )}
          {activeTab === 'shuffleboard' && (
            <ShuffleboardPanel
              notify={notify}
              isDark={isDark}
              elders={[...state.allElders, ...borrowedElders]}
              tokens={state.legacyTokens}
              shuffleboardKing={state.shuffleboard.currentKing}
              lastCourtPurseClaim={state.lastCourtPurseClaim ?? 0}
              onClaimCourtPurse={handleClaimCourtPurse}
              heldStructureIds={state.heldStructureIds}
              onPassiveResult={handlePassiveShuffleResult}
              onTournamentPlay={handleTournamentPlay}
              onChallenge={handleShuffleboardChallenge}
              challengeLadder={state.challengeLadder}
              tournamentScore={state.tournamentScore}
              tournamentEndsAt={state.tournamentEndsAt}
              tournamentThrows={safeCount(state.tournamentThrows)}
              autoPlayPaid={state.autoPlayPaid}
              passiveMatchAt={state.passiveMatchAt}
              goldenGames={state.goldenGames}
              onGoldenGamesResult={handleGoldenGamesResult}
              friends={friendsData?.friends ?? []}
              friendBattle={state.friendBattle}
              onFriendBattleResult={handleFriendBattleResult}
              leaderboard={leaderboard}
              leaderboardAvailable={isCloudAccountsConfigured()}
              leaderboardError={leaderboardError}
              onRetryLeaderboard={() => void refreshLeaderboard()}
              onLeaderboardBracket={(b: number) => void refreshLeaderboard(b)}
              onAddFriendFromLeaderboard={handleAddFriendFromLeaderboard}
            />
          )}
        </main>

        <nav className={`border-t pb-8 pt-3 px-1 flex justify-between items-center z-[60] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {NAV_WITH_COURT.map(item => (
            <button key={item.id} onClick={() => triggerTab(item.id)} className={`flex flex-col items-center flex-1 transition-all relative ${activeTab === item.id ? 'text-[var(--accent-500)] scale-110 font-bold' : 'text-slate-300'}`}>
              <div className="p-1">{item.icon}</div>
              <span className="text-[12px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {showSettings && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md">
            <div className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-300 p-2"><XMarkIcon className="w-6 h-6" /></button>
              </div>
              <div className="mb-6">
                <span className="text-sm font-black uppercase tracking-widest opacity-60">Theme</span>
                <div className="flex gap-2 mt-2">
                  {([
                    { id: '', label: 'Dark' },
                    { id: 'teal', label: 'Teal Night' },
                    { id: 'purple', label: 'Purple Night' },
                  ] as const).map(t => {
                    const active = altThemeId === t.id;
                    return (
                      <button key={t.id} onClick={() => setState(p => ({ ...p, settings: { ...p.settings, darkTheme: true, altTheme: t.id } }))}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-black uppercase border-2 ${active ? 'bg-[var(--accent-600)] border-[var(--accent-400)] text-white' : 'border-slate-600 text-slate-200'}`}>{t.label}</button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Music', key: 'musicEnabled' },
                  { label: 'SFX', key: 'sfxEnabled' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-widest opacity-60">{label}</span>
                    <button onClick={() => setState(p => ({...p, settings: {...p.settings, [key]: !p.settings[key as keyof typeof p.settings]}}))} className={`w-12 h-6 rounded-full transition-colors relative ${state.settings[key as keyof typeof state.settings] ? 'bg-[var(--accent-600)]' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.settings[key as keyof typeof state.settings] ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              {isCloudAccountsConfigured() && (
                <div className="mt-8 pt-8 border-t border-slate-100/10">
                  <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Account & Display Name</h3>
                  {authSession ? (
                    <div className="space-y-4">
                      <div className={`rounded-2xl p-4 text-sm ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <div className="font-bold">Signed in</div>
                        <div className="mt-1 break-all opacity-70">{authSession.user.email || authSession.user.id}</div>
                      </div>
                      <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <p className="text-sm font-bold mb-1">Leaderboard Display Name</p>
                        <p className={`text-[14px] mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>This is the only thing other players ever see about you — never your email.</p>
                        <div className="flex gap-2">
                          <input
                            value={displayNameInput}
                            onChange={e => setDisplayNameInput(e.target.value)}
                            maxLength={20}
                            placeholder="Choose a display name"
                            className={`flex-1 rounded-xl border p-3 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'border-slate-200'}`}
                          />
                          <button
                            type="button"
                            disabled={accountBusy || !displayNameInput.trim() || displayNameInput.trim() === (authSession.user.displayName ?? '')}
                            onClick={handleSaveDisplayName}
                            className="rounded-xl bg-[var(--accent-600)] px-4 text-sm font-black uppercase text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      <button type="button" disabled={accountBusy} onClick={handleAccountSignOut} className={`w-full rounded-2xl py-3 text-sm font-black uppercase ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>Sign out</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button type="button" disabled={accountBusy} onClick={() => startGoogleSignIn()} className="w-full rounded-2xl bg-white py-3 text-sm font-black uppercase text-slate-800 shadow ring-1 ring-slate-200 disabled:opacity-50">Continue with Google</button>
                      <div className={`text-center text-[13px] font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>or email</div>
                      <input value={accountEmail} onChange={e => setAccountEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email" className={`w-full rounded-xl border p-3 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'border-slate-200'}`} />
                      <input value={accountPassword} onChange={e => setAccountPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Password" className={`w-full rounded-xl border p-3 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'border-slate-200'}`} />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={accountBusy || !accountEmail || !accountPassword} onClick={() => handleAccountAction(() => signInWithEmail(accountEmail.trim(), accountPassword))} className="rounded-xl bg-[var(--accent-600)] py-3 text-sm font-black uppercase text-white disabled:opacity-50">Sign in</button>
                        <button type="button" disabled={accountBusy || !accountEmail || !accountPassword} onClick={() => handleAccountAction(async () => (await signUpWithEmail(accountEmail.trim(), accountPassword)).session)} className={`rounded-xl py-3 text-sm font-black uppercase disabled:opacity-50 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>Create</button>
                      </div>
                      <button type="button" disabled={accountBusy || !accountEmail} onClick={() => handleAccountAction(async () => { await sendMagicLink(accountEmail.trim()); return null; })} className={`w-full rounded-xl border py-3 text-sm font-black uppercase disabled:opacity-50 ${isDark ? 'border-slate-700' : ''}`}>Send magic link</button>
                    </div>
                  )}
                  {accountMessage && <div className="mt-4 rounded-xl bg-[var(--accent-50)] p-3 text-sm font-bold text-[var(--accent-900)]">{accountMessage}</div>}
                </div>
              )}
              <div className="mt-8 pt-8 border-t border-slate-100/10">
                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Color Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {UI_THEMES.map(theme => {
                    const isSelected = (state.settings.uiTheme || DEFAULT_UI_THEME_ID) === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSetUITheme(theme.id)}
                        title={theme.name}
                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'ring-4 ring-offset-2 scale-105' : 'active:scale-95'} ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}`}
                        style={{ backgroundColor: theme.swatch, ...(isSelected ? { boxShadow: `0 0 0 4px ${theme.swatch}` } : {}) }}
                      >
                        {isSelected && <span className="text-white text-base font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <p className={`text-sm font-bold uppercase tracking-widest mt-3 text-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {UI_THEMES.find(t => t.id === (state.settings.uiTheme || DEFAULT_UI_THEME_ID))?.name}
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100/10">
                <button onClick={() => { setShowSettings(false); setShowTutorial(true); }} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                  <span className="text-xl">📖</span>
                  <span className="text-[13px] font-black uppercase tracking-widest">How to Play</span>
                </button>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100/10">
                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Data Management</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExportSave} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ArrowDownTrayIcon className="w-5 h-5 mb-2 text-[var(--accent-500)]" />
                    <span className="text-[13px] font-black uppercase">Export</span>
                  </button>
                  <label className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer text-center">
                    <ArrowUpTrayIcon className="w-5 h-5 mb-2 text-[var(--accent-500)]" />
                    <span className="text-[13px] font-black uppercase">Import</span>
                    <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
                  </label>
                  <button onClick={handleCopySyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ClipboardDocumentIcon className="w-5 h-5 mb-2 text-emerald-500" />
                    <span className="text-[13px] font-black uppercase">Copy Sync</span>
                  </button>
                  <button onClick={handlePasteSyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ArrowPathIcon className="w-5 h-5 mb-2 text-emerald-500" />
                    <span className="text-[13px] font-black uppercase">Paste Sync</span>
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="mt-12 w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Back</button>
            </div>
          </div>
        )}

        {showProfilePicker && (() => {
          const unlocked = getUnlockedCosmetics(state.level, state.achievements, state.courtHonors ?? [], state.modeStats, state.antiquesOwned ?? [], state.mementoItemsOwned ?? []);
          const currentRank = getRankForLevel(state.level);
          const activeIconKey = state.selectedAccountIcon || `rank:${currentRank.title}`;
          const activeTitleKey = state.selectedTitle || `rank:${currentRank.title}`;
          const previewDisplay = resolveProfileDisplay(state.level, state.achievements, state.selectedAccountIcon, state.selectedTitle, state.courtHonors ?? [], state.modeStats, state.antiquesOwned ?? [], state.mementoItemsOwned ?? []);
          const completedAchievements = state.achievements.filter(a => a.completed);
          const roster = state.allElders.filter(e => e.captured);
          const favoriteElders = state.favoriteElderIds.map(id => roster.find(e => e.id === id)).filter((e): e is Elder => !!e);
          const toggleFavorite = (elderId: string) => setState(p => {
            const isFav = p.favoriteElderIds.includes(elderId);
            if (isFav) return { ...p, favoriteElderIds: p.favoriteElderIds.filter(id => id !== elderId) };
            if (p.favoriteElderIds.length >= 3) return p;
            return { ...p, favoriteElderIds: [...p.favoriteElderIds, elderId] };
          });
          return (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 bg-black/60 backdrop-blur-md">
              <div className={`rounded-[2rem] p-5 w-full max-w-lg h-[96dvh] max-h-[96dvh] flex flex-col shadow-2xl border-4 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Social Profile</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowGroundsPanel(true)} className="text-[13px] font-black uppercase text-[var(--accent-500)] tracking-widest">🏡 Grounds</button>
                    <button onClick={() => setShowBoards(true)} className="text-[13px] font-black uppercase text-[var(--accent-500)] tracking-widest">🏅 Boards</button>
                    <button onClick={handleOpenFriends} className="text-[13px] font-black uppercase text-[var(--accent-500)] tracking-widest">👥 Friends</button>
                    <button onClick={() => setShowProfilePicker(false)} className="text-slate-300 p-2"><XMarkIcon className="w-6 h-6" /></button>
                  </div>
                </div>

                {/* Preview: what a friend or leaderboard tap-through would eventually see (Phase 1
                    of the social system -- friends/visiting come later and will reuse this same card). */}
                <div className={`rounded-[2rem] p-6 mb-8 border-2 ${isDark ? 'bg-slate-800 border-[var(--accent-500-a30)]' : 'bg-slate-50 border-[var(--accent-100)]'}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl overflow-hidden ${isDark ? 'bg-[var(--accent-500)]' : 'bg-[var(--accent-600)]'}`}>
                      {isImagePath(previewDisplay.icon) ? <img src={previewDisplay.icon} alt={previewDisplay.title} className="w-full h-full object-cover" /> : previewDisplay.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-base uppercase truncate">{authSession?.user.displayName || 'Park Visitor'}</p>
                      <p className="text-[13px] font-black uppercase text-[var(--accent-500)] tracking-widest">{previewDisplay.title}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                      <p className="text-[12px] font-black uppercase opacity-60">Squad Power</p>
                      <p className="font-black text-lg text-[var(--accent-500)]">{getSquadPower(state.allElders.filter(e => e.status === 'Team'))}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                      <p className="text-[12px] font-black uppercase opacity-60">Achievements</p>
                      <p className="font-black text-lg text-[var(--accent-500)]">{completedAchievements.length}/{state.achievements.length}</p>
                    </div>
                  </div>
                  {favoriteElders.length > 0 && (
                    <div>
                      <p className="text-[12px] font-black uppercase opacity-60 mb-2">Featured Folks</p>
                      <div className="flex gap-2">
                        {favoriteElders.map(e => (
                          <div key={e.id} title={`${e.name} · ${e.rarity} · Lv.${e.level}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative border-2" style={{ borderColor: GEAR_RARITY_COLOR[e.rarity as keyof typeof GEAR_RARITY_COLOR] ?? 'transparent' }}>
                            <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} fill />
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-black leading-tight text-center py-[1px]">Lv.{e.level} · {e.rarity}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Icon</h3>
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {unlocked.map(c => (
                    <button
                      key={`icon-${c.key}`}
                      onClick={() => setState(p => ({ ...p, selectedAccountIcon: c.key }))}
                      title={c.title}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-2xl overflow-hidden border-2 transition-all ${activeIconKey === c.key ? 'border-[var(--accent-500)] ring-2 ring-[var(--accent-500)]' : isDark ? 'border-slate-800 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}
                    >
                      {isImagePath(c.icon) ? <img src={c.icon} alt={c.title} className="w-full h-full object-cover" /> : c.icon}
                    </button>
                  ))}
                </div>

                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Title</h3>
                <div className="space-y-2 mb-8">
                  {unlocked.map(c => (
                    <button
                      key={`title-${c.key}`}
                      onClick={() => setState(p => ({ ...p, selectedTitle: c.key }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTitleKey === c.key ? 'bg-[var(--accent-600)] text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600'}`}
                    >
                      {c.title}
                      {activeTitleKey === c.key && <CheckCircleIcon className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Mode Badges</h3>
                <div className="space-y-2 mb-8">
                  {MODE_BADGES.map(m => {
                    const count = modeCount(state.modeStats, m.mode);
                    const reached = modeTierReached(count);
                    const next = MODE_BADGE_TIERS[reached];
                    return (
                      <div key={m.mode} className={`px-4 py-3 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-black uppercase">{m.name}</span>
                          <span className="text-[13px] font-black">{reached > 0 ? `${MODE_BADGE_TIERS[reached - 1].icon} ${MODE_BADGE_TIERS[reached - 1].name}` : 'Not yet'}</span>
                        </div>
                        <p className="text-[12px] opacity-70">{count} total{next ? ` · next: ${next.name} at ${next.min}` : ' · max tier reached'}</p>
                      </div>
                    );
                  })}
                </div>

                <h3 className="text-[15px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Featured Folks ({favoriteElders.length}/3)</h3>
                <p className={`text-[13px] mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Pick up to 3 Elders to show off on your profile — just for show, separate from your battle Team.</p>
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {roster.length === 0 && <p className="col-span-4 text-[13px] italic opacity-50">Capture some Elders first.</p>}
                  {roster.map(e => {
                    const isFav = state.favoriteElderIds.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => toggleFavorite(e.id)}
                        title={`${e.name} · ${e.rarity} · Lv.${e.level}`}
                        disabled={!isFav && state.favoriteElderIds.length >= 3}
                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative ${isFav ? 'border-[var(--accent-500)] ring-2 ring-[var(--accent-500)]' : isDark ? 'border-slate-800' : 'border-slate-100'} disabled:opacity-30`}
                      >
                        <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} fill />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-black leading-tight text-center py-[1px]">Lv.{e.level} · {e.rarity}</div>
                        {isFav && <div className="absolute top-1 right-1 bg-[var(--accent-500)] rounded-full w-4 h-4 flex items-center justify-center"><CheckCircleIcon className="w-3 h-3 text-white" /></div>}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[15px] text-slate-600 mb-6">Icon and title are unlocked by reaching ranks and completing achievements, and can be mixed independently.</p>
                <button onClick={() => setShowProfilePicker(false)} className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Done</button>
              </div>
            </div>
          );
        })()}

        {showWorkshop && <WorkshopPanel isDark={isDark} inventory={state.inventory} elders={state.allElders} tokens={state.legacyTokens} materials={state.buildingMaterials}
          built={state.builtAmenityIds.includes('workshop')} level={state.builtAmenityIds.includes('workshop') ? getBuildingLevel(state.amenityLevels, 'workshop') : 0}
          upgradeDiscountPct={workshopUpgradeDiscountPct(state.builtAmenityIds, state.amenityLevels)} salvageBonusPct={workshopSalvageBonusPct(state.builtAmenityIds, state.amenityLevels)}
          onUpgrade={handleUpgradeGear} onSell={handleSellGear} onSellMany={handleSellGearMany} onEquip={handleEquipElder} onClose={() => setShowWorkshop(false)} />}
        {showExchangeOverview && <ExchangeOverview isDark={isDark} elders={state.allElders} mine={residentExchangeMine} hosting={residentExchangeHosting} onRecall={handleRecallResident} onClose={() => setShowExchangeOverview(false)} />}

        {showThrones && <ThronesPanel isDark={isDark} onWin={() => earnDiners(DINERS_COURT_WIN, 'Court Ladder win')} onClose={() => setShowThrones(false)} onPurse={t => setState(p => ({ ...p, legacyTokens: p.legacyTokens + t }))} onHonor={key => setState(p => (p.courtHonors ?? []).includes(key) ? p : { ...p, courtHonors: [...(p.courtHonors ?? []), key].slice(-60) })} notify={notify} />}

        {encounter && !battleOpponent && (() => {
          const wildPower = getElderPower(encounter);
          const best = Math.max(1, ...activeTeam.map(e => getElderPower(e)));
          const ratio = wildPower / best;
          const risk = ratio <= 0.8 ? { label: 'Easy', color: 'text-emerald-400' } : ratio <= 1.1 ? { label: 'Fair fight', color: 'text-amber-300' } : ratio <= 1.4 ? { label: 'Risky', color: 'text-orange-400' } : { label: 'Very dangerous', color: 'text-red-400' };
          return (
            <div className="fixed inset-0 z-[1900] bg-black/70 flex items-center justify-center p-6" onClick={() => setEncounter(null)}>
              <div className={`w-full max-w-sm rounded-[2rem] p-6 text-center ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`} onClick={ev => ev.stopPropagation()}>
                <div className="w-28 h-28 mx-auto mb-3 relative"><ElderAvatarImg type={encounter.type} stage={encounter.evolutionStage ?? 0} fill className="rounded-[2rem]" /></div>
                <h3 className="text-xl font-black uppercase">{encounter.name}</h3>
                <p className="text-[15px] font-black opacity-80">Lv {encounter.level} {encounter.rarity} · PWR {wildPower}</p>
                <p className={`text-[17px] font-black uppercase mt-2 ${risk.color}`}>{risk.label}</p>
                <p className="text-[13px] opacity-70 mt-1">Your strongest squad Elder: PWR {best}. Chance to guide them home after a win: {Math.round(GUIDE_SUCCESS_RATE[encounter.rarity] * 100)}%. Rarer Elders are stronger in every way.</p>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setEncounter(null)} className={`flex-1 py-3 rounded-2xl font-black uppercase text-[14px] ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>Walk away</button>
                  <button onClick={() => { setBattleOpponent({ elder: encounter }); setEncounter(null); }} className="flex-1 py-3 rounded-2xl font-black uppercase text-[14px] bg-[var(--accent-600)] text-white">Fight</button>
                </div>
              </div>
            </div>
          );
        })()}

        {battleOpponent && activeTeam.length > 0 && (
          <div className="fixed inset-0 z-[2000] bg-slate-900 overflow-y-auto">
            <BattleScreen playerTeam={battleTeam} opponentElder={battleOpponent.elder} onWin={handleBattleWin} onLose={handleBattleLose} onFlee={handleBattleFlee} onGuideSuccess={handleMidBattleGuideSuccess} guideBlockedReason={state.allElders.filter(e => e.captured).length >= getHousingCapacity(state.builtAmenityIds, state.amenityLevels, state.ownedParcels.length, state.premiumRooms ?? 0) ? 'Park full' : undefined} sfxEnabled={state.settings.sfxEnabled} />
          </div>
        )}

        {guideTarget && (
          <ElderInteraction elder={guideTarget} onSuccess={handleGuideSuccess} onFail={handleGuideFail} onClose={handleGuideFail} />
        )}

        {activeArenaId && (() => {
          const site = mapArenas.find(a => a.id === activeArenaId);
          if (!site) return null;
          return (
            <ArenaPanel
              isDark={isDark} site={site} info={arenaInfo[activeArenaId]} me={arenaMe}
              elders={state.allElders} stationedAt={state.stationedAt || {}} tokens={state.legacyTokens} busy={arenaBusy}
              onClose={() => setActiveArenaId(null)}
              onPickFaction={handleArenaPickFaction} onStation={handleArenaStation} onRecall={handleArenaRecall} arenaNames={Object.fromEntries(mapArenas.map((a: any) => [a.id, a.name]))}
              onAttack={handleArenaAttack} onClaimDues={handleArenaClaimDues} onRaidHit={handleArenaRaidHit}
            />
          );
        })()}

        {activeEvent && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`rounded-[3rem] p-10 w-full max-w-md flex flex-col shadow-2xl border-4 ${isDark ? 'bg-slate-800 border-[var(--accent-500-a30)]' : 'bg-white border-[var(--accent-100)]'}`}>
              <div className="text-8xl mb-8 self-center animate-bounce">{activeEvent.icon}</div>
              <h3 className="text-3xl font-black uppercase text-center mb-3 italic tracking-tighter">{activeEvent.name}</h3>
              <p className="text-center mb-8 text-sm font-bold uppercase tracking-widest opacity-60 leading-relaxed">{activeEvent.description}</p>
              {STRUCTURE_PRICING[activeEvent.type] && (
                <p className="text-center -mt-4 mb-6 text-sm font-bold uppercase tracking-widest opacity-70">
                  {eventPrice.soldOut ? 'Daily limit reached — resets at midnight UTC' : `Visits today: ${eventPrice.used}${eventPrice.cap !== undefined ? ` / ${eventPrice.cap}` : ''} · price rises with each visit`}
                </p>
              )}
              <div className="space-y-4">
                {eventResult && <div className="p-4 bg-[var(--accent-500-a10)] rounded-xl text-center text-base font-black mb-4 uppercase tracking-tighter">{eventResult}</div>}
                {activeEvent.type === 'Blitz' && <button onClick={handlePlayBingo} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Drawing...' : `Play Bingo (${eventPrice.cost} 🎟️)`} />}</button>}
                {activeEvent.type === 'Shuffleboard' && <button onClick={handlePlayShuffleboard} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Clashing...' : state.heldStructureIds.includes(activeEvent.id) ? `Defend Court (${eventPrice.cost} 🎟️)` : `Clash for Court (${eventPrice.cost} 🎟️)`} />}</button>}
                {activeEvent.type === 'Heal' && <button onClick={handleHealSquad} disabled={eventPrice.soldOut} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Heal Squad ({eventPrice.cost} <Gfx e="🎟" />)</button>}
                {activeEvent.type === 'Garden' && <button onClick={handleGardenScavenge} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Searching...' : `Scavenge Garden (${eventPrice.cost} 🎟️)`} />}</button>}
                {activeEvent.type === 'Walk' && <button onClick={handleMallWalk} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Walking...' : `Train at Mall (${eventPrice.cost} 🎟️)`} />}</button>}
                {activeEvent.type === 'Pavilion' && <button onClick={handlePavilionPotluck} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Eating...' : `Host Potluck (${eventPrice.cost} 🎟️)`} />}</button>}
                {activeEvent.type === 'Market' && <button onClick={handleMarketVisit} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{<EmojiText text={isEventPlaying ? 'Shopping...' : `Visit Market (${eventPrice.cost} 🎟️)`} />}</button>}
                <button onClick={() => { setActiveEvent(null); setEventResult(null); }} className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase active:scale-95 transition-transform">Close</button>
              </div>
            </div>
          </div>
        )}

        {showAdOverlay && (
          <AdOverlay
            onRewardEarned={handleWatchVideoReward}
            onClose={() => setShowAdOverlay(false)}
            adCount={state.adUsage.count}
            maxAds={MAX_ADS_PER_DAY}
          />
        )}

        {showFriendsPanel && (
          <FriendsPanel
            notify={notify}
            isDark={isDark}
            stationedIds={Object.keys(state.stationedAt ?? {})}
            data={friendsData}
            loading={friendsLoading}
            error={friendsError}
            lastVisitedFriends={state.lastVisitedFriends}
            onClose={() => setShowFriendsPanel(false)}
            onRefresh={refreshFriends}
            onSendRequest={handleSendFriendRequest}
            onRespond={handleRespondToFriendRequest}
            onRemove={handleRemoveFriend}
            onRandomMatch={handleRandomMatch}
            onToggleOpenToRandom={handleToggleOpenToRandom}
            onVisit={handleVisitFriend}
            onBattle={handleBattleFriendFromList}
            nearby={nearbyPlayers}
            nearbyBusy={nearbyBusy}
            nearbyError={nearbyError}
            nearbyReadyAt={nearbyReadyAt}
            onRefreshNearby={handleRefreshNearby}
            mySquadPower={getSquadPower(state.allElders.filter(e => e.status === 'Team' && e.captured))}
            friendBattle={state.friendBattle}
            hasSquad={state.allElders.some(e => e.status === 'Team' && e.captured)}
            elders={state.allElders}
            residentExchangeMine={residentExchangeMine}
            residentExchangeHosting={residentExchangeHosting}
            onPlaceResident={handlePlaceResident}
            onRecallResident={handleRecallResident}
          />
        )}

        {toasts.length > 0 && (
          <div className="fixed top-3 inset-x-0 z-[5000] flex flex-col items-center gap-2 pointer-events-none px-3">
            {toasts.map(t => (
              <div
                key={t.id}
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className={`pointer-events-auto w-full max-w-sm p-4 rounded-2xl text-center text-base font-black border shadow-lg whitespace-pre-line ${t.tone === 'good' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}
              >
                <EmojiText text={t.text} size={22} />
              </div>
            ))}
          </div>
        )}

        {showTutorial && <TutorialOverlay isDark={isDark} onComplete={() => setShowTutorial(false)} />}

        {showMementoShop && <MementoShop isDark={isDark} packPrices={packPrices} canBuy={billingAvailable() && !!authSession} buying={buyingPack} onBuyPack={handleBuyPack} pp={state.pensionBalance} onConvertPp={handleConvertPp} mementos={state.mementos ?? 0} rooms={state.premiumRooms ?? 0} owned={state.mementoItemsOwned ?? []} onBuyRoom={handleBuyPremiumRoom} onBuyItem={handleBuyMementoItem} onClose={() => setShowMementoShop(false)} />}
        {showBoards && <BoardsPanel isDark={isDark} onClose={() => setShowBoards(false)} />}
        {showPvpShop && <PvpShop isDark={isDark} diners={state.tvDinners ?? 0} earnedToday={state.dinersDay === new Date().toDateString() ? (state.dinersToday ?? 0) : 0} owned={state.antiquesOwned ?? []} onBuyAntique={handleBuyAntique} onBuyGear={handleBuyPvpGear} passes={state.pvpPasses ?? { arena: 0, raid: 0 }} onBuyPass={handleBuyPass} onClose={() => setShowPvpShop(false)} />}
        {showParkHub && (
          <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/70">
            <div className={`max-w-lg mx-auto min-h-full ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b backdrop-blur ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50/90 border-slate-200'}`}>
              <h2 className={`text-lg font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Park Hub</h2>
              <button onClick={() => setShowParkHub(false)} className="px-4 py-2 rounded-full bg-[var(--accent-600)] text-white text-[13px] font-black uppercase tracking-widest active:scale-95">✕ Close</button>
            </div>
            <BasePanel upgradeDiscountPct={workshopUpgradeDiscountPct(state.builtAmenityIds, state.amenityLevels)} salvageBonusPct={workshopSalvageBonusPct(state.builtAmenityIds, state.amenityLevels)} isDark={isDark} onEvolve={handleEvolveElder} elders={state.allElders} inventory={state.inventory} tokens={state.legacyTokens} onHealAll={handleHealSquad} onEquipElder={handleEquipElder} onUnequipElder={handleUnequipElder} onRenameElder={handleRenameElder} onUpgradeGear={handleUpgradeGear} onSellGear={handleSellGear} materials={state.buildingMaterials} onDividendClaim={handleClaimDividend} onMoveToTeam={handleMoveToTeam} onMoveToStandby={handleMoveToStandby} onScrapElder={handleScrapElder} lastCheckIn={state.lastLoginTimestamp} onCheckIn={handleDailyCheckIn} streak={state.dailyBoostsCount} lastDividendClaim={state.lastDividendClaim} shuffleboardKing={state.shuffleboard.currentKing} passiveBreakdown={passiveBreakdown} parkScore={state.parkCommunityScore} parkAssets={state.parkAssets} healPrice={getDiscountedPrice('Heal')} />
            </div>
          </div>
        )}

        {showGroundsPanel && (
          <GroundsPanel
            focusId={groundsFocusId}
            isDark={isDark}
            parcelCount={state.ownedParcels.length}
            premiumRooms={state.premiumRooms ?? 0}
            comfortBonus={comfortOutputBonus(state.allElders) + totalProducerBoost(state.builtAmenityIds, state.amenityLevels)}
            buildingMaterials={state.buildingMaterials}
            builtAmenityIds={state.builtAmenityIds}
            amenityLevels={state.amenityLevels ?? {}}
            amenityCollectedAt={state.amenityCollectedAt ?? {}}
            tickets={state.legacyTokens}
            totalRosterCount={state.allElders.filter(e => e.captured).length}
            onBuild={handleBuildAmenity}
            onUpgrade={handleUpgradeAmenity}
            onCollect={handleCollectAmenity}
            onClose={() => { setShowGroundsPanel(false); setGroundsFocusId(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
