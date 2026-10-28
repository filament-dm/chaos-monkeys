// Terrarium tournament harness. Runs one roster generation headless across many seeds, in parallel,
// and reports who survived, who dominated and who went extinct.
//
//   node terrarium/harness/tournament.mjs [--gen N] [--seeds 20] [--eras 6] [--workers K] [--out path.json]
//
// Defaults: the last generation in roster.json, 20 seeds, 6 eras, one worker per CPU (max 8),
// results written to terrarium/results/gen-N.json and a markdown table printed to stdout.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { cpus } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

async function loadGeneration(n) {
  const roster = JSON.parse(readFileSync(join(ROOT, 'roster.json'), 'utf8'));
  const gens = roster.generations;
  const gen = n == null ? gens[gens.length - 1] : gens.find(g => g.n === n);
  if (!gen) throw new Error(`generation ${n} is not in roster.json`);
  const imp = p => import(pathToFileURL(join(ROOT, p)).href).then(m => m.default);
  return { gen, ground: await imp(gen.ground), species: await Promise.all(gen.species.map(imp)) };
}

// Wrap think() so we can count throws and time calls; the engine swallows errors silently.
function instrument(species) {
  return species.map(sp => {
    const probe = { calls: 0, ms: 0, throws: 0, firstError: null };
    const wrapped = Object.create(sp);
    wrapped.think = function (me, sense, rng) {
      const t0 = performance.now();
      try { return sp.think.call(sp, me, sense, rng); }
      catch (e) { probe.throws++; probe.firstError ??= String(e && e.stack || e).split('\n').slice(0, 2).join(' | '); throw e; }
      finally { probe.ms += performance.now() - t0; probe.calls++; }
    };
    return { wrapped, probe };
  });
}

async function runSeed({ genN, seed, eras }) {
  const { createWorld, step, ERA_TICKS } = await import(pathToFileURL(join(ROOT, 'engine.js')).href);
  const { ground, species } = await loadGeneration(genN);
  const inst = instrument(species);
  const t0 = performance.now();
  const world = createWorld({ seed, ground, species: inst.map(i => i.wrapped) });
  const eraPops = [];
  for (let e = 0; e < eras; e++) {
    for (let t = 0; t < ERA_TICKS; t++) step(world);
    eraPops.push(species.map((_, s) => world.history[s][world.history[s].length - 1] || 0));
  }
  return {
    seed, wallMs: Math.round(performance.now() - t0),
    species: species.map((sp, s) => {
      const h = world.history[s];
      return {
        final: h[h.length - 1] || 0,
        peak: h.reduce((a, b) => Math.max(a, b), 0),
        mean: h.reduce((a, b) => a + b, 0) / Math.max(1, h.length),
        extinctAt: world.extinctAt[s],
        born: world.born[s],
        eraPops: eraPops.map(p => p[s]),
        thinkCalls: inst[s].probe.calls,
        thinkMs: inst[s].probe.ms,
        throws: inst[s].probe.throws,
        firstError: inst[s].probe.firstError
      };
    })
  };
}

