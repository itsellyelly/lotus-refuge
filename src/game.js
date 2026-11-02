// Whack-a-Boss: a 30-second pixel whack-a-mole. Bosses pop up from behind cubicle desks;
// bonk them with a foam mallet. Don't bonk your coworker friends.
import { drawMap } from './pixel.js';

const GW = 240, GH = 180, ROUND = 30;
const BOSS_LINES = ['Quick sync?', 'Per my last email', 'Stay late?', 'Circle back!', 'New priority!', 'Is it done yet?', 'Small ask…', 'Weekend?', 'Ping me', 'Let’s align'];
const PAL_LINES = ['Hi!', 'Coffee?', 'Got you!', 'Hey!'];

const FACE = [
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hffffffffh.',
  '.fbbffffbbf.',
  '.ffeffffeff.',
  '.ffffffffff.',
  '..fffmmfff..',
  '...ffffff...',
  '.ssssWWssss.',
  'ssssssTsssss',
  'ssssssTsssss',
  'ssssssTsssss',
];
const DIZZY = { 3: '.ffffffffff.', 4: '.fxfxffxfxf.' };
const SMILE = { 3: '.ffffffffff.', 6: '..fmffffmf..', 7: '...fmmmmf...' };
const KINDS = {
  boss: { pts: 10, pal: { h: '#2b2b2b', f: '#f1c9a5', b: '#1a1a1a', e: '#1a1a1a', m: '#7a2a2a', s: '#4a5878', W: '#ffffff', T: '#d7263d', x: '#1a1a1a' } },
  big: { pts: 30, pal: { h: '#bdbdbd', f: '#e8b98f', b: '#1a1a1a', e: '#1a1a1a', m: '#7a2a2a', s: '#d9a21b', W: '#ffffff', T: '#6b1a1a', x: '#1a1a1a' } },
  pal: { pts: -15, pal: { h: '#7a4a2a', f: '#f5d2b0', b: '#1a1a1a', e: '#1a1a1a', m: '#7a2a2a', s: '#3bb273', W: '#3bb273', T: '#3bb273', x: '#1a1a1a' } },
};

