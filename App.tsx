
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import GameMap from './components/GameMap';
import BattleScreen from './components/BattleScreen';
import StarterSelection from './components/StarterSelection';
import SocialPanel from './components/SocialPanel';
import { TutorialOverlay } from './components/Tutorial';
import { AdOverlay } from './components/AdOverlay';
import { TeamPanel, BankPanel, BasePanel, ElderPassPanel, QuestPanel, ShopPanel, MailboxPanel } from './components/UIPanels';
import { audioManager } from './services/audioManager';
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
  WITHDRAWAL_MINIMUM,
  DAILY_REWARDS,
  INVESTMENT_TIERS
} from './constants';

const SAVE_KEY = 'geriatric_park_v17_save';
const NAMES = ["Arthur", "Ethel", "Barnaby", "Mildred", "Harold", "Gertrude", "Mabel", "Otis", "Edith", "Clarence", "Mortimer", "Gladys", "Cecil"];

const INITIAL_STATE: GameState = {
  version: GAME_VERSION,
  isLinkedToGoogle: false,
  googleEmail: undefined,
  pensionBalance: 0.00,
  communityReserve: 5.00, // Starting simulated shared pool
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
  heldStructureIds: [],
  quests: [
    { id: 'q1', type: 'Daily', title: 'Neighborhood Watch', description: 'Collect 5 items from the map.', progress: 0, target: 5, completed: false, rewardXP: 150, rewardTokens: 25 },
    { id: 'q2', type: 'Daily', title: 'Gentle Persuasion', description: 'Win 2 arguments with wild residents.', progress: 0, target: 2, completed: false, rewardXP: 200, rewardTokens: 50 },
    { id: 'q3', type: 'Weekly', title: 'Bingo Marathon', description: 'Participate in 5 Bingo Blitz sessions.', progress: 0, target: 5, completed: false, rewardXP: 1000, rewardTokens: 250 }
  ],
  achievements: INITIAL_ACHIEVEMENTS,
  season: { id: 1, name: "Autumn Gathering", xp: 0, isPremium: false, startDate: Date.now(), endDate: Date.now() + 30 * 24 * 60 * 60 * 1000 },
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
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [battleOpponent, setBattleOpponent] = useState<{ elder: Elder } | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wildElders, setWildElders] = useState<Elder[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isEventPlaying, setIsEventPlaying] = useState(false);
  const [eventResult, setEventResult] = useState<string | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);

  // Geolocation tracking
  useEffect(() => {
    if (!state.hasStarted) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState(prev => ({
          ...prev,
          currentLocation: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        }));
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [state.hasStarted]);

  const handleBuyParcel = useCallback(() => {
    const cost = 100; // 100 tokens to buy a parcel
    if (state.legacyTokens < cost) {
      alert("Need 100 Tokens to buy a parcel!");
      return;
    }

    const { lat, lng } = state.currentLocation;
    // Snap to a grid (roughly 10m x 10m)
    const gridLat = Math.floor(lat * 10000) / 10000;
    const gridLng = Math.floor(lng * 10000) / 10000;

    const exists = state.ownedParcels.find(p => p.lat === gridLat && p.lng === gridLng);
    if (exists) {
      alert("This parcel is already owned!");
      return;
    }

    const rarities: ('Common' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Rare', 'Epic', 'Legendary'];
    const weights = [0.7, 0.2, 0.08, 0.02];
    const rand = Math.random();
    let cumulative = 0;
    let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        rarity = rarities[i];
        break;
      }
    }

    const bonusMap = { Common: 0.00001, Rare: 0.00002, Epic: 0.00005, Legendary: 0.0001 };
    const bonus = bonusMap[rarity];

    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens - cost,
      pensionRate: prev.pensionRate + bonus,
      ownedParcels: [...prev.ownedParcels, {
        id: `parcel_${Date.now()}`,
        lat: gridLat,
        lng: gridLng,
        ownerId: 'player',
        type: rarity,
        pensionBonus: bonus
      }]
    }));

    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    alert(`You bought a ${rarity} parcel! Pension rate increased.`);
  }, [state.currentLocation, state.legacyTokens, state.ownedParcels, state.settings.sfxEnabled]);

  // Pension accumulation loop
  useEffect(() => {
    if (!state.hasStarted) return;
    const timer = setInterval(() => {
      setState(prev => {
        const isBoosted = Date.now() < prev.boostUntil;
        const multiplier = isBoosted ? 2 : 1;
        const kingMultiplier = prev.shuffleboard.currentKing?.id === 'player' ? 1.25 : 1;
        const totalMultiplier = multiplier * kingMultiplier;
        const increment = prev.pensionRate * totalMultiplier;
        
        return {
          ...prev,
          pensionBalance: prev.pensionBalance + increment,
          earningsBreakdown: {
            ...prev.earningsBreakdown,
            passive: prev.earningsBreakdown.passive + increment
          }
        };
      });
    }, 1000);
    return () => clearInterval(timer);
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

        const selectedPath = nearbyPaths.length > 0 
          ? nearbyPaths[Math.floor(Math.random() * nearbyPaths.length)]
          : null;
        
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
          bio: '',
          comfortGeneration: 0.0001,
          captured: false,
          lat: spawnLat,
          lng: spawnLng,
          happiness: 100,
          hp: 80, maxHp: 80, strength: 10, wit: 10, agility: 8, tenacity: 8,
          equipment: {},
          status: 'Base',
          isRoaming: true,
          pathId,
          pathProgress,
          pathDirection: Math.random() > 0.5 ? 1 : -1
        } as Elder;
      });
      setWildElders(newWilds);
    } catch (err) {
      console.error("Failed to spawn wild elders", err);
    }
  }, [state.hasStarted, wildElders.length, state.currentLocation.lat, state.currentLocation.lng]);

  // Spawn Items and Structures
  useEffect(() => {
    if (!state.hasStarted) return;
    const { lat, lng } = state.currentLocation;

    // Proximity check: If items are too far away, clear them to trigger a respawn
    if (state.nearbyItems.length > 0) {
      const firstItem = state.nearbyItems[0];
      const dist = Math.sqrt(Math.pow(firstItem.lat - lat, 2) + Math.pow(firstItem.lng - lng, 2));
      if (dist > 0.05) { // Roughly 5km
        setState(prev => ({ ...prev, nearbyItems: [], nearbyStructures: [] }));
        setWildElders([]); // Also clear wild elders to trigger respawn
        return;
      }
    }
      
    if (state.nearbyItems.length === 0) {
      const newItems = Array.from({ length: 50 }, (_, i) => {
        const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
        const radius = i < 20 ? 0.005 : 0.02;
        return {
          id: 'item_' + Math.random().toString(36).substr(2, 9),
          ...poolItem,
          lat: lat + (Math.random() - 0.5) * radius,
          lng: lng + (Math.random() - 0.5) * radius,
        } as MapItem;
      });
      setState(prev => ({ ...prev, nearbyItems: newItems }));
    }

    if (state.nearbyStructures.length === 0) {
      const newStructures = Array.from({ length: 12 }, (_, i) => {
        const template = STRUCTURE_TEMPLATES[Math.floor(Math.random() * STRUCTURE_TEMPLATES.length)];
        const sLat = lat + (Math.random() - 0.5) * 0.04;
        const sLng = lng + (Math.random() - 0.5) * 0.04;
        return {
          id: `struct_${sLat.toFixed(4)}_${sLng.toFixed(4)}`,
          ...template,
          lat: sLat,
          lng: sLng,
        } as Structure;
      });
      setState(prev => ({ ...prev, nearbyStructures: newStructures }));
    }
  }, [state.hasStarted, state.nearbyItems.length, state.nearbyStructures.length, state.currentLocation.lat, state.currentLocation.lng]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setState({ ...INITIAL_STATE, ...parsed, version: GAME_VERSION });
        }
      }
    } catch (e) { 
      console.error("Load failed", e); 
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (state.hasStarted) {
      audioManager.setMusicEnabled(state.settings.musicEnabled);
      audioManager.switchTrack(battleOpponent ? 'battle' : 'main');
    }
  }, [state.settings.musicEnabled, state.hasStarted, battleOpponent]);

  useEffect(() => { 
    const timer = setTimeout(() => {
      if (isLoaded && state.hasStarted) {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch (e) {
          console.error("Save failed", e);
        }
      }
    }, 2000); // Debounce save
    return () => clearTimeout(timer);
  }, [state, isLoaded]);

  const triggerTab = (id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setActiveTab(id);
  };

  const handleQuestProgress = useCallback((type: string, amount: number = 1) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q => {
        if (q.completed) return q;
        let matched = false;
        if (type === 'collect' && q.title.includes('Watch')) matched = true;
        if (type === 'battle' && q.title.includes('Gentle')) matched = true;
        if (type === 'bingo' && q.title.includes('Bingo')) matched = true;
        if (matched) {
          const newProgress = Math.min(q.target, q.progress + amount);
          return { ...q, progress: newProgress };
        }
        return q;
      })
    }));
  }, []);

  const handleClaimQuest = useCallback((id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => {
      const q = prev.quests.find(x => x.id === id);
      if (!q || q.progress < q.target || q.completed) return prev;
      let nextXp = prev.xp + q.rewardXP;
      let nextLevel = prev.level;
      while (nextXp >= XP_FOR_LEVEL_UP) { nextXp -= XP_FOR_LEVEL_UP; nextLevel++; }
      return {
        ...prev,
        xp: nextXp,
        level: nextLevel,
        legacyTokens: prev.legacyTokens + q.rewardTokens,
        season: { ...prev.season, xp: prev.season.xp + q.rewardXP },
        quests: prev.quests.map(x => x.id === id ? { ...x, completed: true } : x)
      };
    });
  }, [state.settings.sfxEnabled]);

  const handleCollectItem = (item: MapItem) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    handleQuestProgress('collect');
    setState(prev => {
      let nextXp = prev.xp + 25;
      let nextTokens = prev.legacyTokens;
      let nextInventory = [...prev.inventory];
      let nextElders = [...prev.allElders];

      if (item.type === 'LegacyToken') {
        nextTokens += (item.boost || 25);
      } else if (item.type === 'Equipment') {
        nextInventory.push({
          id: 'inv_' + Math.random().toString(36).substr(2, 9),
          name: item.name,
          icon: item.icon,
          boost: item.boost || 2,
          description: item.description || '',
          slot: item.slot || 'Accessory'
        });
      } else if (item.type === 'StatBoost') {
        const team = nextElders.filter(e => e.status === 'Team');
        if (team.length > 0) {
          const targetIdx = nextElders.indexOf(team[Math.floor(Math.random() * team.length)]);
          if (targetIdx !== -1) {
            nextElders[targetIdx].strength += 1;
            nextElders[targetIdx].wit += 1;
          }
        }
      } else if (item.type === 'Snack') {
        if (item.name === 'Old Map') {
          nextXp += (item.boost || 50);
        } else if (item.name === 'Hard Candy') {
          const team = nextElders.filter(e => e.status === 'Team');
          const target = team.find(e => e.hp < e.maxHp) || team[0];
          if (target) {
            target.hp = Math.min(target.maxHp, target.hp + (item.boost || 15));
          }
        }
      }

      let nextLevel = prev.level;
      while (nextXp >= XP_FOR_LEVEL_UP) {
        nextXp -= XP_FOR_LEVEL_UP;
        nextLevel++;
      }

      return {
        ...prev,
        level: nextLevel,
        xp: nextXp,
        legacyTokens: nextTokens,
        inventory: nextInventory,
        allElders: nextElders,
        nearbyItems: prev.nearbyItems.filter(i => i.id !== item.id),
        season: { ...prev.season, xp: prev.season.xp + 25 }
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
    if (state.communityReserve <= 0.01) {
      alert("Community Reserve is low! Watch some local ads or win battles to fuel the shared pool.");
      return;
    }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    
    const basePayout = 0.01;
    const scoreBonus = state.parkCommunityScore * 0.0002;
    const totalPayout = Math.min(state.communityReserve, basePayout + scoreBonus);
    const tokenBonus = Math.floor(state.parkCommunityScore / 10) + 5;

    setState(prev => ({
      ...prev,
      lastDividendClaim: now,
      pensionBalance: prev.pensionBalance + totalPayout,
      communityReserve: Math.max(0, prev.communityReserve - totalPayout),
      legacyTokens: prev.legacyTokens + tokenBonus,
      earningsBreakdown: {
        ...prev.earningsBreakdown,
        active: prev.earningsBreakdown.active + totalPayout
      }
    }));
    alert(`Successfully claimed a Park Dividend of $${totalPayout.toFixed(3)} and ${tokenBonus} 🎟️!`);
  }, [state.lastDividendClaim, state.communityReserve, state.parkCommunityScore, state.settings.sfxEnabled]);

  const handleInvest = useCallback((investment: any) => {
    if (state.pensionBalance < investment.cost) {
      alert("Insufficient Pension Balance! Watch local ads or claim dividends to earn more.");
      return;
    }
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    
    setState(prev => ({
      ...prev,
      pensionBalance: prev.pensionBalance - investment.cost,
      pensionRate: prev.pensionRate + investment.rateBoost,
      parkCommunityScore: prev.parkCommunityScore + Math.floor(investment.cost * 10)
    }));
    alert(`Investment confirmed! Your Pension Rate has increased by $${(investment.rateBoost * 3600).toFixed(4)}/hour.`);
  }, [state.pensionBalance, state.settings.sfxEnabled]);

  const handleWatchAdWithLimit = useCallback(() => {
    if (state.adUsage.count >= MAX_ADS_PER_HOUR) {
      alert("All sponsorship slots for this hour are full! Come back later.");
      return;
    }
    setShowAdOverlay(true);
  }, [state.adUsage.count]);

  const handleMoveToTeam = useCallback((id: string) => {
    setState(prev => {
      const teamCount = prev.allElders.filter(e => e.status === 'Team').length;
      if (teamCount >= TEAM_SIZE_LIMIT) {
        alert(`Max squad size is ${TEAM_SIZE_LIMIT}!`);
        return prev;
      }
      if (state.settings.sfxEnabled) audioManager.playSFX('click');
      return {
        ...prev,
        allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Team' } : e)
      };
    });
  }, [state.settings.sfxEnabled]);

  const handleMoveToStandby = useCallback((id: string) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('click');
    setState(prev => ({
      ...prev,
      allElders: prev.allElders.map(e => e.id === id ? { ...e, status: 'Base' } : e)
    }));
  }, [state.settings.sfxEnabled]);

  const handleHealSquad = useCallback(() => {
    if (state.legacyTokens < 25) return alert("Need 25 Tokens!");
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    setState(prev => ({
      ...prev,
      legacyTokens: prev.legacyTokens - 25,
      allElders: prev.allElders.map(e => ({ ...e, hp: e.maxHp }))
    }));
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
          return {
            ...prev,
            legacyTokens: prev.legacyTokens - 20,
            xp: prev.xp + 100,
            heldStructureIds: isAlreadyHeld ? prev.heldStructureIds : [...prev.heldStructureIds, activeEvent.id],
            shuffleboard: {
              currentKing: {
                id: 'player',
                name: 'Your Squad',
                elderIcon: '🧑‍🦽',
                heldSince: Date.now(),
                teamIds: team.map(e => e.id)
              }
            }
          };
        } else {
          return { ...prev, legacyTokens: prev.legacyTokens - 20, xp: prev.xp + 25 };
        }
      });
      setEventResult(success ? "Your squad holds the court! You will hold this location until challenged." : "The court kings were too tough!");
      setIsEventPlaying(false);
    }, 1500);
  }, [state.legacyTokens, state.allElders, state.settings.sfxEnabled, activeEvent]);

  const handleGardenScavenge = useCallback(() => {
    if (state.legacyTokens < 10) return alert("Need 10 Tokens!");
    setIsEventPlaying(true);
    setTimeout(() => {
      const poolItem = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      const success = Math.random() > 0.3;
      
      if (state.settings.sfxEnabled) audioManager.playSFX(success ? 'collect' : 'hit');
      
      setState(prev => {
        const nextInventory = success ? [...prev.inventory, { 
          id: 'garden_' + Date.now(), 
          name: poolItem.name, 
          icon: poolItem.icon, 
          boost: poolItem.boost || 2, 
          slot: poolItem.slot as any || 'Accessory', 
          description: poolItem.description || '' 
        }] : prev.inventory;
        
        return {
          ...prev,
          legacyTokens: prev.legacyTokens - 10,
          xp: prev.xp + 50,
          inventory: nextInventory
        };
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
        let nextXp = prev.xp + xpGain;
        let nextLevel = prev.level;
        while (nextXp >= XP_FOR_LEVEL_UP) { nextXp -= XP_FOR_LEVEL_UP; nextLevel++; }
        return {
          ...prev,
          legacyTokens: prev.legacyTokens - 15,
          xp: nextXp,
          level: nextLevel
        };
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
      setState(prev => ({
        ...prev,
        legacyTokens: prev.legacyTokens - 10,
        parkCommunityScore: prev.parkCommunityScore + scoreGain,
        xp: prev.xp + 50
      }));
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
      setState(prev => {
        const nextElders = prev.allElders.map(e => {
          if (e.status !== 'Team') return e;
          const stat = ['strength', 'wit', 'agility', 'tenacity'][Math.floor(Math.random() * 4)] as keyof Elder;
          return { ...e, [stat]: (e[stat] as number) + 2 };
        });
        return {
          ...prev,
          legacyTokens: prev.legacyTokens - 30,
          allElders: nextElders,
          xp: prev.xp + 75
        };
      });
      setEventResult("Fresh produce! Your squad's stats have been boosted.");
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
      
      setState(prev => ({
        ...prev,
        legacyTokens: prev.legacyTokens - 10 + prize,
        xp: prev.xp + (success ? 100 : 20),
        parkCommunityScore: prev.parkCommunityScore + (success ? 10 : 2)
      }));
      
      setEventResult(success ? `BINGO! You won ${prize} 🎟️ and boosted the park score!` : `No luck this time. You got a consolation prize of ${prize} 🎟️.`);
      setIsEventPlaying(false);
      handleQuestProgress('bingo');
    }, 2000);
  }, [state.legacyTokens, state.settings.sfxEnabled, handleQuestProgress]);

  const handleWatchVideoReward = useCallback(() => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    
    // Revenue split logic: $0.10 total revenue
    // 70% to Player ($0.07), 20% to Reserve ($0.02), 10% to Dev ($0.01)
    const playerShare = AD_REVENUE_PAYOUT * REVENUE_SPLIT.player;
    const reserveShare = AD_REVENUE_PAYOUT * REVENUE_SPLIT.community;

    setState(prev => ({
      ...prev,
      pensionBalance: prev.pensionBalance + playerShare,
      communityReserve: prev.communityReserve + reserveShare,
      earningsBreakdown: {
        ...prev.earningsBreakdown,
        sponsorship: prev.earningsBreakdown.sponsorship + playerShare
      },
      parkCommunityScore: prev.parkCommunityScore + 10,
      legacyTokens: prev.legacyTokens + 50,
      adUsage: { ...prev.adUsage, count: prev.adUsage.count + 1 }
    }));
    setShowAdOverlay(false);
    alert(`Reward Claimed! (70/20 split: +$${playerShare.toFixed(3)} to Pension, +$${reserveShare.toFixed(3)} to Shared Pool)`);
  }, [state.settings.sfxEnabled]);

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
      return {
        ...prev,
        legacyTokens: nextTokens,
        inventory: nextInventory,
        mailbox: prev.mailbox.map(m => m.id === id ? { ...m, claimed: true } : m)
      };
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
        if (poolItem) {
          nextInventory.push({
            id: 'daily_' + Math.random().toString(36).substr(2, 9),
            name: poolItem.name, icon: poolItem.icon, boost: poolItem.boost || 2,
            description: poolItem.description || '', slot: poolItem.slot as any || 'Accessory'
          });
        }
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
        if (item.slot === 'Accessory') {
          updated.strength += Math.ceil(item.boost / 2);
          updated.agility += Math.floor(item.boost / 2);
        }
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
        if (parsed.version) {
          setState(parsed);
          alert("Save state loaded successfully!");
          if (state.settings.sfxEnabled) audioManager.playSFX('victory');
        } else {
          alert("Invalid save file!");
        }
      } catch (err) {
        alert("Failed to parse save file.");
      }
    };
    reader.readAsText(file);
  };

  const handleCopySyncCode = () => {
    try {
      const json = JSON.stringify(state);
      const code = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
      navigator.clipboard.writeText(code);
      alert("Sync Code copied to clipboard! You can paste this on another device.");
      if (state.settings.sfxEnabled) audioManager.playSFX('collect');
    } catch (e) {
      alert("Failed to generate Sync Code.");
    }
  };

  const handlePasteSyncCode = () => {
    const code = prompt("Paste your Sync Code here:");
    if (!code) return;
    try {
      const json = decodeURIComponent(atob(code).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const parsed = JSON.parse(json);
      if (parsed.version) {
        setState(parsed);
        alert("Progress restored from Sync Code!");
        if (state.settings.sfxEnabled) audioManager.playSFX('victory');
      } else {
        alert("Invalid Sync Code!");
      }
    } catch (err) {
      alert("Failed to decode Sync Code.");
    }
  };

  const handleBattleWin = useCallback((updatedTeam: Elder[]) => {
    if (state.settings.sfxEnabled) audioManager.playSFX('victory');
    const opponent = battleOpponent?.elder;
    setState(prev => {
      let nextXp = prev.xp + 300;
      let nextLevel = prev.level;
      while (nextXp >= XP_FOR_LEVEL_UP) { nextXp -= XP_FOR_LEVEL_UP; nextLevel++; }
      let nextAllElders = prev.allElders.map(e => {
        const updated = updatedTeam.find(ut => ut.id === e.id);
        return updated || e;
      });
      if (opponent && !prev.allElders.find(e => e.id === opponent.id)) {
        nextAllElders.push({ ...opponent, captured: true, status: 'Base', isRoaming: false });
      }
      return {
        ...prev,
        level: nextLevel,
        xp: nextXp,
        allElders: nextAllElders,
        parkCommunityScore: prev.parkCommunityScore + 10,
        season: { ...prev.season, xp: prev.season.xp + 300 },
        communityReserve: prev.communityReserve + 0.005
      };
    });
    if (opponent) setWildElders(prev => prev.filter(e => e.id !== opponent.id));
    setBattleOpponent(null);
    handleQuestProgress('battle');
  }, [battleOpponent, state.settings.sfxEnabled, handleQuestProgress]);

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
          // Move along path
          progress += (0.0003 * direction);
          if (progress >= 1) { progress = 1; direction = -1; } 
          else if (progress <= 0) { progress = 0; direction = 1; }

          const p1 = path.points[0];
          const p2 = path.points[1];
          return { 
            ...elder, 
            lat: p1.lat + (p2.lat - p1.lat) * progress, 
            lng: p1.lng + (p2.lng - p1.lng) * progress, 
            pathProgress: progress, 
            pathDirection: direction as 1 | -1
          };
        } else {
          // Random walk if no path
          return {
            ...elder,
            lat: elder.lat + (Math.random() - 0.5) * 0.0001,
            lng: elder.lng + (Math.random() - 0.5) * 0.0001
          };
        }
      };

      setWildElders(prev => prev.map(moveElderOnPath));

      setState(prev => ({
        ...prev,
        allElders: prev.allElders.map(moveElderOnPath),
      }));
    }, 1000);
    return () => clearInterval(moveTimer);
  }, [state.hasStarted]);

  const activeTeam = useMemo(() => state.allElders.filter(e => e.status === 'Team'), [state.allElders]);
  const roamingElders = useMemo(() => state.allElders.filter(e => e.isRoaming), [state.allElders]);
  const isDark = state.settings.darkTheme;
  const unreadMailCount = useMemo(() => state.mailbox.filter(m => !m.claimed).length, [state.mailbox]);

  if (!isLoaded) return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center text-white font-black uppercase tracking-widest gap-6">
      <div className="animate-pulse">Initializing...</div>
      <button 
        onClick={() => { localStorage.removeItem(SAVE_KEY); window.location.reload(); }}
        className="text-[10px] opacity-40 hover:opacity-100 transition-opacity border border-white/20 px-4 py-2 rounded-xl"
      >
        Clear Save & Reset
      </button>
    </div>
  );
  if (!state.hasStarted) return <StarterSelection onSelect={(elder) => {
    setState(prev => ({ ...prev, hasStarted: true, allElders: [elder], xp: 100 }));
    setShowTutorial(true);
    setActiveTab('map');
  }} />;

  return (
    <div className={`flex flex-col h-[100dvh] w-full overflow-hidden font-sans select-none items-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} onClick={() => audioManager.setMusicEnabled(state.settings.musicEnabled)}>
      <div className={`w-full max-w-lg h-full flex flex-col shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <header className={`pt-6 pb-4 px-6 border-b z-[60] flex justify-between items-end ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}>GP</div>
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-black uppercase">LVL {state.level}</span>
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
                <div className="text-[10px] font-black uppercase text-indigo-500 leading-none">{state.legacyTokens} 🎟️</div>
                <div className="text-[8px] font-black uppercase opacity-40 tracking-widest mt-1">v{GAME_VERSION}</div>
             </div>
          </div>
        </header>

        <main className={`flex-1 relative ${activeTab === 'map' ? '' : 'overflow-y-auto overflow-x-hidden custom-scrollbar'}`}>
          {activeTab === 'map' && (
            <GameMap 
              isDark={isDark} 
              currentLocation={state.currentLocation} 
              nearbyElders={wildElders} 
              nearbyFriends={state.nearbyFriends} 
              nearbyItems={state.nearbyItems} 
              nearbyStructures={state.nearbyStructures}
              heldStructureIds={state.heldStructureIds}
              roamingElders={roamingElders} 
              unreadMailCount={unreadMailCount} 
              ownedParcels={state.ownedParcels}
              onBuyParcel={handleBuyParcel}
              onElderClick={(e) => { if (activeTeam.length === 0) return alert("Assign a squad first!"); setBattleOpponent({ elder: e }); }} 
              onItemClick={handleCollectItem} 
              onEventClick={setActiveEvent} 
              onPlayerClick={() => triggerTab('base')} 
              onMailClick={() => triggerTab('mailbox')} 
            />
          )}
          {activeTab === 'team' && <TeamPanel isDark={isDark} elders={state.allElders} onMoveToStandby={handleMoveToStandby} onMoveToTeam={handleMoveToTeam} onSetRoamer={id => setState(p => ({...p, allElders: p.allElders.map(e => ({...e, isRoaming: e.id === id}))}))} />}
          {activeTab === 'base' && <BasePanel isDark={isDark} elders={state.allElders} inventory={state.inventory} tokens={state.legacyTokens} onHealAll={handleHealSquad} onEquipElder={handleEquipElder} onDividendClaim={handleClaimDividend} onMoveToTeam={handleMoveToTeam} onMoveToStandby={handleMoveToStandby} lastCheckIn={state.lastLoginTimestamp} onCheckIn={handleDailyCheckIn} streak={state.dailyBoostsCount} lastDividendClaim={state.lastDividendClaim} />}
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
            }
          }} />}
          {activeTab === 'quests' && <QuestPanel isDark={isDark} quests={state.quests} achievements={state.achievements} parkScore={state.parkCommunityScore} onClaim={handleClaimQuest} />}
          {activeTab === 'mailbox' && <MailboxPanel isDark={isDark} messages={state.mailbox} onClaim={handleClaimMail} />}
          {activeTab === 'pass' && <ElderPassPanel isDark={isDark} season={state.season} />}
          {activeTab === 'bank' && <BankPanel isDark={isDark} balance={state.pensionBalance} reserve={state.communityReserve} breakdown={state.earningsBreakdown} rate={state.pensionRate} onWithdraw={() => {
            if (state.pensionBalance < WITHDRAWAL_MINIMUM) return alert("Minimum withdrawal is $10.00");
            alert(`$${state.pensionBalance.toFixed(2)} withdrawn to your pension account!`);
            setState(p => ({...p, pensionBalance: 0, earningsBreakdown: {passive: 0, active: 0, sponsorship: 0}}));
          }} onWatchAd={handleWatchVideoReward} adCount={state.adUsage.count} onWatchAdTrigger={handleWatchAdWithLimit} onInvest={handleInvest} />}
        </main>

        <nav className={`border-t pb-8 pt-3 px-2 flex justify-between items-center z-[60] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {NAV_ITEMS.map(item => (
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
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black uppercase tracking-widest opacity-60">Dark Theme</span>
                   <button onClick={() => setState(p => ({...p, settings: {...p.settings, darkTheme: !p.settings.darkTheme}}))} className={`w-12 h-6 rounded-full transition-colors relative ${state.settings.darkTheme ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.settings.darkTheme ? 'left-7' : 'left-1'}`} />
                   </button>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black uppercase tracking-widest opacity-60">Music</span>
                   <button onClick={() => setState(p => ({...p, settings: {...p.settings, musicEnabled: !p.settings.musicEnabled}}))} className={`w-12 h-6 rounded-full transition-colors relative ${state.settings.musicEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.settings.musicEnabled ? 'left-7' : 'left-1'}`} />
                   </button>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black uppercase tracking-widest opacity-60">SFX</span>
                   <button onClick={() => setState(p => ({...p, settings: {...p.settings, sfxEnabled: !p.settings.sfxEnabled}}))} className={`w-12 h-6 rounded-full transition-colors relative ${state.settings.sfxEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.settings.sfxEnabled ? 'left-7' : 'left-1'}`} />
                   </button>
                 </div>
               </div>
                <div className="mt-8 pt-8 border-t border-slate-100/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Data Management</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExportSave} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <ArrowDownTrayIcon className="w-5 h-5 mb-2 text-indigo-500" />
                      <span className="text-[8px] font-black uppercase">Export</span>
                    </button>
                    <label className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center">
                      <ArrowUpTrayIcon className="w-5 h-5 mb-2 text-indigo-500" />
                      <span className="text-[8px] font-black uppercase">Import</span>
                      <input type="file" accept=".json" onChange={handleImportSave} className="hidden" />
                    </label>
                    <button onClick={handleCopySyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <ClipboardDocumentIcon className="w-5 h-5 mb-2 text-emerald-500" />
                      <span className="text-[8px] font-black uppercase">Copy Sync</span>
                    </button>
                    <button onClick={handlePasteSyncCode} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
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
            <BattleScreen playerTeam={activeTeam} opponentElder={battleOpponent.elder} onWin={handleBattleWin} onLose={() => setBattleOpponent(null)} sfxEnabled={state.settings.sfxEnabled} />
          </div>
        )}

        {activeEvent && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`rounded-[3rem] p-10 w-full max-w-md flex flex-col shadow-2xl border-4 ${isDark ? 'bg-slate-800 border-indigo-500/30' : 'bg-white border-indigo-100'}`}>
              <div className="text-8xl mb-8 self-center animate-bounce">{activeEvent.icon}</div>
              <h3 className="text-3xl font-black uppercase text-center mb-3 italic tracking-tighter">{activeEvent.name}</h3>
              <p className="text-center mb-8 text-xs font-bold uppercase tracking-widest opacity-60 leading-relaxed">{activeEvent.description}</p>
              
              <div className="space-y-4">
                {eventResult && (
                  <div className="p-4 bg-indigo-500/10 rounded-xl text-center text-sm font-black mb-4 uppercase tracking-tighter">{eventResult}</div>
                )}
                {activeEvent.type === 'Blitz' && (
                  <button onClick={handlePlayBingo} disabled={isEventPlaying} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Drawing...' : 'Play Bingo (10 🎟️)'}</button>
                )}
                {activeEvent.type === 'Shuffleboard' && (
                  <button onClick={handlePlayShuffleboard} disabled={isEventPlaying} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">
                    {isEventPlaying ? 'Clashing...' : state.heldStructureIds.includes(activeEvent.id) ? 'Defend Court (20 🎟️)' : 'Clash for Court (20 🎟️)'}
                  </button>
                )}
                {activeEvent.type === 'Heal' && (
                  <button onClick={handleHealSquad} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">Heal Squad (25 🎟️)</button>
                )}
                {activeEvent.type === 'Garden' && (
                  <button onClick={handleGardenScavenge} disabled={isEventPlaying} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Searching...' : 'Scavenge Garden (10 🎟️)'}</button>
                )}
                {activeEvent.type === 'Walk' && (
                  <button onClick={handleMallWalk} disabled={isEventPlaying} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Walking...' : 'Train at Mall (15 🎟️)'}</button>
                )}
                {activeEvent.type === 'Pavilion' && (
                  <button onClick={handlePavilionPotluck} disabled={isEventPlaying} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Eating...' : 'Host Potluck (10 🎟️)'}</button>
                )}
                {activeEvent.type === 'Market' && (
                  <button onClick={handleMarketVisit} disabled={isEventPlaying} className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl uppercase shadow-xl active:scale-95 transition-transform">{isEventPlaying ? 'Shopping...' : 'Visit Market (30 🎟️)'}</button>
                )}
                <button onClick={() => { setActiveEvent(null); setEventResult(null); }} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase active:scale-95 transition-transform">Close</button>
              </div>
            </div>
          </div>
        )}

        {showAdOverlay && <AdOverlay onComplete={handleWatchVideoReward} onClose={() => setShowAdOverlay(false)} isDark={isDark} />}
      </div>
    </div>
  );
};

export default App;
