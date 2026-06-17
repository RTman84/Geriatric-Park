
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

export const GAME_VERSION = '1.7.0';
export const TEAM_SIZE_LIMIT = 6;
export const BASE_POPULATION_LIMIT = 100;
export const WITHDRAWAL_MINIMUM = 10.00;
export const INITIAL_PENSION_RATE = 0.00005;
export const AD_REVENUE_PAYOUT = 0.10; 
export const MAX_ADS_PER_HOUR = 5;
export const DIVIDEND_COOLDOWN = 15 * 60 * 1000; 

export const XP_FOR_LEVEL_UP = 1000;
export const SEASON_XP_PER_LEVEL = 1000;

export const TRAINING_BASE_COST = 50; 
export const STAT_BONUS_PER_LEVEL = 5;

export const REVENUE_SPLIT = {
  player: 0.70,     
  community: 0.20,  
  developer: 0.10   
};

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

export const ELDER_AVATARS: Record<ElderType, string[]> = {
  [ElderType.BINGO_WARRIOR]: ['🧙‍♂️', '👵', '🧓'],
  [ElderType.GRUMPY_GARDENER]: ['👨‍🌾', '👩‍🌾', '🌵'],
  [ElderType.STORYTELLER]: ['👴', '🧓', '📜'],
  [ElderType.TECH_WIZARD]: ['👓', '🕹️', '📟'],
  [ElderType.MALL_WALKER]: ['👟', '🚶‍♀️', '🚶‍♂️'],
  [ElderType.KNITTING_NINJA]: ['🧶', '🥢', '🧤'],
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
  { id: 'a4', title: 'Wealthy Pensioner', description: 'Earn a total of $1.00.', completed: false, rewardType: 'YieldBonus', rewardValue: 0.00005, icon: '💎' },
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
  { name: 'Straw Hat', icon: '👒', type: 'Equipment', boost: 2, slot: 'Head', description: 'Increases Wit by 2.' },
  { name: 'Speedy Sneakers', icon: '👟', type: 'Equipment', boost: 3, slot: 'Body', description: 'Increases Tenacity by 3.' },
  { name: 'Hearing Aid Plus', icon: '👂', type: 'Equipment', boost: 2, slot: 'Accessory', description: 'Increases Strength and Agility.' },
  { name: 'Hard Candy', icon: '🍬', type: 'Snack', boost: 15, slot: 'Accessory', description: 'Restores 15 HP to a resident.' },
  { name: 'Vintage Radio', icon: '📻', type: 'Equipment', boost: 4, slot: 'Accessory', description: 'Increases stats via nostalgic vibes.' },
  { name: 'Lost Dentures', icon: '🦷', type: 'LegacyToken', boost: 25, slot: 'Accessory', description: 'Worth 25 Legacy Tokens.' },
  { name: 'Old Map', icon: '🗺️', type: 'Snack', boost: 50, slot: 'Accessory', description: 'Grants 50 XP to the Park.' },
  { name: 'Lawn Gnome', icon: '🍄', type: 'Equipment', boost: 3, slot: 'Body', description: 'Increases Tenacity by 3.' },
  { name: 'Antique Pocket Watch', icon: '⌚', type: 'Equipment', boost: 5, slot: 'Accessory', description: 'A classic piece that boosts efficiency.' }
];

export const SHOP_ITEMS = [
  { id: 's1', name: 'High-Fiber Muffin', icon: '🧁', price: 50, description: 'Instantly restores 50 HP.' },
  { id: 's2', name: 'Tennis Ball Walker', icon: '🎾', price: 250, description: 'Increases Tenacity by 6.', slot: 'Body', boost: 6 },
  { id: 's3', name: 'Reading Glasses', icon: '👓', price: 150, description: 'Increases Wit by 4.', slot: 'Head', boost: 4 },
  { id: 's4', name: 'Bingo Lucky Charm', icon: '🍀', price: 300, description: 'Boosts competitive spirit slightly.', slot: 'Accessory', boost: 5 }
];

export const SEASONAL_REWARDS = [
  { level: 1, icon: '🎟️', name: 'Starter Kit', free: '100 Tokens' },
  { level: 2, icon: '🍬', name: 'Sweet Treat', free: 'Hard Candy' },
  { level: 3, icon: '🌅', name: 'Morning Badge', free: 'Early Bird Badge' },
  { level: 4, icon: '👟', name: 'Fast Feet', free: 'Speedy Sneakers' },
  { level: 5, icon: '💎', name: 'Token Cache', free: '500 Tokens' },
  { level: 6, icon: '👒', name: 'Sun Protection', free: 'Straw Hat' },
  { level: 7, icon: '📻', name: 'Broadcast', free: 'Vintage Radio' },
  { level: 8, icon: '🦷', name: 'Artifact', free: 'Shiny Dentures' },
  { level: 9, icon: '🥢', name: 'Crafting', free: 'Knitting Needles' },
  { level: 10, icon: '🏆', name: 'Grand Prize', free: '1000 Tokens' }
];
