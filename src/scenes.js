// Procedural pixel scenes. Each is drawn in a 1000 x 600 design space into a low-res buffer,
// then scaled up with smoothing off, which gives the chunky pixel look of the temple artwork.
import { drawItem, drawRibbon } from './pixel.js';
import { PLACES } from './config.js';

let c; // current context
let RM = false; // reduced motion

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function lg(y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col)); return g; }
function ell(x, y, rx, ry, fill, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function rect(x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function glow(x, y, r, col) { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function archPath(x, y, w, h) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.quadraticCurveTo(x, y, x + w / 2, y - w * 0.15); c.quadraticCurveTo(x + w, y, x + w, y + w / 2); c.lineTo(x + w, y + h); c.closePath(); }
const T = (t) => (RM ? 0 : t);

/* ------------------------------------------------ Chapel of Light */
function chapel(t, offs) {
  rect(0, 0, 1000, 600, '#1d2236');
  c.fillStyle = lg(0, 400, ['#2a3150', '#3b4268']); c.fillRect(0, 0, 1000, 400);
  // stone courses
  c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 20; y < 400; y += 36) c.fillRect(0, y, 1000, 3);
  // stained glass windows
  const panes = ['#d7263d', '#3f6fd8', '#f2b632', '#2a9d8f', '#8a5cc7', '#e56b8f'];
  [[110, 70], [790, 70], [430, 40]].forEach(([x, y], wi) => {
    const w = wi === 2 ? 140 : 100, h = wi === 2 ? 210 : 190;
    glow(x + w / 2, y + h / 2, 170, 'rgba(255,220,160,.18)');
    archPath(x, y, w, h); c.fillStyle = '#121626'; c.fill();
    c.save(); archPath(x + 6, y + 6, w - 12, h - 10); c.clip();
    const r = rng(9 + wi);
    for (let py = y; py < y + h; py += 22) for (let px = x; px < x + w; px += 20) { c.fillStyle = panes[Math.floor(r() * panes.length)]; c.globalAlpha = .65 + Math.sin(T(t) * .8 + px * .03 + py * .02) * .15; c.fillRect(px, py, 18, 20); }
    c.globalAlpha = 1; c.restore();
    c.strokeStyle = '#8f96b8'; c.lineWidth = 4; archPath(x + 6, y + 6, w - 12, h - 10); c.stroke();
  });
  // light shafts
  c.fillStyle = 'rgba(255,236,190,.07)';
  [[160, 100], [840, 100], [500, 80]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 40, y); c.lineTo(x + 40, y); c.lineTo(x + 140, 600); c.lineTo(x + 20, 600); c.fill(); });
  // cross above altar
  rect(493, 270, 14, 70, '#e2b13c'); rect(474, 288, 52, 12, '#e2b13c');
  // altar
  rect(390, 350, 220, 60, '#5b3a2a'); rect(380, 342, 240, 12, '#e9e2d0'); rect(470, 354, 60, 50, '#e9e2d0'); rect(486, 366, 28, 6, '#e2b13c'); rect(497, 358, 6, 26, '#e2b13c');
  [405, 595].forEach((x) => { rect(x - 4, 312, 8, 30, '#f3ecd8'); glow(x, 306, 22, 'rgba(255,200,110,.5)'); ell(x, 306, 4, 7, '#ffcc4d'); });
  // floor
  c.fillStyle = lg(400, 600, ['#4a4f63', '#2a2d3b']); c.fillRect(0, 400, 1000, 200);
  c.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 410, i = 0; y < 600; i++, y += 12 + i * 4) c.fillRect(0, y, 1000, 2);
  rect(440, 400, 120, 200, '#7a2232'); rect(446, 400, 4, 200, '#c2954a'); rect(550, 400, 4, 200, '#c2954a');
  // pews
  for (let row = 0; row < 3; row++) { const y = 440 + row * 50; [[60, 360], [640, 940]].forEach(([a, b]) => { rect(a, y, b - a, 12, '#6b4429'); rect(a, y + 12, b - a, 22, '#4f301c'); rect(a, y - 22, b - a, 8, '#7d5233'); rect(a + 6, y - 14, 8, 50, '#4f301c'); rect(b - 14, y - 14, 8, 50, '#4f301c'); }); }
  // candle stand (offerings)
  rect(770, 300, 160, 8, '#2b2b33'); rect(780, 330, 140, 8, '#2b2b33'); rect(790, 360, 120, 8, '#2b2b33'); rect(846, 300, 8, 110, '#2b2b33'); rect(820, 405, 60, 8, '#2b2b33');
  const list = offs.slice(-18);
  list.forEach((o, i) => { const tier = Math.floor(i / 6), k = i % 6; const x = 785 + tier * 10 + k * (tier === 2 ? 20 : 25), y = 300 + tier * 30;
    glow(x, y - 18, 14, 'rgba(255,190,90,.45)'); drawItem(c, o.item, x, y, 4); });
}

