// Inlined intentionally — a shared file (whether under api/ or lib/) was not being
// included in the deployed function bundle in this project, causing
// ERR_MODULE_NOT_FOUND at runtime for every route that imported it. Each API route
// is self-contained instead, at the cost of duplicating this ~45-line helper.
//
// Edge runtime is required here, not optional: this file is written entirely
// against the Web Fetch API (Request/Response/Headers, req.json(), req.headers.get()).
// Without this declaration Vercel defaults to the Node.js runtime, where req is a
// plain http.IncomingMessage-like object with none of those methods -- see the
// same bug found and fixed in tournament-board.ts and account/*.ts (9-12-26).
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
    global: { headers: { 'X-Geriatric-Park-Server': 'friends-api' } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);

  return { userId: data.user.id, supabase };
}

function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

// Excludes visually-ambiguous characters (0/O, 1/I/L) since codes are meant
// to be read aloud or typed in by hand.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

const PROFILE_FIELDS = 'user_id, friend_code, display_name, level, selected_title, selected_account_icon, achievements_completed, achievements_total, squad_power, favorite_elders, open_to_random_friends, updated_at';

async function ensureProfile(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase.from('player_profiles').select(PROFILE_FIELDS).eq('user_id', userId).maybeSingle();
  if (existing) return existing;

  // Race-safe-enough for this scale: retry a few times on the unique
  // constraint if two codes collide, which is astronomically rare at
  // 32^8 combinations but cheap to guard against anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('player_profiles')
      .insert({ user_id: userId, friend_code: generateFriendCode() })
      .select(PROFILE_FIELDS)
      .single();
    if (!error) return data;
    if (!String(error.message).includes('friend_code')) throw error;
  }
  throw new Error('Could not allocate a friend code');
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (!isAccountContext(context)) return context;
    const { supabase, userId } = context;

    if (req.method === 'GET') {
      const profile = await ensureProfile(supabase, userId);

      const [{ data: friends, error: friendsErr }, { data: incoming, error: inErr }, { data: outgoing, error: outErr }] = await Promise.all([
        supabase.from('friend_requests').select('addressee_id').eq('requester_id', userId).eq('status', 'accepted'),
        supabase.from('friend_requests').select('id, requester_id, created_at').eq('addressee_id', userId).eq('status', 'pending'),
        supabase.from('friend_requests').select('id, addressee_id, created_at').eq('requester_id', userId).eq('status', 'pending'),
      ]);
      if (friendsErr || inErr || outErr) {
        const detail = friendsErr?.message || inErr?.message || outErr?.message;
        console.error('Friends read failed', detail);
        return serverJson({ error: 'Friends unavailable', detail }, 500);
      }

      // Accepted friendships are stored as a mirrored pair of rows (see the
      // 'accept' action below), one per direction -- so querying just the
      // requester_id=me side is already sufficient regardless of who
      // originally sent the request. (Verified this against the actual
      // accept/mutual-match logic before "fixing" it -- an earlier version
      // of this comment queried both directions, which double-counted every
      // friend given the mirroring already in place.)
      const friendIds = (friends ?? []).map(f => f.addressee_id);
      let friendProfiles: any[] = [];
      if (friendIds.length > 0) {
        const { data, error } = await supabase.from('player_profiles').select(PROFILE_FIELDS).in('user_id', friendIds);
        if (error) { console.error('Friend profiles read failed', error.message); return serverJson({ error: 'Friends unavailable', detail: error.message }, 500); }
        friendProfiles = data ?? [];
      }

      // Requester/addressee display names for pending requests -- enough to
      // show "who" without a full profile fetch per row.
      const pendingIds = [...(incoming ?? []).map(r => r.requester_id), ...(outgoing ?? []).map(r => r.addressee_id)];
      let pendingProfiles: any[] = [];
      if (pendingIds.length > 0) {
        const { data } = await supabase.from('player_profiles').select('user_id, display_name, friend_code').in('user_id', pendingIds);
        pendingProfiles = data ?? [];
      }
      const nameFor = (id: string) => pendingProfiles.find(p => p.user_id === id)?.display_name || null;

      return serverJson({
        myCode: profile.friend_code,
        myOpenToRandom: profile.open_to_random_friends,
        friends: friendProfiles,
        incoming: (incoming ?? []).map(r => ({ id: r.id, userId: r.requester_id, displayName: nameFor(r.requester_id), createdAt: r.created_at })),
        outgoing: (outgoing ?? []).map(r => ({ id: r.id, userId: r.addressee_id, displayName: nameFor(r.addressee_id), createdAt: r.created_at })),
      });
    }

    if (req.method === 'POST') {
      let body: any;
      try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }
      const action = body?.action;

      // Shared by 'send' (by code), 'sendByUserId' (from the leaderboard),
      // and 'randomMatch' -- all three end in the same place, either a
      // mutual instant-accept (if they'd already requested us) or a new
      // pending request.
      async function sendRequestTo(targetUserId: string): Promise<Response> {
        if (targetUserId === userId) return serverJson({ error: "You can't friend yourself." }, 400);

        const { data: reverse } = await supabase.from('friend_requests').select('id').eq('requester_id', targetUserId).eq('addressee_id', userId).eq('status', 'pending').maybeSingle();
        if (reverse) {
          const now = new Date().toISOString();
          const { error: acceptErr } = await supabase.from('friend_requests').update({ status: 'accepted', updated_at: now }).eq('id', reverse.id);
          if (acceptErr) { console.error('Mutual accept failed', acceptErr.message); return serverJson({ error: 'Friends unavailable', detail: acceptErr.message }, 500); }
          const { error: mirrorErr } = await supabase.from('friend_requests').upsert(
            { requester_id: userId, addressee_id: targetUserId, status: 'accepted', updated_at: now },
            { onConflict: 'requester_id,addressee_id' },
          );
          if (mirrorErr) { console.error('Mutual mirror failed', mirrorErr.message); return serverJson({ error: 'Friends unavailable', detail: mirrorErr.message }, 500); }
          return serverJson({ result: 'friends' });
        }

        const { error: insertErr } = await supabase.from('friend_requests').insert({ requester_id: userId, addressee_id: targetUserId, status: 'pending' });
        if (insertErr) {
          if (String(insertErr.message).includes('duplicate') || String(insertErr.message).includes('unique')) {
            return serverJson({ error: 'Already sent or already friends.' }, 409);
          }
          console.error('Friend request insert failed', insertErr.message);
          return serverJson({ error: 'Friends unavailable', detail: insertErr.message }, 500);
        }
        return serverJson({ result: 'sent' });
      }

      if (action === 'send') {
        const code = String(body?.code || '').toUpperCase().trim();
        if (code.length !== 8) return serverJson({ error: 'Enter an 8-character friend code.' }, 400);

        const { data: target, error: targetErr } = await supabase.from('player_profiles').select('user_id').eq('friend_code', code).maybeSingle();
        if (targetErr) { console.error('Friend code lookup failed', targetErr.message); return serverJson({ error: 'Friends unavailable', detail: targetErr.message }, 500); }
        if (!target) return serverJson({ error: 'No player found with that code.' }, 404);
        return sendRequestTo(target.user_id);
      }

      // From the Daily Tournament leaderboard: add a player you can already
      // see by their (already-public) user_id, no friend code needed.
      if (action === 'sendByUserId') {
        const targetUserId = String(body?.targetUserId || '');
        if (!targetUserId) return serverJson({ error: 'Missing targetUserId' }, 400);
        return sendRequestTo(targetUserId);
      }

      // Opt-in only: picks one random profile that has explicitly turned on
      // open_to_random_friends, isn't the caller, and isn't already a friend
      // or pending request in either direction. Excludes are applied in JS
      // rather than a hand-built SQL "not in (...)" fragment -- simpler and
      // avoids any risk of malformed filter syntax.
      if (action === 'randomMatch') {
        const { data: existingLinks } = await supabase
          .from('friend_requests')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
        const excluded = new Set<string>([userId]);
        (existingLinks ?? []).forEach(l => { excluded.add(l.requester_id); excluded.add(l.addressee_id); });

        const { data: pool, error: candErr } = await supabase
          .from('player_profiles')
          .select('user_id')
          .eq('open_to_random_friends', true)
          .limit(200);
        if (candErr) { console.error('Random match lookup failed', candErr.message); return serverJson({ error: 'Friends unavailable', detail: candErr.message }, 500); }

        const candidates = (pool ?? []).filter(p => !excluded.has(p.user_id));
        if (candidates.length === 0) return serverJson({ error: 'No one is available for random matching right now — try again later!' }, 404);

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return sendRequestTo(pick.user_id);
      }

      if (action === 'accept' || action === 'decline') {
        const requestId = String(body?.requestId || '');
        const { data: reqRow, error: reqErr } = await supabase.from('friend_requests').select('id, requester_id, addressee_id, status').eq('id', requestId).maybeSingle();
        if (reqErr) { console.error('Friend request lookup failed', reqErr.message); return serverJson({ error: 'Friends unavailable', detail: reqErr.message }, 500); }
        if (!reqRow || reqRow.addressee_id !== userId || reqRow.status !== 'pending') {
          return serverJson({ error: 'Request not found.' }, 404);
        }

        const now = new Date().toISOString();
        if (action === 'decline') {
          const { error } = await supabase.from('friend_requests').update({ status: 'declined', updated_at: now }).eq('id', requestId);
          if (error) { console.error('Decline failed', error.message); return serverJson({ error: 'Friends unavailable', detail: error.message }, 500); }
          return serverJson({ result: 'declined' });
        }

        const { error: acceptErr } = await supabase.from('friend_requests').update({ status: 'accepted', updated_at: now }).eq('id', requestId);
        if (acceptErr) { console.error('Accept failed', acceptErr.message); return serverJson({ error: 'Friends unavailable', detail: acceptErr.message }, 500); }
        const { error: mirrorErr } = await supabase.from('friend_requests').upsert(
          { requester_id: userId, addressee_id: reqRow.requester_id, status: 'accepted', updated_at: now },
          { onConflict: 'requester_id,addressee_id' },
        );
        if (mirrorErr) { console.error('Accept mirror failed', mirrorErr.message); return serverJson({ error: 'Friends unavailable', detail: mirrorErr.message }, 500); }
        return serverJson({ result: 'accepted' });
      }

      return serverJson({ error: 'Unknown action' }, 400);
    }

    if (req.method === 'PUT') {
      let body: any;
      try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }
      if (typeof body?.openToRandomFriends !== 'boolean') return serverJson({ error: 'Missing openToRandomFriends' }, 400);

      await ensureProfile(supabase, userId); // make sure a row exists to update
      const { error } = await supabase
        .from('player_profiles')
        .update({ open_to_random_friends: body.openToRandomFriends, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) { console.error('Random-match preference update failed', error.message); return serverJson({ error: 'Friends unavailable', detail: error.message }, 500); }
      return serverJson({ result: 'updated', openToRandomFriends: body.openToRandomFriends });
    }

    if (req.method === 'DELETE') {
      let body: any;
      try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }
      const friendUserId = String(body?.friendUserId || '');
      if (!friendUserId) return serverJson({ error: 'Missing friendUserId' }, 400);

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendUserId}),and(requester_id.eq.${friendUserId},addressee_id.eq.${userId})`);
      if (error) { console.error('Unfriend failed', error.message); return serverJson({ error: 'Friends unavailable', detail: error.message }, 500); }
      return serverJson({ result: 'removed' });
    }

    return serverJson({ error: 'Method not allowed' }, 405);
  } catch (e: any) {
    console.error('Friends handler crashed', e?.message || e);
    return serverJson({ error: 'Friends crashed', detail: String(e?.message || e) }, 500);
  }
}
