
export enum ElderType {
  BINGO_WARRIOR = 'Bingo Warrior',
  GRUMPY_GARDENER = 'Grumpy Gardener',
  STORYTELLER = 'Storyteller',
  TECH_WIZARD = 'Tech Wizard',
  MALL_WALKER = 'Mall Walker',
  KNITTING_NINJA = 'Knitting Ninja'
}

export enum PowerType {
  PHYSICAL = 'Physical',
  SOCIAL = 'Social',
  TECH = 'Tech',
  LEGENDARY = 'Legendary'
}

export interface MailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  reward?: { type: 'Tokens' | 'Gear'; value: number | Gear };
  claimed: boolean;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  rewardType: 'Tokens' | 'YieldBonus' | 'CommunityScore';
  rewardValue: number;
  icon: string;
}

export interface Quest {
  id: string;
  type: 'Daily' | 'Weekly';
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardXP: number;
  rewardTokens: number;
}

export interface Season {
  id: number;
  name: string;
  xp: number;
  isPremium: boolean;
  startDate: number;
  endDate: number;
}

export interface Gear {
  id: string;
  name: string;
  boost: number;
  description: string;
  icon: string;
  slot: 'Head' | 'Body' | 'Accessory';
}

export interface BingoBlitzState {
  phase: 'Prep' | 'Blitz' | 'Rewards';
  pot: number;
  participants: string[];
  timer: number;
}

export interface ShuffleboardState {
  currentKing: { 
    id: string; 
    name: string; 
    elderIcon: string; 
    heldSince: number;
    teamIds: string[]; 
  } | null;
}

export interface GameSettings {
  darkTheme: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export interface Parcel {
  id: string;
  lat: number;
  lng: number;
  ownerId: string; // 'player' or 'none'
  type: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  pensionBonus: number;
}

export interface Structure {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  type: string;
  description: string;
  requirement: string;
}

export interface GameState {
  version: string;
  isLinkedToGoogle: boolean;
  googleEmail?: string;
  pensionBalance: number;
  communityReserve: number; 
  earningsBreakdown: {
    passive: number;
    active: number;
    sponsorship: number;
  };
  legacyTokens: number;
  pensionRate: number; 
  level: number;
  xp: number;
  parkCommunityScore: number;
  allElders: Elder[];
  currentLocation: { lat: number, lng: number };
  ownedParcels: Parcel[];
  nearbyFriends: Friend[];
  nearbyItems: MapItem[];
  nearbyStructures: Structure[];
  heldStructureIds: string[];
  quests: Quest[];
  achievements: Achievement[];
  season: Season;
  hasStarted: boolean;
  inventory: Gear[];
  friends: Friend[];
  lastActiveTime: number; 
  lastLoginTimestamp?: number;
  lastDividendClaim?: number; 
  boostUntil: number; 
  dailyBoostsCount: number;
  skipAdCooldown: number;
  adUsage: {
    count: number;
    lastReset: number;
  };
  profileColor: string;
  parkTheme: string;
  mailbox: MailMessage[];
  bingoBlitz: BingoBlitzState;
  shuffleboard: ShuffleboardState;
  settings: GameSettings;
}

export interface Elder {
  id: string;
  name: string;
  type: ElderType;
  powerType: PowerType;
  level: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  bio: string;
  comfortGeneration: number; 
  captured: boolean;
  lat: number;
  lng: number;
  equipment: {
    head?: Gear;
    body?: Gear;
    accessory?: Gear;
  };
  happiness: number;
  hp: number;
  maxHp: number;
  strength: number;
  wit: number;
  agility: number;
  tenacity: number;
  status: 'Team' | 'Porch' | 'Base';
  isRoaming?: boolean;
  despawnAt?: number;
  pathId?: string;
  pathProgress?: number; 
  pathDirection?: 1 | -1;
}

export interface Friend {
  id: string;
  name: string;
  level: number;
  roamerAvatar: string;
  lastActive: string;
  lat: number;
  lng: number;
  isMoving: boolean;
}

export interface MapItem {
  id: string;
  type: 'Equipment' | 'Snack' | 'LegacyToken' | 'StatBoost';
  lat: number;
  lng: number;
  name: string;
  description?: string;
  icon: string;
  boost?: number;
  slot?: 'Head' | 'Body' | 'Accessory';
}