/* ------------------------------------------------ Prayer Hall (masjid) */
function masjid(t, offs) {
  c.fillStyle = lg(0, 400, ['#efe4cc', '#e2d2b0']); c.fillRect(0, 0, 1000, 400);
  // geometric tile band
  for (let x = 0; x < 1000; x += 40) { rect(x, 0, 40, 40, (x / 40) % 2 ? '#1f7a72' : '#2a9d8f'); c.fillStyle = '#f2d27a'; c.beginPath(); c.moveTo(x + 20, 6); c.lineTo(x + 34, 20); c.lineTo(x + 20, 34); c.lineTo(x + 6, 20); c.fill(); c.fillStyle = '#1f7a72'; c.fillRect(x + 16, 16, 8, 8); }
  rect(0, 40, 1000, 6, '#b88a2e');
  // side arches
  [40, 190, 690, 840].forEach((x) => { archPath(x, 120, 120, 280); c.fillStyle = '#d6c39b'; c.fill(); archPath(x + 12, 132, 96, 268); c.fillStyle = '#c4ad80'; c.fill(); c.strokeStyle = '#b88a2e'; c.lineWidth = 3; archPath(x, 120, 120, 280); c.stroke();
    for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(42,157,143,.35)'; c.fillRect(x + 30 + (k % 2) * 30, 200 + Math.floor(k / 2) * 50, 26, 40); } });
  // mihrab
  archPath(400, 90, 200, 310); c.fillStyle = '#b88a2e'; c.fill();
  archPath(414, 104, 172, 296); c.fillStyle = '#1f6f68'; c.fill();
  c.save(); archPath(414, 104, 172, 296); c.clip();
  for (let y = 100; y < 400; y += 24) for (let x = 414; x < 586; x += 24) { c.fillStyle = (x + y) % 48 ? '#2a9d8f' : '#25877c'; c.beginPath(); c.moveTo(x + 12, y + 2); c.lineTo(x + 22, y + 12); c.lineTo(x + 12, y + 22); c.lineTo(x + 2, y + 12); c.fill(); }
  c.restore();
  archPath(450, 170, 100, 230); c.fillStyle = '#163f3c'; c.fill();
  // minbar
  for (let s = 0; s < 6; s++) rect(620 + s * 14, 400 - (s + 1) * 26, 14, (s + 1) * 26, s % 2 ? '#7a4a2a' : '#8b5a33');
  rect(700, 210, 14, 190, '#6b4429'); c.fillStyle = '#b88a2e'; c.beginPath(); c.moveTo(696, 210); c.lineTo(718, 210); c.lineTo(707, 180); c.fill();
  // carpet with rows of prayer-mat arches
  rect(0, 400, 1000, 200, '#8e1f2a');
  for (let row = 0; row < 4; row++) for (let x = -20 + (row % 2) * 30; x < 1000; x += 60) { const y = 412 + row * 48; c.strokeStyle = '#c9893a'; c.lineWidth = 2; archPath(x + 8, y, 44, 40); c.stroke(); rect(x + 26, y + 18, 8, 8, '#2a9d8f'); }
  // hanging lamps: each dua lights one
  const lit = offs.length;
  const lamps = [[90, 170], [240, 140], [340, 200], [660, 200], [760, 140], [910, 170], [150, 260], [850, 260], [300, 300], [700, 300], [460, 70], [540, 70]];
  lamps.forEach(([x, y], i) => {
    c.strokeStyle = 'rgba(80,60,30,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 46); c.lineTo(x, y - 12); c.stroke();
    const on = i < lit;
    if (on) glow(x, y + 6, 44 + Math.sin(T(t) * 2 + i) * 3, 'rgba(255,200,100,.55)');
    c.globalAlpha = on ? 1 : .45; drawItem(c, 'lamp', x, y + 18, 4); c.globalAlpha = 1;
  });
}

/* ------------------------------------------------ Mandir */
function mandir(t, offs) {
  c.fillStyle = lg(0, 400, ['#7a1f1a', '#a8321f', '#c4502a']); c.fillRect(0, 0, 1000, 400);
  // pillars
  [[40, 110], [890, 960]].forEach(([a, b]) => { rect(a, 0, b - a, 400, '#e8c9a0'); for (let y = 30; y < 400; y += 60) { rect(a - 4, y, b - a + 8, 10, '#d9a441'); } });
  // shrine (shikhara)
  c.fillStyle = '#e2b13c'; c.beginPath(); c.moveTo(330, 380); c.lineTo(330, 170); c.lineTo(400, 120); c.lineTo(440, 60); c.lineTo(500, 20); c.lineTo(560, 60); c.lineTo(600, 120); c.lineTo(670, 170); c.lineTo(670, 380); c.closePath(); c.fill();
  c.fillStyle = '#c48a1e'; for (let y = 70; y < 380; y += 22) c.fillRect(340, y, 320, 4);
  rect(492, 6, 16, 20, '#f2d27a'); ell(500, 8, 10, 6, '#f2d27a');
  archPath(380, 170, 240, 210); c.fillStyle = '#5a1010'; c.fill();
  archPath(396, 186, 208, 194); c.fillStyle = '#8e1b1b'; c.fill();
  glow(500, 270, 120, 'rgba(255,190,90,.45)');
  c.fillStyle = '#f6d26a'; c.font = '110px "Tiro Devanagari Hindi", "Noto Sans Devanagari", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ॐ', 500, 278);
  // marigold garlands
  [[120, 330, 60], [330, 670, 50], [670, 880, 60]].forEach(([a, b, sag]) => { for (let i = 0; i <= 20; i++) { const f = i / 20, x = a + (b - a) * f, y = 60 + Math.sin(f * Math.PI) * sag; ell(x, y, 7, 7, i % 2 ? '#f28c1b' : '#ffc23d'); } });
  // bells
  [250, 750].forEach((x, i) => { const sw = Math.sin(T(t) * 1.5 + i) * 4; c.strokeStyle = '#5a3a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + sw, 140); c.stroke();
    c.fillStyle = '#d9a441'; c.beginPath(); c.moveTo(x + sw - 18, 180); c.quadraticCurveTo(x + sw - 16, 140, x + sw, 140); c.quadraticCurveTo(x + sw + 16, 140, x + sw + 18, 180); c.fill(); ell(x + sw, 184, 5, 5, '#8a5a1a'); });
  // floor
  c.fillStyle = lg(380, 600, ['#efe6d8', '#c9bba4']); c.fillRect(0, 380, 1000, 220);
  for (let y = 380; y < 600; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < 1000; x += 80) rect(x, y, 40, 40, 'rgba(160,120,80,.12)');
  // rangoli
  [[500, 520]].forEach(([x, y]) => { ell(x, y, 90, 30, '#e56b8f'); ell(x, y, 70, 22, '#f2b632'); ell(x, y, 48, 15, '#2a9d8f'); ell(x, y, 26, 8, '#fff'); });
  // brass plate with offerings
  ell(500, 410, 170, 18, '#b88a2e'); ell(500, 406, 160, 14, '#e2b13c');
  const list = offs.slice(-14);
  list.forEach((o, i) => { const x = 360 + (i % 7) * 46 + (i >= 7 ? 23 : 0), y = 406 - (i >= 7 ? 10 : 0); if (o.item === 'diya') glow(x, y - 20, 18, 'rgba(255,170,60,.5)'); drawItem(c, o.item, x, y, 4); });
}

/* ------------------------------------------------ Wishing Tree */
function tree(t, offs) {
  c.fillStyle = lg(0, 380, ['#6cc3f5', '#b7e3fb', '#e9f6ff']); c.fillRect(0, 0, 1000, 380);
  const r = rng(77);
  for (let i = 0; i < 5; i++) { const x = ((i * 260 + T(t) * 8) % 1250) - 150, y = 50 + (i % 3) * 30; ell(x, y, 60, 18, '#fff'); ell(x + 30, y - 12, 34, 16, '#fff'); ell(x - 30, y - 6, 28, 12, '#fff'); }
  // hills
  c.fillStyle = '#7cc56b'; c.beginPath(); c.moveTo(0, 380); for (let x = 0; x <= 1000; x += 20) c.lineTo(x, 330 - Math.sin(x * .006) * 30); c.lineTo(1000, 380); c.fill();
  c.fillStyle = lg(360, 600, ['#64b558', '#4a9a44']); c.fillRect(0, 360, 1000, 240);
  // trunk
  c.fillStyle = '#6b4429'; c.beginPath(); c.moveTo(460, 470); c.quadraticCurveTo(475, 330, 440, 250); c.lineTo(560, 250); c.quadraticCurveTo(525, 330, 540, 470); c.fill();
  c.strokeStyle = '#6b4429'; c.lineWidth = 16; [[470, 280, 330, 190], [530, 280, 680, 190], [500, 260, 500, 140]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + x) / 2, y + 40, x, y); c.stroke(); });
  // canopy
  const blobs = [[500, 130, 150], [360, 170, 120], [640, 170, 120], [260, 220, 80], [740, 220, 80], [430, 90, 100], [580, 90, 100]];
  blobs.forEach(([x, y, rr]) => ell(x, y, rr, rr * .7, '#2f8a3e'));
  blobs.forEach(([x, y, rr]) => ell(x - rr * .15, y - rr * .15, rr * .75, rr * .5, '#3fa84a'));
  for (let i = 0; i < 40; i++) ell(220 + r() * 560, 60 + r() * 200, 8, 6, 'rgba(160,220,120,.6)');
  // ribbons (offerings)
  const items = PLACES.tree.items;
  const list = offs.slice(-40);
  list.forEach((o, i) => { const rr2 = rng(1000 + i); const ang = rr2() * Math.PI; const x = 500 + Math.cos(ang) * (180 + rr2() * 170) * (i % 2 ? 1 : -1); const y = 220 + rr2() * 60;
    const col = (items.find((it) => it.id === o.item) || items[0]).color; drawRibbon(c, Math.round(x), Math.round(y), col, T(t) + i, 9); });
  // fence, flowers, bench
  for (let x = 0; x < 1000; x += 30) { rect(x + 10, 395, 10, 40, '#f4f0e6'); } rect(0, 405, 1000, 6, '#f4f0e6'); rect(0, 422, 1000, 6, '#f4f0e6');
  for (let i = 0; i < 60; i++) { const x = r() * 1000, y = 450 + r() * 140; ell(x, y, 4, 4, ['#f2b632', '#e56b8f', '#fff', '#9b5de5'][i % 4]); }
  rect(700, 470, 140, 12, '#8b5a33'); rect(710, 482, 10, 26, '#6b4429'); rect(820, 482, 10, 26, '#6b4429');
  // butterflies
  for (let i = 0; i < 3; i++) { const tt = T(t) * (0.6 + i * .2) + i * 2; const x = 300 + i * 200 + Math.sin(tt) * 80, y = 330 + Math.cos(tt * 1.3) * 40; const flap = Math.abs(Math.sin(T(t) * 10 + i)) * 6 + 2; ell(x - 4, y, flap, 5, '#ff9ecf'); ell(x + 4, y, flap, 5, '#ff9ecf'); }
}

