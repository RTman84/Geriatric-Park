import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import GameMap from './components/GameMap';
import BattleScreen from './components/BattleScreen';
import ElderInteraction from './components/ElderInteraction';
import StarterSelection from './components/StarterSelection';
import SocialPanel from './components/SocialPanel';
import { TutorialOverlay } from './components/Tutorial';
import { AdOverlay } from './components/AdOverlay';
import { TeamPanel, BankPanel, BasePanel, ElderPassPanel, QuestPanel, ShopPanel, MailboxPanel, ShuffleboardPanel } from './components/UIPanels';
import { audioManager } from './services/audioManager';
import { isCloudAccountsConfigured, supabase } from './services/authService';
import { fetchCloudSave, uploadCloudSave } from './services/cloudSaveService';
import { 
  Cog6ToothIcon, XMarkIcon, EnvelopeIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ClipboardDocumentIcon, ArrowPathIcon
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
  STRUCTURE_TEMPLATES,
  WORLD_PATHS,
  TRAINING_BASE_COST,
  STAT_BONUS_PER_LEVEL,
  TEAM_SIZE_LIMIT,
  AD_REVENUE_PAYOUT,
  REVENUE_SPLIT,
  MAX_ADS_PER_HOUR,
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
  ELDER_COMFORT_RATE,
  PARCEL_RENT_RATE,
  AD_BOOST_MULTIPLIER,
  AD_BOOST_DURATION_MS,
  OFFLINE_CAP_MS,
  SHUFFLEBOARD_KING_BOOST,
  MAX_NEARBY_ITEMS,
  INITIAL_ITEM_SEED,
  ITEM_SPAWN_INTERVAL_MS,
  SCRAP_RARITY_MULTIPLIER,
  LEVEL_UP_TICKET_REWARD,
  RANK_TIERS,
  getRankForLevel,
  SCRAP_BASE_TICKETS,
} from './constants';

function calculatePassiveIncome(state: GameState, elapsedMs: number): number {
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const ticks    = cappedMs / PASSIVE_TICK_MS;
  let rate = INITIAL_PENSION_RATE + state.pensionRate;
  const activeElders = state.allElders.filter(
    e => e.captured && (e.status === 'Team' || e.status === 'Porch')
  );
  rate += activeElders.reduce((sum, e) => sum + (e.comfortGeneration * ELDER_COMFORT_RATE), 0);
  rate += state.ownedParcels.length * PARCEL_RENT_RATE;
  const isShuffleboardKing = state.shuffleboard.currentKing?.id === 'player';
  if (isShuffleboardKing) rate *= SHUFFLEBOARD_KING_BOOST;
  const isAdBoosted = state.boostUntil > Date.now();
  if (isAdBoosted) rate *= AD_BOOST_MULTIPLIER;
  return rate * ticks;
}

const SAVE_KEY = 'geriatric_park_v17_save';
const NAMES = ["Arthur", "Ethel", "Barnaby", "Mildred", "Harold", "Gertrude", "Mabel", "Otis", "Edith", "Clarence", "Mortimer", "Gladys", "Cecil"];

// Applies an XP gain and rolls over into level-ups, so every XP source
// uses identical leveling math (previously several handlers added XP
// without ever checking for a level-up, so the bar could fill without
// the level actually increasing).
function applyXpGain(xp: number, level: number, amount: number): { xp: number; level: number } {
  let nextXp = xp + amount;
  let nextLevel = level;
  while (nextXp >= XP_FOR_LEVEL_UP) { nextXp -= XP_FOR_LEVEL_UP; nextLevel++; }
  return { xp: nextXp, level: nextLevel };
}

