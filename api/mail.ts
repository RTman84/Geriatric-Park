// Self-contained on purpose (see the note at the top of api/friends.ts): shared
// helper files were not being included in the deployed function bundle.
// Edge runtime is required -- this route is written against the Web Fetch API.
export const config = { runtime: 'edge' };

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccountContext = { userId: string; supabase: SupabaseClient };

function serverJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function getBearerToken(req: Request): string | null {
  const value = req.headers.get('authorization') || '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function requireAccount(req: Request): Promise<AccountContext | Response> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = getBearerToken(req);

  if (!url || !serviceKey) return serverJson({ error: 'Account service is not configured' }, 503);
  if (!token || token.length > 8192) return serverJson({ error: 'Authentication required' }, 401);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Geriatric-Park-Server': 'mail-api' } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);

  return { userId: data.user.id, supabase };
}

function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

// Defender reward tuning. Tickets + Building Materials only -- never PP.
// Paid to the DEFENDER when they beat a friend's attack; the attacker gets
// nothing from a loss. Fixed once per attacker per day, and capped per
// defender per day, so two cooperating accounts can't farm it.
const DEFENSE_REWARD_TICKETS = 25;
const DEFENSE_REWARD_MATERIALS = 3;
const MAX_REWARDED_DEFENSES_PER_DAY = 5;
// Spam guard: past this many battles from one friend in one day, further
// battles simply stop updating the message.
const MAX_BATTLES_PER_PAIR_PER_DAY = 20;
const INBOX_WINDOW_DAYS = 14;

const MAIL_FIELDS_LEGACY = 'id, sender_name, kind, day, attacker_wins, defender_wins, reward_tickets, reward_materials, updated_at';
// Migration 008 added `note` (Arena notices). If it has not been run yet, fall back to the old column list.
const MAIL_FIELDS = `${MAIL_FIELDS_LEGACY}, note`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (!isAccountContext(context)) return context;
    const { supabase, userId } = context;

    // Your own inbox rows from the last couple of weeks. The client dedupes
    // by row id when merging into its Mailbox, so re-fetching is harmless.
    if (req.method === 'GET') {
      const since = new Date(Date.now() - INBOX_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const readInbox = (fields: string) => supabase
        .from('mail_inbox')
        .select(fields)
        .eq('recipient_id', userId)
        .gte('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(100);
      let { data, error } = await readInbox(MAIL_FIELDS);
      if (error && String(error.message).includes('note')) ({ data, error } = await readInbox(MAIL_FIELDS_LEGACY));
      if (error) {
        console.error('Mail read failed', error.message);
        return serverJson({ error: 'Mail unavailable', detail: error.message }, 500);
      }
      return serverJson({ messages: data ?? [] });
    }

    if (req.method === 'POST') {
      let body: any;
      try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }

      if (body?.action !== 'friendBattle') return serverJson({ error: 'Unknown action' }, 400);

      const defenderId = String(body?.defenderId || '');
      const attackerWon = body?.attackerWon;
      if (!UUID_RE.test(defenderId)) return serverJson({ error: 'Invalid defenderId' }, 400);
      if (typeof attackerWon !== 'boolean') return serverJson({ error: 'attackerWon must be a boolean' }, 400);
      if (defenderId === userId) return serverJson({ error: "You can't battle yourself." }, 400);

      // Only accepted friends can leave each other Friend Battle mail.
      const { data: link, error: linkErr } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('requester_id', userId)
        .eq('addressee_id', defenderId)
        .eq('status', 'accepted')
        .maybeSingle();
      if (linkErr) { console.error('Mail friend check failed', linkErr.message); return serverJson({ error: 'Mail unavailable', detail: linkErr.message }, 500); }
      if (!link) return serverJson({ error: 'You can only battle friends.' }, 403);

      const { data: profile } = await supabase.from('player_profiles').select('display_name').eq('user_id', userId).maybeSingle();
      const senderName = (profile?.display_name && String(profile.display_name).slice(0, 40)) || 'Park Visitor';
      const today = new Date().toISOString().slice(0, 10);

      // Two attempts: the second covers a race where the same friend's two
      // requests both saw "no row yet" and one insert lost the unique constraint.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data: existing, error: existingErr } = await supabase
          .from('mail_inbox')
          .select('id, attacker_wins, defender_wins, reward_tickets')
          .eq('recipient_id', defenderId)
          .eq('sender_id', userId)
          .eq('kind', 'friend_battle')
          .eq('day', today)
          .maybeSingle();
        if (existingErr) { console.error('Mail lookup failed', existingErr.message); return serverJson({ error: 'Mail unavailable', detail: existingErr.message }, 500); }

        if (existing && existing.attacker_wins + existing.defender_wins >= MAX_BATTLES_PER_PAIR_PER_DAY) {
          return serverJson({ result: 'ignored' });
        }

        let rewardTickets = existing?.reward_tickets ?? 0;
        let rewardMaterials = rewardTickets > 0 ? DEFENSE_REWARD_MATERIALS : 0;
        if (!attackerWon && rewardTickets === 0) {
          const { count, error: countErr } = await supabase
            .from('mail_inbox')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', defenderId)
            .eq('day', today)
            .gt('reward_tickets', 0);
          if (countErr) { console.error('Mail reward count failed', countErr.message); return serverJson({ error: 'Mail unavailable', detail: countErr.message }, 500); }
          if ((count ?? 0) < MAX_REWARDED_DEFENSES_PER_DAY) {
            rewardTickets = DEFENSE_REWARD_TICKETS;
            rewardMaterials = DEFENSE_REWARD_MATERIALS;
          }
        }

        const now = new Date().toISOString();
        if (existing) {
          const { error: updateErr } = await supabase.from('mail_inbox').update({
            sender_name: senderName,
            attacker_wins: existing.attacker_wins + (attackerWon ? 1 : 0),
            defender_wins: existing.defender_wins + (attackerWon ? 0 : 1),
            reward_tickets: rewardTickets,
            reward_materials: rewardMaterials,
            updated_at: now,
          }).eq('id', existing.id);
          if (updateErr) { console.error('Mail update failed', updateErr.message); return serverJson({ error: 'Mail unavailable', detail: updateErr.message }, 500); }
          return serverJson({ result: 'updated' });
        }

        const { error: insertErr } = await supabase.from('mail_inbox').insert({
          recipient_id: defenderId,
          sender_id: userId,
          sender_name: senderName,
          kind: 'friend_battle',
          day: today,
          attacker_wins: attackerWon ? 1 : 0,
          defender_wins: attackerWon ? 0 : 1,
          reward_tickets: rewardTickets,
          reward_materials: rewardMaterials,
          updated_at: now,
        });
        if (!insertErr) return serverJson({ result: 'created' });
        if (!(String(insertErr.message).includes('duplicate') || String(insertErr.message).includes('unique'))) {
          console.error('Mail insert failed', insertErr.message);
          return serverJson({ error: 'Mail unavailable', detail: insertErr.message }, 500);
        }
      }
      return serverJson({ error: 'Mail busy, try again' }, 409);
    }

    return serverJson({ error: 'Method not allowed' }, 405);
  } catch (e) {
    console.error('Mail handler crashed', e);
    return serverJson({ error: 'Mail unavailable', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
}