/* ------------------------------------------------ Gossip Bar */
function bar(t) {
  rect(0, 0, 1000, 600, '#1c1230');
  for (let y = 0; y < 380; y += 22) for (let x = (y / 22) % 2 ? -25 : 0; x < 1000; x += 50) { c.fillStyle = (x + y) % 3 ? '#2b1b45' : '#2f1d4b'; c.fillRect(x + 2, y + 2, 46, 18); }
  glow(400, 70, 200, 'rgba(255,80,180,.25)'); // neon glow; the lettering is drawn crisp in drawOverlay
  // shelves of bottles
  const r = rng(5);
  [180, 250].forEach((y) => { rect(100, y, 600, 8, '#6b4429'); for (let x = 115; x < 690; x += 26) { const h = 30 + r() * 20, col = ['#3bb273', '#f2b632', '#d7263d', '#7ef9ff', '#9b5de5', '#e8a33d'][Math.floor(r() * 6)]; rect(x, y - h, 14, h, col); rect(x + 4, y - h - 10, 6, 10, col); rect(x + 2, y - h + 8, 4, h - 16, 'rgba(255,255,255,.25)'); } });
  rect(740, 150, 200, 110, '#3a2a1a'); rect(748, 158, 184, 94, '#1e2a24'); // chalkboard (text in drawOverlay)
  // pendant lights
  [220, 420, 620].forEach((x) => { c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 300); c.stroke(); c.fillStyle = '#e8a33d'; c.beginPath(); c.moveTo(x - 20, 320); c.lineTo(x - 8, 300); c.lineTo(x + 8, 300); c.lineTo(x + 20, 320); c.fill(); glow(x, 330, 90, 'rgba(255,200,120,.25)'); });
  // bar counter
  rect(60, 330, 680, 20, '#a8673a'); rect(60, 350, 680, 80, '#5a3420'); for (let x = 80; x < 740; x += 60) rect(x, 360, 40, 60, '#6b4429');
  // drinks on counter
  [[150, '#f2b632'], [330, '#7ef9ff'], [520, '#e56b8f']].forEach(([x, col]) => { rect(x, 312, 14, 18, 'rgba(255,255,255,.35)'); rect(x + 2, 318, 10, 12, col); });
  // stools
  [140, 280, 420, 560].forEach((x) => { ell(x, 450, 26, 8, '#d7263d'); rect(x - 4, 456, 8, 60, '#888'); ell(x, 518, 18, 5, '#666'); });
  // floor
  rect(0, 430, 1000, 170, '#2a1d1a');
  for (let y = 430; y < 600; y += 30) for (let x = (y / 30) % 2 ? 0 : 30; x < 1000; x += 60) rect(x, y, 30, 30, 'rgba(255,255,255,.04)');
  // arcade cabinet (Whack-the-Boss)
  rect(820, 250, 130, 260, '#d7263d'); rect(810, 240, 150, 30, '#ff5fc8');
  rect(836, 282, 98, 80, '#0b0b18');
  const bob = Math.round(Math.sin(T(t) * 4) * 4);
  rect(868, 312 + bob, 34, 30, '#f1c9a5'); rect(868, 304 + bob, 34, 10, '#3a2a1a'); rect(874, 322 + bob, 6, 4, '#000'); rect(890, 322 + bob, 6, 4, '#000'); rect(872, 316 + bob, 10, 3, '#000'); rect(888, 316 + bob, 10, 3, '#000'); rect(878, 334 + bob, 14, 3, '#000');
  rect(860, 342 + bob, 50, 20, '#2c3e66'); rect(882, 342 + bob, 6, 16, '#d7263d');
  rect(836, 380, 98, 30, '#222'); ell(860, 395, 8, 8, '#f2b632'); ell(890, 395, 8, 8, '#3bb273'); ell(915, 395, 8, 8, '#3f6fd8');
}

