// Shared word filter for display names, Posse names/tags and chat. The marked block is copied into each api route; run `node scripts/check-wordfilter.mjs` (add --fix to sync).
// --- WORDFILTER START (identical copy lives in services/wordFilter.ts and every api route that uses it; scripts/check-wordfilter.mjs verifies) ---
const WF_LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't' };
// Matched anywhere inside the squashed text (spaces, symbols and repeats removed): unambiguous severe terms only.
const WF_ALWAYS = ['nigg', 'nigr', 'fagg', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'gook', 'wetback', 'spic', 'cunt', 'fuck', 'shit', 'bitch', 'whore', 'slut', 'rapist', 'nazi', 'hitler', 'cock', 'dick', 'pussy', 'bastard', 'twat', 'wank', 'jizz', 'porn', 'dildo', 'penis', 'vagina', 'molest', 'pedo'];
// Matched only as whole words (so "class", "grape", "assistant" stay fine).
const WF_WORDS = ['ass', 'asshole', 'coon', 'dyke', 'rape', 'rapes', 'raped', 'sex', 'sexy', 'nude', 'nudes', 'tits', 'boob', 'boobs', 'anal', 'cum', 'hoe', 'damn', 'piss', 'crap', 'fag', 'negro', 'homo', 'suicide', 'kys', 'kkk'];
// Innocent words that contain a blocked fragment; removed whole before the squashed check.
const WF_SAFE = ['scunthorpe', 'cockburn', 'dickens', 'dickinson', 'dickson', 'hancock', 'peacock', 'cockatoo', 'cocktail', 'cockpit', 'shiitake', 'shitake', 'penistone', 'analysis', 'analyst', 'assassin', 'bassett', 'classic', 'grape', 'therapist', 'mishit', 'pussycat', 'pussy willow', 'cumberland', 'cucumber', 'document', 'accumulate', 'circumstance', 'specific', 'spice', 'spicy', 'helen'];
const WF_RESERVED = ['admin', 'administrator', 'moderator', 'support', 'staff', 'official', 'geriatricpark', 'anthropic', 'claude'];
export type WordCheck = { ok: boolean; reason?: 'empty' | 'length' | 'blocked' | 'contact' | 'reserved' };
function wfSquash(text: string): string {
  const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) out += WF_LEET[ch] ?? ch;
  return out.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
}
function wfTokens(text: string): string[] {
  const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) out += WF_LEET[ch] ?? ch;
  return out.split(/[^a-z]+/).filter(Boolean);
}
function wfVariants(t: string): string[] { return [t, t.replace(/(.)\1{2,}/g, '$1'), t.replace(/(.)\1{2,}/g, '$1$1')]; }
export function checkText(raw: unknown, opts: { min?: number; max?: number; reserved?: boolean } = {}): WordCheck {
  const text = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim() : '';
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length < (opts.min ?? 1) || text.length > (opts.max ?? 40)) return { ok: false, reason: 'length' };
  if (/https?:|www\.|\.(com|net|org|io|gg|ly|me|co|tv)\b|@\w+\.\w+|\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/i.test(text)) return { ok: false, reason: 'contact' };
  const tokens = wfTokens(text);
  if (tokens.some(t => wfVariants(t).some(v => WF_WORDS.includes(v)))) return { ok: false, reason: 'blocked' };
  const kept = tokens.filter(t => !WF_SAFE.includes(t)).join(' ');
  const squashed = wfSquash(kept);
  if (WF_ALWAYS.some(w => squashed.includes(w.replace(/(.)\1+/g, '$1')))) return { ok: false, reason: 'blocked' };
  const wholeSquash = wfSquash(text);
  if (opts.reserved && WF_RESERVED.some(w => { const d = w.replace(/(.)\1+/g, '$1'); return wholeSquash === d || wholeSquash.startsWith(d); })) return { ok: false, reason: 'reserved' };
  return { ok: true };
}
export function wordCheckMessage(c: WordCheck): string {
  if (c.ok) return '';
  if (c.reason === 'empty') return 'Please enter something.';
  if (c.reason === 'length') return 'That is too short or too long.';
  if (c.reason === 'contact') return 'Links, emails and phone numbers are not allowed.';
  if (c.reason === 'reserved') return 'That name is reserved. Please pick another.';
  return 'That is not allowed. Please pick something friendlier.';
}
// --- WORDFILTER END ---
