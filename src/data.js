// Data layer: Supabase when configured, otherwise an in-memory demo circle so the app still runs locally.
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(URL_ && KEY);
export const supabase = configured ? createClient(URL_, KEY) : null;

/* ------------------------------------------------------------ auth */
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuth(fn) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => fn(session));
  return () => data.subscription.unsubscribe();
}
// No sign-in screen: each browser gets an invisible guest identity (Supabase anonymous auth).
export async function signInAnon() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }

/* ------------------------------------------------------------ circles */
export async function myCircles(uid) {
  const { data, error } = await supabase
    .from('circle_members')
    .select('role, nickname, robe, home_realm, circles(id, name, invite_code)')
    .eq('user_id', uid);
  if (error) throw error;
  return data.filter((r) => r.circles).map((r) => ({ ...r.circles, role: r.role, me: r }));
}
export async function createCircle({ name, nickname, robe, home }) {
  const { data, error } = await supabase.rpc('create_circle', { p_name: name, p_nickname: nickname, p_robe: robe, p_home: home || null });
  if (error) throw error;
  return data;
}
export async function joinCircle({ code, nickname, robe }) {
  const { data, error } = await supabase.rpc('join_circle', { p_code: code, p_nickname: nickname, p_robe: robe });
  if (error) throw error;
  return data;
}
export async function rotateInvite(circleId) {
  const { data, error } = await supabase.rpc('rotate_invite', { p_circle: circleId });
  if (error) throw error;
  return data;
}
export async function leaveCircle(circleId, uid) {
  const { error } = await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', uid);
  if (error) throw error;
}

/* ------------------------------------------------------------ a live circle session */
// handlers: { members(list), messages(list), offerings(list), reactions(list), scores(list), peers(list), status(text) }
export function openCircle(circle, uid, handlers) {
  return configured ? openRemote(circle, uid, handlers) : openLocal(circle, uid, handlers);
}

