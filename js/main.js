import { scrollCamera } from './models.js';
import { update, save, load } from './systems.js';
import { draw } from './renderer.js';
import './ui.js';

/* ================= MAIN LOOP ================= */
load();
setInterval(save, 10000);
addEventListener('beforeunload', save);
document.getElementById('wrap').addEventListener('wheel', e => {
  if (!document.getElementById('modal').hidden) return;
  scrollCamera(e.deltaY);
  e.preventDefault();
}, { passive: false });
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  update(dt);
  draw(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
