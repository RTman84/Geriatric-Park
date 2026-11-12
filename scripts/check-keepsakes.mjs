// Verifies keepsake prices in constants.tsx (MEMENTO_SOURCE) equal ITEM_PRICES in api/mementos.ts, in the same order.
import fs from 'node:fs';
const c = fs.readFileSync('constants.tsx', 'utf8');
const block = c.slice(c.indexOf('const MEMENTO_SOURCE'), c.indexOf('export const MEMENTO_ITEMS:'));
const client = [...block.matchAll(/\[(?:'([^']*)'|"([^"]*)"),\s*'[^']*',\s*(\d+),\s*'(Common|Rare|Epic|Legendary)'\]/g)].map(m => Number(m[3]));
const server = Object.values(JSON.parse(fs.readFileSync('api/mementos.ts', 'utf8').match(/const ITEM_PRICES: Record<string, number> = (\{[^}]*\});/)[1].replace(/(\w+):/g, '"$1":')));
const same = client.length === server.length && client.every((p, i) => p === server[i]);
if (!same) { console.log('KEEPSAKE PRICE MISMATCH', { client, server }); process.exit(1); }
console.log('keepsake prices match:', client.length);