/* ------------------------------------------------ Bamboo Grove */
const BAMBOO = (() => { const r = rng(7); const layers = [[], [], []]; for (let l = 0; l < 3; l++) { const n = [22, 14, 8][l]; for (let i = 0; i < n; i++) layers[l].push({ x: r() * 1040 - 20, w: [8, 13, 20][l] + r() * 4, ph: r() * 6, nodes: 4 + Math.floor(r() * 3) }); } return layers; })();
function bamboo(t) {
  c.fillStyle = lg(0, 450, ['#e2f5d8', '#b0dfa8', '#7fca86']); c.fillRect(0, 0, 1000, 450);
  const cols = [['#a6d9a2', '#8cc489'], ['#4fae63', '#3c9450'], ['#21803f', '#176330']];
  BAMBOO.forEach((layer, l) => { const base = [430, 445, 470][l];
    layer.forEach((s) => { const sw = Math.sin(T(t) * .7 + s.ph) * (4 + l * 3);
      c.strokeStyle = cols[l][0]; c.lineWidth = s.w; c.beginPath(); c.moveTo(s.x, base); c.quadraticCurveTo(s.x, base / 2, s.x + sw, -10); c.stroke();
      c.strokeStyle = cols[l][1]; c.lineWidth = 3;
      for (let k = 1; k <= s.nodes; k++) { const f = k / (s.nodes + 1), y = base - f * (base + 10), x = s.x + sw * f * f; c.beginPath(); c.moveTo(x - s.w / 2, y); c.lineTo(x + s.w / 2, y); c.stroke();
        if (l > 0 && k % 2) for (let j = 0; j < 3; j++) ell(x + (j - 1) * 14 + 12, y - 6 - j * 3, 16, 4, l === 1 ? '#5fc06f' : '#2f9a4c', -.5 + j * .25); } });
    if (l === 0) { c.fillStyle = 'rgba(225,245,215,.4)'; c.fillRect(0, 0, 1000, 450); } });
  c.fillStyle = lg(430, 600, ['#9cc77a', '#6fa85a']); c.fillRect(0, 430, 1000, 170);
  const r = rng(3); for (let i = 0; i < 9; i++) { const y = 470 + i * 14, x = 140 + i * 90 + r() * 30; ell(x, y, 40 + i * 2, 10 + i, '#b7b9aa'); ell(x, y - 2, 36 + i * 2, 8 + i, '#d8dacd'); }
}

