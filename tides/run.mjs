// Headless runner: node tides/run.mjs [--roster N] [--seeds 5] [--ticks 20000]
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => a.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const roster = JSON.parse(readFileSync(join(HERE, 'roster.json'), 'utf8')).tides;
const entry = args.roster != null ? roster.find(r => r.n === Number(args.roster)) : roster[roster.length - 1];
const E = await import(pathToFileURL(join(HERE, 'engine.js')).href);
const tides = await Promise.all(entry.tides.map(p => import(pathToFileURL(join(HERE, p)).href).then(m => m.default)));
const seeds = Number(args.seeds || 5), ticks = Number(args.ticks || 20000);
console.log(`Roster ${entry.n} (${entry.label}): ${tides.map(t => t.name).join(', ')}`);
for (let s = 1; s <= seeds; s++) {
  const w = E.createWorld({ seed: 'seed' + s, tides });
  let peak = 0, wetTicks = 0;
  for (let i = 0; i < ticks; i++) { E.step(w); peak = Math.max(peak, w.flooded); if (w.flooded > 0.05) wetTicks++; }
  const bad = [...w.eta].some(Number.isNaN);
  console.log(`seed${s}: village peak flood ${(peak * 100).toFixed(0)}%, wet ${(100 * wetTicks / ticks).toFixed(0)}% of the time${bad ? ', NaN!' : ''} | ` +
    tides.map((t, k) => `${t.name}: lift ${w.stats[k].lift.toFixed(0)}, blow ${w.stats[k].blow.toFixed(0)}, ${w.stats[k].ms.toFixed(0)}ms, throws ${w.stats[k].throws}`).join(' | '));
}
