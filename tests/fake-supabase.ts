const G: any = globalThis as any;
G.__DB = G.__DB || { tables: {} as Record<string, any[]>, tokens: {} as Record<string, string>, uid: 0 };
const DB = G.__DB;
const uuid = () => { DB.uid++; return '00000000-0000-4000-8000-' + String(DB.uid).padStart(12, '0'); };
const uniques: Record<string, (rows: any[], row: any) => boolean> = {
  posse_members: (rows, r) => rows.some(x => x.user_id === r.user_id || (x.posse_id === r.posse_id && x.user_id === r.user_id)),
  posse_lfp: (rows, r) => rows.some(x => x.user_id === r.user_id),
  posses: (rows, r) => rows.some(x => x.name_key === r.name_key && !x.deleted_at && !r.deleted_at),
};
class Q {
  op = 'select'; filters: ((r: any) => boolean)[] = []; patch: any = null; ins: any = null; ord: any = null; lim = Infinity; wantSingle = false; wantMaybe = false; selectAfter = false;
  constructor(public t: string) { DB.tables[t] = DB.tables[t] || []; }
  select() { if (this.op === 'insert' || this.op === 'update') this.selectAfter = true; else this.op = 'select'; return this; }
  insert(r: any) { this.op = 'insert'; this.ins = r; return this; }
  update(p: any) { this.op = 'update'; this.patch = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c: string, v: any) { this.filters.push(r => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push(r => r[c] !== v); return this; }
  in(c: string, v: any[]) { this.filters.push(r => v.includes(r[c])); return this; }
  is(c: string, v: any) { this.filters.push(r => (r[c] ?? null) === v); return this; }
  gte(c: string, v: any) { this.filters.push(r => r[c] >= v); return this; }
  gt(c: string, v: any) { this.filters.push(r => r[c] > v); return this; }
  lt(c: string, v: any) { this.filters.push(r => r[c] < v); return this; }
  ilike(c: string, pat: string) { const rx = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); this.filters.push(r => rx.test(String(r[c] ?? ''))); return this; }
  order(c: string, o: any) { this.ord = [c, o?.ascending !== false]; return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.wantMaybe = true; return this; }
  single() { this.wantSingle = true; return this; }
  run() {
    const rows = DB.tables[this.t];
    const match = rows.filter(r => this.filters.every(f => f(r)));
    if (this.op === 'insert') {
      const list = Array.isArray(this.ins) ? this.ins : [this.ins]; const out: any[] = [];
      for (const r0 of list) {
        const r = { ...r0 }; if (this.t === 'posse_chat' || this.t === 'friend_chat') { DB.chatSeq = (DB.chatSeq || 0) + 1; r.id = DB.chatSeq; } else if (!r.id && !['posse_members', 'player_profiles', 'posse_lfp'].includes(this.t)) r.id = uuid(); if (!r.created_at) r.created_at = new Date().toISOString();
        if (this.t === 'posse_invites') { r.status = r.status ?? 'pending'; r.expires_at = r.expires_at ?? new Date(Date.now() + 7 * 86400000).toISOString(); }
        if (uniques[this.t]?.(rows, r)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        rows.push(r); out.push(r);
      }
      return this.finish(out);
    }
    if (this.op === 'update') { match.forEach(r => Object.assign(r, this.patch)); return this.finish(match); }
    if (this.op === 'delete') { DB.tables[this.t] = rows.filter(r => !match.includes(r)); return { data: null, error: null }; }
    let out = [...match]; if (this.ord) out.sort((a, b) => (a[this.ord[0]] > b[this.ord[0]] ? 1 : -1) * (this.ord[1] ? 1 : -1));
    return this.finish(out.slice(0, this.lim));
  }
  finish(out: any[]) {
    const copy = out.map(r => ({ ...r }));
    if (this.wantSingle) return copy.length ? { data: copy[0], error: null } : { data: null, error: { message: 'no rows' } };
    if (this.wantMaybe) return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null };
  }
  then(res: any, rej: any) { try { return Promise.resolve(this.run()).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); } }
}
export function createClient() {
  return { from: (t: string) => new Q(t), auth: { getUser: async (token: string) => DB.tokens[token] ? { data: { user: { id: DB.tokens[token] } }, error: null } : { data: { user: null }, error: { message: 'bad' } } } };
}
