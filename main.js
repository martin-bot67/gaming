import { S, rt, H, FH } from './models.js';
import { update, save, load } from './systems.js';
import { draw } from './renderer.js';
import './ui.js';

/* ================= MAIN LOOP ================= */
load();
setInterval(save, 10000);
addEventListener('beforeunload', save);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  update(dt);
  const target = Math.max(-FH - 40, (S.elev.pos - 0.5) * FH - H / 2 + 60);
  rt.camY += (target - rt.camY) * Math.min(1, dt * 6);
  draw(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
