// Friend chat: preset-only messages between accepted friends. Self-contained edge route.
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Preset chat ids accepted (keep in sync with services/posseChat.ts; scripts/check-chat-presets.mjs verifies).
const PRESET_IDS = new Set(['hello', 'hi', 'morning', 'afternoon', 'evening', 'night', 'welcome', 'brb', 'back', 'busy', 'thanks', 'welcome_back', 'bye', 'howdy', 'great', 'gg', 'raid_on', 'raid_soon', 'raid_hit', 'raid_need', 'raid_low', 'raid_won', 'raid_lost', 'raid_done', 'raid_where', 'raid_join', 'raid_hard', 'raid_tier', 'raid_ready', 'raid_thanks', 'arena_hold', 'arena_lost', 'arena_atk', 'arena_help', 'arena_dues', 'arena_won', 'arena_full', 'arena_open', 'arena_shield', 'arena_strong', 'arena_swap', 'arena_thanks', 'loan', 'loan_offer', 'visit', 'visited', 'visit_back', 'exchange', 'exchange_sent', 'battle', 'battle_yes', 'help', 'help_ok', 'heal', 'materials', 'tip', 'guide', 'daily', 'mission', 'mission_need', 'mission_done', 'mission_pick', 'mission_raid', 'mission_arena', 'mission_pvp', 'mission_close', 'mission_time', 'points', 'pvp_gl', 'pvp_won', 'pvp_lost', 'pvp_rematch', 'pvp_nice', 'pvp_ladder', 'pvp_tower', 'pvp_squad', 'pvp_gear', 'pvp_rest', 'nice', 'wow', 'haha', 'oops', 'yes', 'no', 'ok', 'wait', 'congrats', 'luck', 'sorry', 'please', 'maybe', 'sure', 'awesome', 'love', 'st_wave', 'st_thumbs', 'st_rematch', 'st_bingo', 'st_morning', 'st_night', 'st_thanks', 'st_goodfight', 'st_horn', 'st_flag', 'st_hands', 'st_tea', 'st_scroll', 'st_cheer', 'st_laugh', 'st_sorry', 'st_okay', 'st_highfive', 'st_surprised', 'st_sleepy', 'st_casserole', 'st_puck', 'st_heart', 'st_confetti']);
const CHAT_PER_10S = 4;
const CHAT_PER_HOUR = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { userId: string; supabase: SupabaseClient };
function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
async function requireAccount(req: Request): Promise<Ctx | Response> {
  const url = process.env.SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!url || !serviceKey) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { 'X-Geriatric-Park-Server': 'friendchat-api' } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);
  return { userId: data.user.id, supabase };
}
const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

async function areFriends(supabase: SupabaseClient, a: string, b: string): Promise<boolean> {
  const { data: one } = await supabase.from('friend_requests').select('id').eq('requester_id', a).eq('addressee_id', b).eq('status', 'accepted').maybeSingle();
  if (one) return true;
  const { data: two } = await supabase.from('friend_requests').select('id').eq('requester_id', b).eq('addressee_id', a).eq('status', 'accepted').maybeSingle();
  return !!two;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (context instanceof Response) return context;
    const { supabase, userId } = context;
    if (req.method !== 'POST') return serverJson({ error: 'Method not allowed' }, 405);
    let body: any;
    try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }
    const action = String(body?.action || '');

    // Latest incoming message id per friend (for "new message" dots). Client compares with what it has seen.
    if (action === 'summary') {
      const { data } = await supabase.from('friend_chat').select('id, sender_id').eq('recipient_id', userId).gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()).order('id', { ascending: false }).limit(200);
      const latest: Record<string, number> = {};
      for (const r of (data ?? []) as any[]) if (latest[r.sender_id] === undefined) latest[r.sender_id] = Number(r.id);
      return serverJson({ latest });
    }

    if (action !== 'list' && action !== 'send') return serverJson({ error: 'Unknown action' }, 400);
    const friendId = String(body?.friendId || '');
    if (!UUID_RE.test(friendId) || friendId === userId) return serverJson({ error: 'Invalid friend.' }, 400);
    if (!(await areFriends(supabase, userId, friendId))) return serverJson({ error: 'You can only chat with friends.' }, 403);
    const key = pairKey(userId, friendId);

    if (action === 'send') {
      const preset = String(body?.preset || '');
      if (!PRESET_IDS.has(preset)) return serverJson({ error: 'Unknown message.' }, 400);
      const { data: recent } = await supabase.from('friend_chat').select('id, created_at').eq('sender_id', userId).gte('created_at', new Date(Date.now() - 3600000).toISOString());
      const list = (recent ?? []) as any[];
      if (list.length >= CHAT_PER_HOUR) return serverJson({ error: 'You have sent a lot of messages. Take a short break.' }, 429);
      if (list.filter(r => r.created_at >= new Date(Date.now() - 10000).toISOString()).length >= CHAT_PER_10S) return serverJson({ error: 'Slow down a little.' }, 429);
      const { error } = await supabase.from('friend_chat').insert({ pair_key: key, sender_id: userId, recipient_id: friendId, preset });
      if (error) return serverJson({ error: 'Could not send.' }, 500);
      await supabase.from('friend_chat').delete().eq('pair_key', key).lt('created_at', new Date(Date.now() - 14 * 86400000).toISOString());
    }
    const after = Number(body?.after);
    let q = supabase.from('friend_chat').select('id, sender_id, preset, created_at').eq('pair_key', key);
    if (Number.isFinite(after) && after > 0) q = q.gt('id', after);
    const { data: msgs } = await q.order('id', { ascending: false }).limit(60);
    return serverJson({ messages: ((msgs ?? []) as any[]).reverse().map(m => ({ id: m.id, mine: m.sender_id === userId, preset: m.preset, createdAt: m.created_at })) });
  } catch (e) {
    console.error('friendchat api crashed', e);
    return serverJson({ error: 'Chat unavailable' }, 500);
  }
}
