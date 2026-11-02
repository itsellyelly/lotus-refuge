import './style.css';
import { W, H, P, REALMS, realmById, PLACES, itemOf, MOODS, ROBES, robe, HOMES, REACTIONS } from './config.js';
import { drawPerson, drawItem } from './pixel.js';
import { drawProcedural, drawOverlay, IMAGE_REALMS, HOTSPOTS } from './scenes.js';
import { createGame } from './game.js';
import * as data from './data.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const ls = {
  get(k, d) { try { const v = localStorage.getItem('lotus.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lotus.' + k, JSON.stringify(v)); } catch { /* optional */ } },
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const ts = (iso) => new Date(iso).getTime();
function ago(t) { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
const clock = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
let toastTimer;
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (e.hidden = true), 3400); }
function errText(e) {
  const m = (e && (e.message || e.error_description)) || '';
  if (/invite code not found/i.test(m)) return 'That invite code didn’t match a circle. Ask your friend for a fresh link.';
  if (/row-level security|permission/i.test(m)) return 'You’re not a member of this circle anymore.';
  if (/fetch|network/i.test(m)) return 'Couldn’t reach the server. Check your connection and try again.';
  return m || 'Something went wrong. Try again.';
}

/* ================================================================ state */
const S = {
  uid: null, defaultName: '',
  circles: [], circle: null, api: null,
  members: new Map(), messages: [], offerings: [], reactions: [], scores: [], peers: [],
  realm: 'gate', me: { x: 500, y: 620, tx: 500, ty: 620, moving: 0, back: false },
  peerPos: new Map(), flying: [], tab: ls.get('tab', 'chat'), sound: ls.get('sound', true),
};
const meRow = () => S.members.get(S.uid) || S.circle?.me || {};
const myNick = () => meRow().nickname || 'You';
const myRobe = () => meRow().robe ?? 0;

/* ================================================================ sound */
let actx = null;
function bell() {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const n = actx.currentTime;
    [[1, .5, 4.5], [2.76, .22, 3], [5.4, .1, 1.8]].forEach(([m, g, d]) => {
      const o = actx.createOscillator(), v = actx.createGain(); o.type = 'sine'; o.frequency.value = 196 * m;
      v.gain.setValueAtTime(0, n); v.gain.linearRampToValueAtTime(g * .5, n + .01); v.gain.exponentialRampToValueAtTime(.0001, n + d);
      o.connect(v).connect(actx.destination); o.start(n); o.stop(n + d + .1);
    });
  } catch { /* optional */ }
}
function syncSound() { $('soundBtn').textContent = S.sound ? 'Sound on' : 'Sound off'; $('soundBtn').setAttribute('aria-pressed', String(S.sound)); }
$('soundBtn').onclick = () => { S.sound = !S.sound; ls.set('sound', S.sound); syncSound(); if (S.sound) bell(); };

/* ================================================================ canvas */
const cvs = $('scene');
const ctx = cvs.getContext('2d');
const buf = document.createElement('canvas'); buf.width = 256; buf.height = 171;
const bctx = buf.getContext('2d');
const images = {};
REALMS.filter((r) => r.image).forEach((r) => { const img = new Image(); img.src = r.image; images[r.id] = img; });
let scale = 1, dpr = 1;
function resize() { const r = cvs.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2, window.devicePixelRatio || 1); cvs.width = Math.round(r.width * dpr); cvs.height = Math.round(r.height * dpr); scale = r.width / W; }
new ResizeObserver(resize).observe($('stage'));

const placeOffs = (place) => S.offerings.filter((o) => o.place === place);

function drawHallOfferings() {
  const offs = placeOffs('hall').slice(-16);
  offs.forEach((o, i) => {
    const side = i % 2, k = Math.floor(i / 2), row = Math.floor(k / 4), col = k % 4;
    const x = side ? 562 + col * 30 + row * 15 : 438 - col * 30 - row * 15;
    const y = 560 + row * 14;
    drawItem(ctx, o.item, x, y, P * .9);
  });
}