if (!isMainThread) {
  parentPort.on('message', async job => {
    try { parentPort.postMessage({ ok: true, result: await runSeed(job) }); }
    catch (e) { parentPort.postMessage({ ok: false, seed: job.seed, error: String(e && e.stack || e) }); }
  });
} else {
  const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
    .map(a => a.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true]));
  const { gen, species } = await loadGeneration(args.gen != null ? Number(args.gen) : null);
  const seeds = Number(args.seeds || 20), eras = Number(args.eras || 6);
  const nWorkers = Math.min(Number(args.workers || Math.min(8, cpus().length)), seeds);
  const seedNames = Array.from({ length: seeds }, (_, k) => `gen${gen.n}-seed${k + 1}`);
  console.error(`Generation ${gen.n} (${gen.label || ''}): ${species.map(s => s.name).join(', ')}`);
  console.error(`${seeds} seeds x ${eras} eras on ${nWorkers} workers…`);

  const t0 = Date.now();
  const results = [];
  const queue = seedNames.slice();
  await Promise.all(Array.from({ length: nWorkers }, () => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url));
    const next = () => {
      const seed = queue.shift();
      if (!seed) { w.terminate(); return resolve(); }
      w.postMessage({ genN: gen.n, seed, eras });
    };
    w.on('message', m => {
      if (!m.ok) { w.terminate(); return reject(new Error(`seed ${m.seed} crashed:\n${m.error}`)); }
      results.push(m.result);
      console.error(`  ${m.result.seed} done in ${(m.result.wallMs / 1000).toFixed(1)}s`);
      next();
    });
    w.on('error', reject);
    next();
  })));
  results.sort((a, b) => seedNames.indexOf(a.seed) - seedNames.indexOf(b.seed));

  // Aggregate per species across seeds.
  const totalTicks = eras * 2000;
  const summary = species.map((sp, s) => {
    const rows = results.map(r => r.species[s]);
    const extinct = rows.filter(r => r.extinctAt !== null);
    const share = results.map(r => {
      const tot = r.species.reduce((a, x) => a + x.final, 0);
      return tot ? r.species[s].final / tot : 0;
    });
    const wins = results.filter(r => r.species[s].final > 0 &&
      r.species.every((x, k) => k === s || x.final < r.species[s].final)).length;
    const calls = rows.reduce((a, r) => a + r.thinkCalls, 0);
    const avg = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    return {
      name: sp.name, author: sp.author, color: sp.color,
      survived: rows.length - extinct.length, seeds: rows.length,
      wins,
      meanFinal: avg(rows.map(r => r.final)),
      meanShare: avg(share),
      meanPeak: avg(rows.map(r => r.peak)),
      meanExtinctTick: extinct.length ? avg(extinct.map(r => r.extinctAt)) : null,
      meanBorn: avg(rows.map(r => r.born)),
      eraMeans: Array.from({ length: eras }, (_, e) => avg(rows.map(r => r.eraPops[e]))),
      thinkUsPerCall: calls ? 1000 * rows.reduce((a, r) => a + r.thinkMs, 0) / calls : 0,
      throws: rows.reduce((a, r) => a + r.throws, 0),
      firstError: rows.find(r => r.firstError)?.firstError || null
    };
  });

  const out = {
    generation: gen.n, label: gen.label || null, ground: gen.ground,
    seeds, eras, ticks: totalTicks, ranAt: new Date().toISOString(),
    wallSeconds: Math.round((Date.now() - t0) / 100) / 10,
    summary, perSeed: results
  };
  const outPath = args.out && args.out !== true ? args.out : join(ROOT, 'results', `gen-${gen.n}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');

  // Markdown report, ranked by mean share of the final population.
  const ranked = summary.slice().sort((a, b) => b.meanShare - a.meanShare);
  const f1 = x => x.toFixed(1), pct = x => Math.round(100 * x) + '%';
  const lines = [
    `**Terrarium, generation ${gen.n}:** ${seeds} seeds × ${eras} eras (${totalTicks} ticks), ground \`${gen.ground}\`, ${out.wallSeconds}s`,
    '',
    '| Species | Author | Survived | Wins | Final share | Mean final | Mean peak | Extinct at (mean tick) | Born | think µs | Throws |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...ranked.map(r => `| ${r.name} | ${r.author} | ${r.survived}/${r.seeds} | ${r.wins} | ${pct(r.meanShare)} | ${f1(r.meanFinal)} | ${f1(r.meanPeak)} | ${r.meanExtinctTick == null ? '–' : Math.round(r.meanExtinctTick)} | ${Math.round(r.meanBorn)} | ${f1(r.thinkUsPerCall)} | ${r.throws} |`),
    '',
    '**Mean population at the end of each era:**',
    '',
    `| Species | ${Array.from({ length: eras }, (_, e) => `Era ${e + 1}`).join(' | ')} |`,
    `|---|${'---|'.repeat(eras)}`,
    ...ranked.map(r => `| ${r.name} | ${r.eraMeans.map(f1).join(' | ')} |`)
  ];
  const errs = summary.filter(r => r.firstError);
  if (errs.length) lines.push('', '**Errors in think():**', ...errs.map(r => `- ${r.name}: ${r.throws} throws. First: \`${r.firstError}\``));
  console.log(lines.join('\n'));
  console.error(`Wrote ${relative(process.cwd(), outPath)}`);
}