/* ------------------------------------------------ Lotus Pond */
const PADS = (() => { const r = rng(11), a = []; for (let i = 0; i < 16; i++) { const ang = r() * 6.28, rr = Math.sqrt(r()); a.push({ x: 500 + Math.cos(ang) * 420 * rr, y: 405 + Math.sin(ang) * 70 * rr, s: 12 + r() * 14, f: r() < .4 }); } return a; })();
function pond(t) {
  c.fillStyle = lg(0, 330, ['#6cc3f5', '#b7e3fb', '#eaf6ff']); c.fillRect(0, 0, 1000, 330);
  [['#9fc4d6', 250, 60], ['#7ba7bd', 285, 45], ['#5b8aa1', 315, 30]].forEach(([col, b, amp], i) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 340); for (let x = 0; x <= 1000; x += 20) c.lineTo(x, b - Math.abs(Math.sin(x * .006 + i * 2)) * amp); c.lineTo(1000, 340); c.fill(); });
  rect(0, 330, 1000, 270, '#d9c79c');
  c.save(); c.beginPath(); c.ellipse(500, 405, 480, 100, 0, 0, 7); c.clip();
  c.fillStyle = lg(305, 505, ['#4fb3c4', '#2a8a9d', '#1f6c7c']); c.fillRect(0, 300, 1000, 210);
  for (let k = 0; k < 5; k++) { const a = T(t) * (.12 + k * .03) + k * 1.4, rx = 330 - k * 45, ry = 62 - k * 8; const x = 500 + Math.cos(a) * rx, y = 410 + Math.sin(a) * ry;
    ell(x, y, 16, 6, k % 2 ? '#f08a3e' : '#f4efe6'); if (k % 2 === 0) ell(x + 3, y, 5, 4, '#e5652c'); }
  PADS.forEach((p) => { ell(p.x, p.y, p.s, p.s * .4, '#3f9a4a'); if (p.f) drawItem(c, 'lotus', p.x, p.y - 2, 4); });
  c.restore();
  c.strokeStyle = '#a7967a'; c.lineWidth = 8; c.beginPath(); c.ellipse(500, 405, 480, 100, 0, .02 * Math.PI, .98 * Math.PI); c.stroke();
  c.fillStyle = lg(490, 600, ['#d8c294', '#b39c6c']); c.beginPath(); c.moveTo(0, 600); c.lineTo(0, 470); c.quadraticCurveTo(500, 560, 1000, 470); c.lineTo(1000, 600); c.fill();
}

