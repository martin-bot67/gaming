import { S, rt, fx, walkers, outs, W, H, FH, SX, TYPES, TK, rnd, pick } from './models.js';
import { income, housingCapacity, isPowered, POWER_PER_ENERGY_ROOM, poweredRoomCount, powerDemand } from './systems.js';

/* ================= UI / RENDERER ================= */
export const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

function hue(id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const dirt = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#2a211a'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 260; i++) { x.fillStyle = pick(['#33281f', '#221a14', '#3b2e22', '#1c1511']); x.fillRect(rnd(0, 62), rnd(0, 62), rnd(1, 3), rnd(1, 2)); } return c; })();
const stars = Array.from({ length: 40 }, () => ({ x: rnd(0, W), y: rnd(-FH - 210, -FH - 20), p: Math.random() * 6 }));
const SKY = [[8, 40], [44, 70], [84, 36], [120, 96], [170, 58], [214, 80], [262, 44], [300, 66]];
function figure(x, y, id, t, walk, dir) {
  const h = hue(id), ph = Math.sin(t * 18 + h), bob = walk ? Math.round(Math.abs(ph)) : Math.round(Math.sin(t * 2 + h) * 0.6);
  const sw = walk ? Math.round(ph * 2) : 0;
  const skin = ['#e8c9a0', '#c99a6b', '#8d5b3a', '#f1d5b5'][h % 4], hair = ['#2b1d14', '#7a4a1e', '#c8b070', '#666'][(h >> 2) % 4];
  R(x + 1 + sw, y + 19, 3, 4, '#1b1b22'); R(x + 4 - sw, y + 19, 3, 4, '#1b1b22');
  R(x, y + 9 + bob, 8, 10, 'hsl(' + h + ',45%,50%)'); R(x, y + 9 + bob, 8, 2, '#ffffff33');
  R(x + 1, y + 1 + bob, 6, 8, skin); R(x + 1, y + bob, 6, 3, hair);
  const ex = dir < 0 ? -1 : dir > 0 ? 1 : 0; R(x + 2 + ex, y + 4 + bob, 1, 1, '#111'); R(x + 5 + ex, y + 4 + bob, 1, 1, '#111');
}
function txt(s, x, y, size, col, al) {
  ctx.font = 'bold ' + (size || 11) + 'px "Courier New",monospace';
  ctx.fillStyle = col || '#e8dfcf'; ctx.textAlign = al || 'left'; ctx.fillText(s, x, y);
}

function drawFloor(f, t) {
  const y = (f.depth - 1) * FH, x0 = 8, w = SX - 18, res = f.cat === 'RESIDENTIAL', fy = y + FH - 16, px = 196, tp = fy;
  const base = res ? '#6a5540' : TYPES[f.type].c;
  R(x0, y + 4, w, FH - 8, base); R(x0, y + 4, w, FH - 8, '#00000044');
  for (let i = 0; i < w; i += 42) { R(x0 + i, y + 8, 2, FH - 24, '#0000003a'); R(x0 + i + 2, y + 8, 1, FH - 24, '#ffffff14'); }
  R(x0, y + 4, w, 4, '#0007'); R(x0, fy, w, 12, '#1e1a16');
  for (let i = 0; i < w; i += 16) R(x0 + i, fy, 1, 12, '#0008');
  R(x0, fy, w, 2, '#ffffff22');
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y + 4, w, FH - 8); ctx.clip();
  [90, 250].forEach(lx => {
    R(lx - 12, y + 8, 24, 3, '#fff2b0');
    const g = ctx.createRadialGradient(lx, y + 12, 2, lx, y + 12, 70);
    g.addColorStop(0, 'rgba(255,230,150,.28)'); g.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 70, y + 4, 140, FH);
  });
  ctx.restore();
  if (res) for (let i = 0; i < 3; i++) { const bx = px + i * 48; R(bx, tp - 40, 3, 40, '#2a2f3a'); R(bx + 37, tp - 40, 3, 40, '#2a2f3a'); R(bx, tp - 36, 40, 4, '#3d4a6b'); R(bx + 2, tp - 40, 10, 4, '#e8e0d0'); R(bx, tp - 14, 40, 4, '#3d4a6b'); R(bx + 2, tp - 18, 10, 4, '#e8e0d0'); }
  else if (f.type === 'FOOD') for (let i = 0; i < 4; i++) { const bx = px + i * 34; [tp - 10, tp - 30].forEach(sy => { R(bx, sy, 28, 4, '#5a4630'); for (let k = 0; k < 4; k++) { R(bx + 3 + k * 7, sy - 9, 3, 9, '#8be05a'); R(bx + 1 + k * 7, sy - 9, 7, 3, '#4fae3a'); } }); }
  else if (f.type === 'ENERGY') {
    const on = Math.sin(t * 5) > 0, a = t * 8;
    R(px, tp - 34, 70, 34, '#3b4048'); R(px + 4, tp - 30, 62, 6, '#555c66');
    R(px + 8, tp - 18, 8, 8, on ? '#ffd23a' : '#6b5a1c'); R(px + 22, tp - 18, 8, 8, on ? '#6b5a1c' : '#ffd23a');
    R(px + 44, tp - 24, 18, 18, '#222'); R(px + 53 + Math.cos(a) * 6 - 1, tp - 15 + Math.sin(a) * 6 - 1, 3, 3, '#9ab'); R(px + 53 - Math.cos(a) * 6 - 1, tp - 15 - Math.sin(a) * 6 - 1, 3, 3, '#9ab');
    R(px + 70, tp - 24, 40, 5, '#6aa0c0'); R(px + 106, tp - 24, 5, 24, '#6aa0c0');
  } else if (f.type === 'SECURITY') {
    R(px, tp - 34, 80, 4, '#222'); for (let i = 0; i < 5; i++) { R(px + 6 + i * 14, tp - 30, 3, 22, '#555'); R(px + 4 + i * 14, tp - 30, 7, 4, '#333'); }
    R(px + 96, tp - 34, 36, 24, '#111'); R(px + 98, tp - 32, 32, 20, '#0c2a14'); R(px + 100, tp - 22 + Math.round(Math.sin(t * 3) * 4), 28, 2, '#33ff55');
  } else if (f.type === 'MEDICAL') {
    R(px, tp - 14, 56, 8, '#e8e8e8'); R(px, tp - 6, 4, 6, '#555'); R(px + 52, tp - 6, 4, 6, '#555'); R(px + 2, tp - 20, 14, 6, '#cde');
    R(px + 78, tp - 30, 16, 5, '#e44'); R(px + 83, tp - 35, 6, 15, '#e44');
    R(px + 100, tp - 40, 2, 40, '#aaa'); R(px + 96, tp - 40, 10, 2, '#aaa'); R(px + 97, tp - 34, 6, 10, '#99ddff');
  } else {
    R(px, tp - 26, 64, 10, '#8a2a2a'); R(px, tp - 16, 64, 16, '#a33');
    R(px + 80, tp - 36, 18, 36, '#222'); R(px + 84, tp - 24 + Math.round(Math.sin(t * 10)), 10, 10, '#444');
    R(px + 110, tp - 40, 10, 10, 'hsl(' + Math.floor(t * 120 % 360) + ',90%,60%)');
  }
  const key = res ? 'assignedResidenceFloorId' : 'assignedJobFloorId';
  const list = S.surv.filter(s => s[key] === f.id);
  list.forEach(s => { const w = walkers[s.id] || { x: 20 }; figure(w.x, fy - 21, s.id, t, w.moving, w.dir); });
  const lab = 'B' + f.depth + ' ' + f.name; ctx.font = 'bold 11px "Courier New",monospace';
  R(12, y + 9, ctx.measureText(lab).width + 10, 14, '#000b'); R(12, y + 9, 3, 14, res ? '#c9a070' : '#ffffff88'); txt(lab, 19, y + 20, 11, '#f1e6cc');
  if (!res) {
    R(SX - 72, y + 9, 56, 14, '#000b');
    if (f.type === 'ENERGY') txt('+' + POWER_PER_ENERGY_ROOM + ' POWER', SX - 20, y + 20, 9, '#ffe36b', 'right');
    else if (isPowered(f)) txt('+' + income(f).toFixed(1) + '/s', SX - 20, y + 20, 10, '#ffe9a8', 'right');
    else txt('NO POWER', SX - 20, y + 20, 9, '#ff8c75', 'right');
  }
  txt(list.length + '/5', SX - 20, y + FH - 6, 10, '#fffc', 'right');
}
export function draw(t) {
  const e = S.elev, nF = S.floors.length, bottom = (nF + (S.build ? 1 : 0)) * FH, cy = (e.pos - 1) * FH + 6;
  ctx.imageSmoothingEnabled = false;
  R(0, 0, W, H, '#14110f');
  ctx.save(); ctx.translate(0, Math.round(-rt.camY));
  const g = ctx.createLinearGradient(0, -FH - 220, 0, -14); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#6a4f55');
  ctx.fillStyle = g; ctx.fillRect(0, -FH - 220, W, FH + 206);
  stars.forEach(s => R(s.x, s.y, 2, 2, Math.sin(t * 2 + s.p) > 0 ? '#fff' : '#778'));
  ctx.fillStyle = '#e9e2c8'; ctx.beginPath(); ctx.arc(70, -FH - 120, 18, 0, 7); ctx.fill();
  R(64, -FH - 126, 5, 5, '#cfc7aa'); R(76, -FH - 114, 4, 4, '#cfc7aa');
  SKY.forEach(([bx, bh], i) => {
    R(bx, -14 - bh, 30, bh, '#171320'); R(bx + 4, -20 - bh, 8, 6, '#171320');
    for (let k = 0; k < 4; k++) if ((i + k) % 3 === 0) R(bx + 6 + (k % 2) * 12, -6 - bh + 14 + k * 10, 4, 4, '#e0a03088');
  });
  R(0, -14, W, 14, '#4a3b2c'); R(0, -14, W, 3, '#5b6b3a');
  ctx.fillStyle = ctx.createPattern(dirt, 'repeat'); ctx.fillRect(0, 0, W, bottom + 900);
  R(SX - 2, -FH, W - SX - 6, bottom + FH, '#0a0908'); R(SX - 2, -FH, 3, bottom + FH, '#444'); R(W - 8, -FH, 3, bottom + FH, '#444');
  R(SX - 8, -FH - 10, 92, 10, '#555');
  for (let i = 0; i < 92; i += 16) R(SX - 8 + i, -FH - 8, 8, 6, '#e0a030');
  txt('SURFACE GATE', 14, -FH + 18, 11, '#cfe0f0');
  S.floors.forEach(f => { const y = (f.depth - 1) * FH; R(W - 24, y + FH - 18, 8, 8, Math.abs(e.pos - f.depth) < 0.2 ? '#7fff9a' : '#e0a030'); txt('B' + f.depth, W - 12, y + FH - 21, 9, '#9a8f7c', 'right'); });
  S.queue.forEach((r, i) => {
    const x = r.x == null ? 20 + i * 56 : r.x; figure(x, -37, 'r' + r.id, t, r.moving, r.dir);
    R(x - 6, -62, 24, 13, '#f4ecd8'); R(x + 2, -49, 4, 3, '#f4ecd8'); txt('B' + r.target, x - 3, -52, 10, '#2a1d10');
  });
  S.floors.forEach(f => drawFloor(f, t));
  outs.forEach(o => { ctx.globalAlpha = Math.min(1, o.t); figure(o.x, (o.depth - 1) * FH + FH - 37, o.id, t, o.moving, o.dir); ctx.globalAlpha = 1; });
  if (S.build) {
    const y = nF * FH, b = S.build, p = 1 - b.left / b.total, bw = SX - 38;
    R(8, y + 4, SX - 18, FH - 8, '#1d1813');
    for (let i = 0; i < SX - 18; i += 24) { R(8 + i, y + 4, 12, 4, '#e0a030'); R(20 + i, y + 4, 12, 4, '#222'); R(8 + i, y + FH - 8, 12, 4, '#e0a030'); R(20 + i, y + FH - 8, 12, 4, '#222'); }
    R(18, y + 44, bw, 10, '#0a0908'); R(18, y + 44, Math.round(bw * p), 10, '#e0a030');
    for (let i = 0; i < bw; i += 8) R(18 + i, y + 44, 1, 10, '#0006');
    if (Math.sin(t * 20) > -0.3) R(18 + bw * p + rnd(-3, 3), y + 40 + rnd(-4, 8), 2, 2, '#ffd070');
    figure(14 + Math.round(bw * p), y + 21, 'crew', t);
    txt('B' + b.depth + ' under construction', 14, y + 19, 11, '#f1e6cc'); txt(Math.ceil(b.left) + 's', SX - 16, y + 19, 11, '#ffe9a8', 'right');
  }
  R(SX + 20, -FH - 10, 2, cy + FH + 10, '#777'); R(SX + 50, -FH - 10, 2, cy + FH + 10, '#777');
  R(SX + 2, cy, 68, FH - 12, '#6c7480'); R(SX + 2, cy, 68, 3, '#aab2be'); R(SX + 2, cy + FH - 15, 68, 3, '#4a5058');
  R(SX + 6, cy + 6, 60, FH - 24, '#2b3038'); R(SX + 6, cy + 6, 60, 3, '#ffe9a8'); R(SX + 6, cy + FH - 22, 60, 4, '#555');
  R(SX + 24, cy + 10, 24, 11, '#000');
  if (e.ext) R(SX + 6, cy + 6, 60, 3, '#e0a030');
  if (e.auto) { R(SX + 52, cy + 10, 14, 11, '#000'); R(SX + 55, cy + 13, 8, 5, Math.sin(t * 4) > 0 ? '#7fff9a' : '#2a6a3a'); } txt(e.pos < 0.5 ? 'G' : 'B' + Math.round(e.pos), SX + 36, cy + 19, 9, '#7fff9a', 'center');
  e.pax.forEach((p, i) => { const px = SX + 10 + i * 20; figure(px, cy + FH - 44, 'r' + p.id, t); txt('B' + p.target, px + 4, cy + FH - 47, 10, '#ffd070', 'center'); });
  fx.forEach(f => { const fy2 = f.y - (1.4 - f.t) * 24; ctx.globalAlpha = Math.min(1, f.t); txt(f.s, SX - 6, fy2 + 1, 12, '#000', 'right'); txt(f.s, SX - 7, fy2, 12, f.c || '#ffe9a8', 'right'); ctx.globalAlpha = 1; });
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  R(0, 0, W, 42, '#000d'); R(0, 42, W, 2, '#e0a030');
  R(10, 7, 10, 10, '#b9b2a0'); R(13, 10, 4, 4, '#0e0c0a'); txt('' + Math.floor(S.scrap), 26, 17, 14, '#f0c060');
  R(10, 25, 13, 8, '#6fd3ff'); R(23, 27, 2, 4, '#6fd3ff'); R(12, 27, 4, 4, '#ffffff66'); txt('' + S.bat, 30, 33, 13, '#6fd3ff');
  txt('+' + rt.incPS.toFixed(1) + '/s  PWR ' + poweredRoomCount() + '/' + powerDemand(), W - 10, 17, 13, '#a8d67a', 'right');
  txt(S.surv.length + '/' + housingCapacity() + ' survivors  depth B' + nF, W - 10, 34, 11, '#cfc4b0', 'right');
  if (rt.toast.t > 0) { R(40, 54, W - 80, 28, '#000d'); R(40, 54, 3, 28, '#e0a030'); txt(rt.toast.s, W / 2, 73, 12, '#fff', 'center'); }
  if (!nF && !S.build) txt('Open Build to dig your first floor.', W / 2, 112, 12, '#ffd070', 'center');
}
