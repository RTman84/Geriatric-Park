// Verifies (or with --fix, rewrites) that every file using the word filter carries a block identical to services/wordFilter.ts.
import fs from 'node:fs';
const START = '// --- WORDFILTER START', END = '// --- WORDFILTER END ---';
const extract = (s) => { const a = s.indexOf(START); const b = s.indexOf(END); return a < 0 || b < 0 ? null : s.slice(a, b + END.length); };
const masterRaw = extract(fs.readFileSync('services/wordFilter.ts', 'utf8'));
const strip = (b) => b.replace(/^export /gm, '');
const master = strip(masterRaw);
const files = ['api/account/save.ts', 'api/posse.ts', 'api/chat.ts'].filter(f => fs.existsSync(f));
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'); const blk = extract(src);
  if (blk === master) continue;
  if (process.argv.includes('--fix') && blk) { fs.writeFileSync(f, src.replace(blk, () => master)); console.log('fixed', f); continue; }
  console.log('MISMATCH', f); bad++;
}
if (bad) process.exit(1); console.log('wordfilter copies identical:', files.length);
