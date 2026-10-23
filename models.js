/* ================= MODELS (data & state) ================= */
export const W = 450, H = 800, FH = 80, SX = 352;
export const TYPES = {
  FOOD:     { c: '#3f7d34', n: ['Hydroponics Bay', 'Ration Station'] },
  ENERGY:   { c: '#a88a1c', n: ['Generator Room', 'Water Purifier'] },
  SECURITY: { c: '#8f3f38', n: ['Guard Post', 'Armory'] },
  MEDICAL:  { c: '#2f7f8f', n: ['Med Bay', 'Comms Center'] },
  SERVICE:  { c: '#7a4f96', n: ['Rec Lounge', 'Radio Station'] }
};
export const TK = Object.keys(TYPES);
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const cost = d => Math.round(1000 * Math.pow(1.25, d));
export const buildTime = d => 8 + d * 4;
export const FN = ['Rex', 'Mara', 'Jun', 'Ola', 'Tess', 'Brock', 'Ivy', 'Dax', 'Nell', 'Kit', 'Sol', 'Vera'];
export const LN = ['Vance', 'Cole', 'Reyes', 'Hart', 'Okoye', 'Lund', 'Pike', 'Ward', 'Moss', 'Tran'];
export const SAVE_KEY = 'tiny-bunker-save-v1';

export const fresh = () => ({
  v: 1, scrap: 1500, bat: 10, nid: 100,
  floors: [], surv: [], queue: [], build: null,
  elev: { pos: 0, sl: 0, tl: 0, pax: [] }, delivered: 0
});
export let S = fresh();
export const setState = s => { S = s; };

export const mkSurvivor = () => {
  const stats = {}; TK.forEach(k => stats[k] = rnd(1, 10));
  return {
    id: 'survivor_' + S.nid++, name: pick(FN) + ' ' + pick(LN), stats,
    dreamFloorType: pick(TK), assignedJobFloorId: null, assignedResidenceFloorId: null
  };
};


/* Runtime state shared between modules (not saved) */
export const rt = { goal: null, camY: -FH - 40, incPS: 0, toast: { t: 0, s: '' } };
export const keys = { up: false, down: false };
export const fx = [];
export const walkers = {}, outs = [];
