// Pixel-art helpers: sprite maps drawn with fillRect so they stay crisp at any size.
import { P, robe } from './config.js';

export function drawMap(ctx, rows, pal, x, y, u = P, flip = false) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < w; c++) {
      const ch = row[flip ? w - 1 - c : c];
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + c * u), Math.round(y + r * u), Math.ceil(u), Math.ceil(u));
    }
  }
}

/* ---------------- people ---------------- */
const FRONT = [
  '..HHHH..',
  '.HHHHHH.',
  '.HSSSSH.',
  '.SESSES.',
  '..SSSS..',
  '.CCCCCC.',
  'ACCCCCCA',
  'ACCCCCCA',
  '.PPPPPP.',
];
const BACK = [
  '..HHHH..',
  '.HHHHHH.',
  '.HHHHHH.',
  '.HHHHHH.',
  '..SSSS..',
  '.CCCCCC.',
  'ACCCCCCA',
  'ACCCCCCA',
  '.PPPPPP.',
];
const LEGS = [
  ['.PP..PP.', '.PP..PP.', '.BB..BB.'],
  ['.PP..PP.', '.PP...PP', '.BB...BB'],
  ['.PP..PP.', 'PP...PP.', 'BB...BB.'],
];
const HAIRS = ['#1d1412', '#3b2416', '#5a3a22', '#0f0f14', '#7a4a2a', '#2b1d33'];
const SKINS = ['#f5d2b0', '#e8b98f', '#c98e62', '#8d5a3b', '#f1c9a5', '#b07850'];

export function personPalette(seed, robeIdx) {
  const shirt = robe(robeIdx);
  return { H: HAIRS[seed % HAIRS.length], S: SKINS[(seed >> 3) % SKINS.length], A: SKINS[(seed >> 3) % SKINS.length],
    E: '#1a1a1a', C: shirt, P: '#2c3e66', B: '#1a1a1a' };
}

// Draws a little person standing with feet at (x, y). Returns the sprite's top y.
export function drawPerson(ctx, x, y, { seed = 0, robeIdx = 0, back = false, frame = 0, alpha = 1, u = P }) {
  const rows = [...(back ? BACK : FRONT), ...LEGS[frame % 3]];
  const pal = personPalette(seed, robeIdx);
  const w = 8 * u, h = rows.length * u;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(Math.round(x - w / 2 + u), Math.round(y - u * .5), Math.round(w - 2 * u), Math.round(u));
  drawMap(ctx, rows, pal, x - w / 2, y - h, u);
  ctx.restore();
  return y - h;
}

/* ---------------- offerings ---------------- */
const SPR = {
  lotus: [['..a.a..', '.aAaAa.', 'aAAyAAa', '.aAAAa.', '...g...', '..gg...'], { a: '#e56b8f', A: '#f7b2c6', y: '#f2c94c', g: '#3f8a3a' }],
  chrys: [['.w.w.w.', 'wwWwWww', '.wWyWw.', 'wwWwWww', '.w.g.w.', '...g...'], { w: '#f5f2e6', W: '#e6dcb8', y: '#e1b94a', g: '#3f8a3a' }],
  orchid: [['.v...v.', 'vVv.vVv', '.vVlVv.', '..vlv..', '...g...', '..gg...'], { v: '#a866c4', V: '#d7a6ec', l: '#f6e3fb', g: '#3f8a3a' }],
  peony: [['.rRRr..', 'rRpPRr.', 'rpPPpr.', '.rRRr..', '...g...', '...gg..'], { r: '#b8283f', R: '#df5b74', p: '#f08aa0', P: '#fbc7d2', g: '#3f8a3a' }],
  plum: [['.k...k.', 'kKk.kKk', '.kck.c.', '..b.kKk', '..b..k.', '..b....'], { k: '#f3b7c8', K: '#fde8ee', c: '#c33b54', b: '#5a3a22' }],
  white: [['...f...', '..fYf..', '...w...', '..wWw..', '..wWw..', '.gGGGg.'], { f: '#ffb43b', Y: '#fff1a8', w: '#f4f0e6', W: '#ffffff', g: '#9aa7b8', G: '#c8d3e0' }],
  red: [['...f...', '..fYf..', '...w...', '..wWw..', '..wWw..', '.gGGGg.'], { f: '#ffb43b', Y: '#fff1a8', w: '#c8202f', W: '#e8505c', g: '#9aa7b8', G: '#c8d3e0' }],
  blue: [['...f...', '..fYf..', '...w...', '..wWw..', '..wWw..', '.gGGGg.'], { f: '#ffb43b', Y: '#fff1a8', w: '#2e6fd0', W: '#6aa2f0', g: '#9aa7b8', G: '#c8d3e0' }],
  gold: [['...f...', '..fYf..', '...w...', '..wWw..', '..wWw..', '.gGGGg.'], { f: '#ffb43b', Y: '#fff1a8', w: '#d9a21b', W: '#f6d26a', g: '#9aa7b8', G: '#c8d3e0' }],
  diya: [['...f...', '..fYf..', '...f...', 'cCCCCCc', '.cCCCc.', '..ccc..'], { f: '#ff9a1f', Y: '#fff1a8', c: '#8a4b23', C: '#c9733a' }],
  marigold: [['.o.o.o.', 'oOoOoOo', '.oOyOo.', 'oOoOoOo', '.o.g.o.', '...g...'], { o: '#f28c1b', O: '#ffc23d', y: '#d96a00', g: '#3f8a3a' }],
  mlotus: [['..a.a..', '.aAaAa.', 'aAAyAAa', '.aAAAa.', 'gGGGGGg', '.gGGGg.'], { a: '#e56b8f', A: '#f7b2c6', y: '#f2c94c', g: '#3f8a3a', G: '#5fb04f' }],
  fruit: [['..l....', '.yYy.oO', 'yYYYyoO', '.yyy.oo', 'bBBBBBb', '.bbbbb.'], { l: '#3f8a3a', y: '#f2c230', Y: '#ffe27a', o: '#f28c1b', O: '#ffb15c', b: '#b8b8c8', B: '#e0e0ea' }],
  lamp: [['...c...', '..cGc..', '.cGYGc.', '.cGYGc.', '..cGc..', '...c...'], { c: '#b88a2e', G: '#f6c453', Y: '#fff3c0' }],
};
export function drawItem(ctx, id, x, y, u = P) {
  const s = SPR[id];
  if (s) drawMap(ctx, s[0], s[1], x - 3.5 * u, y - 6 * u, u);
}
export const hasSprite = (id) => Boolean(SPR[id]);
export function drawRibbon(ctx, x, y, color, t, u = P) {
  ctx.fillStyle = color;
  const sway = Math.round(Math.sin(t * 2 + x) * 1);
  ctx.fillRect(x, y, u * 2, u);
  ctx.fillRect(x + sway * u * 0.5, y + u, u, u * 3);
  ctx.fillRect(x + u + sway * u, y + u, u, u * 2);
}
