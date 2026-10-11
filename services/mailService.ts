import { POWER_BRACKETS } from '../constants';
import { getAccessToken } from './authService';
import { apiUrl } from './api';
import type { MailMessage } from '../types';

// Mirrors MAIL_FIELDS in api/mail.ts.
export interface InboxRow {
  id: string;
  sender_name: string;
  kind: 'friend_battle' | 'arena_knockout' | 'arena_dues' | 'raid_result' | 'resident_exchange_host' | 'court_displaced' | 'board_reward' | 'friend_request';
  day: string;
  attacker_wins: number;
  defender_wins: number;
  reward_tickets: number;
  reward_materials: number;
  reward_diners?: number;
  note?: string | null;
  updated_at: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchInbox(): Promise<InboxRow[]> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/mail'), { headers, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Mail request failed (${response.status}).`);
  return (body.messages ?? []) as InboxRow[];
}

// Fire-and-forget from the challenger's side after a Friend Battle resolves.
export async function notifyFriendBattle(defenderId: string, attackerWon: boolean): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(apiUrl('/api/mail'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'friendBattle', defenderId, attackerWon }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `Mail request failed (${response.status}).`);
  }
}

export const MAIL_ID_PREFIX = 'fb-';
// Server returns a 14-day window; never prune Friend Battle mail younger than
// this, or a pruned message could reappear from the server as brand new.
const PRUNE_AFTER_MS = 15 * 24 * 60 * 60 * 1000;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function rowToMessage(row: InboxRow): MailMessage {
  const base = {
    id: `${MAIL_ID_PREFIX}${row.id}`,
    claimed: false,
    timestamp: Date.parse(row.updated_at) || Date.now(),
  };
  const reward = row.reward_tickets > 0 ? { type: 'Tokens' as const, value: row.reward_tickets } : undefined;
  const materials = row.reward_materials > 0 ? row.reward_materials : undefined;
  if (row.kind === 'board_reward') {
    // note (written by api/boards.ts): board:<mode>:<bracket>:<place>:<week>
    const bits = typeof row.note === 'string' ? row.note.split(':') : [];
    const label = ({ arena: 'Arenas', raid: 'Raids', friend: 'Friend Battles' } as Record<string, string>)[bits[1]] ?? 'Leaderboard';
    const bracket = Math.max(1, Math.min(10, Math.floor(Number(bits[2]) || 1)));
    const place = Math.max(1, Math.min(3, Math.floor(Number(bits[3]) || 1)));
    const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
    return { ...base, sender: 'Weekly Boards', subject: `${medal} Weekly ${label} board: #${place} in ${POWER_BRACKETS[bracket - 1].name}`, body: `You finished #${place} in the ${POWER_BRACKETS[bracket - 1].name} bracket on the weekly ${label} board (${bits[4] ?? 'last week'}). Your reward was paid automatically and the title is yours to equip in the profile picker.`, materials, diners: row.reward_diners && row.reward_diners > 0 ? row.reward_diners : undefined, auto: true, honor: `board:${bits[1]}:${bracket}:${place}` };
  }
  if (row.kind === 'friend_request') {
    // note (written by api/friends.ts): the friend request id
    const requestId = typeof row.note === 'string' ? row.note.slice(0, 60) : '';
    return { ...base, sender: row.sender_name, subject: `\u{1F91D} ${row.sender_name} sent you a friend request`, body: `${row.sender_name} would like to be your friend. Accept to see each other's parks and battle as friends, or decline. Nothing changes unless you accept.`, friendRequest: requestId ? { requestId } : undefined };
  }
  if (row.kind === 'arena_knockout') {
    const n = row.attacker_wins;
    return {
      ...base,
      sender: row.sender_name,
      subject: `🏟️ Arena: ${row.sender_name} knocked out ${n} of your ${plural(n, 'Elder', 'Elders')}`,
      body: `${row.note || 'An Elder of yours was knocked out at an Arena.'} ${n > 1 ? `That happened ${n} times today. ` : ''}Your Elders are safe and back home — here's a little consolation.`,
      reward, materials,
    };
  }
  if (row.kind === 'arena_dues') {
    return {
      ...base,
      sender: 'Arena Committee',
      subject: '🏟️ Arena Dues',
      body: `${row.note || 'Your stationed Elders earned Arena Dues.'} Claim them below.`,
      reward, materials,
    };
  }
  if (row.kind === 'raid_result') {
    return {
      ...base,
      sender: row.sender_name,
      subject: `🐲 Raid: ${row.sender_name}`,
      body: row.note || 'A Raid you joined has ended.',
      reward, materials,
    };
  }
  if (row.kind === 'court_displaced') {
    // note (written by api/court.ts): displaced:<bracket>:<oldRank>:<newRank, 0 = off the ladder>
    const bits = typeof row.note === 'string' ? row.note.split(':') : [];
    const bracket = Math.max(1, Math.min(10, Math.floor(Number(bits[1]) || 1)));
    const from = Math.floor(Number(bits[2]) || 0), to = Math.floor(Number(bits[3]) || 0);
    const bName = POWER_BRACKETS[bracket - 1].name;
    return { ...base, sender: row.sender_name, subject: `\u{1F451} ${row.sender_name} took your Court spot`, body: to > 0 ? `${row.sender_name} beat you in the ${bName} ladder. You dropped from rank ${from} to rank ${to}. Challenge them back from the Court tab!` : `${row.sender_name} beat you in the ${bName} ladder and took your last spot. Rejoin from the Court tab.` };
  }
  if (row.kind === 'resident_exchange_host') {
    // note format (untrusted, written by api/resident-exchange.ts): gift:<materials|quest|boost>:<amount>:<elder name>
    const bits = typeof row.note === 'string' ? row.note.split(':') : [];
    const type = bits[1];
    const amount = Math.max(0, Math.min(100, Math.floor(Number(bits[type === 'materials' ? 2 : 2]) || 0)));
    const elder = (bits[3] || '').slice(0, 60) || 'An Elder';
    const targetId = (bits[4] || '').slice(0, 40);
    const targetLabel = (bits.slice(5).join(':') || '').slice(0, 60);
    const intro = `${elder} just finished a visit to your park and ${row.sender_name} sent a thank-you gift.`;
    if (type === 'quest' && amount > 0) {
      return { ...base, sender: row.sender_name, subject: `🏡 ${elder} visited your park`, body: `${intro} ${targetId ? `Quest chosen for you: ${targetLabel || 'a quest'}.` : 'Claim it and choose one active Quest to push forward by ' + amount + '.'}`, exchangeHost: true, gift: { type: 'quest', amount, from: row.sender_name, targetId: targetId || undefined, targetLabel: targetLabel || undefined } };
    }
    if (type === 'boost' && amount > 0) {
      return { ...base, sender: row.sender_name, subject: `🏡 ${elder} visited your park`, body: `${intro} ${targetId ? `Building chosen for you: ${targetLabel || 'a building'} (+${amount} ${plural(amount, 'hour', 'hours')} of output, up to its storage limit).` : 'Claim it and choose one working building to add ' + amount + ' extra ' + plural(amount, 'hour', 'hours') + ' of output to (up to its storage limit).'}`, exchangeHost: true, gift: { type: 'boost', amount, from: row.sender_name, targetId: targetId || undefined, targetLabel: targetLabel || undefined } };
    }
    return { ...base, sender: row.sender_name, subject: `🏡 ${elder} visited your park`, body: `${intro}`, reward, materials, exchangeHost: true };
  }
  const total = row.attacker_wins + row.defender_wins;
  const parts: string[] = [`${row.sender_name} challenged your squad ${total} ${plural(total, 'time', 'times')} today.`];
  parts.push(`Your squad held them off ${row.defender_wins} ${plural(row.defender_wins, 'time', 'times')}; they won ${row.attacker_wins}.`);
  if (row.reward_tickets > 0) parts.push("Nicely defended — here's your defender's bounty!");
  return {
    ...base,
    sender: row.sender_name,
    subject: `⚔️ Friend Battle: ${row.sender_name}`,
    body: parts.join(' '),
    reward, materials,
  };
}

