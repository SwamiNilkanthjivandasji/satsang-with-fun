// Auth + progress storage.
// - With Supabase configured: Google login, name+PIN accounts, progress synced to the database.
// - Without it: everything is kept in this browser's localStorage (local-only mode).
import { CONFIG } from './config.js';

const LS = {
  user: 'swf.user',
  localUsers: 'swf.localUsers',
  progress: 'swf.progress',
  tries: 'swf.pinTries',
};

let sb = null;
let session = null;
const listeners = new Set();

export const backendEnabled = () => !!sb;
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => { try { f(); } catch { /* ignore */ } });

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const normName = (n) => n.trim().replace(/\s+/g, ' ').toLowerCase();

export async function init() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
      const { data } = await sb.auth.getSession();
      session = data.session;
      sb.auth.onAuthStateChange((_evt, s) => { session = s; emit(); });
      if (session) await pullProgress();
    } catch (e) {
      console.warn('Supabase unavailable – running in local mode.', e);
      sb = null;
    }
  }
}

export function currentUser() {
  if (session) {
    const u = session.user;
    const m = u.user_metadata || {};
    return { id: u.id, name: m.full_name || m.name || u.email || '', mode: 'account' };
  }
  return read(LS.user, null);
}

// ---------- PIN lockout (client-side convenience only) ----------
function lockState() {
  const s = read(LS.tries, { n: 0, until: 0 });
  const left = s.until - Date.now();
  return { s, left };
}
function failPin() {
  const { s } = lockState();
  s.n = (s.n || 0) + 1;
  if (s.n >= CONFIG.maxPinTries) { s.until = Date.now() + CONFIG.lockMinutes * 60000; s.n = 0; }
  write(LS.tries, s);
}
const clearTries = () => write(LS.tries, { n: 0, until: 0 });

export class AuthError extends Error {
  constructor(code, extra) { super(code); this.code = code; this.extra = extra; }
}

// ---------- Sign-in methods ----------
export async function signInGoogle() {
  if (!sb) throw new AuthError('GOOGLE_OFF');
  const redirectTo = location.origin + location.pathname;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw new AuthError('GENERIC');
}

export async function signInWithPin(name, pin) {
  name = name.trim().replace(/\s+/g, ' ');
  if (name.split(' ').length < 2 || name.length < 3) throw new AuthError('NAME');
  if (!/^\d{4}$/.test(pin)) throw new AuthError('PIN');
  const { left } = lockState();
  if (left > 0) throw new AuthError('LOCKED', Math.ceil(left / 60000));

  if (!sb) return localPinLogin(name, pin);

  const email = `u${(await sha256Hex(normName(name))).slice(0, 24)}@users.satsang-with-fun.app`;
  const password = CONFIG.pinPepper + pin;
  const first = await sb.auth.signInWithPassword({ email, password });
  if (!first.error) { clearTries(); await pullProgress(); return currentUser(); }

  // Not signed in: either a new user, or an existing user with a different PIN.
  const up = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (up.error) throw new AuthError('GENERIC');
  const existing = up.data.user && Array.isArray(up.data.user.identities) && up.data.user.identities.length === 0;
  if (existing) { failPin(); throw new AuthError('WRONG_PIN'); }
  if (!up.data.session) throw new AuthError('CONFIRM');
  clearTries();
  return currentUser();
}

async function localPinLogin(name, pin) {
  const users = read(LS.localUsers, {});
  const key = normName(name);
  const hash = await sha256Hex(`${CONFIG.pinPepper}${key}:${pin}`);
  if (users[key] && users[key].hash !== hash) { failPin(); throw new AuthError('WRONG_PIN'); }
  if (!users[key]) users[key] = { name, hash };
  write(LS.localUsers, users);
  clearTries();
  const user = { id: `local:${key}`, name: users[key].name, mode: 'local' };
  write(LS.user, user);
  emit();
  return user;
}

export function continueAsGuest() {
  const user = { id: 'guest', name: '', mode: 'guest' };
  write(LS.user, user);
  emit();
  return user;
}

export async function signOut() {
  if (sb && session) { try { await sb.auth.signOut(); } catch { /* ignore */ } }
  session = null;
  try { localStorage.removeItem(LS.user); } catch { /* ignore */ }
  emit();
}

// ---------- Progress ----------
const progKey = () => { const u = currentUser(); return u ? `${LS.progress}.${u.id}` : LS.progress; };
export const getProgress = (gameId) => (read(progKey(), {})[gameId]) || {};

export async function saveProgress(gameId, data) {
  const all = read(progKey(), {});
  all[gameId] = data;
  write(progKey(), all);
  const u = currentUser();
  if (sb && session && u && u.mode === 'account') {
    const { error } = await sb.from('progress').upsert(
      { user_id: u.id, game_id: gameId, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,game_id' },
    );
    if (error) console.warn('Could not sync progress', error.message);
  }
}

async function pullProgress() {
  const u = currentUser();
  if (!sb || !u || u.mode !== 'account') return;
  const { data, error } = await sb.from('progress').select('game_id,data').eq('user_id', u.id);
  if (error || !data) return;
  const all = read(progKey(), {});
  for (const row of data) all[row.game_id] = row.data;
  write(progKey(), all);
}
