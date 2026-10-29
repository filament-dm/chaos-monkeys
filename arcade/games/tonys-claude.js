// Two Rings, by Tony's Claude. One button.
// A spark runs round one of two rings. Press (space, any key, click or tap) to hop to the other ring.
// Walls sweep round both rings; touch one and it's over. Gold motes are points. It speeds up, a little, every lap.
export default (canvas) => {
  const x = canvas.getContext('2d');
  const C = 240, R = [120, 175];
  let best = 0; try { best = +localStorage.getItem('two-rings-best') || 0; } catch (e) {}
  let s, ring, ang, speed, score, walls, motes, dead, hop, t, laps, flash;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const reset = () => {
    s = 12345; ring = 0; ang = -Math.PI / 2; speed = 0.024; score = 0; dead = false; hop = 0; t = 0; laps = 0; flash = 0;
    walls = []; motes = [];
    for (let k = 0; k < 3; k++) spawnWall(ang + Math.PI * (0.7 + k * 0.45));
    for (let k = 0; k < 4; k++) spawnMote();
  };
  // A wall is a short arc on one ring that drifts slowly the opposite way.
  function spawnWall(at) { walls.push({ ring: rnd() < 0.5 ? 0 : 1, a: at ?? ang + Math.PI * (0.7 + rnd() * 0.6), len: 0.22 + rnd() * 0.16, drift: -(0.004 + rnd() * 0.006) }); }
  function spawnMote() { motes.push({ ring: rnd() < 0.5 ? 0 : 1, a: ang + Math.PI * (0.5 + rnd() * 1.3) }); }
  const press = e => {
    if (e && e.type === 'keydown' && (e.repeat || e.metaKey || e.ctrlKey)) return;
    if (e && e.preventDefault) e.preventDefault();
    if (dead) { if (t > 30) reset(); return; }
    ring = 1 - ring; hop = 1;
  };
  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('keydown', press);
  window.addEventListener('keydown', e => { if (document.activeElement !== canvas) press(e); });
  const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const near = (a, b, w) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, Math.PI * 2 - d) < w; };
  function step() {
    t++;
    if (dead) return;
    const before = norm(ang);
    ang += speed; hop = Math.max(0, hop - 0.12);
    if (norm(ang) < before) { laps++; speed *= 1.06; spawnWall(); }
    for (const w of walls) w.a += w.drift;
    for (const w of walls) if (w.ring === ring && hop < 0.5 && near(ang, w.a + w.len / 2, w.len / 2 + 0.035)) { dead = true; t = 0; flash = 1; if (score > best) { best = score; try { localStorage.setItem('two-rings-best', String(best)); } catch (e) {} } }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      if (m.ring === ring && near(ang, m.a, 0.07)) { score++; motes.splice(i, 1); spawnMote(); flash = 0.3; }
    }
  }
  function draw() {
    x.fillStyle = '#0b0a10'; x.fillRect(0, 0, 480, 480);
    for (let k = 0; k < 2; k++) { x.strokeStyle = k === ring && !dead ? '#3b3550' : '#221f2c'; x.lineWidth = 14; x.beginPath(); x.arc(C, C, R[k], 0, Math.PI * 2); x.stroke(); }
    x.lineCap = 'round';
    for (const w of walls) { x.strokeStyle = '#e04a5a'; x.lineWidth = 14; x.beginPath(); x.arc(C, C, R[w.ring], w.a, w.a + w.len); x.stroke(); }
    for (const m of motes) { x.fillStyle = '#f2c46d'; x.beginPath(); x.arc(C + Math.cos(m.a) * R[m.ring], C + Math.sin(m.a) * R[m.ring], 5, 0, Math.PI * 2); x.fill(); }
    const r = R[ring] + (R[1 - ring] - R[ring]) * hop;
    x.fillStyle = dead ? '#e04a5a' : '#ffffff';
    x.beginPath(); x.arc(C + Math.cos(ang) * r, C + Math.sin(ang) * r, 8, 0, Math.PI * 2); x.fill();
    if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash * 0.25})`; x.fillRect(0, 0, 480, 480); flash = Math.max(0, flash - 0.05); }
    x.fillStyle = '#fff'; x.textAlign = 'center';
    x.font = 'bold 56px ui-monospace, Menlo, monospace'; x.fillText(String(score), C, C + 18);
    x.font = '14px ui-monospace, Menlo, monospace'; x.fillStyle = '#8f879c';
    x.fillText('BEST ' + best + '  ·  LAP ' + laps, C, C + 44);
    if (dead) { x.fillStyle = '#ece6f2'; x.font = 'bold 20px ui-monospace, Menlo, monospace'; x.fillText('PRESS TO GO AGAIN', C, 456); }
    else if (score === 0 && laps === 0) { x.fillStyle = '#8f879c'; x.font = '15px ui-monospace, Menlo, monospace'; x.fillText('PRESS TO HOP RINGS · DODGE RED · TAKE GOLD', C, 456); }
  }
  let acc = 0, last = performance.now();
  const loop = now => { acc += Math.min(100, now - last); last = now; while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; } draw(); requestAnimationFrame(loop); };
  reset(); requestAnimationFrame(loop);
};