// Merges server rows into the local Mailbox by id. Text/counts always refresh;
// once a message is claimed its reward and claimed flag are never touched, so a
// re-fetch can't hand out the reward twice. Returns the SAME array reference
// when nothing changed, so callers don't trigger needless saves.
// Saved Mailboxes come from every past version of the game, so entries are treated as
// untrusted: a non-array Mailbox, or a message with a missing/non-string id, must never throw
// here (this runs on every app load).
const idOf = (m: unknown): string => (m && typeof (m as MailMessage).id === 'string') ? (m as MailMessage).id : '';

export function mergeInboxIntoMailbox(mailbox: MailMessage[], rows: InboxRow[], now = Date.now()): MailMessage[] {
  if (!Array.isArray(mailbox) || !Array.isArray(rows)) return mailbox;
  let changed = false;
  let next = mailbox.slice();

  for (const row of rows) {
    const incoming = rowToMessage(row);
    const idx = next.findIndex(m => idOf(m) === incoming.id);
    if (idx === -1) {
      next.push(incoming);
      changed = true;
      continue;
    }
    const existing = next[idx];
    const merged: MailMessage = existing.claimed
      ? { ...existing, sender: incoming.sender, subject: incoming.subject, body: incoming.body, timestamp: incoming.timestamp }
      : { ...existing, ...incoming, claimed: false };
    if (merged.body !== existing.body || merged.timestamp !== existing.timestamp || merged.sender !== existing.sender
      || merged.materials !== existing.materials || JSON.stringify(merged.reward) !== JSON.stringify(existing.reward)) {
      next[idx] = merged;
      changed = true;
    }
  }

  const pruned = next.filter(m => !(idOf(m).startsWith(MAIL_ID_PREFIX) && m.claimed && now - m.timestamp > PRUNE_AFTER_MS));
  if (pruned.length !== next.length) { next = pruned; changed = true; }

  return changed ? next : mailbox;
}