export function createGame(canvas, { onEnd, bossName = '' }) {
  canvas.width = GW; canvas.height = GH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let audio = null;
  const holes = [];
  for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) holes.push({ x: 14 + col * 76, y: 34 + r * 48, who: null });
  let state = 'ready', score = 0, combo = 0, left = ROUND, last = 0, spawnIn = 0, raf = 0, popups = [];

  function sound(kind) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), n = audio.currentTime;
      if (kind === 'bonk') { o.type = 'square'; o.frequency.setValueAtTime(520, n); o.frequency.exponentialRampToValueAtTime(140, n + .12); }
      else if (kind === 'oops') { o.type = 'sawtooth'; o.frequency.setValueAtTime(160, n); o.frequency.linearRampToValueAtTime(90, n + .25); }
      else { o.type = 'triangle'; o.frequency.setValueAtTime(660, n); o.frequency.setValueAtTime(880, n + .1); o.frequency.setValueAtTime(1320, n + .2); }
      g.gain.setValueAtTime(.12, n); g.gain.exponentialRampToValueAtTime(.001, n + (kind === 'end' ? .5 : .25));
      o.connect(g).connect(audio.destination); o.start(n); o.stop(n + .55);
    } catch { /* sound is optional */ }
  }

  function spawn(now) {
    const free = holes.filter((h) => !h.who);
    if (!free.length) return;
    const h = free[Math.floor(Math.random() * free.length)];
    const roll = Math.random();
    const kind = roll < .12 ? 'big' : roll < .3 ? 'pal' : 'boss';
    const speed = 1 - (ROUND - left) / ROUND; // 1 → 0 over the round
    const up = 650 + speed * 500 + (kind === 'big' ? -150 : 0);
    const lines = kind === 'pal' ? PAL_LINES : BOSS_LINES;
    h.who = { kind, born: now, up, hitAt: 0, line: lines[Math.floor(Math.random() * lines.length)] };
  }

  function rise(w, now) {
    const age = now - w.born, end = w.hitAt ? w.hitAt + 380 : w.born + w.up;
    if (age < 120) return age / 120;
    if (now > end) return Math.max(0, 1 - (now - end) / 120);
    return 1;
  }

  function hitTest(px, py, now) {
    if (state !== 'play') return;
    for (const h of holes) {
      const w = h.who; if (!w || w.hitAt) continue;
      if (rise(w, now) < .4) continue;
      if (px >= h.x && px <= h.x + 60 && py >= h.y - 8 && py <= h.y + 40) {
        w.hitAt = now;
        if (w.kind === 'pal') { score = Math.max(0, score - 15); combo = 0; sound('oops'); popups.push({ x: h.x + 30, y: h.y, t: now, text: 'OOPS -15', col: '#ff6b6b' }); }
        else { combo++; const pts = KINDS[w.kind].pts + Math.min(10, (combo - 1) * 2); score += pts; sound('bonk'); popups.push({ x: h.x + 30, y: h.y, t: now, text: (w.kind === 'big' ? 'BIG BONK +' : 'BONK +') + pts, col: w.kind === 'big' ? '#ffd23d' : '#ffffff' }); }
        return;
      }
    }
    combo = 0; // whiffed
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * GW, y = (e.clientY - r.top) / r.height * GH;
    if (state !== 'play') return;
    hitTest(x, y, performance.now());
    mallet = { x, y, t: performance.now() };
  }
  let mallet = null;
  canvas.addEventListener('pointerdown', pointer);

  function text(s, x, y, col = '#fff', size = 8, align = 'center') {
    ctx.font = `${size}px "Pixelify Sans", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  function drawPerson(h, w, now) {
    const r = rise(w, now); if (r <= 0) return;
    const rows = FACE.map((row, i) => {
      if (w.hitAt && w.kind !== 'pal' && DIZZY[i]) return DIZZY[i];
      if (w.kind === 'pal' && SMILE[i]) return SMILE[i];
      return row;
    });
    const bx = h.x + 18, by = h.y + 30 - Math.round(r * 28);
    ctx.save(); ctx.beginPath(); ctx.rect(h.x, h.y - 20, 64, 50); ctx.clip();
    drawMap(ctx, rows, KINDS[w.kind].pal, bx, by, 2);
    if (w.kind === 'big') drawMap(ctx, ['.y.y.y.', 'yyyyyyy'], { y: '#ffd23d' }, bx + 5, by - 4, 2);
    ctx.restore();
    if (w.hitAt && w.kind !== 'pal') { const a = (now - w.hitAt) / 90; for (let i = 0; i < 3; i++) { const ang = a + i * 2.1; ctx.fillStyle = '#ffd23d'; ctx.fillRect(Math.round(bx + 12 + Math.cos(ang) * 12), Math.round(by - 2 + Math.sin(ang) * 3), 2, 2); } }
    if (!w.hitAt && r === 1) {
      const label = w.kind === 'pal' ? w.line : (w.kind === 'boss' && bossName ? bossName + ': ' : '') + w.line;
      ctx.font = '8px "Pixelify Sans", monospace'; const tw = Math.min(110, ctx.measureText(label).width + 6);
      const lx = Math.max(2, Math.min(GW - tw - 2, h.x + 32 - tw / 2)), ly = by - 12;
      ctx.fillStyle = w.kind === 'pal' ? '#d6ffe4' : '#ffffff'; ctx.fillRect(lx, ly, tw, 11);
      ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, lx + 3, ly + 5, tw - 6);
    }
  }

  function draw(now) {
    // office backdrop
    ctx.fillStyle = '#2f3b52'; ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#3a4862'; for (let x = 0; x < GW; x += 24) ctx.fillRect(x, 18, 12, GH);
    ctx.fillStyle = '#c9d6e8'; for (let x = 8; x < GW; x += 40) ctx.fillRect(x, 20, 26, 8); // ceiling lights
    // HUD
    ctx.fillStyle = '#14141f'; ctx.fillRect(0, 0, GW, 16);
    text('SCORE ' + score, 6, 8, '#ffd23d', 8, 'left');
    text(combo > 1 ? 'COMBO x' + combo : '', GW / 2, 8, '#7ef9ff');
    text('TIME ' + Math.ceil(left), GW - 6, 8, left < 6 ? '#ff6b6b' : '#fff', 8, 'right');
    // holes: person behind, desk in front
    holes.forEach((h) => {
      ctx.fillStyle = '#5b6c8a'; ctx.fillRect(h.x - 2, h.y - 14, 68, 4); // cubicle wall top
      if (h.who) drawPerson(h, h.who, now);
      ctx.fillStyle = '#8b5a33'; ctx.fillRect(h.x, h.y + 22, 64, 6);
      ctx.fillStyle = '#6b4429'; ctx.fillRect(h.x + 2, h.y + 28, 60, 12);
      ctx.fillStyle = '#1b1b24'; ctx.fillRect(h.x + 44, h.y + 10, 16, 12); ctx.fillStyle = '#7ef9ff'; ctx.fillRect(h.x + 46, h.y + 12, 12, 8); ctx.fillStyle = '#1b1b24'; ctx.fillRect(h.x + 50, h.y + 22, 4, 2);
      ctx.fillStyle = '#f4f0e6'; ctx.fillRect(h.x + 6, h.y + 16, 6, 6); ctx.fillStyle = '#6b3a1a'; ctx.fillRect(h.x + 7, h.y + 17, 4, 2); // mug
    });
    // popups
    popups = popups.filter((p) => now - p.t < 700);
    popups.forEach((p) => text(p.text, p.x, p.y - (now - p.t) / 30, p.col, 8));
    // foam mallet
    if (mallet && now - mallet.t < 160) {
      const { x, y } = mallet; ctx.fillStyle = '#ff5fc8'; ctx.fillRect(Math.round(x) - 8, Math.round(y) - 12, 16, 9); ctx.fillStyle = '#ffd1f1'; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 11, 4, 7);
      ctx.fillStyle = '#e8a33d'; ctx.fillRect(Math.round(x) + 6, Math.round(y) - 6, 12, 3);
    }
    if (state === 'ready') overlay('WHACK-A-BOSS', 'Tap START. Bonk bosses, not friends.');
    if (state === 'over') overlay('TIME!', 'You scored ' + score);
  }
  function overlay(title, sub) {
    ctx.fillStyle = 'rgba(10,10,20,.72)'; ctx.fillRect(0, 0, GW, GH);
    text(title, GW / 2, GH / 2 - 14, '#ff5fc8', 16);
    text(sub, GW / 2, GH / 2 + 8, '#fff', 8);
  }

  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (state === 'play') {
      left -= dt;
      spawnIn -= dt * 1000;
      if (spawnIn <= 0) { spawn(now); spawnIn = 380 + Math.random() * 420 - (ROUND - left) * 6; }
      holes.forEach((h) => { if (h.who && rise(h.who, now) <= 0 && now - h.who.born > 200) { if (!h.who.hitAt && h.who.kind !== 'pal') combo = 0; h.who = null; } });
      if (left <= 0) { left = 0; state = 'over'; holes.forEach((h) => (h.who = null)); sound('end'); onEnd(score); }
    }
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  last = performance.now(); raf = requestAnimationFrame(loop);

  return {
    start() { score = 0; combo = 0; left = ROUND; spawnIn = 400; popups = []; holes.forEach((h) => (h.who = null)); state = 'play'; },
    get playing() { return state === 'play'; },
    setBossName(n) { bossName = n; },
    destroy() { cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', pointer); },
  };
}