const INITIAL_STATE: GameState = {
  version: GAME_VERSION,
  isLinkedToGoogle: false,
  googleEmail: undefined,
  pensionBalance: 0.00,
  communityReserve: 5.00,
  earningsBreakdown: { passive: 0, active: 0, sponsorship: 0 },
  legacyTokens: 200,
  pensionRate: INITIAL_PENSION_RATE,
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
  quests: [
    { id: 'q1', type: 'Daily', title: 'Neighborhood Watch', description: 'Collect 5 items from the map.', progress: 0, target: 5, completed: false, rewardXP: 150, rewardTokens: 25, rewardStars: 5 },
    { id: 'q2', type: 'Daily', title: 'Gentle Persuasion', description: 'Win 2 arguments with wild residents.', progress: 0, target: 2, completed: false, rewardXP: 200, rewardTokens: 50, rewardStars: 8 },
    { id: 'q3', type: 'Daily', title: 'Court Presence', description: 'Play 3 shuffleboard matches.', progress: 0, target: 3, completed: false, rewardXP: 175, rewardTokens: 40, rewardStars: 6 },
    { id: 'q4', type: 'Daily', title: 'Sponsor Support', description: 'Watch 3 sponsor videos.', progress: 0, target: 3, completed: false, rewardXP: 100, rewardTokens: 30, rewardStars: 4 },
    { id: 'q5', type: 'Daily', title: 'Bingo Night', description: 'Participate in 2 Bingo sessions.', progress: 0, target: 2, completed: false, rewardXP: 150, rewardTokens: 35, rewardStars: 6 },
    { id: 'q6', type: 'Weekly', title: 'Bingo Marathon', description: 'Participate in 5 Bingo Blitz sessions.', progress: 0, target: 5, completed: false, rewardXP: 1000, rewardTokens: 250, rewardStars: 25 },
    { id: 'q7', type: 'Weekly', title: 'Court Dominator', description: 'Win 10 shuffleboard matches.', progress: 0, target: 10, completed: false, rewardXP: 1500, rewardTokens: 400, rewardStars: 35 },
    { id: 'q8', type: 'Weekly', title: 'Pension Earner', description: 'Earn 0.50 PP in passive income.', progress: 0, target: 50, completed: false, rewardXP: 2000, rewardTokens: 500, rewardStars: 40 },
  ],
  achievements: INITIAL_ACHIEVEMENTS,
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
  mailbox: [
    { id: 'm1', sender: 'Park Admin', subject: 'Park Keys!', body: 'Welcome to the management team. Here is your starter bonus!', reward: { type: 'Tokens', value: 50 }, claimed: false, timestamp: Date.now() }
  ],
  bingoBlitz: { phase: 'Prep', pot: 0, participants: [], timer: 60 },
  shuffleboard: { currentKing: null },
  settings: {
    darkTheme: false,
    musicEnabled: true,
    sfxEnabled: true
  },
  tournamentScore: 0,
  tournamentEndsAt: Date.now() + 24 * 60 * 60 * 1000,
  passiveMatchAt: Date.now(),
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [battleOpponent, setBattleOpponent] = useState<{ elder: Elder } | null>(null);
  const [guideTarget, setGuideTarget] = useState<Elder | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wildElders, setWildElders] = useState<Elder[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
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
    if (state.legacyTokens < cost) { alert("Need 100 Tokens to buy a parcel!"); return; }
    const { lat, lng } = state.currentLocation;
    const gridLat = Math.floor(lat * 10000) / 10000;
    const gridLng = Math.floor(lng * 10000) / 10000;
    const exists = state.ownedParcels.find(p => p.lat === gridLat && p.lng === gridLng);
    if (exists) { alert("This parcel is already owned!"); return; }
    const rarities: ('Common' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Rare', 'Epic', 'Legendary'];
    const weights = [0.7, 0.2, 0.08, 0.02];
    const rand = Math.random();
    let cumulative = 0;
    let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) { rarity = rarities[i]; break; }
    }
    const bonusMap = { Common: 0.00001, Rare: 0.00002, Epic: 0.00005, Legendary: 0.0001 };
    const bonus = bonusMap[rarity];
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens - cost,
      pensionRate: prev.pensionRate + bonus,
      ownedParcels: [...prev.ownedParcels, {
        id: `parcel_${Date.now()}`, lat: gridLat, lng: gridLng,
        ownerId: 'player', type: rarity, pensionBonus: bonus
      }]
    }));
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    alert(`You bought a ${rarity} parcel! Pension rate increased.`);
  }, [state.currentLocation, state.legacyTokens, state.ownedParcels, state.settings.sfxEnabled]);

  // Passive income tick
  useEffect(() => {
    if (!state.hasStarted) return;
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const elapsedMs = now - prev.lastActiveTime;
        const earned = calculatePassiveIncome(prev, elapsedMs);
        return {
          ...prev,
          pensionBalance: prev.pensionBalance + earned,
          earningsBreakdown: { ...prev.earningsBreakdown, passive: prev.earningsBreakdown.passive + earned },
          lastActiveTime: now,
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
      const earned = calculatePassiveIncome(prev, elapsedMs);
      const offlineHours = Math.min(elapsedMs / (60 * 60 * 1000), 8).toFixed(1);
      console.log(`[Passive] Away ${offlineHours}hrs — credited ${earned.toFixed(5)} PP`);
      return {
        ...prev,
        pensionBalance: prev.pensionBalance + earned,
        earningsBreakdown: { ...prev.earningsBreakdown, passive: prev.earningsBreakdown.passive + earned },
        lastActiveTime: now,
      };
    });
  }, [state.hasStarted]);

  // Ad reset check
  useEffect(() => {
    const checkReset = setInterval(() => {
      setState(prev => {
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - prev.adUsage.lastReset > oneHour) {
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
        return {
          id: 'wild_' + Math.random().toString(36).substr(2, 9),
          name: NAMES[Math.floor(Math.random() * NAMES.length)],
          type,
          powerType: [PowerType.PHYSICAL, PowerType.SOCIAL, PowerType.TECH][Math.floor(Math.random() * 3)],
          level: Math.floor(Math.random() * 5) + 1,
          rarity: Math.random() > 0.8 ? 'Epic' : Math.random() > 0.5 ? 'Rare' : 'Common',
          bio: '', comfortGeneration: 0.0001, captured: false,
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
    if (state.nearbyStructures.length === 0) {
      const newStructures = Array.from({ length: 12 }, (_, i) => {
        const template = STRUCTURE_TEMPLATES[Math.floor(Math.random() * STRUCTURE_TEMPLATES.length)];
        const sLat = lat + (Math.random() - 0.5) * 0.04;
        const sLng = lng + (Math.random() - 0.5) * 0.04;
        return { id: `struct_${sLat.toFixed(4)}_${sLng.toFixed(4)}`, ...template, lat: sLat, lng: sLng } as Structure;
      });
      setState(prev => ({ ...prev, nearbyStructures: newStructures }));
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
      return { ...s, tournamentScore: 0, tournamentEndsAt: Date.now() + 24 * 60 * 60 * 1000 };
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

  // Load save
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setState(applySeasonRollover(applyTournamentRollover({ ...INITIAL_STATE, ...parsed, version: GAME_VERSION })));
        }
      }
    } catch (e) { console.error("Load failed", e); }
    finally { setIsLoaded(true); }
  }, []);

  // Level-up rewards: fires whenever state.level increases from ANY XP source,
  // rather than threading a payout through every individual handler. Guarded by
  // isLoaded so restoring a save at level 8 doesn't look like "leveling up".
  // Tickets only — PP stays limited to ad-watch share + Dividend claims, so leveling
  // up (an XP-driven, unbounded-frequency event) never creates PP out of thin air.
  const prevLevelRef = useRef<number>(state.level);
  useEffect(() => {
    if (!isLoaded) { prevLevelRef.current = state.level; return; }
    if (state.level > prevLevelRef.current) {
      const levelsGained = state.level - prevLevelRef.current;
      const ticketReward = LEVEL_UP_TICKET_REWARD * levelsGained;
      setState(prev => ({
        ...prev,
        legacyTokens: prev.legacyTokens + ticketReward,
      }));
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const rank = getRankForLevel(state.level);
      alert(`🎉 Level ${state.level}! ${rank.icon} ${rank.title}\n+${ticketReward} 🎟️`);
    }
    prevLevelRef.current = state.level;
  }, [state.level, isLoaded]);

  // Cloud save sync: pull the cloud save on sign-in (initial session or later),
  // and keep whichever copy (local vs cloud) has the higher revision number.
  const cloudRevisionRef = useRef<number>(Number(localStorage.getItem(`${SAVE_KEY}_rev`)) || 0);
  const syncFromCloud = useCallback(async () => {
    if (!isCloudAccountsConfigured()) return;
    try {
      const cloudSave = await fetchCloudSave();
      if (cloudSave && cloudSave.client_revision > cloudRevisionRef.current) {
        cloudRevisionRef.current = cloudSave.client_revision;
        localStorage.setItem(`${SAVE_KEY}_rev`, String(cloudSave.client_revision));
        setState(applySeasonRollover(applyTournamentRollover({ ...INITIAL_STATE, ...(cloudSave.save_data as object), version: GAME_VERSION })));
      }
    } catch (e) { console.error('Cloud save fetch failed', e); }
  }, []);

  useEffect(() => {
    if (!isCloudAccountsConfigured() || !supabase) return;
    void syncFromCloud();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void syncFromCloud();
    });
    return () => sub.subscription.unsubscribe();
  }, [syncFromCloud]);

  useEffect(() => {
    if (state.hasStarted) {
      audioManager.setMusicEnabled(state.settings.musicEnabled);
      audioManager.switchTrack(battleOpponent ? 'battle' : 'main');
    }
  }, [state.settings.musicEnabled, state.hasStarted, battleOpponent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoaded && state.hasStarted) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
        catch (e) { console.error("Save failed", e); }

        if (isCloudAccountsConfigured()) {
          const revision = Date.now();
          cloudRevisionRef.current = revision;
          localStorage.setItem(`${SAVE_KEY}_rev`, String(revision));
          uploadCloudSave(1, revision, state as unknown as Record<string, unknown>)
            .catch(e => console.error('Cloud save upload failed', e));
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, isLoaded]);

  // Flush an immediate save when the tab is hidden/closed, so a quick
  // reload right after an action doesn't lose anything still waiting
  // on the 2s debounce above.
  useEffect(() => {
    const flush = () => {
      if (!isLoaded || !state.hasStarted) return;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      if (isCloudAccountsConfigured()) {
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
  }, [state, isLoaded]);

  const triggerTab = (id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setActiveTab(id);
  };

  // Updated quest progress tracking
  const handleQuestProgress = useCallback((type: string, amount: number = 1) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q => {
        if (q.completed) return q;
        let matched = false;
        if (type === 'collect' && q.title.includes('Watch')) matched = true;
        if (type === 'battle' && q.title.includes('Gentle')) matched = true;
        if (type === 'bingo' && (q.title.includes('Bingo') || q.title.includes('bingo'))) matched = true;
        if (type === 'shuffleboard' && q.title.includes('Court')) matched = true;
        if (type === 'tournament' && q.title.includes('Court')) matched = true;
        if (type === 'challenge' && q.title.includes('Court')) matched = true;
        if (type === 'ad' && q.title.includes('Sponsor')) matched = true;
        if (matched) {
          const newProgress = Math.min(q.target, q.progress + amount);
          return { ...q, progress: newProgress };
        }
        return q;
      })
    }));
  }, []);

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
      alert(`Community pool is still recharging. Check back in ${minutesLeft} minutes!`);
      return;
    }
    if (state.communityReserve <= 0.01) { alert("Community Reserve is low! Watch some local ads or win battles to fuel the shared pool."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    const basePayout = 0.01;
    const scoreBonus = state.parkCommunityScore * 0.0002;
    const totalPayout = Math.min(state.communityReserve, basePayout + scoreBonus);
    const tokenBonus = Math.floor(state.parkCommunityScore / 10) + 5;
    setState(prev => ({
      ...prev, lastDividendClaim: now,
      pensionBalance: prev.pensionBalance + totalPayout,
      communityReserve: Math.max(0, prev.communityReserve - totalPayout),
      legacyTokens: prev.legacyTokens + tokenBonus,
      earningsBreakdown: { ...prev.earningsBreakdown, active: prev.earningsBreakdown.active + totalPayout }
    }));
    alert(`Successfully claimed a Park Dividend of ${totalPayout.toFixed(3)} PP and ${tokenBonus} 🎟️!`);
  }, [state.lastDividendClaim, state.communityReserve, state.parkCommunityScore, state.settings.sfxEnabled]);

  const handleInvest = useCallback((investment: any) => {
    if (state.pensionBalance < investment.cost) { alert("Insufficient Pension Balance! Watch local ads or claim dividends to earn more."); return; }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      pensionBalance: prev.pensionBalance - investment.cost,
      pensionRate: prev.pensionRate + investment.rateBoost,
      parkCommunityScore: prev.parkCommunityScore + Math.floor(investment.cost * 10)
    }));
    alert(`Investment confirmed! Your Pension Rate has increased by ${(investment.rateBoost * 3600).toFixed(4)} PP/hour.`);
  }, [state.pensionBalance, state.settings.sfxEnabled]);

  const handleWatchAdWithLimit = useCallback(() => {
    if (state.adUsage.count >= MAX_ADS_PER_HOUR) { alert("All sponsorship slots for this hour are full! Come back later."); return; }
    setShowAdOverlay(true);
  }, [state.adUsage.count]);

  const handleMoveToTeam = useCallback((id: string) => {
    setState(prev => {
      const teamCount = prev.allElders.filter(e => e.status === 'Team').length;
      if (teamCount >= TEAM_SIZE_LIMIT) { alert(`Max squad size is ${TEAM_SIZE_LIMIT}!`); return prev; }
      if (state.settings.sfxEnabled) audioManager.playSFX('click');
      return { ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Team' } : e) };
    });
  }, [state.settings.sfxEnabled]);

  const handleMoveToStandby = useCallback((id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setState(prev => ({ ...prev, allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Base' } : e) }));
  }, [state.settings.sfxEnabled]);

  const handleScrapElder = useCallback((id: string) => {
    const elder = state.allElders.find(e => e.id === id);
    if (!elder) return;
    if (state.allElders.filter(e => e.status === 'Team').length <= 1 && elder.status === 'Team') {
      alert("You can't scrap your last active squad member!");
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
    alert(`${elder.name} was scrapped for ${ticketPayout} 🎟️.`);
  }, [state.allElders, state.settings.sfxEnabled]);

  const handleHealSquad = useCallback(() => {
    if (state.legacyTokens < 25) return alert("Need 25 Tokens!");
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({ ...prev, legacyTokens: prev.legacyTokens - 25, allElders: prev.allElders.map(e => ({ ...e, hp: e.maxHp })) }));
    alert("Squad restored!");
    setActiveEvent(null);
  }, [state.legacyTokens, state.settings.sfxEnabled]);

  const handlePlayShuffleboard = useCallback(() => {
    const team = state.allElders.filter(e => e.status === 'Team');
    if (team.length === 0) return alert("Assign a squad first!");
    if (state.legacyTokens < 20) return alert("Need 20 Tokens!");
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
            ...prev, legacyTokens: prev.legacyTokens - 20, xp, level,
            heldStructureIds: isAlreadyHeld ? prev.heldStructureIds : [...prev.heldStructureIds, activeEvent.id],
            shuffleboard: { currentKing: { id: 'player', name: 'Your Squad', elderIcon: '🧑‍🦽', heldSince: Date.now(), teamIds: team.map(e => e.id) } }
          };
        } else {
          const { xp, level } = applyXpGain(prev.xp, prev.level, 25);
          return { ...prev, legacyTokens: prev.legacyTokens - 20, xp, level };
        }
      });
      handleQuestProgress('shuffleboard');
      setEventResult(success ? "Your squad holds the court!" : "The court kings were too tough!");
      setIsEventPlaying(false);
    }, 1500);
  }, [state.legacyTokens, state.allElders, state.settings.sfxEnabled, activeEvent, handleQuestProgress]);

  // Shuffleboard panel handlers
  const handlePassiveShuffleResult = useCallback((won: boolean, tokensEarned: number) => {
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, won ? 100 : 25);
      return {
        ...prev,
        legacyTokens: prev.legacyTokens + tokensEarned,
        xp, level,
        parkCommunityScore: prev.parkCommunityScore + (won ? 15 : 5),
        passiveMatchAt: Date.now() + 10 * 60 * 1000,
      };
    });
    handleQuestProgress('shuffleboard');
  }, [state.settings.sfxEnabled, handleQuestProgress]);

  const handleTournamentPlay = useCallback((score: number) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, 75);
      return {
        ...prev,
        tournamentScore: Math.max(prev.tournamentScore, score),
        xp, level,
        legacyTokens: prev.legacyTokens + 10,
      };
    });
    handleQuestProgress('tournament');
  }, [state.settings.sfxEnabled, handleQuestProgress]);

  const handleShuffleboardChallenge = useCallback((stakeTokens: number, won: boolean) => {
    if (state.settings.sfxEnabled) audioManager.playSFX(won ? 'victory' : 'hit');
    setState(prev => {
      const { xp, level } = applyXpGain(prev.xp, prev.level, won ? 150 : 30);
      return {
        ...prev,
        legacyTokens: prev.legacyTokens + (won ? stakeTokens : -stakeTokens),
        xp, level,
        parkCommunityScore: prev.parkCommunityScore + (won ? 20 : 5),
      };
    });
    handleQuestProgress('challenge');
  }, [state.settings.sfxEnabled, handleQuestProgress]);

  const handleGardenScavenge = useCallback(() => {
    if (state.legacyTokens < 10) return alert("Need 10 Tokens!");
    setIsEventPlaying(true);
    setTimeout(() => {
      const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      const success = Math.random() > 0.3;
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'collect' : 'hit');
      setState(prev => {
        const nextInventory = success ? [...prev.inventory, { id: 'garden_' + Date.now(), name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2, slot: poolItem.slot as any || 'Accessory', description: poolItem.description || '' }] : prev.inventory;
        const { xp, level } = applyXpGain(prev.xp, prev.level, 50);
        return { ...prev, legacyTokens: prev.legacyTokens - 10, xp, level, inventory: nextInventory };
      });
      setEventResult(success ? `You found a ${poolItem.name}!` : "You only found some weeds today.");
      setIsEventPlaying(false);
    }, 1200);
  }, [state.legacyTokens, state.settings.sfxEnabled]);

  const handleMallWalk = useCallback(() => {
    if (state.legacyTokens < 15) return alert("Need 15 Tokens!");
    setIsEventPlaying(true);
    setTimeout(() => {
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const xpGain = 250;
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, xpGain);
        return { ...prev, legacyTokens: prev.legacyTokens - 15, xp, level };
      });
      setEventResult(`Great workout! Your squad gained ${xpGain} XP.`);
      setIsEventPlaying(false);
    }, 1500);
  }, [state.legacyTokens, state.settings.sfxEnabled]);

  const handlePavilionPotluck = useCallback(() => {
    if (state.legacyTokens < 10) return alert("Need 10 Tokens!");
    setIsEventPlaying(true);
    setTimeout(() => {
      if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      const scoreGain = 50;
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, 50);
        return { ...prev, legacyTokens: prev.legacyTokens - 10, parkCommunityScore: prev.parkCommunityScore + scoreGain, xp, level };
      });
      setEventResult(`The potluck was a hit! Community Score +${scoreGain}.`);
      setIsEventPlaying(false);
    }, 1500);
  }, [state.legacyTokens, state.settings.sfxEnabled]);

  const handleMarketVisit = useCallback(() => {
    const team = state.allElders.filter(e => e.status === 'Team');
    if (team.length === 0) return alert("Assign a squad first!");
    if (state.legacyTokens < 30) return alert("Need 30 Tokens!");
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
        return { ...prev, legacyTokens: prev.legacyTokens - 30, allElders: nextElders, xp, level };
      });
      setEventResult(`Fresh produce! Your whole squad's ${statNames[boostedStat]} +2.`);
      setIsEventPlaying(false);
    }, 1500);
  }, [state.legacyTokens, state.allElders, state.settings.sfxEnabled]);

  const handlePlayBingo = useCallback(() => {
    if (state.legacyTokens < 10) return alert("Need 10 Tokens!");
    setIsEventPlaying(true);
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setTimeout(() => {
      const success = Math.random() > 0.6;
      const prize = success ? 50 : 5;
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'victory' : 'hit');
      setState(prev => {
        const { xp, level } = applyXpGain(prev.xp, prev.level, success ? 100 : 20);
        return {
          ...prev, legacyTokens: prev.legacyTokens - 10 + prize,
          xp, level,
          parkCommunityScore: prev.parkCommunityScore + (success ? 10 : 2)
        };
      });
      setEventResult(success ? `BINGO! You won ${prize} 🎟️ and boosted the park score!` : `No luck this time. You got a consolation prize of ${prize} 🎟️.`);
      setIsEventPlaying(false);
      handleQuestProgress('bingo');
    }, 2000);
  }, [state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

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
      if (msg.reward) {
        if (msg.reward.type === 'Tokens') nextTokens += msg.reward.value as number;
        else if (msg.reward.type === 'Gear') nextInventory.push(msg.reward.value as Gear);
      }
      if (prev.settings.sfxEnabled) audioManager.playSFX('collect');
      return { ...prev, legacyTokens: nextTokens, inventory: nextInventory, mailbox: prev.mailbox.map(m => m.id === id ? { ...m, claimed: true } : m) };
    });
  }, []);

  const handleDailyCheckIn = useCallback(() => {
    const now = Date.now();
    const today = new Date(now).setHours(0,0,0,0);
    const last = state.lastLoginTimestamp ? new Date(state.lastLoginTimestamp).setHours(0,0,0,0) : 0;
    if (today === last) return alert("Already checked in today!");
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
    alert("Daily check-in successful!");
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
        if (parsed.version) { setState(parsed); alert("Save state loaded successfully!"); if (state.settings.sfxEnabled) audioManager.playSFX('victory'); }
        else alert("Invalid save file!");
      } catch (err) { alert("Failed to parse save file."); }
    };
    reader.readAsText(file);
  };

  const handleCopySyncCode = () => {
    try {
      const json = JSON.stringify(state);
      const code = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
      navigator.clipboard.writeText(code);
      alert("Sync Code copied to clipboard!");
      if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    } catch (e) { alert("Failed to generate Sync Code."); }
  };

  const handlePasteSyncCode = () => {
    const code = prompt("Paste your Sync Code here:");
    if (!code) return;
    try {
      const json = decodeURIComponent(atob(code).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const parsed = JSON.parse(json);
      if (parsed.version) { setState(parsed); alert("Progress restored from Sync Code!"); if (state.settings.sfxEnabled) audioManager.playSFX('victory'); }
      else alert("Invalid Sync Code!");
    } catch (err) { alert("Failed to decode Sync Code."); }
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
      let nextAllElders = prev.allElders.map(e => { const updated = updatedTeam.find(ut => ut.id === e.id); return updated || e; });
      return {
        ...prev, level: nextLevel, xp: nextXp, allElders: nextAllElders,
        parkCommunityScore: prev.parkCommunityScore + 10,
        season: { ...prev.season, xp: prev.season.xp + 300 },
        communityReserve: prev.communityReserve + 0.005
      };
    });
    if (opponent) setWildElders(prev => prev.filter(e => e.id !== opponent.id));
    setBattleOpponent(null);
    handleQuestProgress('battle');
    if (opponent) alert(`${opponent.name} had to sit down and wandered off. (Tip: use the Guide button during a fight to bring residents to the park!)`);
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
    if (opponent) alert(`You guided ${opponent.name} to the park!`);
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
    if (opponent) alert(`${opponent.name} lost patience and wandered off!`);
  }, [battleOpponent, state.settings.sfxEnabled]);

  // Wheelchair Away: a deliberate mid-battle retreat. No HP consequence and the resident
  // stays put on the map — the player can come back and try again later.
  const handleBattleFlee = useCallback(() => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    const opponent = battleOpponent?.elder;
    setBattleOpponent(null);
    if (opponent) alert(`You wheeled away safely. ${opponent.name} is still nearby.`);
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

  // Passive income breakdown for BasePanel
  const passiveBreakdown = useMemo(() => {
    const activeElders = state.allElders.filter(e => e.captured && (e.status === 'Team' || e.status === 'Porch'));
    return {
      base: INITIAL_PENSION_RATE + state.pensionRate,
      elders: activeElders.reduce((sum, e) => sum + (e.comfortGeneration * ELDER_COMFORT_RATE), 0),
      parcels: state.ownedParcels.length * PARCEL_RENT_RATE,
    };
  }, [state.allElders, state.pensionRate, state.ownedParcels]);

  if (!isLoaded) return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center text-white font-black uppercase tracking-widest gap-6">
      <div className="animate-pulse">Initializing...</div>
      <button onClick={() => { localStorage.removeItem(SAVE_KEY); window.location.reload(); }} className="text-[10px] opacity-40 hover:opacity-100 transition-opacity border border-white/20 px-4 py-2 rounded-xl">Clear Save & Reset</button>
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`} title={getRankForLevel(state.level).title}>{getRankForLevel(state.level).icon}</div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase">LVL {state.level}</span>
                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">{getRankForLevel(state.level).title}</span>
                <button onClick={() => setShowSettings(true)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"><Cog6ToothIcon className="w-4 h-4" /></button>
              </div>
              <div className={`w-24 h-1 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="h-full bg-indigo-500" style={{ width: `${(state.xp / XP_FOR_LEVEL_UP) * 100}%` }}></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => triggerTab('mailbox')} className={`relative p-2 rounded-xl transition-all ${activeTab === 'mailbox' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              <EnvelopeIcon className="w-6 h-6" />
              {unreadMailCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white">{unreadMailCount}</div>}
            </button>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[10px] font-black uppercase text-emerald-500 leading-none">{state.pensionBalance.toFixed(2)} PP</span>
                <span className="text-[10px] font-black uppercase text-indigo-500 leading-none">{state.legacyTokens} 🎟️</span>
              </div>
              <div className="text-[8px] font-black uppercase opacity-40 tracking-widest mt-1">v{GAME_VERSION}</div>
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
              onElderClick={(e) => { if (activeTeam.length === 0) return alert("Assign a squad first!"); setBattleOpponent({ elder: e }); }}
              onItemClick={handleCollectItem} onEventClick={setActiveEvent}
              onPlayerClick={() => triggerTab('base')} onMailClick={() => triggerTab('mailbox')}
            />
          )}
          {activeTab === 'team' && <TeamPanel isDark={isDark} elders={state.allElders} onMoveToStandby={handleMoveToStandby} onMoveToTeam={handleMoveToTeam} onSetRoamer={id => setState(p => ({...p, allElders: p.allElders.map(e => ({...e, isRoaming: e.id === id}))}))} />}
          {activeTab === 'base' && <BasePanel isDark={isDark} elders={state.allElders} inventory={state.inventory} tokens={state.legacyTokens} onHealAll={handleHealSquad} onEquipElder={handleEquipElder} onDividendClaim={handleClaimDividend} onMoveToTeam={handleMoveToTeam} onMoveToStandby={handleMoveToStandby} onScrapElder={handleScrapElder} lastCheckIn={state.lastLoginTimestamp} onCheckIn={handleDailyCheckIn} streak={state.dailyBoostsCount} lastDividendClaim={state.lastDividendClaim} shuffleboardKing={state.shuffleboard.currentKing} passiveBreakdown={passiveBreakdown} parkScore={state.parkCommunityScore} />}
          {activeTab === 'shop' && <ShopPanel isDark={isDark} tokens={state.legacyTokens} onBuy={item => {
            if (state.legacyTokens < item.price) return alert("Not enough tokens!");
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
              alert(`${item.name} activated!`);
            }
          }} />}
          {activeTab === 'quests' && <QuestPanel isDark={isDark} quests={state.quests} achievements={state.achievements} parkScore={state.parkCommunityScore} onClaim={handleClaimQuest} />}
          {activeTab === 'mailbox' && <MailboxPanel isDark={isDark} messages={state.mailbox} onClaim={handleClaimMail} />}
          {activeTab === 'pass' && <ElderPassPanel isDark={isDark} season={state.season} onClaim={handleClaimSeasonReward} />}
          {activeTab === 'bank' && <BankPanel isDark={isDark} balance={state.pensionBalance} reserve={state.communityReserve} breakdown={state.earningsBreakdown} rate={state.pensionRate} onWithdraw={() => {
            if (state.pensionBalance < WITHDRAWAL_MINIMUM) return alert("Minimum redemption is 10.00 PP");
            alert(`${state.pensionBalance.toFixed(2)} PP redeemed to your park account!`);
            setState(p => ({...p, pensionBalance: 0, earningsBreakdown: {passive: 0, active: 0, sponsorship: 0}}));
          }} onWatchAd={handleWatchVideoReward} adCount={state.adUsage.count} onWatchAdTrigger={handleWatchAdWithLimit} onInvest={handleInvest} boostUntil={state.boostUntil} />}
          {activeTab === 'shuffleboard' && (
            <ShuffleboardPanel
              isDark={isDark}
              elders={state.allElders}
              tokens={state.legacyTokens}
              shuffleboardKing={state.shuffleboard.currentKing}
              heldStructureIds={state.heldStructureIds}
              onPassiveResult={handlePassiveShuffleResult}
              onTournamentPlay={handleTournamentPlay}
              onChallenge={handleShuffleboardChallenge}
              tournamentScore={state.tournamentScore}
              tournamentEndsAt={state.tournamentEndsAt}
              passiveMatchAt={state.passiveMatchAt}
            />
          )}
        </main>

        <nav className={`border-t pb-8 pt-3 px-1 flex justify-between items-center z-[60] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {NAV_WITH_COURT.map(item => (
            <button key={item.id} onClick={() => triggerTab(item.id)} className={`flex flex-col items-center flex-1 transition-all relative ${activeTab === item.id ? 'text-indigo-500 scale-110 font-bold' : 'text-slate-400'}`}>
              <div className="p-1">{item.icon}</div>
              <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {showSettings && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className={`rounded-[3rem] p-10 w-full max-w-sm flex flex-col shadow-2xl border-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 p-2"><XMarkIcon className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Dark Theme', key: 'darkTheme' },
                  { label: 'Music', key: 'musicEnabled' },
                  { label: 'SFX', key: 'sfxEnabled' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">{label}</span>
                    <button onClick={() => setState(p => ({...p, settings: {...p.settings, [key]: !p.settings[key as keyof typeof p.settings]}}))} className={`w-12 h-6 rounded-full transition-colors relative ${state.settings[key as keyof typeof state.settings] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.settings[key as keyof typeof state.settings] ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100/10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Data Management</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExportSave} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ArrowDownTrayIcon className="w-5 h-5 mb-2 text-indigo-500" />
                    <span className="text-[8px] font-black uppercase">Export</span>
                  </button>
                  <label className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer text-center">
                    <ArrowUpTrayIcon className="w-5 h-5 mb-2 text-indigo-500" />
                    <span className="text-[8px] font-black uppercase">Import</span>
                    <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
                  </label>
                  <button onClick={handleCopySyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ClipboardDocumentIcon className="w-5 h-5 mb-2 text-emerald-500" />
                    <span className="text-[8px] font-black uppercase">Copy Sync</span>
                  </button>
                  <button onClick={handlePasteSyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                    <ArrowPathIcon className="w-5 h-5 mb-2 text-emerald-500" />
                    <span className="text-[8px] font-black uppercase">Paste Sync</span>
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="mt-12 w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Back</button>
            </div>
          </div>
        )}

        {battleOpponent && activeTeam.length > 0 && (
          <div className="fixed inset-0 z-[2000] bg-slate-900 overflow-y-auto">
            <BattleScreen playerTeam={activeTeam} opponentElder={battleOpponent.elder} onWin={handleBattleWin} onLose={handleBattleLose} onFlee={handleBattleFlee} onGuideSuccess={handleMidBattleGuideSuccess} sfxEnabled={state.settings.sfxEnabled} />
          </div>
        )}

        {guideTarget && (
          <ElderInteraction elder={guideTarget} onSuccess={handleGuideSuccess} onFail={handleGuideFail} onClose={handleGuideFail} />
        )}

        {activeEvent && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`rounded-[3rem] p-10 w-full max-w-md flex flex-col shadow-2xl border-4 ${isDark ? 'bg-slate-800 border-indigo-500/30' : 'bg-white border-indigo-100'}`}>
              <div className="text-8xl mb-8 self-center animate-bounce">{activeEvent.icon}</div>
              <h3 className="text-3xl font-black uppercase text-center mb-3 italic tracking-tighter">{activeEvent.name}</h3>
              <p className="text-center mb-8 text-xs font-bold uppercase tracking-widest opacity-60 leading-relaxed">{activeEvent.description}</p>
              <div className="space-y-4">
                {eventResult && <div className="p-4 bg-indigo-500/10 rounded-xl text-center text-sm font-black mb-4 uppercase tracking-tighter">{eventResult}</div>}
                {activeEvent.type === 'Blitz' && <button onClick={handlePlayBingo} disabled={isEventPlaying} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Drawing...' : 'Play Bingo (10 🎟️)'}</button>}
                {activeEvent.type === 'Shuffleboard' && <button onClick={handlePlayShuffleboard} disabled={isEventPlaying} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Clashing...' : state.heldStructureIds.includes(activeEvent.id) ? 'Defend Court (20 🎟️)' : 'Clash for Court (20 🎟️)'}</button>}
                {activeEvent.type === 'Heal' && <button onClick={handleHealSquad} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Heal Squad (25 🎟️)</button>}
                {activeEvent.type === 'Garden' && <button onClick={handleGardenScavenge} disabled={isEventPlaying} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Searching...' : 'Scavenge Garden (10 🎟️)'}</button>}
                {activeEvent.type === 'Walk' && <button onClick={handleMallWalk} disabled={isEventPlaying} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Walking...' : 'Train at Mall (15 🎟️)'}</button>}
                {activeEvent.type === 'Pavilion' && <button onClick={handlePavilionPotluck} disabled={isEventPlaying} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Eating...' : 'Host Potluck (10 🎟️)'}</button>}
                {activeEvent.type === 'Market' && <button onClick={handleMarketVisit} disabled={isEventPlaying} className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Shopping...' : 'Visit Market (30 🎟️)'}</button>}
                <button onClick={() => { setActiveEvent(null); setEventResult(null); }} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase active:scale-95 transition-transform">Close</button>
              </div>
            </div>
          </div>
        )}

        {showAdOverlay && (
          <AdOverlay
            onRewardEarned={handleWatchVideoReward}
            onClose={() => setShowAdOverlay(false)}
            adCount={state.adUsage.count}
            maxAds={MAX_ADS_PER_HOUR}
          />
        )}
      </div>
    </div>
  );
};

export default App;