/* ------------------------------------------------ Lantern Bridge */
const STARS = (() => { const r = rng(42), a = []; for (let i = 0; i < 70; i++) a.push([r() * 1000, r() * 260, r() * 6]); return a; })();
function bridge(t) {
  c.fillStyle = lg(0, 360, ['#0d1431', '#251e4b', '#4a2d55']); c.fillRect(0, 0, 1000, 360);
  STARS.forEach(([x, y, p]) => { c.globalAlpha = RM ? .8 : .5 + Math.sin(t * 1.5 + p) * .4; rect(x, y, 4, 4, '#fff8e6'); }); c.globalAlpha = 1;
  glow(820, 90, 110, 'rgba(255,244,214,.3)'); ell(820, 90, 36, 36, '#f8efd6');
  c.fillStyle = '#1a1530'; c.beginPath(); c.moveTo(0, 330); for (let i = 0; i < 9; i++) { const x = i * 120, h = 250 + (i % 3) * 18; c.lineTo(x, 330); c.lineTo(x + 6, h + 14); c.lineTo(x + 60, h); c.lineTo(x + 114, h + 14); c.lineTo(x + 120, 330); } c.lineTo(1000, 360); c.lineTo(0, 360); c.fill();
  c.fillStyle = lg(330, 430, ['#1d2448', '#141936']); c.fillRect(0, 330, 1000, 100);
  for (let i = 0; i < 5; i++) { const x = ((i * 230 + T(t) * 12) % 1100) - 50, y = 360 + (i % 3) * 20; glow(x, y, 26, 'rgba(255,170,80,.6)'); rect(x - 6, y - 6, 12, 8, '#f7c46a'); }
  c.fillStyle = lg(420, 600, ['#6a4630', '#3c2416']); c.fillRect(0, 420, 1000, 180);
  rect(0, 398, 1000, 10, '#7c2b20'); rect(0, 418, 1000, 6, '#7c2b20'); for (let x = 0; x < 1000; x += 60) rect(x, 392, 10, 30, '#7c2b20');
  const sag = (x) => 120 + Math.sin(x / 1000 * Math.PI) * 50;
  c.strokeStyle = '#1e1414'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= 1000; x += 20) x ? c.lineTo(x, sag(x)) : c.moveTo(x, sag(x)); c.stroke();
  for (let i = 0; i < 9; i++) { const x = 60 + i * 110, y = sag(x) + Math.sin(T(t) * 1.2 + i) * 3; glow(x, y + 30, 60, 'rgba(255,120,70,.35)'); rect(x - 10, y + 10, 20, 5, '#e2b13c'); ell(x, y + 32, 20, 18, '#d7263d'); rect(x - 10, y + 48, 20, 5, '#e2b13c'); }
}