function onlineIds() { return new Set(S.peers.map((p) => p.uid || p.key)); }
function bubbleFor(uid) {
  const now = Date.now();
  for (let i = S.messages.length - 1; i >= 0; i--) {
    const m = S.messages[i]; const t = ts(m.created_at);
    if (now - t > 12000) break;
    if (m.user_id === uid && (m.kind === 'msg' || m.kind === 'vent') && m.realm === S.realm) return m.body;
  }
  return null;
}
function label(x, y, text, mine) {
  ctx.font = '600 15px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = Math.ceil(ctx.measureText(text).width) + 12;
  ctx.fillStyle = mine ? 'rgba(215,38,61,.95)' : 'rgba(10,20,20,.78)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y + 4), w, 20);
  ctx.fillStyle = '#fff'; ctx.fillText(text, x, y + 14.5);
}
function bubble(x, topY, text) {
  ctx.font = '15px "DotGothic16", monospace'; const s = text.length > 38 ? text.slice(0, 36) + '…' : text;
  const w = Math.min(320, Math.ceil(ctx.measureText(s).width) + 18);
  const bx = Math.max(4, Math.min(W - w - 4, x - w / 2)), by = topY - 40;
  ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, w + 4, 30); ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, w, 26);
  ctx.fillRect(Math.round(x - 4), by + 26, 8, 6); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, bx + w / 2, by + 14);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (IMAGE_REALMS.has(S.realm)) {
    const img = images[S.realm];
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, W, H); else { ctx.fillStyle = '#0d2423'; ctx.fillRect(0, 0, W, H); }
    if (S.realm === 'hall') drawHallOfferings();
  } else {
    bctx.setTransform(256 / 1000, 0, 0, 171 / 600, 0, 0);
    bctx.imageSmoothingEnabled = false;
    drawProcedural(bctx, S.realm, t, placeOffs(realmById(S.realm).place), reduceMotion);
    ctx.drawImage(buf, 0, 0, W, H);
    drawOverlay(ctx, S.realm, t, reduceMotion);
  }

  const people = [];
  const online = onlineIds();
  // friends who last checked in here but aren't online: shown faded where they left off
  S.members.forEach((m, uid) => {
    if (uid === S.uid || online.has(uid) || m.realm !== S.realm || !m.checked_in_at) return;
    const w = realmById(S.realm).walk, h = hash(uid);
    people.push({ x: w[0] + 30 + (h % (w[1] - w[0] - 60)), y: w[2] + ((h >> 9) % Math.max(1, w[3] - w[2])), seed: h, robe: m.robe, alpha: .5, back: false, frame: 0, text: m.nickname + ' · ' + ago(ts(m.checked_in_at)) });
  });
  // live friends
  S.peers.forEach((p) => {
    if (p.realm !== S.realm || typeof p.x !== 'number' || typeof p.y !== 'number') return;
    let pos = S.peerPos.get(p.key); if (!pos) { pos = { x: p.x, y: p.y, moving: 0, back: false }; S.peerPos.set(p.key, pos); }
    const dx = p.x - pos.x, dy = p.y - pos.y, d = Math.hypot(dx, dy), step = 230 * dt;
    if (d > step) { pos.x += dx / d * step; pos.y += dy / d * step; pos.moving += dt; pos.back = dy < -1; } else { pos.x = p.x; pos.y = p.y; pos.moving = 0; }
    const uid = p.uid || p.key; const m = S.members.get(uid);
    const nick = (m && m.nickname) || (typeof p.nick === 'string' ? p.nick.slice(0, 24) : 'Friend');
    people.push({ x: pos.x, y: pos.y, seed: hash(uid), robe: m ? m.robe : (p.robe | 0), back: pos.back, frame: pos.moving ? 1 + (Math.floor(pos.moving * 8) % 2) : 0, text: nick, say: bubbleFor(uid) });
  });
  // me
  const me = S.me, dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy), step = 230 * dt;
  if (d > step) { me.x += dx / d * step; me.y += dy / d * step; me.moving += dt; me.back = dy < -1; } else { me.x = me.tx; me.y = me.ty; me.moving = 0; me.back = false; }
  people.push({ x: me.x, y: me.y, seed: hash(S.uid || 'me'), robe: myRobe(), back: me.back, frame: me.moving ? 1 + (Math.floor(me.moving * 8) % 2) : 0, text: myNick() + ' (you)', mine: true, say: bubbleFor(S.uid) });

  people.sort((a, b) => a.y - b.y).forEach((p) => {
    const top = drawPerson(ctx, p.x, p.y, { seed: p.seed, robeIdx: p.robe, back: p.back, frame: p.frame, alpha: p.alpha ?? 1, u: P });
    ctx.globalAlpha = p.alpha ?? 1; label(p.x, p.y, p.text, p.mine); ctx.globalAlpha = 1;
    if (p.say) bubble(p.x, top, p.say);
  });

  // offerings in flight
  S.flying = S.flying.filter((f) => {
    const k = Math.min(1, (now - f.start) / 1300), e = 1 - Math.pow(1 - k, 3);
    const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 90;
    if (f.color) { ctx.fillStyle = f.color; ctx.fillRect(x - 6, y - 12, 10, 24); } else drawItem(ctx, f.item, x, y, P * 1.6);
    return k < 1;
  });
  if (!document.hidden) requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });

