import { getAccessToken } from './authService';
import type { MailMessage } from '../types';

// Mirrors MAIL_FIELDS in api/mail.ts.
export interface InboxRow {
  id: string;
  sender_name: string;
  kind: 'friend_battle';
  day: string;
  attacker_wins: number;
  defender_wins: number;
  reward_tickets: number;
  reward_materials: number;
  updated_at: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) throw new Error('Account sign-in required.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchInbox(): Promise<InboxRow[]> {
  const headers = await authHeaders();
  const response = await fetch('/api/mail', { headers, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Mail request failed (${response.status}).`);
  return (body.messages ?? []) as InboxRow[];
}

// Fire-and-forget from the challenger's side after a Friend Battle resolves.
export async function notifyFriendBattle(defenderId: string, attackerWon: boolean): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch('/api/mail', {
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
  const total = row.attacker_wins + row.defender_wins;
  const parts: string[] = [`${row.sender_name} challenged your squad ${total} ${plural(total, 'time', 'times')} today.`];
  parts.push(`Your squad held them off ${row.defender_wins} ${plural(row.defender_wins, 'time', 'times')}; they won ${row.attacker_wins}.`);
  if (row.reward_tickets > 0) parts.push("Nicely defended — here's your defender's bounty!");
  return {
    id: `${MAIL_ID_PREFIX}${row.id}`,
    sender: row.sender_name,
    subject: `⚔️ Friend Battle: ${row.sender_name}`,
    body: parts.join(' '),
    reward: row.reward_tickets > 0 ? { type: 'Tokens', value: row.reward_tickets } : undefined,
    materials: row.reward_materials > 0 ? row.reward_materials : undefined,
    claimed: false,
    timestamp: Date.parse(row.updated_at) || Date.now(),
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
