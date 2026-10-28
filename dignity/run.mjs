// Headless runner: node dignity/run.mjs [--roster N] [--seeds 10] [--ticks 36000]
// Runs whole nights and reports whether the boat sailed, when, and what each rewriter did.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createWorld, step, stats, NIGHT_TICKS } from './engine.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => a.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const roster = JSON.parse(readFileSync(join(HERE, 'roster.json'), 'utf8')).nights;
const entry = args.roster != null ? roster.find(r => r.n === Number(args.roster)) : roster[roster.length - 1];
const rewriters = await Promise.all(entry.rewriters.map(p => import(pathToFileURL(join(HERE, p)).href).then(m => m.default)));
const seeds = Number(args.seeds || 10), ticks = Number(args.ticks || NIGHT_TICKS);
console.log(`Roster ${entry.n} (${entry.label}): ${rewriters.map(r => r.name).join(', ')}, ${seeds} seeds x ${ticks} ticks`);
for (let k = 1; k <= seeds; k++) {
  const t0 = performance.now();
  const w = createWorld({ seed: `night-${entry.n}-${k}`, rewriters });
  let peak = 0;
  while (!w.ended && w.tick < ticks) { step(w); if (w.harborMass > peak) peak = w.harborMass; }
  const s = stats(w);
  console.log(`seed ${k}: ${s.ended && s.ended.sailed ? 'SAILED at tick ' + (w.boat.startTick) : 'no boat'} | harbor peak ${Math.round(peak)} | glyphs ${s.glyphs} | ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  for (const r of s.rewriters) console.log(`   ${r.name} (${r.author}): push ${r.push} spawn ${r.spawn} remove ${r.remove} | ${r.ms}ms | throws ${r.throws}${r.firstError ? ' first: ' + r.firstError : ''}`);
}