function openRemote(circle, uid, h) {
  const cid = circle.id;
  const st = { members: new Map(), messages: [], offerings: [], reactions: [], scores: [] };
  const emit = {
    members: () => h.members([...st.members.values()]),
    messages: () => h.messages(st.messages),
    offerings: () => h.offerings(st.offerings),
    reactions: () => h.reactions(st.reactions),
    scores: () => h.scores(st.scores),
  };
  const byId = (a, row) => (a.some((x) => x.id === row.id) ? a : [...a, row]);

  async function loadAll() {
    const [m, msg, off, re, sc] = await Promise.all([
      supabase.from('circle_members').select('*').eq('circle_id', cid),
      supabase.from('messages').select('*').eq('circle_id', cid).order('created_at', { ascending: false }).limit(200),
      supabase.from('offerings').select('*').eq('circle_id', cid).order('created_at', { ascending: false }).limit(150),
      supabase.from('vent_reactions').select('*').eq('circle_id', cid),
      supabase.from('boss_scores').select('*').eq('circle_id', cid).order('score', { ascending: false }).limit(100),
    ]);
    const err = [m, msg, off, re, sc].find((r) => r.error);
    if (err) throw err.error;
    st.members = new Map(m.data.map((r) => [r.user_id, r]));
    st.messages = msg.data.reverse();
    st.offerings = off.data.reverse();
    st.reactions = re.data;
    st.scores = sc.data;
    Object.values(emit).forEach((f) => f());
  }

  const filter = `circle_id=eq.${cid}`;
  const rows = supabase.channel(`rows:${cid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (p) => { st.messages = byId(st.messages, p.new).slice(-250); emit.messages(); })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => { st.messages = st.messages.filter((x) => x.id !== p.old.id); emit.messages(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offerings', filter }, (p) => { st.offerings = byId(st.offerings, p.new).slice(-200); emit.offerings(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'circle_members', filter }, (p) => { st.members.set(p.new.user_id, p.new); emit.members(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'circle_members', filter }, (p) => { st.members.set(p.new.user_id, p.new); emit.members(); })
    // Delete events can't be filtered server-side; the old row carries its primary key (circle_id, user_id).
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'circle_members' }, (p) => {
      if (p.old.circle_id !== cid) return; st.members.delete(p.old.user_id); emit.members();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vent_reactions', filter }, (p) => { st.reactions = [...st.reactions, p.new]; emit.reactions(); })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vent_reactions' }, (p) => {
      const o = p.old; if (o.circle_id && o.circle_id !== cid) return; st.reactions = st.reactions.filter((r) => !(r.message_id === o.message_id && r.user_id === o.user_id && r.reaction === o.reaction)); emit.reactions();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'boss_scores', filter }, (p) => { st.scores = byId(st.scores, p.new); emit.scores(); })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') loadAll().then(() => h.status('')).catch(() => h.status('Could not load this circle. Check your connection and reload.'));
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') h.status('Live updates paused. Reconnecting…');
    });

  // Presence: who is in which realm, and where they are standing.
  let presenceState = null;
  const presence = supabase.channel(`circle:${cid}`, { config: { private: true, presence: { key: uid } } });
  presence
    .on('presence', { event: 'sync' }, () => {
      const s = presence.presenceState();
      const peers = Object.entries(s).filter(([k]) => k !== uid).map(([k, metas]) => ({ key: k, ...metas[metas.length - 1] }));
      h.peers(peers);
    })
    .subscribe((status) => { if (status === 'SUBSCRIBED' && presenceState) presence.track(presenceState); });

  h.status('Connecting to your circle…');
  const ins = async (table, row) => {
    const { error } = await supabase.from(table).insert({ ...row, circle_id: cid, user_id: uid });
    if (error) throw error;
  };

  return {
    track(p) { presenceState = p; presence.track(p).catch(() => {}); },
    async post(row) { await ins('messages', row); },
    async offer({ place, item, wish, realm }) {
      await ins('offerings', { place, item, wish });
      await ins('messages', { kind: 'offering', realm, place, item, body: wish || null });
    },
    async checkIn({ realm, mood, note }) {
      const { error } = await supabase.from('circle_members')
        .update({ realm, mood, note, checked_in_at: new Date().toISOString() })
        .eq('circle_id', cid).eq('user_id', uid);
      if (error) throw error;
      await ins('messages', { kind: 'checkin', realm, mood, body: note || null });
    },
    async updateMe(fields) {
      const { error } = await supabase.from('circle_members').update(fields).eq('circle_id', cid).eq('user_id', uid);
      if (error) throw error;
    },
    async react(messageId, reaction, on) {
      if (on) {
        const { error } = await supabase.from('vent_reactions').insert({ message_id: messageId, reaction, circle_id: cid, user_id: uid });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase.from('vent_reactions').delete().match({ message_id: messageId, reaction, user_id: uid });
        if (error) throw error;
      }
    },
    async submitScore(score) { await ins('boss_scores', { score }); },
    close() { supabase.removeChannel(rows); supabase.removeChannel(presence); },
  };
}

/* ------------------------------------------------------------ local demo (no Supabase configured) */
function openLocal(circle, uid, h) {
  let n = 1;
  const now = () => new Date().toISOString();
  const st = { members: [{ ...circle.me, user_id: uid, circle_id: circle.id }], messages: [], offerings: [], reactions: [], scores: [] };
  const push = (k, row) => { st[k] = [...st[k], { id: n++, created_at: now(), user_id: uid, ...row }]; h[k](st[k]); };
  setTimeout(() => { h.members(st.members); h.messages([]); h.offerings([]); h.reactions([]); h.scores([]); h.peers([]);
    h.status('Demo mode: Supabase is not configured, so everything stays in this tab.'); }, 0);
  return {
    track() {},
    async post(row) { push('messages', row); },
    async offer({ place, item, wish, realm }) { push('offerings', { place, item, wish }); push('messages', { kind: 'offering', realm, place, item, body: wish || null }); },
    async checkIn({ realm, mood, note }) {
      Object.assign(st.members[0], { realm, mood, note, checked_in_at: now() }); h.members([...st.members]);
      push('messages', { kind: 'checkin', realm, mood, body: note || null });
    },
    async updateMe(f) { Object.assign(st.members[0], f); h.members([...st.members]); },
    async react(message_id, reaction, on) {
      st.reactions = on ? [...st.reactions, { message_id, reaction, user_id: uid }]
        : st.reactions.filter((r) => !(r.message_id === message_id && r.reaction === reaction && r.user_id === uid));
      h.reactions(st.reactions);
    },
    async submitScore(score) { push('scores', { score }); },
    close() {},
  };
}
