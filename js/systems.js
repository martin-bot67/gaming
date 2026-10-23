import { S, setState, rt, keys, fx, walkers, outs, W, H, FH, SX, TYPES, TK, rnd, pick, clamp, cost, buildTime, FN, LN, SAVE_KEY, fresh, mkSurvivor } from './models.js';

/* ================= SYSTEMS (logic) ================= */
export let spawnT = 2;
export const say = s => { rt.toast = { t: 2.5, s }; };
export const floorById = id => S.floors.find(f => f.id === id);
export const count = (fid, key) => S.surv.filter(s => s[key] === fid).length;
export const BEDS_PER_RESIDENTIAL_FLOOR = 5;
export const POWER_PER_ENERGY_ROOM = 3;
export const housingCapacity = () => S.floors.filter(f => f.cat === 'RESIDENTIAL').length * BEDS_PER_RESIDENTIAL_FLOOR;
export const housingUsed = () => S.surv.length + S.elev.pax.length;
const productiveFloors = () => S.floors
  .filter(f => f.cat === 'COMMERCIAL' && f.type !== 'ENERGY')
  .sort((a, b) => a.depth - b.depth);
export const energyCapacity = () => S.floors.filter(f => f.cat === 'COMMERCIAL' && f.type === 'ENERGY').length * POWER_PER_ENERGY_ROOM;
export const powerDemand = () => productiveFloors().length;
export const poweredRoomCount = () => Math.min(productiveFloors().length, energyCapacity());
export const isPowered = f => {
  if (f.cat !== 'COMMERCIAL' || f.type === 'ENERGY') return false;
  return productiveFloors().slice(0, energyCapacity()).some(room => room.id === f.id);
};
export const income = f => S.surv.filter(s => s.assignedJobFloorId === f.id)
  .reduce((a, s) => a + (1 + s.stats[f.type] * 0.2) * (s.dreamFloorType === f.type ? 1.5 : 1), 0) * (1 + f.depth * 0.15) * 0.65;
export const elevSpeed = () => 120 + 40 * S.elev.sl;
export const tipMult = () => 1 + 0.25 * S.elev.tl;

export function assignAll() {
  for (const s of S.surv) {
    if (!floorById(s.assignedResidenceFloorId)) {
      const f = S.floors.find(f => f.cat === 'RESIDENTIAL' && count(f.id, 'assignedResidenceFloorId') < BEDS_PER_RESIDENTIAL_FLOOR);
      s.assignedResidenceFloorId = f ? f.id : null;
    }
    if (!floorById(s.assignedJobFloorId)) {
      const c = S.floors.filter(f => f.cat === 'COMMERCIAL' && count(f.id, 'assignedJobFloorId') < 5);
      const f = c.find(f => f.type === s.dreamFloorType) || c[0];
      s.assignedJobFloorId = f ? f.id : null;
    }
  }
}

export function startBuild(choice) {
  if (S.build) return say('Crew is already digging.');
  const depth = S.floors.length + 1, c = cost(depth);
  const exact = choice !== 'RANDOM';
  if (S.scrap < c) return say('Need ' + c + ' scrap.');
  if (exact && S.bat < 5) return say('Choosing a type costs 5 batteries.');
  S.scrap -= c; if (exact) S.bat -= 5;
  const kind = exact ? choice : pick(['RESIDENTIAL', ...TK]);
  S.build = { depth, kind, total: buildTime(depth), left: buildTime(depth) };
  say('Digging B' + depth + '...');
}
export function rushBuild() {
  if (!S.build) return;
  const c = Math.ceil(S.build.left / 10) + 1;
  if (S.bat < c) return say('Need ' + c + ' batteries.');
  S.bat -= c; finishBuild();
}
export function finishBuild() {
  const b = S.build; S.build = null;
  const f = { id: 'floor_b' + b.depth, depth: b.depth };
  if (b.kind === 'RESIDENTIAL') { f.cat = 'RESIDENTIAL'; f.name = 'Bunks'; }
  else { f.cat = 'COMMERCIAL'; f.type = b.kind; f.name = pick(TYPES[b.kind].n); }
  S.floors.push(f); assignAll(); say('B' + b.depth + ' ready: ' + f.name);
}
export function adminAddScrap() { S.scrap += 1000000; say('Added 1,000,000 scrap.'); }
export function adminAddBatteries() { S.bat += 1000000; say('Added 1,000,000 batteries.'); }
export function adminSpawnSurvivor() {
  if (housingUsed() >= housingCapacity()) return say('No empty bunks. Build a residential floor.');
  S.surv.push(mkSurvivor());
  assignAll();
  say('Survivor spawned.');
}
export function adminCompleteBuild() {
  if (!S.build) return say('No build in progress.');
  finishBuild();
}

