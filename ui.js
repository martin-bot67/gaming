import { S, rt, keys, TK, H, FH, cost, buildTime } from './models.js';
import { startBuild, rushBuild, say, elevSpeed, tipMult, extHtml, autoHtml, importSave, hardReset } from './systems.js';
import { cv } from './renderer.js';

const modal = document.getElementById('modal');

/* modal panels (DOM overlay) */
function openPanel(kind) {
  let h = '';
  if (kind === 'build') {
    const d = S.floors.length + 1;
    h = '<h2>Dig B' + d + '</h2><p>Cost: ' + cost(d) + ' scrap. Build time: ' + buildTime(d) + 's.</p>' +
      '<p>Random type is free. Choosing an exact type costs 5 batteries.</p>' +
      '<select id="ftype"><option value="RANDOM">Random type</option><option value="RESIDENTIAL">Residential (bunks)</option>' +
      TK.map(k => '<option value="' + k + '">' + k[0] + k.slice(1).toLowerCase() + ' floor</option>').join('') + '</select>' +
      '<div class="row"><button data-act="do-build">Start digging</button>' +
      (S.build ? '<button data-act="do-rush">Rush (' + (Math.ceil(S.build.left / 10) + 1) + ' batt)</button>' : '') + '</div>';
  } else if (kind === 'up') {
    h = '<h2>Hoist upgrades</h2>' +
      '<p>Speed lvl ' + S.elev.sl + ': ' + elevSpeed() + ' px/s</p><div class="row"><button data-act="up-speed">Upgrade: ' + (3 + 3 * S.elev.sl) + ' batt</button></div>' +
      '<p>Tips lvl ' + S.elev.tl + ': x' + tipMult().toFixed(2) + '</p><div class="row"><button data-act="up-tip">Upgrade: ' + (3 + 3 * S.elev.tl) + ' batt</button></div>' + extHtml() + autoHtml();
  } else {
    h = '<h2>Save data</h2><p>Autosaves every 10 seconds and on exit.</p>' +
      '<textarea id="sv" aria-label="Save JSON">' + JSON.stringify(S).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</textarea>' +
      '<div class="row"><button data-act="do-import">Import JSON</button><button data-act="do-reset">Hard reset</button></div>';
  }
  modal.innerHTML = '<div class="card">' + h + '<div class="row"><button data-act="close">Close</button></div></div>';
  modal.hidden = false; modal.dataset.kind = kind;
}
function upgrade(k, name) {
  const c = 3 + 3 * S.elev[k];
  if (S.bat < c) return say('Need ' + c + ' batteries.');
  S.bat -= c; S.elev[k]++; say(name + ' upgraded.'); openPanel('up');
}
document.addEventListener('click', ev => {
  const a = ev.target.closest('[data-act]'); if (!a) return;
  switch (a.dataset.act) {
    case 'open-build': openPanel('build'); break;
    case 'open-up': openPanel('up'); break;
    case 'open-save': openPanel('save'); break;
    case 'close': modal.hidden = true; break;
    case 'do-build': startBuild(document.getElementById('ftype').value); modal.hidden = true; break;
    case 'do-rush': rushBuild(); modal.hidden = true; break;
    case 'up-speed': upgrade('sl', 'Speed'); break;
    case 'up-tip': upgrade('tl', 'Tips'); break;
    case 'buy-ext':
      if (S.scrap < EXT_COST) say('Need ' + EXT_COST + ' scrap.');
      else { S.scrap -= EXT_COST; S.elev.ext = true; say('Cab extension installed.'); openPanel('up'); }
      break;
    case 'buy-auto':
      if (S.scrap < AUTO_COST) say('Need ' + AUTO_COST + ' scrap.');
      else { S.scrap -= AUTO_COST; S.elev.auto = true; say('Automated hoist online.'); openPanel('up'); }
      break;
    case 'do-import':
      try { importSave(document.getElementById('sv').value); modal.hidden = true; } catch (e) { say('Invalid save JSON.'); }
      break;
    case 'do-reset': if (confirm('Erase the whole bunker?')) { hardReset(); modal.hidden = true; } break;
  }
});

/* input */
const hold = (id, k) => {
  const b = document.getElementById(id);
  b.addEventListener('pointerdown', e => { keys[k] = true; b.setPointerCapture(e.pointerId); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => b.addEventListener(n, () => keys[k] = false));
};
hold('bUp', 'up'); hold('bDown', 'down');
addEventListener('keydown', e => {
  if (e.target.matches('textarea,select')) return;
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { keys.up = true; e.preventDefault(); }
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { keys.down = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
});
function dragTo(e) {
  const r = cv.getBoundingClientRect();
  const wy = (e.clientY - r.top) * (H / r.height) + rt.camY;
  rt.goal = clamp(Math.round(wy / FH + 0.5), 0, S.floors.length);
}
let dragging = false;
cv.addEventListener('pointerdown', e => { dragging = true; dragTo(e); });
cv.addEventListener('pointermove', e => { if (dragging) dragTo(e); });
addEventListener('pointerup', () => dragging = false);
