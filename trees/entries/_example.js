// Test card: not competing. Shows the contract: deterministic drawing at any W×H.
export default (x, W, H) => {
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#f3ede2'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#7a4a2a'; x.lineWidth = W / 600;
  const branch = (px, py, a, len, d) => {
    if (d === 0) { x.fillStyle = `hsl(${20 + r() * 25},70%,${40 + r() * 15}%)`; x.beginPath(); x.arc(px, py, W / 300, 0, 7); x.fill(); return; }
    const qx = px + Math.cos(a) * len, qy = py + Math.sin(a) * len;
    x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.stroke();
    branch(qx, qy, a - 0.35 - r() * 0.2, len * 0.72, d - 1);
    branch(qx, qy, a + 0.35 + r() * 0.2, len * 0.72, d - 1);
  };
  branch(W / 2, H * 0.95, -Math.PI / 2, H * 0.22, 10);
};
