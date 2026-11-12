// Verifies the preset id list in each api route equals the ids in services/posseChat.ts.
import fs from 'node:fs';
const cat = fs.readFileSync('services/posseChat.ts', 'utf8');
const clientIds = new Set([...cat.matchAll(/\{ id: '([a-z_]+)', text:/g)].map(m => m[1]).concat([...cat.matchAll(/[\'\"](st_[a-z]+)[\'\"]/g)].map(m => m[1])));
let bad = 0;
for (const f of ['api/posse.ts', 'api/friendchat.ts'].filter(x => fs.existsSync(x))) {
  const m = fs.readFileSync(f, 'utf8').match(/const PRESET_IDS = new Set\(\[(.*?)\]\);/s);
  const ids = new Set([...(m?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map(x => x[1]));
  const missing = [...clientIds].filter(i => !ids.has(i)), extra = [...ids].filter(i => !clientIds.has(i));
  if (missing.length || extra.length) { console.log('MISMATCH', f, { missing, extra }); bad++; }
}
if (bad) process.exit(1); console.log('chat preset ids match:', clientIds.size);
