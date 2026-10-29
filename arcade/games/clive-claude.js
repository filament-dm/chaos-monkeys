// Nidus, by clive claude. Round 8: Simple Yet Addictive. (No kangaroos.)
//
// Dice gave me: nidus (a nest), regulus (the kinglet, and a star), "herd", and "one key".
// A song sweeps around the nest like a lighthouse beam. Hold ONE key (space, or click/touch and hold) to sing:
// every kinglet inside the beam is drawn toward the nest. Singing spends breath; let go to get it back.
// A hawk circles. If you sing while the beam crosses the hawk, you call it in, and it takes a bird from the nest.
// Let five kinglets fly off the edge of the night and the game is over. It speeds up as the nest fills.
export default (canvas, input = {}) => {
  const x = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, S = Math.min(W, H), cx = W / 2, cy = H / 2;
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let st, held = false, best = 0, raf = 0;
  const reset = () => {
    st = { t: 0, beam: 0, breath: 1, birds: [], nest: 0, lost: 0, hawk: { a: 0, r: S * 0.42, on: false, dive: 0 }, over: false, spawn: 0, flash: 0 };
  };
  reset();
  const down = () => { held = true; if (st.over) reset(); };
  const up = () => { held = false; };
  const kd = e => { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) down(); } };
  const ku = e => { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); up(); } };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  canvas.addEventListener('pointerdown', down); addEventListener('pointerup', up);

  const BEAM = 0.55;                                   // half-width of the song, in radians
  const inBeam = a => { let d = ((a - st.beam) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return Math.abs(d) < BEAM; };
  const stars = Array.from({ length: 70 }, () => [rnd() * W, rnd() * H, rnd()]);

  const step = dt => {
    if (st.over) return;
    st.t += dt;
    const level = 1 + st.nest / 7;
    st.beam += dt * (0.9 + 0.12 * level);
    const singing = held && st.breath > 0.02;
    st.breath = Math.max(0, Math.min(1, st.breath + (singing ? -0.36 : 0.3) * dt));
    // Kinglets arrive from the edge and wander across the night.
    st.spawn -= dt;
    if (st.spawn <= 0) {
      st.spawn = Math.max(0.35, 2.2 - 0.3 * level) * (0.6 + rnd() * 0.8);
      const a = rnd() * 2 * Math.PI, r = S * 0.55, h = a + Math.PI + (rnd() - 0.5) * 1.6;
      st.birds.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: Math.cos(h) * S * 0.06 * level ** 0.8, vy: Math.sin(h) * S * 0.06 * level ** 0.8, w: rnd() * 6 });
    }
    for (const b of st.birds) {
      const dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy);
      if (singing && inBeam(Math.atan2(b.y - cy, b.x - cx))) { b.vx += dx / d * S * 0.8 * dt; b.vy += dy / d * S * 0.8 * dt; }
      b.w += dt * 3; b.vx += Math.cos(b.w) * S * 0.02 * dt; b.vy += Math.sin(b.w * 1.3) * S * 0.02 * dt;   // flutter
      const sp = Math.hypot(b.vx, b.vy), cap = S * 0.22; if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (d < S * 0.06) { b.home = true; st.nest++; st.flash = 1; }
      else if (b.x < -S * 0.1 || b.x > W + S * 0.1 || b.y < -S * 0.1 || b.y > H + S * 0.1) { b.gone = true; st.lost++; }
    }
    st.birds = st.birds.filter(b => !b.home && !b.gone);
    // The hawk circles at the edge; sing at it and it dives for the nest.
    const hk = st.hawk;
    hk.on = st.nest >= 3;
    if (hk.on) {
      hk.a -= dt * 0.55;
      if (!hk.dive && singing && inBeam(hk.a)) hk.dive = 1;
      if (hk.dive) { hk.r -= S * 0.5 * dt; if (hk.r < S * 0.05) { st.nest = Math.max(0, st.nest - 2); hk.dive = 0; hk.r = S * 0.42; st.flash = -1; } }
    }
    st.flash *= 0.92;
    if (st.lost >= 5) { st.over = true; best = Math.max(best, st.nest); }
  };

  const draw = () => {
    x.fillStyle = '#0b0f1e'; x.fillRect(0, 0, W, H);
    for (const [sx, sy, sb] of stars) { x.fillStyle = `rgba(230,230,255,${0.25 + 0.5 * sb})`; x.fillRect(sx, sy, 1.5, 1.5); }
    // Regulus, the little king of the sky.
    x.fillStyle = '#cfe0ff'; x.beginPath(); x.arc(W * 0.83, H * 0.14, S * 0.008, 0, 7); x.fill();
    // The song beam.
    const singing = held && st.breath > 0.02;
    x.fillStyle = singing ? 'rgba(255,214,120,0.22)' : 'rgba(255,214,120,0.06)';
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, S, st.beam - BEAM, st.beam + BEAM); x.closePath(); x.fill();
    // The nest: rings grow with each bird.
    x.strokeStyle = st.flash < -0.1 ? '#d8524a' : '#b98a4e'; x.lineWidth = S * 0.006;
    for (let k = 0; k < Math.min(12, 2 + st.nest / 2); k++) { x.beginPath(); x.ellipse(cx, cy, S * (0.035 + k * 0.004), S * (0.025 + k * 0.003), k * 0.7, 0, 7); x.stroke(); }
    if (st.flash > 0.1) { x.fillStyle = `rgba(255,220,120,${st.flash * 0.5})`; x.beginPath(); x.arc(cx, cy, S * 0.07, 0, 7); x.fill(); }
    // Kinglets: olive body, a gold crown.
    for (const b of st.birds) {
      x.fillStyle = '#9aa36a'; x.beginPath(); x.arc(b.x, b.y, S * 0.011, 0, 7); x.fill();
      x.fillStyle = '#ffcf3a'; x.fillRect(b.x - S * 0.004, b.y - S * 0.013, S * 0.008, S * 0.004);
    }
    // The hawk.
    if (st.hawk.on) {
      const hk = st.hawk, hx = cx + Math.cos(hk.a) * hk.r, hy = cy + Math.sin(hk.a) * hk.r;
      x.fillStyle = hk.dive ? '#e05a4a' : '#6b5a52';
      x.beginPath(); x.moveTo(hx - S * 0.03, hy); x.lineTo(hx, hy - S * 0.012); x.lineTo(hx + S * 0.03, hy); x.lineTo(hx, hy + S * 0.008); x.fill();
    }
    // Breath, score, lives.
    x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(S * 0.04, H - S * 0.06, S * 0.3, S * 0.015);
    x.fillStyle = '#ffd678'; x.fillRect(S * 0.04, H - S * 0.06, S * 0.3 * st.breath, S * 0.015);
    x.fillStyle = '#f4ecd8'; x.font = `bold ${S * 0.07}px Georgia, serif`; x.textAlign = 'left'; x.textBaseline = 'top';
    x.fillText(String(st.nest), S * 0.04, S * 0.03);
    x.font = `${S * 0.028}px Georgia, serif`;
    x.fillText('lost ' + '●'.repeat(st.lost) + '○'.repeat(Math.max(0, 5 - st.lost)) + (best ? `   best ${best}` : ''), S * 0.04, S * 0.11);
    if (st.over) {
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#f4ecd8'; x.textAlign = 'center'; x.font = `bold ${S * 0.08}px Georgia, serif`;
      x.fillText(`${st.nest} kinglets home`, cx, cy - S * 0.08);
      x.font = `${S * 0.035}px Georgia, serif`; x.fillText('hold space (or press) to sing again', cx, cy + S * 0.03);
    } else if (st.t < 4) {
      x.textAlign = 'center'; x.font = `${S * 0.032}px Georgia, serif`; x.fillStyle = 'rgba(244,236,216,0.8)';
      x.fillText('hold space to sing the kinglets home · don\'t sing at the hawk', cx, H - S * 0.12);
    }
    canvas.dataset.score = String(st.nest);
  };

  let last = 0;
  const loop = now => { const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('pointerup', up); };
};
