// Headless runner: node improvements/run.mjs [--roster N] [--seeds 3]
// Runs the 200 years and reports, decade by decade, what was standing, cracked, and what fell.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createWorld, stepDecade, stats } from './engine.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => a.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
const runs = JSON.parse(readFileSync(join(HERE, 'roster.json'), 'utf8')).runs;
const run = args.roster != null ? runs.find(r => r.n === Number(args.roster)) : runs[runs.length - 1];
const imps = await Promise.all(run.improvements.map(p => import(pathToFileURL(join(HERE, p)).href).then(m => m.default)));
console.log(`Run ${run.n} (${run.label}): ${imps.map(p => p.name).join(', ')}`);
for (let s = 1; s <= Number(args.seeds || 3); s++) {
  const t0 = performance.now(), w = createWorld({ seed: `improvements-${run.n}-${s}`, improvements: imps });
  while (stepDecade(w));
  const st = stats(w);
  const firstFall = st.log.find(l => l.fell > 20);
  console.log(`seed ${s}: ${((performance.now() - t0) / 1000).toFixed(1)}s | standing ${st.standing}, cracked ${st.cracked}, collapsed ${st.collapsed} | first big fall: ${firstFall ? firstFall.year + ' (' + firstFall.fell + ' blocks)' : 'never'}`);
  console.log('   ' + st.log.map(l => `${l.year}:${l.fell}`).join(' '));
  for (const p of st.improvements) console.log(`   ${p.name} (${p.author}): added ${p.added}, throws ${p.throws}${p.firstError ? ' first: ' + p.firstError : ''}`);
}
