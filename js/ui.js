import { S, rt, keys, TK, H, FH, clamp, cost, buildTime, scrollCamera } from './models.js';
import { startBuild, rushBuild, say, elevSpeed, tipMult, extHtml, autoHtml, EXT_COST, AUTO_COST, importSave, hardReset, save, adminAddScrap, adminAddBatteries, adminSpawnSurvivor, adminSpawnRareSurvivor, adminCompleteBuild, SHOP_SPIN_COOLDOWN_MS, SHOP_WHEEL_PRIZES, shopSpinCooldownRemaining, spinShopWheel } from './systems.js';
import { cv } from './renderer.js';

const modal = document.getElementById('modal');
const adminToggle = document.getElementById('admin-toggle');
const adminPanel = document.getElementById('admin-panel');
const adminLogin = document.getElementById('admin-login');
const adminPassword = document.getElementById('admin-password');
const adminActions = document.getElementById('admin-actions');
const adminLoginError = document.getElementById('admin-login-error');
const ADMIN_PASSWORD = 'chromedout';

adminToggle.addEventListener('click', () => {
  adminPanel.hidden = !adminPanel.hidden;
  adminToggle.setAttribute('aria-expanded', String(!adminPanel.hidden));
  if (adminPanel.hidden) {
    adminPassword.value = '';
    adminActions.hidden = true;
    adminLogin.hidden = false;
    adminLoginError.hidden = true;
  } else {
    adminPassword.focus();
  }
});
adminLogin.addEventListener('submit', ev => {
  ev.preventDefault();
  if (adminPassword.value === ADMIN_PASSWORD) {
    adminActions.hidden = false;
    adminLogin.hidden = true;
    adminLoginError.hidden = true;
    adminPassword.value = '';
  } else {
    adminLoginError.hidden = false;
    adminPassword.select();
  }
});
adminPanel.addEventListener('click', ev => {
  const action = ev.target.closest('[data-admin-act]');
  if (!action) return;
  switch (action.dataset.adminAct) {
    case 'add-scrap': adminAddScrap(); break;
    case 'add-batteries': adminAddBatteries(); break;
    case 'spawn-survivor': adminSpawnSurvivor(); break;
    case 'spawn-rare-survivor': adminSpawnRareSurvivor(); break;
    case 'complete-build': adminCompleteBuild(); break;
    case 'reset-game':
      if (confirm('Erase the whole bunker?')) hardReset();
      break;
  }
});

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
  } else if (kind === 'shop') {
    const prizeLabel = prize => prize.amount.toLocaleString() + ' ' + prize.kind;
    h = '<h2>Shop</h2><p>Robux gamepasses and currency packs are planned for the Roblox version.</p>' +
      '<h3>Lucky wheel</h3><p>Free spin every 15 minutes. Each color wins one fixed prize.</p>' +
      '<div class="wheel-pointer" aria-hidden="true"></div>' +
      '<div id="shop-wheel" class="shop-wheel" role="img" aria-label="Prize wheel: ' + SHOP_WHEEL_PRIZES.map(prizeLabel).join(', ') + '">' +
      SHOP_WHEEL_PRIZES.map(prize => '<span><strong>' + prize.amount.toLocaleString() + '</strong><small>' + prize.kind.toUpperCase() + '</small></span>').join('') +
      '<i aria-hidden="true"></i></div>' +
      '<p id="shop-spin-status" role="status" aria-live="polite"></p>' +
      '<div class="row"><button data-act="spin-wheel"' + (shopSpinCooldownRemaining() > 0 ? ' disabled' : '') + '>Spin</button></div>' +
      '<p id="shop-spin-cooldown"></p>';
  } else {
    h = '<h2>Save data</h2><p>Autosaves every 10 seconds and on exit.</p>' +
      '<textarea id="sv" aria-label="Save JSON">' + JSON.stringify(S).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</textarea>' +
      '<div class="row"><button data-act="do-import">Import JSON</button><button data-act="do-reset">Hard reset</button></div>';
  }
  modal.innerHTML = '<div class="card">' + h + '<div class="row"><button data-act="close">Close</button></div></div>';
  if (kind === 'shop') {
    const wheel = modal.querySelector('#shop-wheel');
    const slices = SHOP_WHEEL_PRIZES.map((prize, index) => {
      const start = index * 360 / SHOP_WHEEL_PRIZES.length;
      const end = (index + 1) * 360 / SHOP_WHEEL_PRIZES.length;
      return prize.color + ' ' + start + 'deg ' + end + 'deg';
    });
    wheel.style.background = 'conic-gradient(' + slices.join(',') + ')';
  }
  modal.hidden = false; modal.dataset.kind = kind;
}
function upgrade(k, name) {
  const c = 3 + 3 * S.elev[k];
  if (S.bat < c) return say('Need ' + c + ' batteries.');
  S.bat -= c; S.elev[k]++; say(name + ' upgraded.'); openPanel('up');
}
function refreshShopStatus() {
  if (modal.hidden || modal.dataset.kind !== 'shop') return;
  const remaining = shopSpinCooldownRemaining();
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.ceil(remaining % 60000 / 1000);
  const button = modal.querySelector('[data-act="spin-wheel"]');
  const cooldown = modal.querySelector('#shop-spin-cooldown');
  if (button) button.disabled = remaining > 0;
  if (cooldown) cooldown.textContent = remaining > 0
    ? 'Next free spin in ' + minutes + ':' + String(seconds).padStart(2, '0')
    : 'Your free spin is ready!';
}
setInterval(refreshShopStatus, 1000);
document.addEventListener('click', ev => {
  const a = ev.target.closest('[data-act]'); if (!a) return;
  switch (a.dataset.act) {
    case 'open-build': openPanel('build'); break;
    case 'open-up': openPanel('up'); break;
    case 'open-shop': openPanel('shop'); refreshShopStatus(); break;
    case 'open-save': openPanel('save'); break;
    case 'close': modal.hidden = true; break;
    case 'do-build': startBuild(document.getElementById('ftype').value); modal.hidden = true; break;
    case 'do-rush': rushBuild(); modal.hidden = true; break;
    case 'up-speed': upgrade('sl', 'Speed'); break;
    case 'up-tip': upgrade('tl', 'Tips'); break;
    case 'spin-wheel': {
      const prize = spinShopWheel();
      if (!prize) { refreshShopStatus(); break; }
      const wheel = modal.querySelector('#shop-wheel');
      const status = modal.querySelector('#shop-spin-status');
      const current = wheel ? Number(wheel.dataset.rotation || 0) : 0;
      const target = 360 - (prize.slice + 0.5) * 45;
      const rotation = current + 5 * 360 + (target - current % 360 + 360) % 360;
      if (wheel) {
        wheel.dataset.rotation = String(rotation);
        wheel.style.transform = 'rotate(' + rotation + 'deg)';
      }
      if (status) status.textContent = 'Spinning...';
      save();
      refreshShopStatus();
      setTimeout(() => {
        if (!modal.hidden && modal.dataset.kind === 'shop') {
          const result = modal.querySelector('#shop-spin-status');
          if (result) result.textContent = 'You won ' + prize.amount + ' ' + prize.kind + '!';
        }
      }, 3200);
      break;
    }
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
let dragging = false, touch = null;
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') {
    touch = { id: e.pointerId, y: e.clientY, lastY: e.clientY, panning: false };
  } else {
    dragging = true;
    dragTo(e);
  }
});
cv.addEventListener('pointermove', e => {
  if (touch && e.pointerId === touch.id) {
    if (Math.abs(e.clientY - touch.y) > 6) touch.panning = true;
    if (touch.panning) scrollCamera(touch.lastY - e.clientY);
    touch.lastY = e.clientY;
  } else if (dragging) {
    dragTo(e);
  }
});
const endPointer = e => {
  if (touch && e.pointerId === touch.id) {
    if (!touch.panning) dragTo(e);
    touch = null;
  }
  dragging = false;
};
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);
