// Verifies the awardPosse block is identical in every route that uses it.
import fs from 'node:fs';
const START = '// --- POSSE POINTS START', END = '// --- POSSE POINTS END ---';
const ex = (s) => { const a = s.indexOf(START), b = s.indexOf(END); return a < 0 || b < 0 ? null : s.slice(a, b + END.length); };
const files = ['api/arena.ts', 'api/mail.ts', 'api/court.ts'];
const blocks = files.map(f => ex(fs.readFileSync(f, 'utf8')));
if (blocks.some(b => !b) || new Set(blocks).size !== 1) { console.log('POSSE POINTS block missing or different', blocks.map(b => !!b)); process.exit(1); }
console.log('posse points blocks identical:', files.length);
