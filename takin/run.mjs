// Headless runner: node takin/run.mjs [--roster N] [--seeds 3] [--extra 3600]
// Runs every play in order (each followed by SETTLE ticks), then --extra ticks more, and reports what happened.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createWorld, step, stats, SETTLE } from './engine.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => a.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const games = JSON.parse(readFileSync(join(HERE, 'roster.json'), 'utf8')).games;
const g = args.roster != null ? games.find(x => x.n === Number(args.roster)) : games[games.length - 1];
const plays = await Promise.all(g.plays.map(p => import(pathToFileURL(join(HERE, p)).href).then(m => m.default)));
const seeds = Number(args.seeds || 3), extra = Number(args.extra || 3600);
console.log(`Game ${g.n} (${g.label}): ${plays.map(p => p.name).join(' → ')}`);
for (let s = 1; s <= seeds; s++) {
  const t0 = performance.now(), w = createWorld({ seed: `takin-${g.n}-${s}`, plays });
  const total = plays.length * SETTLE + extra;
  for (let i = 0; i < total; i++) step(w);
  const st = stats(w);
  console.log(`seed ${s}: ${total} ticks, ${((performance.now() - t0) / 1000).toFixed(1)}s | summit visits ${st.summitVisits}, moss eaten ${st.fed} | ${Object.entries(st.materials).filter(([k]) => k !== 'empty').map(([k, v]) => k + ' ' + v).join(', ')}`);
  for (const p of st.plays) console.log(`   ${p.name} (${p.author}): stamped ${p.stamped}, throws ${p.throws}${p.firstError ? ' first: ' + p.firstError : ''}`);
}
