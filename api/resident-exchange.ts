// Self-contained on purpose (see the note at the top of api/friends.ts): shared helper files
// were not being included in the deployed function bundle. Edge runtime is required.
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
    global: { headers: { 'X-Geriatric-Park-Server': 'resident-exchange-api' } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return serverJson({ error: 'Invalid or expired session' }, 401);

  return { userId: data.user.id, supabase };
}

function isAccountContext(value: AccountContext | Response): value is AccountContext {
  return value instanceof Response === false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_DURATIONS = [8, 12, 24];
const OWNER_MAX_ACTIVE = 3; // how many of YOUR OWN Elders can be away at once, across all friends
const HOST_MAX_VISITORS = 3; // how many visiting Elders any one host can have at once, across all senders
const RESIDENT_XP_PER_HOUR = 15;
const HOST_MAX_LOANS = 1; // a borrower can have one loaned Elder at a time (Squad Loan)
const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary'];
const clampNum = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));
// Combat snapshot of a loaned Elder. Client-supplied (same trust level as synced Squad Power) but clamped here.
function cleanSnapshot(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  const maxHp = clampNum(raw.maxHp, 1, 5000);
  return {
    level: clampNum(raw.level, 1, 100),
    rarity: RARITIES.includes(raw.rarity) ? raw.rarity : 'Common',
    powerType: String(raw.powerType || 'Strength').slice(0, 20),
    strength: clampNum(raw.strength, 0, 3000), wit: clampNum(raw.wit, 0, 3000),
    agility: clampNum(raw.agility, 0, 3000), tenacity: clampNum(raw.tenacity, 0, 3000),
    maxHp, hp: clampNum(raw.hp, 1, maxHp),
  };
}
const VALID_GIFTS = ['materials', 'quest', 'boost'];
const HOST_MAX_GIFTS_PER_DAY = 6; // spam/farming guard: gifts any one host can receive per UTC day
const MIN_GIFT_HOURS = 1; // an Elder recalled within the first hour earns the host nothing
// Gift sizes scale with hours actually stayed (capped at the chosen duration), same rule as Elder XP.
const giftMaterials = (h: number) => Math.max(1, Math.round(h * 0.5)); // 24h = 12
const giftQuestPoints = (h: number) => Math.max(1, Math.round(h / 4)); // 24h = 6
const giftBoostHours = (h: number) => Math.max(1, Math.round(h / 4)); // 24h = 6 extra hours of one building's output (client caps at its storage limit)

const ROW_FIELDS = 'id, owner_id, host_id, elder_id, elder_name, elder_type, elder_evolution_stage, duration_hours, gift_type, mode, snapshot, placed_at, ends_at';

