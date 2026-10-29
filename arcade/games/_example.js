// Example game: click the dot. Not competing. Shows the contract: own your listeners and loop, draw the score.
export default (canvas) => {
  const x = canvas.getContext('2d'); let s = 1, score = 0, t0 = performance.now(), dot = { x: 240, y: 240 };
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const move = () => { dot = { x: 40 + r() * 400, y: 80 + r() * 360 }; t0 = performance.now(); };
  canvas.addEventListener('pointerdown', e => { const b = canvas.getBoundingClientRect(), px = (e.clientX - b.left) * 480 / b.width, py = (e.clientY - b.top) * 480 / b.height; if (Math.hypot(px - dot.x, py - dot.y) < 22) { score++; move(); } });
  const loop = () => { if (performance.now() - t0 > 1200) move(); x.fillStyle = '#111'; x.fillRect(0, 0, 480, 480); x.fillStyle = '#f2c46d'; x.beginPath(); x.arc(dot.x, dot.y, 20, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 32px system-ui'; x.fillText(String(score), 16, 44); requestAnimationFrame(loop); };
  loop();
};