function toLogical(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function hotspotAt(x, y) { return (HOTSPOTS[S.realm] || []).find((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1); }
cvs.addEventListener('pointermove', (e) => { const [x, y] = toLogical(e); const h = hotspotAt(x, y); cvs.style.cursor = h ? 'pointer' : 'default'; $('hint').textContent = h ? h.label : 'Tap the ground to walk'; });
cvs.addEventListener('click', (e) => {
  const [x, y] = toLogical(e); const h = hotspotAt(x, y);
  if (h) { runAction(h.act); return; }
  walkTo(x, y);
});
function clampWalk(x, y) { const w = realmById(S.realm).walk; return [Math.min(w[1], Math.max(w[0], x)), Math.min(w[3], Math.max(w[2], y))]; }
function walkTo(x, y) { [S.me.tx, S.me.ty] = clampWalk(x, y); sendPresence(); }
function sendPresence() { S.api?.track({ realm: S.realm, x: Math.round(S.me.tx), y: Math.round(S.me.ty), nick: myNick(), robe: myRobe(), uid: S.uid }); }
function runAction(act) {
  if (act === 'offer') openOffer();
  else if (act === 'game') openGame();
  else if (act.startsWith('enter:')) enterRealm(act.slice(6));
}

/* ================================================================ realms UI */
function renderGates() {
  const g = $('gates'); g.textContent = '';
  const counts = {}; S.peers.forEach((p) => { if (typeof p.realm === 'string') counts[p.realm] = (counts[p.realm] || 0) + 1; }); counts[S.realm] = (counts[S.realm] || 0) + 1;
  let group = '';
  REALMS.forEach((r) => {
    if (r.group !== group) { group = r.group; g.append(el('span', 'gate-group', group)); }
    const b = el('button', 'gate'); b.type = 'button'; b.setAttribute('aria-pressed', String(r.id === S.realm));
    b.append(el('span', 'g-mark', r.zh || r.mark));
    const t = el('span'); t.append(el('span', 'g-name', r.name)); const n = counts[r.id] || 0; t.append(el('span', 'g-count', n ? n + ' here now' : 'quiet')); b.append(t);
    b.onclick = () => enterRealm(r.id); g.append(b);
  });
}
function enterRealm(id) {
  S.realm = realmById(id).id; ls.set('realm', S.realm);
  const w = realmById(S.realm).walk;
  S.me.x = S.me.tx = (w[0] + w[1]) / 2 + (Math.random() - .5) * 160; S.me.y = S.me.ty = w[3] - 10;
  S.peerPos.clear(); sendPresence(); renderRealm(); renderGates();
}
function renderRealm() {
  const r = realmById(S.realm); $('realmTitle').textContent = r.name; $('realmBlurb').textContent = r.blurb;
  const a = $('actions'); a.textContent = '';
  const add = (text, fn, primary) => { const b = el('button', 'btn' + (primary ? ' primary' : ''), text); b.type = 'button'; b.onclick = fn; a.append(b); };
  if (r.id === 'gate') add('Enter the hall', () => enterRealm('hall'), true);
  if (r.place) add(PLACES[r.place].action, openOffer, true);
  if (r.id === 'hall' || r.id === 'mandir') add('Ring the bell', () => { bell(); if (!S.sound) toast('Turn sound on to hear the bell'); });
  if (r.id === 'bar') { add('Play Whack-a-Boss', openGame, true); add('Post a vent', () => { setTab('vents'); $('chatInput').focus(); }); }
  add('Check in here', openCheckin, !r.place && r.id !== 'bar' && r.id !== 'gate');
}

/* ================================================================ sidebar */
function avatar(uid, cls = 'av') {
  const m = S.members.get(uid); const a = el('div', cls);
  a.style.background = robe(m ? m.robe : 0); a.textContent = ((m && m.nickname) || '?').charAt(0).toUpperCase(); return a;
}
const nickOf = (uid) => (S.members.get(uid) || {}).nickname || 'Former member';

function renderChat() {
  const p = $('chatPanel'); const nearBottom = p.scrollHeight - p.scrollTop - p.clientHeight < 80; p.textContent = '';
  const list = S.messages.filter((m) => m.kind !== 'vent');
  if (!list.length) { const e = el('div', 'empty'); e.append(el('span', 'big', 'Say hi')); e.append(el('div', null, 'No messages yet. Tell the circle how today went, or check in at a space so friends know where to find you.')); p.append(e); return; }
  list.forEach((m) => {
    const row = el('div', 'msg' + (m.kind === 'msg' ? '' : ' event')); row.append(avatar(m.user_id));
    const col = el('div'); col.style.minWidth = '0';
    const meta = el('div', 'meta'); meta.append(el('span', 'who', nickOf(m.user_id))); meta.append(el('span', 'tag', realmById(m.realm).name)); meta.append(el('span', null, clock(ts(m.created_at)))); col.append(meta);
    const body = el('div', 'body');
    if (m.kind === 'checkin') { body.textContent = 'Checked in at ' + realmById(m.realm).name + (m.mood ? ' · ' + m.mood : '') + (m.body ? '\n“' + m.body + '”' : ''); }
    else if (m.kind === 'offering') { const pl = PLACES[m.place]; const it = itemOf(m.place, m.item); body.textContent = pl ? `${pl.verb} ${it.name.toLowerCase()} · ${pl.name}` + (m.body ? '\n“' + m.body + '”' : '') : 'Made an offering'; }
    else body.textContent = m.body || '';
    col.append(body); row.append(col); p.append(row);
  });
  if (nearBottom || !renderChat.done) { p.scrollTop = p.scrollHeight; renderChat.done = true; }
}

function renderVents() {
  const p = $('ventPanel'); p.textContent = '';
  const intro = el('p', 'muted small', 'Vent about work here. Only people in this circle can read it. Friends can react.'); p.append(intro);
  const vents = S.messages.filter((m) => m.kind === 'vent').slice().reverse();
  if (!vents.length) { const e = el('div', 'empty'); e.append(el('span', 'big', 'Spill it')); e.append(el('div', null, 'Nobody has vented yet. Type below and hit Send. Bonus points for “per my last email”.')); p.append(e); return; }
  vents.forEach((m) => {
    const card = el('div', 'vent');
    const meta = el('div', 'meta'); meta.append(el('span', 'who', nickOf(m.user_id))); meta.append(el('span', null, ago(ts(m.created_at)))); card.append(meta);
    card.append(el('div', 'body', m.body || ''));
    const rx = el('div', 'reacts');
    REACTIONS.forEach((r) => {
      const who = S.reactions.filter((x) => x.message_id === m.id && x.reaction === r.id);
      const mine = who.some((x) => x.user_id === S.uid);
      const b = el('button', 'react', `${r.glyph} ${r.label}${who.length ? ' · ' + who.length : ''}`); b.type = 'button'; b.setAttribute('aria-pressed', String(mine));
      b.title = who.map((x) => nickOf(x.user_id)).join(', ');
      b.onclick = async () => { b.disabled = true; try { await S.api.react(m.id, r.id, !mine); } catch (e) { toast(errText(e)); } finally { b.disabled = false; } };
      rx.append(b);
    });
    card.append(rx); p.append(card);
  });
}

function renderWho() {
  const p = $('whoPanel'); p.textContent = '';
  const live = new Map(S.peers.map((x) => [x.uid || x.key, x]));
  p.append(el('div', 'section-h', 'You'));
  p.append(personRow(S.uid, meRow(), { realm: S.realm }, true));
  p.append(el('div', 'section-h', 'Your circle'));
  const others = [...S.members.values()].filter((m) => m.user_id !== S.uid)
    .sort((a, b) => (live.has(b.user_id) - live.has(a.user_id)) || ((b.checked_in_at ? ts(b.checked_in_at) : 0) - (a.checked_in_at ? ts(a.checked_in_at) : 0)));
  if (!others.length) { const e = el('div', 'empty'); e.style.padding = '20px 8px'; e.textContent = 'It’s just you so far. Use “Invite friends” at the top to send your circle a link.'; p.append(e); return; }
  others.forEach((m) => p.append(personRow(m.user_id, m, live.get(m.user_id), live.has(m.user_id))));
}
function personRow(uid, m, liveP, on) {
  const row = el('div', 'person'); const av = avatar(uid); if (on) av.append(el('span', 'on')); row.append(av);
  const col = el('div'); col.style.minWidth = '0';
  const l1 = el('div', 'l1'); l1.append(document.createTextNode(m.nickname || 'Friend')); if (liveP && typeof liveP.realm === 'string') l1.append(el('span', null, 'now in ' + realmById(liveP.realm).name)); col.append(l1);
  if (m.checked_in_at) { const l2 = el('div', 'l2'); l2.append(document.createTextNode('Checked in at ' + realmById(m.realm).name + ' · ' + ago(ts(m.checked_in_at)) + ' ')); if (m.mood) l2.append(el('span', 'mood', m.mood)); col.append(l2); if (m.note) col.append(el('div', 'note', '“' + m.note + '”')); }
  else col.append(el('div', 'l2', 'No check-in yet'));
  row.append(col); return row;
}

function setTab(t) {
  S.tab = t; ls.set('tab', t);
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $('chatPanel').hidden = t !== 'chat'; $('ventPanel').hidden = t !== 'vents'; $('whoPanel').hidden = t !== 'who';
  $('composer').hidden = t === 'who';
  $('chatInput').placeholder = t === 'vents' ? 'What did the boss do now?' : 'Check in with the circle…';
  $('sendBtn').textContent = t === 'vents' ? 'Vent' : 'Send';
  if (t === 'chat') renderChat(); else if (t === 'vents') renderVents(); else renderWho();
}
document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
setInterval(() => { if (S.tab === 'who') renderWho(); }, 60000);

$('composer').addEventListener('submit', async (e) => {
  e.preventDefault(); const ta = $('chatInput'); const body = ta.value.trim().slice(0, 500); if (!body || !S.api) return;
  ta.value = '';
  try { await S.api.post({ kind: S.tab === 'vents' ? 'vent' : 'msg', realm: S.tab === 'vents' ? 'bar' : S.realm, body }); }
  catch (err) { ta.value = body; toast(errText(err)); }
});
$('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('composer').requestSubmit(); } });

/* ================================================================ sheets */
function openSheet(id) { $(id).hidden = false; const f = $(id).querySelector('input:not([readonly]),textarea,.btn.primary'); if (f) setTimeout(() => f.focus(), 30); }
function closeSheets() { document.querySelectorAll('.overlay').forEach((o) => { if (o.id === 'onboardSheet' && !S.circles.length && data.configured) return; o.hidden = true; }); if (game && game.playing === false) { /* keep instance */ } }
document.querySelectorAll('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o || e.target.hasAttribute('data-close')) closeSheets(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

function swatchGroup(container, get, set) {
  container.textContent = '';
  ROBES.forEach((c, i) => { const b = el('button', 'sw'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + (i + 1)); b.style.background = c;
    b.onclick = () => { set(i); sync(); }; container.append(b); });
  const sync = () => [...container.children].forEach((b, i) => b.setAttribute('aria-checked', String(i === get())));
  sync(); return sync;
}
function fillHomes(select, value) {
  select.textContent = ''; const none = el('option', null, 'No preference (Temple Gate)'); none.value = ''; select.append(none);
  HOMES.forEach((h) => { const o = el('option', null, h.label); o.value = h.id; select.append(o); }); select.value = value || '';
}

// --- offering
let picked = null;
function itemIcon(place, it) {
  const c = document.createElement('canvas'); c.width = 40; c.height = 40; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (place === 'tree') { x.fillStyle = it.color; x.fillRect(12, 6, 16, 6); x.fillRect(14, 12, 6, 22); x.fillRect(22, 12, 6, 16); }
  else if (place === 'masjid') drawItem(x, 'lamp', 20, 34, 5);
  else drawItem(x, it.id, 20, 34, 5);
  return c;
}
function openOffer() {
  const place = realmById(S.realm).place; if (!place) return;
  const pl = PLACES[place]; picked = pl.items[0].id;
  $('offerH').textContent = pl.title; $('offerSub').textContent = pl.sub; $('offerGo').textContent = pl.action;
  $('wish').value = ''; $('wish').placeholder = pl.placeholder;
  const wrap = $('itemPick'); wrap.textContent = '';
  pl.items.forEach((it) => { const b = el('button', 'item'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = it.id;
    const t = el('span'); t.append(el('b', null, it.name)); t.append(el('small', null, it.note)); b.append(itemIcon(place, it), t);
    b.onclick = () => { picked = it.id; syncItems(); }; wrap.append(b); });
  syncItems();
  $('offerForm').hidden = false; $('offerDone').hidden = true; openSheet('offerSheet');
  walkTo(500, realmById(S.realm).walk[2] + 5);
}
function syncItems() { document.querySelectorAll('#itemPick .item').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === picked))); }
const TARGET = { hall: [500, 560], chapel: [850, 340], masjid: [500, 110], mandir: [500, 455], tree: [500, 270] };
$('offerGo').onclick = async () => {
  const place = realmById(S.realm).place; const pl = PLACES[place];
  const wish = $('wishShare').checked ? $('wish').value.trim().slice(0, 160) : '';
  const btn = $('offerGo'); btn.disabled = true;
  try {
    await S.api.offer({ place, item: picked, wish: wish || null, realm: S.realm });
    const it = itemOf(place, picked); const [tx, ty] = TARGET[place];
    S.flying.push({ item: place === 'masjid' ? 'lamp' : picked, color: place === 'tree' ? it.color : null, x0: S.me.x, y0: S.me.y - 60, x1: tx, y1: ty, start: performance.now() });
    $('doneH').textContent = pl.done; $('doneSub').textContent = pl.doneSub;
    $('blessing').textContent = pl.blessing; $('blessing').lang = place === 'masjid' ? 'ar' : place === 'mandir' ? 'hi' : place === 'hall' ? 'zh' : 'en';
    $('blessing').dir = place === 'masjid' ? 'rtl' : 'ltr';
    $('blessingEn').textContent = pl.blessingEn;
    $('offerForm').hidden = true; $('offerDone').hidden = false;
    if (place === 'hall' || place === 'mandir') bell();
  } catch (e) { toast(errText(e)); } finally { btn.disabled = false; }
};

// --- check-in
let mood = MOODS[2];
(function buildMoods() { const w = $('moods'); MOODS.forEach((m) => { const b = el('button', 'moodbtn', m); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.m = m; b.onclick = () => { mood = m; syncMood(); }; w.append(b); }); })();
function syncMood() { document.querySelectorAll('#moods .moodbtn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.m === mood))); }
function openCheckin() { $('checkRealm').textContent = realmById(S.realm).name; $('checkNote').value = ''; syncMood(); openSheet('checkSheet'); }
$('checkGo').onclick = async () => {
  const btn = $('checkGo'); btn.disabled = true;
  try { await S.api.checkIn({ realm: S.realm, mood, note: $('checkNote').value.trim().slice(0, 140) || null }); closeSheets(); toast('Checked in at ' + realmById(S.realm).name); }
  catch (e) { toast(errText(e)); } finally { btn.disabled = false; }
};

// --- me
let meRobe = 0; let syncMeSw = () => {};
$('meChip').onclick = () => { $('leaveBtn').hidden = !data.configured; $('nickInput').value = myNick(); meRobe = myRobe(); syncMeSw = swatchGroup($('swatches'), () => meRobe, (i) => (meRobe = i)); fillHomes($('homeInput'), meRow().home_realm); openSheet('meSheet'); };
$('meSave').onclick = async () => {
  const nickname = $('nickInput').value.trim().slice(0, 24) || myNick();
  try { await S.api.updateMe({ nickname, robe: meRobe, home_realm: $('homeInput').value || null }); closeSheets(); renderMe(); sendPresence(); toast('Saved'); }
  catch (e) { toast(errText(e)); }
};
$('leaveBtn').onclick = async () => {
  if ($('leaveBtn').dataset.confirm !== '1') { $('leaveBtn').dataset.confirm = '1'; $('leaveBtn').textContent = 'Tap again to leave'; setTimeout(() => { $('leaveBtn').dataset.confirm = ''; $('leaveBtn').textContent = 'Leave this circle'; }, 4000); return; }
  try { await data.leaveCircle(S.circle.id, S.uid); closeSheets(); toast('You left ' + S.circle.name); await loadCircles(); }
  catch (e) { toast(errText(e)); }
};
function renderMe() { $('meName').textContent = myNick(); $('meDot').style.background = robe(myRobe()); }

// --- invite
$('inviteBtn').onclick = () => {
  if (!S.circle) return;
  const link = location.origin + '/?join=' + S.circle.invite_code;
  $('inviteCircle').textContent = S.circle.name; $('inviteLink').value = link; $('inviteCode').textContent = S.circle.invite_code;
  $('rotateInvite').hidden = meRow().role !== 'owner' && S.circle.role !== 'owner';
  openSheet('inviteSheet');
};
$('copyInvite').onclick = async () => { const i = $('inviteLink'); try { await navigator.clipboard.writeText(i.value); toast('Invite link copied'); } catch { i.select(); toast('Press Ctrl+C or Cmd+C to copy'); } };
$('rotateInvite').onclick = async () => {
  try { const code = await data.rotateInvite(S.circle.id); S.circle.invite_code = code; $('inviteBtn').onclick(); toast('New link made. The old one no longer works.'); }
  catch (e) { toast(errText(e)); }
};
$('newCircleBtn').onclick = () => { closeSheets(); openOnboard('create'); };

// --- onboarding: create or join a circle
let obMode = 'create', obRobe = Math.floor(Math.random() * ROBES.length);
function openOnboard(mode, code = '') {
  if (!data.configured) { toast('Creating and joining circles needs Supabase. This is the demo.'); return; }
  obMode = mode; $('obErr').hidden = true;
  $('obNick').value = $('obNick').value || S.defaultName || '';
  $('joinCode').value = code; swatchGroup($('obSwatches'), () => obRobe, (i) => (obRobe = i)); fillHomes($('obHome'), '');
  $('obCancel').hidden = !S.circles.length; syncOb();
  if (mode === 'join' && code) $('obNick').focus(); openSheet('onboardSheet');
}
function syncOb() {
  document.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === obMode)));
  $('createFields').hidden = obMode !== 'create'; $('joinFields').hidden = obMode !== 'join';
  $('onboardH').textContent = obMode === 'create' ? 'Start your circle' : 'Join a circle';
  $('obGo').textContent = obMode === 'create' ? 'Create circle' : 'Join circle';
}
document.querySelectorAll('.seg-btn').forEach((b) => (b.onclick = () => { obMode = b.dataset.mode; syncOb(); }));
const parseCode = (v) => { const m = String(v).match(/join=([A-Za-z0-9]+)/); return (m ? m[1] : String(v)).trim(); };
$('obGo').onclick = async () => {
  const nickname = $('obNick').value.trim().slice(0, 24); const err = $('obErr');
  if (!nickname) { err.textContent = 'Add the name your friends will see.'; err.hidden = false; return; }
  const btn = $('obGo'); btn.disabled = true; err.hidden = true;
  try {
    let c;
    if (obMode === 'create') {
      const name = $('circleName').value.trim().slice(0, 40); if (!name) { err.textContent = 'Give your circle a name.'; err.hidden = false; return; }
      c = await data.createCircle({ name, nickname, robe: obRobe, home: $('obHome').value });
    } else {
      const code = parseCode($('joinCode').value); if (!code) { err.textContent = 'Paste the invite code or link.'; err.hidden = false; return; }
      c = await data.joinCircle({ code, nickname, robe: obRobe });
      const home = $('obHome').value; if (home) await data.supabase.from('circle_members').update({ home_realm: home }).eq('circle_id', c.id).eq('user_id', S.uid);
    }
    ls.set('circle', c.id); $('onboardSheet').hidden = true; await loadCircles(c.id);
  } catch (e) { err.textContent = errText(e); err.hidden = false; } finally { btn.disabled = false; }
};

// --- game
let game = null;
function openGame() {
  openSheet('gameSheet');
  if (!game) {
    game = createGame($('gameCanvas'), { bossName: ls.get('bossName', ''), onEnd: async (score) => {
      $('gameStart').textContent = 'Play again';
      if (score > 0) { try { await S.api.submitScore(score); toast('Score posted to the circle: ' + score); } catch (e) { toast(errText(e)); } }
    } });
  }
  $('bossName').value = ls.get('bossName', '');
  renderBoard();
}
$('gameStart').onclick = () => { game?.start(); $('gameCanvas').focus?.(); };
$('bossName').addEventListener('input', () => { const v = $('bossName').value.slice(0, 14); ls.set('bossName', v); game?.setBossName(v); });
function renderBoard() {
  const ol = $('leaderboard'); ol.textContent = '';
  const best = new Map(); S.scores.forEach((s) => { if (!best.has(s.user_id) || best.get(s.user_id) < s.score) best.set(s.user_id, s.score); });
  const rows = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!rows.length) { ol.append(el('li', 'muted', 'No scores yet. Be the first to bonk.')); return; }
  rows.forEach(([uid, sc]) => { const li = el('li'); li.append(document.createTextNode(nickOf(uid) + (uid === S.uid ? ' (you)' : ''))); li.append(el('b', null, String(sc))); ol.append(li); });
}

