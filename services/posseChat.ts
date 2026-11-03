// Preset-only Posse chat. Keep the ids in sync with PRESET_IDS in api/posse.ts (the server accepts only these ids).
export interface PosseChatPreset { id: string; text: string }
export interface PosseChatCategory { id: string; label: string; presets: PosseChatPreset[] }
export const POSSE_CHAT_CATEGORIES: PosseChatCategory[] = [
  { id: 'greet', label: 'Chat', presets: [
    { id: 'hello', text: 'Hello, Posse!' }, { id: 'morning', text: 'Good morning, everyone!' }, { id: 'night', text: 'Good night, gang!' },
    { id: 'welcome', text: 'Welcome to the Posse!' }, { id: 'brb', text: 'Be right back.' }, { id: 'back', text: "I'm back!" },
    { id: 'thanks', text: 'Thank you!' }, { id: 'gg', text: 'Good game!' } ] },
  { id: 'raid', label: 'Raids', presets: [
    { id: 'raid_on', text: 'A raid is live nearby, join in!' }, { id: 'raid_soon', text: 'A raid starts soon, get ready.' }, { id: 'raid_hit', text: 'Hit the raid when you can!' },
    { id: 'raid_need', text: 'We need more hits on the raid.' }, { id: 'raid_low', text: 'Boss is almost down, finish it!' }, { id: 'raid_won', text: 'We beat the boss! Great work!' },
    { id: 'raid_done', text: 'I used my raid attempts.' } ] },
  { id: 'arena', label: 'Arenas', presets: [
    { id: 'arena_hold', text: 'Please station a defender at our Arena.' }, { id: 'arena_lost', text: 'We lost an Arena, take it back!' }, { id: 'arena_atk', text: 'Attacking an enemy Arena now.' },
    { id: 'arena_help', text: 'Need help at an Arena.' }, { id: 'arena_dues', text: "Don't forget to claim your Arena dues." } ] },
  { id: 'assist', label: 'Assist', presets: [
    { id: 'loan', text: 'Can someone loan me a strong Elder?' }, { id: 'visit', text: 'Please visit my Park!' }, { id: 'visited', text: 'Thanks for visiting my Park!' },
    { id: 'exchange', text: 'Send a resident to my Park, please.' }, { id: 'battle', text: 'Up for a friendly battle?' }, { id: 'help', text: 'I need help!' },
    { id: 'mission', text: "Let's finish our weekly mission!" }, { id: 'mission_need', text: 'We need a few more points for the mission.' }, { id: 'mission_done', text: 'Mission complete!' } ] },
  { id: 'react', label: 'React', presets: [
    { id: 'nice', text: 'Nice one!' }, { id: 'wow', text: 'Wow!' }, { id: 'haha', text: 'Haha!' }, { id: 'oops', text: 'Oops, my bad.' }, { id: 'yes', text: 'Yes!' },
    { id: 'no', text: 'No, thanks.' }, { id: 'ok', text: 'OK!' }, { id: 'wait', text: 'Wait for me.' }, { id: 'congrats', text: 'Congratulations!' }, { id: 'luck', text: 'Good luck!' } ] },
];
export const POSSE_CHAT_TEXT: Record<string, string> = Object.fromEntries(POSSE_CHAT_CATEGORIES.flatMap(c => c.presets.map(p => [p.id, p.text])));
