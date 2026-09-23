import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getWorldStructures, getWorldArenas, worldCellKey } from './services/worldMap';
import { ArenaPanel } from './components/ArenaPanel';
import { fetchArenas, chooseFaction, stationElder, recallElder, attackArena, claimArenaDues, type ArenaInfo, type ArenaMe } from './services/arenaService';
import GameMap from './components/GameMap';
import BattleScreen from './components/BattleScreen';
import ElderInteraction from './components/ElderInteraction';
import StarterSelection from './components/StarterSelection';
import FriendsPanel from './components/FriendsPanel';
import GroundsPanel from './components/GroundsPanel';
import { TutorialOverlay } from './components/Tutorial';
import { AdOverlay } from './components/AdOverlay';
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
import { fetchFriendsData, sendFriendRequest, sendFriendRequestByUserId, sendRandomMatchRequest, setOpenToRandomFriends, respondToFriendRequest, removeFriend, type FriendsData } from './services/socialService';
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
  SCRAP_RARITY_MULTIPLIER,
  LEVEL_UP_TICKET_REWARD,
  RANK_TIERS,
  getRankForLevel,
  getUnlockedCosmetics,
  getSquadPower,
  ElderAvatarImg,
  resolveProfileDisplay,
  isImagePath,
  SCRAP_BASE_TICKETS,
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
  AMENITIES,
  VISIT_COOLDOWN_MS,
  VISIT_MATERIALS_REWARD,
  getHousingCapacity,
  getBuildingLevel,
  buildingUpgradeMaterials,
  buildingUpgradeTickets,
  producerStored,
  MAX_BUILDING_LEVEL,
  FRIEND_BATTLE_COOLDOWN_MS,
  FRIEND_BATTLE_WIN_MATERIALS,
  FRIEND_BATTLE_DAILY_REWARDS,
  FRIEND_BATTLE_UNREWARDED_XP_SHARE,
  rollFriendBattle,
  FRIEND_BATTLE_WIN_ELDER_XP,
  FRIEND_BATTLE_LOSS_ELDER_XP,
  FRIEND_BATTLE_WIN_COMMUNITY_SCORE,
  UI_THEMES,
  DEFAULT_UI_THEME_ID,
  applyUITheme,
} from './constants';

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
  const statBonus = STAT_BONUS_PER_LEVEL * levelsGained;
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
    darkTheme: false,
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
  const [arenaInfo, setArenaInfo] = useState<Record<string, ArenaInfo>>({});
  const [arenaMe, setArenaMe] = useState<ArenaMe | null>(null);
  const [activeArenaId, setActiveArenaId] = useState<string | null>(null);
  const [arenaBusy, setArenaBusy] = useState(false);
  const [friendsData, setFriendsData] = useState<FriendsData | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

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

  const handleOpenFriends = useCallback(() => {
    setShowFriendsPanel(true);
    void refreshFriends();
  }, [refreshFriends]);

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
        const wildRarity: 'Common' | 'Rare' | 'Epic' = Math.random() > 0.8 ? 'Epic' : Math.random() > 0.5 ? 'Rare' : 'Common';
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
    const achievements = [...INITIAL_ACHIEVEMENTS, ...NEW_ACHIEVEMENTS].map(def => savedById.get(def.id) ?? def);
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
  const refreshArenas = useCallback(async () => {
    if (!authSession || arenaSites.length === 0) return;
    try {
      const { arenas, me } = await fetchArenas(arenaSites.map(a => a.id));
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
  }, [authSession, arenaSites]);

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
  }), [runArenaAction, activeArenaId, notify]);

  const handleArenaRecall = useCallback(() => runArenaAction('Recalling', async () => {
    if (!activeArenaId) return;
    const res = await recallElder(activeArenaId);
    setState(prev => {
      const st = { ...(prev.stationedAt || {}) };
      delete st[res.elderId];
      return { ...prev, stationedAt: st };
    });
    notify('Your Elder is back home.', 'good');
  }), [runArenaAction, activeArenaId, notify]);

  const handleArenaAttack = useCallback(() => runArenaAction('Attacking', async () => {
    if (!activeArenaId) return;
    const upfront = arenaAttackCost(arenaMe?.attacksToday ?? 0);
    if (state.legacyTokens < upfront) { notify(`You need ${upfront} 🎟️ for another attack today.`, 'bad'); return; }
    const { result } = await attackArena(activeArenaId);
    const cost = arenaAttackCost(result.attackNumber - 1); // price of THIS attack, from the server's count
    const lost = result.log.length > 0 && !result.log[result.log.length - 1].won;
    const elderXp = 25 * result.rewardedWins + (lost ? 6 : 0);
    if (state.settings.sfxEnabled) audioManager.playSFX(result.beaten > 0 ? 'victory' : 'hit');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, elderXp * 2);
      return {
        ...prev,
        legacyTokens: Math.max(0, prev.legacyTokens + result.tickets - cost),
        buildingMaterials: prev.buildingMaterials + result.materials,
        xp, level,
        allElders: elderXp > 0 ? grantElderXpToTeam(prev.allElders, elderXp) : prev.allElders,
      };
    });
    const bits = [`${result.beaten}/${result.total} defenders beaten`];
    if (result.tickets > 0 || result.materials > 0) bits.push(`+${result.tickets} 🎟️ +${result.materials} 🧱`);
    if (cost > 0) bits.push(`(-${cost} 🎟️ attack fee)`);
    if (result.flipped) bits.push('The Arena is now neutral — station an Elder to claim it!');
    notify(`🏟️ ${result.arenaName}: ${bits.join(' · ')}`, result.beaten > 0 ? 'good' : 'bad');
    setState(prev => ({ ...prev, quests: prev.quests.map(q => (!q.completed && q.kind === 'arena') ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q) }));
  }), [runArenaAction, activeArenaId, arenaMe, state.legacyTokens, state.settings.sfxEnabled, notify]);

  const handleArenaClaimDues = useCallback(() => runArenaAction('Collecting Dues', async () => {
    const r = await claimArenaDues();
    notify(`💰 Arena Dues sent to your Mailbox: ${r.tickets} 🎟️ ${r.materials} 🧱`, 'good');
    void refreshMail();
  }), [runArenaAction, notify, refreshMail]);

  const handleArenaMarkerClick = useCallback((id: string) => {
    if (!authSession) { notify('Sign in to your account to join Arenas.', 'bad'); return; }
    setActiveArenaId(id);
  }, [authSession, notify]);

  // Real daily leaderboard — replaces the old simulated NPC list in ShuffleboardPanel.
  // Signed-out players simply see no leaderboard data (fetchLeaderboard throws on missing
  // auth token; caught and ignored here, since there's no stable cross-device identity to
  // rank an anonymous local player against others).
  const refreshLeaderboard = useCallback(async () => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const data = await fetchLeaderboard();
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
      if (event === 'SIGNED_IN') { void syncFromCloud(); void refreshLeaderboard(); void refreshFriends(); }
      void getCurrentSession().then(setAuthSession).catch(() => setAuthSession(null));
    });
    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, [syncFromCloud, refreshLeaderboard, refreshFriends]);

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
      // Same guard as the two autosave effects: never push before cloudSyncSettled is confirmed.
      if (isCloudAccountsConfigured() && cloudSyncSettled) {
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

        if (isCloudAccountsConfigured() && cloudSyncSettled) {
          const revision = Date.now();
          cloudRevisionRef.current = revision;
          localStorage.setItem(`${SAVE_KEY}_rev`, String(revision));
          uploadCloudSave(1, revision, state as unknown as Record<string, unknown>)
            .catch(e => console.error('Cloud save upload failed', e));
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, isLoaded, cloudSyncSettled]);

  // Flush an immediate save when the tab is hidden/closed, so a quick
  // reload right after an action doesn't lose anything still waiting
  // on the 2s debounce above.
  useEffect(() => {
    const flush = () => {
      if (!isLoaded || !state.hasStarted) return;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      // Same fix as the debounced autosave above: never push to the cloud before cloudSyncSettled.
      if (isCloudAccountsConfigured() && cloudSyncSettled) {
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
  }, [state, isLoaded, cloudSyncSettled]);

  const triggerTab = (id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setActiveTab(id);
    if (id === 'mailbox') void refreshMail(true);
  };

  // Updated quest progress tracking
  const handleQuestProgress = useCallback((kind: string, amount: number = 1) => {
    setState(prev => ({
      ...prev,
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
      let tokens = prev.legacyTokens, score = prev.parkCommunityScore, rate = prev.pensionRate;
      const achievements = prev.achievements.map(a => {
        if (a.completed) return a;
        const check = ACHIEVEMENT_CONDITIONS[a.id];
        if (!check || !check(prev)) return a;
        changed = true;
        if (a.rewardType === 'Tokens') tokens += a.rewardValue;
        else if (a.rewardType === 'CommunityScore') score += a.rewardValue;
        else if (a.rewardType === 'YieldBonus') rate += a.rewardValue;
        return { ...a, completed: true };
      });
      if (!changed) return prev;
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      return { ...prev, achievements, legacyTokens: tokens, parkCommunityScore: score, pensionRate: rate };
    });
  }, [state.allElders.length, state.parkCommunityScore, state.battleWins, state.pensionBalance, state.parkAssets, state.challengeLadder?.highestCleared, state.goldenGames?.highestLeagueCleared, state.stationedAt, state.faction]);

  const handleClaimSeasonReward = useCallback((level: number) => {
    const currentLevel = Math.min(Math.floor(state.season.xp / SEASON_XP_PER_LEVEL) + 1, SEASONAL_REWARDS.length);
    const reward = SEASONAL_REWARDS.find(r => r.level === level);
    if (!reward || level > currentLevel || state.season.claimedLevels.includes(level)) return;
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens + reward.tickets,
      season: { ...prev.season, claimedLevels: [...prev.season.claimedLevels, level] },
    }));
  }, [state.season, state.settings.sfxEnabled]);

  const handleClaimQuest = useCallback((id: string) => {
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
        quests: prev.quests.map(x => x.id === id ? { ...x, completed: true } : x)
      };
    });
  }, [state.settings.sfxEnabled]);

  const handleCollectItem = (item: MapItem) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    handleQuestProgress('collect');
    setState(prev => {
      let xpGain = 25;
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      let nextElders = [...prev.allElders];
      if (item.type === 'LegacyToken') {
        nextTokens += (item.boost || 25);
      } else if (item.type === 'Equipment') {
        nextInventory.push({ id: 'inv_' + Math.random().toString(36).substr(2, 9), name: item.name, icon: item.icon, boost: item.boost || 2, description: item.description || '', slot: item.slot || 'Accessory' });
      } else if (item.type === 'StatBoost') {
        const team = nextElders.filter(e => e.status === 'Team');
        if (team.length > 0) {
          const targetIdx = nextElders.indexOf(team[Math.floor(Math.random() * team.length)]);
          if (targetIdx !== -1) { nextElders[targetIdx].strength += 1; nextElders[targetIdx].wit += 1; }
        }
      } else if (item.type === 'Snack') {
        if (item.name === 'Old Map') { xpGain += (item.boost || 50); }
        else if (item.name === 'Hard Candy') {
          const team = nextElders.filter(e => e.status === 'Team');
          const target = team.find(e => e.hp < e.maxHp) || team[0];
          if (target) target.hp = Math.min(target.maxHp, target.hp + (item.boost || 15));
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
    if (state.pendingYield < investment.cost) { notify("Not enough Pending Yield yet — it builds up on its own, and watching a sponsor ad doubles the rate for an hour."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      pendingYield: prev.pendingYield - investment.cost,
      pensionRate: prev.pensionRate + investment.rateBoost,
      parkAssets: { ...(prev.parkAssets && typeof prev.parkAssets === 'object' ? prev.parkAssets : {}), [investment.id]: ownedAssetCount(prev.parkAssets, investment.id) + 1 },
      // Stars scale with the size of the investment (old formula was cost x 10 before the PP rescale)
      parkCommunityScore: prev.parkCommunityScore + Math.round((investment.cost / PP_SCALE_V2) * 10)
    }));
    notify(`Investment confirmed! Your passive rate rose by ${(investment.rateBoost * PASSIVE_TICKS_PER_HOUR).toFixed(6)} PP/hour.`);
  }, [state.pendingYield, state.settings.sfxEnabled]);

  const handleWatchAdWithLimit = useCallback(() => {
    if (state.adUsage.count >= MAX_ADS_PER_DAY) { notify("All of today's sponsorship slots are used — they reset at midnight."); return; }
    setShowAdOverlay(true);
  }, [state.adUsage.count]);

  const handleMoveToTeam = useCallback((id: string) => {
    if (state.stationedAt?.[id]) { notify('That Elder is defending an Arena — recall it first.', 'bad'); return; }
    setState(prev => {
      const teamCount = prev.allElders.filter(e => e.status === 'Team').length;
      if (teamCount >= TEAM_SIZE_LIMIT) { notify(`Max squad size is ${TEAM_SIZE_LIMIT}!`); return prev; }
      if (state.settings.sfxEnabled) audioManager.playSFX('click');
      return { ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Team' } : e) };
    });
  }, [state.settings.sfxEnabled, state.stationedAt, notify]);

  const handleMoveToStandby = useCallback((id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setState(prev => ({ ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Base' } : e) }));
  }, [state.settings.sfxEnabled]);

  const handleScrapElder = useCallback((id: string) => {
    const elder = state.allElders.find(e => e.id === id);
    if (!elder) return;
    if (state.stationedAt?.[id]) { notify('That Elder is defending an Arena — recall it before scrapping.', 'bad'); return; }
    if (state.allElders.filter(e => e.status === 'Team').length <= 1 && elder.status === 'Team') {
      notify("You can't scrap your last active squad member!");
      return;
    }
    // Tickets only — PP stays strictly limited to ad-revenue-backed sources (ad-watch share +
    // Dividend claims), so scrapping an Elder never creates PP out of thin air.
    const scale = elder.level * SCRAP_RARITY_MULTIPLIER[elder.rarity];
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
        friendBattle: { nextMatchAt: Date.now() + FRIEND_BATTLE_COOLDOWN_MS, rewardDay: today, rewardsToday: prevUsed + (rewarded ? 1 : 0) },
      };
    });
    return { tickets: ticketsToGrant, materials: materialsEarned, rewarded };
  }, [state.settings.sfxEnabled, state.friendBattle.rewardDay, state.friendBattle.rewardsToday, showNotice, notify, friendsData]);

  // Attack from the Friends list: same roll, same cooldown, same rewards and
  // same mail notice as the Court tab's Friend mode (both go through
  // rollFriendBattle + handleFriendBattleResult). Returns the result text.
  const handleBattleFriendFromList = useCallback((friendUserId: string): string => {
    const friend = friendsData?.friends.find(f => f.user_id === friendUserId);
    if (!friend) return 'Could not find that friend — try refreshing.';
    const squad = state.allElders.filter(e => e.status === 'Team' && e.captured);
    if (squad.length === 0) return 'Put at least one Elder on your squad first.';
    const waitMs = state.friendBattle.nextMatchAt - Date.now();
    if (waitMs > 0) return `Your squad is still resting — ready in ${Math.ceil(waitMs / 60000)} min.`;
    const { won, ticketsEarned } = rollFriendBattle(getSquadPower(squad), friend.squad_power);
    const result = handleFriendBattleResult(won, ticketsEarned, friend.user_id);
    const name = friend.display_name || 'Park Visitor';
    return won
      ? (result.rewarded ? `You beat ${name}'s squad! +${result.tickets} 🎟️ +${result.materials} 🧱` : `You beat ${name}'s squad! Today's battle rewards are used up, so this one is for bragging rights.`)
      : `${name}'s squad held their ground — the defender's bounty goes to them this time. (+Elder XP for your squad)`;
  }, [friendsData, state.allElders, state.friendBattle.nextMatchAt, handleFriendBattleResult]);

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
        const nextInventory = success ? [...prev.inventory, { id: 'garden_' + Date.now(), name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2, slot: poolItem.slot as any || 'Accessory', description: poolItem.description || '' }] : prev.inventory;
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
      if (!msg || msg.claimed) return prev;
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      const nextMaterials = prev.buildingMaterials + (msg.materials ?? 0);
      if (msg.reward) {
        if (msg.reward.type === 'Tokens') nextTokens += msg.reward.value as number;
        else if (msg.reward.type === 'Gear') nextInventory.push(msg.reward.value as Gear);
      }
      if (prev.settings.sfxEnabled) audioManager.playSFX('collect');
      return { ...prev, legacyTokens: nextTokens, inventory: nextInventory, buildingMaterials: nextMaterials, mailbox: prev.mailbox.map(m => m.id === id ? { ...m, claimed: true } : m) };
    });
  }, []);

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
        if (poolItem) nextInventory.push({ id: 'daily_' + Math.random().toString(36).substr(2, 9), name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2, description: poolItem.description || '', slot: poolItem.slot as any || 'Accessory' });
      }
      if (prev.settings.sfxEnabled) audioManager.playSFX('victory');
      return { ...prev, lastLoginTimestamp: now, dailyBoostsCount: newStreak, legacyTokens: nextTokens, inventory: nextInventory };
    });
    notify("Daily check-in successful!");
  }, [state.lastLoginTimestamp, state.settings.sfxEnabled]);

  const handleEquipElder = useCallback((elderId: string, item: Gear) => {
    setState(prev => {
      const nextInventory = prev.inventory.filter(i => i.id !== item.id);
      const nextElders = prev.allElders.map(e => {
        if (e.id !== elderId) return e;
        const updated = { ...e };
        if (item.slot === 'Head') updated.wit += item.boost;
        if (item.slot === 'Body') updated.tenacity += item.boost;
        if (item.slot === 'Accessory') { updated.strength += Math.ceil(item.boost / 2); updated.agility += Math.floor(item.boost / 2); }
        return updated;
      });
      return { ...prev, inventory: nextInventory, allElders: nextElders };
    });
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
  }, [state.settings.sfxEnabled]);

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

  const handleGuideSuccess = useCallback((guidedElder: Elder) => {
    setState(prev => {
      if (prev.allElders.find(e => e.id === guidedElder.id)) return prev; // already added, guard against double-fire
      return { ...prev, allElders: [...prev.allElders, { ...guidedElder, status: 'Base', isRoaming: false }] };
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
        nextAllElders.push({ ...opponent, captured: true, status: 'Base', isRoaming: false });
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
  const roamingElders = useMemo(() => state.allElders.filter(e => e.isRoaming), [state.allElders]);
  const isDark = state.settings.darkTheme;
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
                localStorage.removeItem(SAVE_KEY);
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
        <header className={`pt-6 pb-4 px-6 border-b z-[60] flex justify-between items-end ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3">
            {(() => {
              const display = resolveProfileDisplay(state.level, state.achievements, state.selectedAccountIcon, state.selectedTitle);
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
                        <span className="text-sm font-black uppercase text-[var(--accent-500)] truncate max-w-[140px]" title={authSession.user.displayName}>{authSession.user.displayName}</span>
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
          <div className="flex items-center gap-4">
            <button onClick={handleOpenFriends} className={`relative p-2 rounded-xl transition-all text-slate-300 hover:bg-slate-100`}>
              <UserGroupIcon className="w-6 h-6" />
              {(friendsData?.incoming.length ?? 0) > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-black text-white">{friendsData!.incoming.length}</div>}
            </button>
            <button onClick={() => triggerTab('mailbox')} className={`relative p-2 rounded-xl transition-all ${activeTab === 'mailbox' ? 'bg-[var(--accent-500)] text-white' : 'text-slate-300 hover:bg-slate-100'}`}>
              <EnvelopeIcon className="w-6 h-6" />
              {unreadMailCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-black text-white">{unreadMailCount}</div>}
            </button>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[15px] font-black uppercase text-emerald-500 leading-none">{state.pensionBalance.toFixed(4)} PP</span>
                <span className="text-[15px] font-black uppercase text-[var(--accent-500)] leading-none">{state.legacyTokens} 🎟️</span>
              </div>
              <div className="text-[13px] font-black uppercase opacity-40 tracking-widest mt-1">v{GAME_VERSION}</div>
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
              onElderClick={(e) => { if (activeTeam.length === 0) return notify("Assign a squad first!"); setBattleOpponent({ elder: e }); }}
              onItemClick={handleCollectItem} onEventClick={setActiveEvent} arenas={arenaSites} arenaFactions={Object.fromEntries((Object.entries(arenaInfo) as [string, ArenaInfo][]).map(([k, v]) => [k, v.faction]))} onArenaClick={handleArenaMarkerClick}
              onPlayerClick={() => triggerTab('base')} onMailClick={() => triggerTab('mailbox')}
            />
          )}
          {activeTab === 'team' && <TeamPanel isDark={isDark} elders={state.allElders} onMoveToStandby={handleMoveToStandby} onMoveToTeam={handleMoveToTeam} onSetRoamer={id => setState(p => ({...p, allElders: p.allElders.map(e => ({...e, isRoaming: e.id === id}))}))} onEvolve={handleEvolveElder} legacyTokens={state.legacyTokens} />}
          {activeTab === 'base' && <BasePanel isDark={isDark} elders={state.allElders} inventory={state.inventory} tokens={state.legacyTokens} onHealAll={handleHealSquad} onEquipElder={handleEquipElder} onDividendClaim={handleClaimDividend} onMoveToTeam={handleMoveToTeam} onMoveToStandby={handleMoveToStandby} onScrapElder={handleScrapElder} lastCheckIn={state.lastLoginTimestamp} onCheckIn={handleDailyCheckIn} streak={state.dailyBoostsCount} lastDividendClaim={state.lastDividendClaim} shuffleboardKing={state.shuffleboard.currentKing} passiveBreakdown={passiveBreakdown} parkScore={state.parkCommunityScore} parkAssets={state.parkAssets} healPrice={getDiscountedPrice('Heal')} />}
          {activeTab === 'shop' && <ShopPanel isDark={isDark} tokens={state.legacyTokens} onBuy={item => {
            if (state.legacyTokens < item.price) return notify("Not enough tokens!");
            if (item.id === 's1') {
              const team = state.allElders.filter(e => e.status === 'Team');
              if (team.length > 0) {
                const target = team.find(e => e.hp < e.maxHp) || team[0];
                setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price, allElders: prev.allElders.map(e => e.id === target.id ? {...e, hp: Math.min(e.maxHp, e.hp + 50)} : e)}));
              }
            } else if (item.slot) {
              setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price, inventory: [...prev.inventory, { id: 'shop_'+Date.now(), name: item.name, icon: item.icon, boost: item.boost, slot: item.slot, description: item.description }]}));
            } else {
              // Booster/shuffleboard items — just deduct tokens for now
              setState(prev => ({...prev, legacyTokens: prev.legacyTokens - item.price}));
              notify(`${item.name} activated!`);
            }
          }} />}
          {activeTab === 'quests' && <QuestPanel isDark={isDark} quests={state.quests} achievements={state.achievements} parkScore={state.parkCommunityScore} onClaim={handleClaimQuest} />}
          {activeTab === 'mailbox' && <MailboxPanel isDark={isDark} messages={state.mailbox} onClaim={handleClaimMail} />}
          {activeTab === 'pass' && <ElderPassPanel isDark={isDark} season={state.season} onClaim={handleClaimSeasonReward} />}
          {activeTab === 'bank' && <BankPanel isDark={isDark} balance={state.pensionBalance} reserve={state.communityReserve} breakdown={state.earningsBreakdown} rate={passiveBreakdown.base + passiveBreakdown.assets} onWithdraw={() => {
            if (state.pensionBalance < WITHDRAWAL_MINIMUM) return notify(`Minimum redemption is ${WITHDRAWAL_MINIMUM.toFixed(2)} PP`);
            notify(`${state.pensionBalance.toFixed(4)} PP redeemed to your park account!`);
            setState(p => ({...p, pensionBalance: 0, earningsBreakdown: {passive: 0, active: 0, sponsorship: 0}}));
          }} onWatchAd={handleWatchVideoReward} adCount={state.adUsage.count} onWatchAdTrigger={handleWatchAdWithLimit} onInvest={handleInvest} boostUntil={state.boostUntil}
            pendingYield={state.pendingYield} onCashOutYield={handleCashOutYield}
            parkAssets={state.parkAssets} assetRatePerTick={state.pensionRate}
          />}
          {activeTab === 'shuffleboard' && (
            <ShuffleboardPanel
              isDark={isDark}
              elders={state.allElders}
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
              onRetryLeaderboard={refreshLeaderboard}
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
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className={`rounded-[3rem] p-10 w-full max-w-sm flex flex-col shadow-2xl border-4 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-300 p-2"><XMarkIcon className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Dark Theme', key: 'darkTheme' },
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
          const unlocked = getUnlockedCosmetics(state.level, state.achievements);
          const currentRank = getRankForLevel(state.level);
          const activeIconKey = state.selectedAccountIcon || `rank:${currentRank.title}`;
          const activeTitleKey = state.selectedTitle || `rank:${currentRank.title}`;
          const previewDisplay = resolveProfileDisplay(state.level, state.achievements, state.selectedAccountIcon, state.selectedTitle);
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
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <div className={`rounded-[3rem] p-10 w-full max-w-sm flex flex-col shadow-2xl border-4 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Social Profile</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowGroundsPanel(true)} className="text-[13px] font-black uppercase text-[var(--accent-500)] tracking-widest">🏡 Grounds</button>
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
                          <div key={e.id} className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                            <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} fill />
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
                        title={e.name}
                        disabled={!isFav && state.favoriteElderIds.length >= 3}
                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative ${isFav ? 'border-[var(--accent-500)] ring-2 ring-[var(--accent-500)]' : isDark ? 'border-slate-800' : 'border-slate-100'} disabled:opacity-30`}
                      >
                        <ElderAvatarImg type={e.type} stage={e.evolutionStage ?? 0} fill />
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

        {battleOpponent && activeTeam.length > 0 && (
          <div className="fixed inset-0 z-[2000] bg-slate-900 overflow-y-auto">
            <BattleScreen playerTeam={activeTeam} opponentElder={battleOpponent.elder} onWin={handleBattleWin} onLose={handleBattleLose} onFlee={handleBattleFlee} onGuideSuccess={handleMidBattleGuideSuccess} guideBlockedReason={state.allElders.filter(e => e.captured).length >= getHousingCapacity(state.builtAmenityIds, state.amenityLevels, state.ownedParcels.length) ? 'Park full' : undefined} sfxEnabled={state.settings.sfxEnabled} />
          </div>
        )}

        {guideTarget && (
          <ElderInteraction elder={guideTarget} onSuccess={handleGuideSuccess} onFail={handleGuideFail} onClose={handleGuideFail} />
        )}

        {activeArenaId && (() => {
          const site = arenaSites.find(a => a.id === activeArenaId);
          if (!site) return null;
          return (
            <ArenaPanel
              isDark={isDark} site={site} info={arenaInfo[activeArenaId]} me={arenaMe}
              elders={state.allElders} stationedAt={state.stationedAt || {}} tokens={state.legacyTokens} busy={arenaBusy}
              onClose={() => setActiveArenaId(null)}
              onPickFaction={handleArenaPickFaction} onStation={handleArenaStation} onRecall={handleArenaRecall}
              onAttack={handleArenaAttack} onClaimDues={handleArenaClaimDues}
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
                {activeEvent.type === 'Blitz' && <button onClick={handlePlayBingo} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Drawing...' : `Play Bingo (${eventPrice.cost} 🎟️)`}</button>}
                {activeEvent.type === 'Shuffleboard' && <button onClick={handlePlayShuffleboard} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Clashing...' : state.heldStructureIds.includes(activeEvent.id) ? `Defend Court (${eventPrice.cost} 🎟️)` : `Clash for Court (${eventPrice.cost} 🎟️)`}</button>}
                {activeEvent.type === 'Heal' && <button onClick={handleHealSquad} disabled={eventPrice.soldOut} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Heal Squad ({eventPrice.cost} 🎟️)</button>}
                {activeEvent.type === 'Garden' && <button onClick={handleGardenScavenge} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Searching...' : `Scavenge Garden (${eventPrice.cost} 🎟️)`}</button>}
                {activeEvent.type === 'Walk' && <button onClick={handleMallWalk} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Walking...' : `Train at Mall (${eventPrice.cost} 🎟️)`}</button>}
                {activeEvent.type === 'Pavilion' && <button onClick={handlePavilionPotluck} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Eating...' : `Host Potluck (${eventPrice.cost} 🎟️)`}</button>}
                {activeEvent.type === 'Market' && <button onClick={handleMarketVisit} disabled={isEventPlaying || eventPrice.soldOut} className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Shopping...' : `Visit Market (${eventPrice.cost} 🎟️)`}</button>}
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
            isDark={isDark}
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
            battleReadyAt={state.friendBattle.nextMatchAt}
            hasSquad={state.allElders.some(e => e.status === 'Team' && e.captured)}
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
                {t.text}
              </div>
            ))}
          </div>
        )}

        {showTutorial && <TutorialOverlay isDark={isDark} onComplete={() => setShowTutorial(false)} />}

        {showGroundsPanel && (
          <GroundsPanel
            isDark={isDark}
            parcelCount={state.ownedParcels.length}
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
            onClose={() => setShowGroundsPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