// Text drawn on the full-resolution stage (1000 x 667) so it stays readable.
export function drawOverlay(ctx, realm, t, reduceMotion) {
  if (realm !== 'bar') return;
  const Y = 667 / 600;
  const txt = (s, x, y, size, col, align = 'center', weight = '') => { ctx.font = `${weight} ${size}px "Pixelify Sans", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y * Y); };
  const flick = reduceMotion ? 1 : (Math.sin(t * 23) > .96 ? .45 : 1);
  ctx.save(); ctx.globalAlpha = flick; ctx.shadowColor = '#ff5fc8'; ctx.shadowBlur = 18;
  txt('GOSSIP BAR', 400, 72, 60, '#ffd1f1', 'center', '700'); ctx.restore();
  ctx.save(); ctx.shadowColor = '#7ef9ff'; ctx.shadowBlur = 10; txt('★ OPEN AFTER EVERY MEETING ★', 400, 120, 22, '#7ef9ff'); ctx.restore();
  ['TODAY’S SPECIALS', 'Venting ......... free', 'Hugs ............ free', '“Per my last email”', '  sour ............ $0'].forEach((s, i) => txt(s, 758, 168 + i * 16, 15, i ? '#f4f0e6' : '#f2b632', 'left', i ? '' : '600'));
  txt('WHACK-A-BOSS', 885, 255, 18, '#ffffff', 'center', '700');
  if (reduceMotion || Math.floor(t * 2) % 2) txt('PRESS START', 885, 294, 13, '#7ef9ff');
}

const SCENES = { chapel, masjid, mandir, tree, bar, bamboo, pond, bridge };
export const IMAGE_REALMS = new Set(['gate', 'hall']);

// Draw a procedural realm into `ctx`, already transformed to the 1000 x 600 design space.
export function drawProcedural(ctx, realm, t, offs, reduceMotion) {
  c = ctx; RM = reduceMotion;
  (SCENES[realm] || bamboo)(t, offs || []);
}

// Clickable spots, in the 1000 x 667 stage space.
export const HOTSPOTS = {
  gate: [{ x0: 384, y0: 365, x1: 612, y1: 540, act: 'enter:hall', label: 'Enter the hall' }],
  hall: [{ x0: 286, y0: 160, x1: 716, y1: 555, act: 'offer', label: 'Offer flowers' }],
  chapel: [{ x0: 760, y0: 290, x1: 940, y1: 460, act: 'offer', label: 'Light a candle' }, { x0: 370, y0: 280, x1: 630, y1: 460, act: 'offer', label: 'Light a candle' }],
  masjid: [{ x0: 400, y0: 90, x1: 600, y1: 445, act: 'offer', label: 'Make a dua' }],
  mandir: [{ x0: 330, y0: 20, x1: 670, y1: 470, act: 'offer', label: 'Make an offering' }],
  tree: [{ x0: 220, y0: 40, x1: 780, y1: 520, act: 'offer', label: 'Tie a ribbon' }],
  bar: [{ x0: 805, y0: 260, x1: 965, y1: 570, act: 'game', label: 'Play Whack-a-Boss' }],
};