export function deliver(p) {
  if (S.surv.length >= housingCapacity()) return say('No empty bunks. Build a residential floor.');
  const e = S.elev, t = p.target;
  const tip = Math.round((15 + 10 * t) * tipMult());
  S.scrap += tip; S.delivered++;
  fx.push({ y: (t - 0.5) * FH, t: 1.4, s: '+' + tip });
  if (Math.random() < 0.12) { S.bat++; fx.push({ y: (t - 0.5) * FH + 14, t: 1.4, s: '+1 battery', c: '#6fd3ff' }); }
  outs.push({ depth: t, x: SX + 8, t: 2.2, id: 'r' + p.id, dir: -1 });
  const ns = mkSurvivor(); walkers[ns.id] = { x: SX - 30, tx: 0, wait: 0 };
  S.surv.push(ns); assignAll();
}

export const EXT_COST = 6000;
export const cap = () => S.elev.ext ? 3 : 1;
export function extHtml() {
  if (S.elev.ext) return '<p>Cab extension: installed. Carries up to 3 people.</p>';
  return '<p>Cab extension: carries 3 people instead of 1.</p><div class="row"><button data-act="buy-ext">Buy: ' + EXT_COST + ' scrap</button></div>';
}
export const AUTO_COST = 15000;
export function autoHtml() {
  if (S.elev.auto) return '<p>Automated hoist: running. It ferries refugees on its own. Hold Up or Down to take over.</p>';
  return '<p>Automated hoist: an operator robot runs the elevator for you.</p><div class="row"><button data-act="buy-auto">Buy: ' + AUTO_COST + ' scrap</button></div>';
}
export function walk(o, tx, sp, dt) {
  const d = tx - o.x;
  if (Math.abs(d) < 1) { o.moving = false; return; }
  o.dir = Math.sign(d); o.x += o.dir * Math.min(Math.abs(d), sp * dt); o.moving = true;
}
export function update(dt) {
  rt.incPS = 0;
  S.floors.forEach(f => { if (isPowered(f)) rt.incPS += income(f); });
  S.scrap += rt.incPS * dt;
  if (S.build && (S.build.left -= dt) <= 0) finishBuild();
  spawnT -= dt;
  if (spawnT <= 0) {
    spawnT = rnd(4, 8);
    if (S.floors.length && S.queue.length < 4 && housingUsed() + S.queue.length < housingCapacity())
      S.queue.push({ id: S.nid++, target: rnd(1, S.floors.length), name: pick(FN), x: -10 });
  }
  const e = S.elev, max = S.floors.length, step = (elevSpeed() / FH) * dt;
  let dir = (keys.up ? -1 : 0) + (keys.down ? 1 : 0);
  if (dir) rt.goal = null;
  else if (e.auto && rt.goal == null) {
    const full = e.pax.length >= cap() || housingUsed() >= housingCapacity();
    if (e.pax.length && (full || !S.queue.length || Math.abs(e.pos) > 0.15)) rt.goal = e.pax.reduce((a, p) => Math.abs(p.target - e.pos) < Math.abs(a - e.pos) ? p.target : a, e.pax[0].target);
    else if (S.queue.length && !full) rt.goal = 0;
  }
  else if (rt.goal != null) {
    const d = rt.goal - e.pos;
    if (Math.abs(d) <= step) { e.pos = rt.goal; rt.goal = null; } else dir = Math.sign(d);
  }
  e.pos = clamp(e.pos + dir * step, 0, max);
  const near = l => Math.abs(e.pos - l) < 0.15;
  for (const p of e.pax.filter(p => near(p.target))) { e.pax.splice(e.pax.indexOf(p), 1); deliver(p); }
  const canBoard = e.pax.length < cap() && housingUsed() < housingCapacity() && near(0);
  S.queue.forEach((r, i) => { if (r.x == null) r.x = 20 + i * 56; walk(r, canBoard && i === 0 ? SX + 14 : 20 + i * 56, 120, dt); });
  if (canBoard && S.queue.length && S.queue[0].x >= SX + 10) e.pax.push(S.queue.shift());
  S.surv.forEach(s => {
    const w = walkers[s.id] || (walkers[s.id] = { x: 18 + rnd(0, 150), tx: 0, wait: rnd(0, 3) });
    if (w.wait > 0) { w.wait -= dt; w.moving = false; }
    else if (!w.tx || Math.abs(w.x - w.tx) < 1) { w.wait = rnd(0, 2); w.tx = rnd(16, 175); w.moving = false; }
    else walk(w, w.tx, 65, dt);
  });
  for (let i = outs.length - 1; i >= 0; i--) { const o = outs[i]; walk(o, 100, 100, dt); if ((o.t -= dt) <= 0) outs.splice(i, 1); }
  for (let i = fx.length - 1; i >= 0; i--) if ((fx[i].t -= dt) <= 0) fx.splice(i, 1);
  if (rt.toast.t > 0) rt.toast.t -= dt;
}

/* persistence */
export function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) importSave(raw, true);
  } catch (e) {}
}
export function importSave(str, silent) {
  const o = JSON.parse(str);
  if (!o || !Array.isArray(o.floors) || !Array.isArray(o.surv) || !o.elev) throw new Error('bad');
  setState(Object.assign(fresh(), o)); rt.goal = null;
  const el = S.elev; if (!el.pax) el.pax = el.pass ? [el.pass] : []; delete el.pass;
  if (!silent) say('Save imported.');
}
export function hardReset() { setState(fresh()); rt.goal = null; fx.length = 0; save(); say('Bunker reset.'); }