export default async function handler(req: Request): Promise<Response> {
  try {
    const context = await requireAccount(req);
    if (!isAccountContext(context)) return context;
    const { supabase, userId } = context;

    if (req.method === 'GET') {
      const [{ data: mine, error: mineErr }, { data: hosting, error: hostErr }] = await Promise.all([
        supabase.from('resident_exchange').select(`${ROW_FIELDS}, host:player_profiles!resident_exchange_host_id_fkey(display_name)`).eq('owner_id', userId),
        supabase.from('resident_exchange').select(`${ROW_FIELDS}, owner:player_profiles!resident_exchange_owner_id_fkey(display_name)`).eq('host_id', userId),
      ]);
      if (mineErr || hostErr) {
        const msg = (mineErr || hostErr)?.message;
        console.error('Resident Exchange read failed', msg);
        return serverJson({ error: 'Resident Exchange unavailable', detail: msg }, 500);
      }
      return serverJson({ mine: mine ?? [], hosting: hosting ?? [] });
    }

    if (req.method === 'POST') {
      let body: any;
      try { body = await req.json(); } catch { return serverJson({ error: 'Invalid JSON' }, 400); }

      if (body?.action === 'place') {
        const hostId = String(body?.hostId || '');
        const elderId = String(body?.elderId || '');
        const elderName = String(body?.elderName || '').slice(0, 60) || 'An Elder';
        const elderType = String(body?.elderType || '');
        const evoStage = Number.isInteger(body?.elderEvolutionStage) ? body.elderEvolutionStage : 0;
        const durationHours = Number(body?.durationHours);
        const giftType = body?.giftType === undefined ? 'materials' : String(body.giftType);
        const mode = body?.mode === 'loan' ? 'loan' : 'visit';
        const snapshot = mode === 'loan' ? cleanSnapshot(body?.snapshot) : null;

        if (!UUID_RE.test(hostId)) return serverJson({ error: 'Invalid hostId' }, 400);
        if (hostId === userId) return serverJson({ error: "You can't send an Elder to your own park." }, 400);
        if (!elderId) return serverJson({ error: 'Invalid elderId' }, 400);
        if (mode === 'loan' && !snapshot) return serverJson({ error: 'Invalid Elder snapshot' }, 400);
        if (!VALID_GIFTS.includes(giftType)) return serverJson({ error: 'Invalid giftType' }, 400);
        if (!VALID_DURATIONS.includes(durationHours)) return serverJson({ error: 'durationHours must be 8, 12, or 24.' }, 400);

        // Only accepted friends can host each other's Elders (mirrors the same-direction check
        // already used for Friend Battle mail -- acceptance writes a mirrored row both ways).
        const { data: link, error: linkErr } = await supabase
          .from('friend_requests').select('id').eq('requester_id', userId).eq('addressee_id', hostId).eq('status', 'accepted').maybeSingle();
        if (linkErr) { console.error('Resident Exchange friend check failed', linkErr.message); return serverJson({ error: 'Resident Exchange unavailable', detail: linkErr.message }, 500); }
        if (!link) return serverJson({ error: 'You can only visit a friend\'s park.' }, 403);

        const { count: ownerCount, error: ownerCountErr } = await supabase
          .from('resident_exchange').select('id', { count: 'exact', head: true }).eq('owner_id', userId);
        if (ownerCountErr) { console.error('Resident Exchange owner-count failed', ownerCountErr.message); return serverJson({ error: 'Resident Exchange unavailable', detail: ownerCountErr.message }, 500); }
        if ((ownerCount ?? 0) >= OWNER_MAX_ACTIVE) return serverJson({ error: `You already have ${OWNER_MAX_ACTIVE} Elders visiting friends.` }, 409);

        const { count: hostCount, error: hostCountErr } = await supabase
          .from('resident_exchange').select('id', { count: 'exact', head: true }).eq('host_id', hostId).eq('mode', mode);
        if (hostCountErr) { console.error('Resident Exchange host-count failed', hostCountErr.message); return serverJson({ error: 'Resident Exchange unavailable', detail: hostCountErr.message }, 500); }
        if (mode === 'loan' && (hostCount ?? 0) >= HOST_MAX_LOANS) return serverJson({ error: 'That friend already has a borrowed Elder.' }, 409);
        if (mode === 'visit' && (hostCount ?? 0) >= HOST_MAX_VISITORS) return serverJson({ error: "That friend's park is full of visitors right now." }, 409);

        const now = new Date();
        const endsAt = new Date(now.getTime() + durationHours * 3600000);
        const { data: inserted, error: insertErr } = await supabase.from('resident_exchange').insert({
          owner_id: userId, host_id: hostId, elder_id: elderId, elder_name: elderName, elder_type: elderType,
          elder_evolution_stage: evoStage, duration_hours: durationHours, gift_type: giftType, mode, snapshot, placed_at: now.toISOString(), ends_at: endsAt.toISOString(),
        }).select(ROW_FIELDS).maybeSingle();
        if (insertErr) {
          if (String(insertErr.message).includes('duplicate') || String(insertErr.message).includes('unique')) {
            return serverJson({ error: 'That Elder is already visiting a friend.' }, 409);
          }
          console.error('Resident Exchange insert failed', insertErr.message);
          return serverJson({ error: 'Resident Exchange unavailable', detail: insertErr.message }, 500);
        }

        return serverJson({ placement: inserted });
      }

      if (body?.action === 'recall') {
        const placementId = String(body?.placementId || '');
        if (!UUID_RE.test(placementId)) return serverJson({ error: 'Invalid placementId' }, 400);

        const { data: row, error: rowErr } = await supabase.from('resident_exchange').select(ROW_FIELDS).eq('id', placementId).maybeSingle();
        if (rowErr) { console.error('Resident Exchange recall lookup failed', rowErr.message); return serverJson({ error: 'Resident Exchange unavailable', detail: rowErr.message }, 500); }
        if (!row || row.owner_id !== userId) return serverJson({ error: 'Placement not found' }, 404);

        const elapsedHours = (Date.now() - Date.parse(row.placed_at)) / 3600000;
        const xpEarned = Math.max(0, Math.round(Math.min(elapsedHours, row.duration_hours) * RESIDENT_XP_PER_HOUR));

        const { error: delErr } = await supabase.from('resident_exchange').delete().eq('id', placementId);
        if (delErr) { console.error('Resident Exchange recall delete failed', delErr.message); return serverJson({ error: 'Resident Exchange unavailable', detail: delErr.message }, 500); }

        // Host gift, paid now that the visit is over. Failure here never blocks the owner's return/XP.
        const stayedHours = Math.min(Math.max(0, elapsedHours), row.duration_hours);
        let giftSent = false;
        if (row.mode !== 'loan' && stayedHours >= MIN_GIFT_HOURS) { // loans pay the owner's XP only; the host's reward is the combat help itself
          try {
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            const { count: todays } = await supabase.from('mail_inbox').select('id', { count: 'exact', head: true })
              .eq('recipient_id', row.host_id).eq('kind', 'resident_exchange_host').eq('day', today);
            if ((todays ?? 0) < HOST_MAX_GIFTS_PER_DAY) {
              const { data: profile } = await supabase.from('player_profiles').select('display_name').eq('user_id', userId).maybeSingle();
              const senderName = (profile?.display_name && String(profile.display_name).slice(0, 40)) || 'Park Visitor';
              const gift = row.gift_type === 'quest' || row.gift_type === 'boost' ? row.gift_type : 'materials';
              const note = gift === 'quest' ? `gift:quest:${giftQuestPoints(stayedHours)}:${row.elder_name}`
                : gift === 'boost' ? `gift:boost:${giftBoostHours(stayedHours)}:${row.elder_name}`
                : `gift:materials:0:${row.elder_name}`;
              const { error: mailErr } = await supabase.from('mail_inbox').insert({
                recipient_id: row.host_id, sender_id: userId, sender_name: senderName, kind: 'resident_exchange_host',
                day: today, ref: row.id, reward_materials: gift === 'materials' ? giftMaterials(stayedHours) : 0,
                note: note.slice(0, 200), updated_at: now.toISOString(),
              });
              if (mailErr) console.error('Resident Exchange host-gift mail failed (recall still succeeded)', mailErr.message);
              else giftSent = true;
            }
          } catch (e) { console.error('Resident Exchange host gift crashed (recall still succeeded)', e); }
        }

        return serverJson({ elderId: row.elder_id, xpEarned, giftType: row.gift_type, giftSent });
      }

      return serverJson({ error: 'Unknown action' }, 400);
    }

    return serverJson({ error: 'Method not allowed' }, 405);
  } catch (e) {
    console.error('Resident Exchange handler crashed', e);
    return serverJson({ error: 'Resident Exchange unavailable', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
}