/* ================================================================ circles & session */
function setStatus(t) { const s = $('status'); s.textContent = t || ''; s.hidden = !t; }
function renderCircleSelect() {
  const s = $('circleSelect'); s.textContent = '';
  S.circles.forEach((c) => { const o = el('option', null, c.name); o.value = c.id; s.append(o); });
  const add = el('option', null, '+ Create or join a circle'); add.value = '__new'; s.append(add);
  if (S.circle) s.value = S.circle.id;
}
$('circleSelect').onchange = (e) => {
  const v = e.target.value;
  if (v === '__new') { e.target.value = S.circle?.id || ''; openOnboard('create'); return; }
  const c = S.circles.find((x) => x.id === v); if (c) enterCircle(c);
};

function enterCircle(c) {
  S.api?.close();
  S.circle = c; ls.set('circle', c.id);
  S.members = new Map([[S.uid, { ...c.me, user_id: S.uid }]]); S.messages = []; S.offerings = []; S.reactions = []; S.scores = []; S.peers = []; S.peerPos.clear();
  renderChat.done = false;
  S.api = data.openCircle(c, S.uid, {
    members: (list) => { S.members = new Map(list.map((m) => [m.user_id, m])); renderMe(); if (S.tab === 'who') renderWho(); else if (S.tab === 'chat') renderChat(); else renderVents(); },
    messages: (list) => { S.messages = list; if (S.tab === 'chat') renderChat(); if (S.tab === 'vents') renderVents(); },
    offerings: (list) => { S.offerings = list; },
    reactions: (list) => { S.reactions = list; if (S.tab === 'vents') renderVents(); },
    scores: (list) => { S.scores = list; if (!$('gameSheet').hidden) renderBoard(); },
    peers: (list) => { S.peers = list; renderGates(); if (S.tab === 'who') renderWho(); },
    status: setStatus,
  });
  const home = c.me?.home_realm;
  renderCircleSelect(); renderMe();
  enterRealm(ls.get('realm', null) || home || 'gate');
  setTab(S.tab);
}

async function loadCircles(preferId) {
  S.circles = await data.myCircles(S.uid);
  if (!S.circles.length) { S.circle = null; renderCircleSelect(); openOnboard('create'); return; }
  const want = preferId || ls.get('circle', null);
  enterCircle(S.circles.find((c) => c.id === want) || S.circles[0]);
}

async function afterSignIn(session) {
  S.uid = session.user.id;
  const md = session.user.user_metadata || {};
  S.defaultName = String(md.full_name || md.name || '').split(' ')[0].slice(0, 24);
  $('landing').hidden = true; $('world').hidden = false; resize();
  const code = new URLSearchParams(location.search).get('join');
  if (code) {
    history.replaceState(null, '', location.pathname);
    S.circles = await data.myCircles(S.uid);
    renderCircleSelect();
    openOnboard('join', code);
    return;
  }
  await loadCircles();
}

function showLanding() {
  $('world').hidden = true; $('landing').hidden = false;
  if (!data.configured) {
    $('demoBtn').hidden = false;
    $('landingMsg').textContent = 'Supabase isn’t configured yet (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), so this runs as a single-player demo.';
  }
}
$('demoBtn').onclick = () => {
  S.uid = 'demo-user'; $('landing').hidden = true; $('world').hidden = false; resize();
  S.circles = [{ id: 'demo', name: 'Demo circle', invite_code: 'demo', role: 'owner', me: { nickname: 'You', robe: 1, role: 'owner', home_realm: null } }];
  enterCircle(S.circles[0]);
};

/* ================================================================ boot */
syncSound();
requestAnimationFrame(frame);
(async () => {
  if (!data.configured) { showLanding(); return; }
  const session = (await data.getSession()) || (await data.signInAnon());
  await afterSignIn(session);
})().catch((e) => {
  showLanding();
  $('landingMsg').textContent = /anonymous/i.test(e?.message || '')
    ? 'The app owner needs to turn on anonymous sign-ins in Supabase (Authentication → Sign In / Providers).'
    : errText(e);
});

