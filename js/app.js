import * as store from './store.js';
import { t, tr, getLang, setLang } from './i18n.js';
import { CONFIG } from './config.js';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastEl = document.getElementById('toast');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let menu = null;
let activeGame = null; // { unmount() }
let deferredInstall = null;

// ---------- Icons (original inline SVG) ----------
const ICONS = {
  book: '<svg viewBox="0 0 64 64"><path d="M8 14c8-3 17-3 24 2v34c-7-5-16-5-24-2z" fill="#F7D9A8"/><path d="M56 14c-8-3-17-3-24 2v34c7-5 16-5 24-2z" fill="#FBE8C8"/><path d="M14 22c5-1.5 10-1 14 1M14 30c5-1.5 10-1 14 1M36 23c4-2 9-2.500 14-1M36 31c4-2 9-2.500 14-1" stroke="#B5642B" stroke-width="2.200" fill="none" stroke-linecap="round"/><path d="M32 6l2.200 5 5 2.200-5 2.200L32 20.500l-2.200-5.100-5-2.200 5-2.200z" fill="#E9B44C"/></svg>',
  lotus: '<svg viewBox="0 0 64 64"><g transform="translate(32 40)"><ellipse rx="7" ry="20" cy="-14" fill="#F4A58A"/><ellipse rx="7" ry="20" cy="-14" transform="rotate(-42)" fill="#F7B9A2"/><ellipse rx="7" ry="20" cy="-14" transform="rotate(42)" fill="#F7B9A2"/><ellipse rx="6" ry="17" cy="-12" transform="rotate(-78)" fill="#FAD0C0"/><ellipse rx="6" ry="17" cy="-12" transform="rotate(78)" fill="#FAD0C0"/></g><path d="M8 50c8-6 16-6 24 0 8-6 16-6 24 0-8 6-16 6-24 2-8 4-16 4-24-2z" fill="#6E9D5B"/><circle cx="32" cy="20" r="4" fill="#E9B44C"/></svg>',
  cards: '<svg viewBox="0 0 64 64"><rect x="8" y="14" width="30" height="40" rx="6" fill="#8FB58A" transform="rotate(-10 23 34)"/><rect x="26" y="10" width="30" height="40" rx="6" fill="#F4A58A" transform="rotate(8 41 30)"/><path d="M41 22.500c-4 0-6 2.500-6 5 0 4 6 4 6 8m0 5v.5" stroke="#FFF4E3" stroke-width="3.200" stroke-linecap="round" fill="none" transform="rotate(8 41 30)"/></svg>',
  gamepad: '<svg viewBox="0 0 64 64"><rect x="6" y="18" width="52" height="30" rx="15" fill="#7FA77A"/><path d="M20 27v12M14 33h12" stroke="#FFF4E3" stroke-width="4" stroke-linecap="round"/><circle cx="42" cy="30" r="3.500" fill="#F4A58A"/><circle cx="49" cy="37" r="3.500" fill="#E9B44C"/></svg>',
  ball: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="#E8742A"/><path d="M12 24c14 6 26 6 40 0M12 40c14-6 26-6 40 0M32 10c-8 12-8 32 0 44" stroke="#FFF4E3" stroke-width="2.800" fill="none" stroke-linecap="round"/></svg>',
  logo: '<svg viewBox="0 0 64 64"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F29A4A"/><stop offset="1" stop-color="#D9531E"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lg)"/><g transform="translate(32 34)" fill="#FFF4E3"><ellipse rx="4.500" ry="12" cy="-7"/><ellipse rx="4.500" ry="12" cy="-7" transform="rotate(-48)" opacity=".92"/><ellipse rx="4.500" ry="12" cy="-7" transform="rotate(48)" opacity=".92"/><circle r="4" fill="#E9B44C"/></g></svg>',
};

// ---------- Helpers ----------
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
export function openModal(html, { onClose, dismissible = true } = {}) {
  modalRoot.innerHTML = `<div class="overlay" data-overlay><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const ov = modalRoot.firstElementChild;
  const close = () => { modalRoot.innerHTML = ''; onClose && onClose(); };
  ov.addEventListener('click', (e) => { if (dismissible && e.target === ov) close(); });
  modalRoot.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  return { el: ov.firstElementChild, close };
}
export const closeModal = () => { modalRoot.innerHTML = ''; };
export const go = (hash) => { location.hash = hash; };

function topbar({ back, title } = {}) {
  const user = store.currentUser();
  return `
  <header class="topbar">
    ${back ? `<button class="chip" data-action="back" aria-label="${esc(t('back'))}">${esc(t('back'))}</button>` : '<span class="brand-mini">' + ICONS.logo + '</span>'}
    <div class="topbar-title">${esc(title || '')}</div>
    <div class="topbar-actions">
      <button class="chip chip-round" data-action="lang" aria-label="${esc(t('language'))}">🌐 ${getLang() === 'gu' ? 'ગુ' : 'EN'}</button>
      ${user ? `<button class="chip chip-round" data-action="profile" aria-label="Profile">👤</button>` : ''}
    </div>
  </header>`;
}

// ---------- Views ----------
function viewLogin() {
  const googleOn = store.backendEnabled();
  app.innerHTML = `
  <section class="screen login">
    <div class="topbar-actions floating"><button class="chip chip-round" data-action="lang">🌐 ${getLang() === 'gu' ? 'ગુ' : 'EN'}</button></div>
    <div class="login-card card">
      <div class="logo">${ICONS.logo}</div>
      <h1>${esc(t('appName'))}</h1>
      <p class="muted">${esc(t('tagline'))}</p>
      <button class="btn btn-google" data-action="google" ${googleOn ? '' : 'disabled title="' + esc(t('googleOff')) + '"'}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.500c3.500 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>
        <span>${esc(t('google'))}</span>
      </button>
      ${googleOn ? '' : `<p class="hint">${esc(t('googleOff'))}</p>`}
      <div class="divider"><span>${esc(t('or'))}</span></div>
      <form id="pin-form" novalidate>
        <label for="f-name">${esc(t('fullName'))} *</label>
        <input id="f-name" name="name" type="text" autocomplete="name" required>
        <label for="f-pin">${esc(t('pin'))} *</label>
        <input id="f-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" required>
        <p class="error" id="login-error" role="alert"></p>
        <button class="btn btn-primary" type="submit">${esc(t('loginPin'))}</button>
      </form>
      <button class="btn btn-ghost" data-action="guest">${esc(t('guest'))}</button>
      <button class="link" data-action="forgot">${esc(t('forgotPin'))}</button>
      ${store.backendEnabled() ? '' : `<p class="hint">ℹ️ ${esc(t('localMode'))}</p>`}
    </div>
  </section>`;

  const form = document.getElementById('pin-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-error');
    err.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await store.signInWithPin(form.name.value, form.pin.value);
      go('#/home');
      route();
    } catch (ex) {
      const map = { NAME: 'errName', PIN: 'errPin', WRONG_PIN: 'errWrongPin', CONFIRM: 'errConfirm' };
      err.textContent = ex.code === 'LOCKED' ? t('errLocked', { m: ex.extra }) : t(map[ex.code] || 'errGeneric');
    } finally { btn.disabled = false; }
  });
}

function viewHome() {
  const user = store.currentUser();
  const name = user && user.name ? user.name.split(' ')[0] : t('guestName');
  app.innerHTML = `
  <section class="screen">
    ${topbar({})}
    <div class="greeting"><span>${esc(t('hello'))}</span><strong>${esc(name)}</strong></div>
    <div class="tiles">
      ${menu.sections.map((s) => `
        <a class="tile ${s.wide ? 'tile-wide' : ''}" href="#/section/${esc(s.id)}">
          <span class="tile-art">${ICONS[s.icon] || ''}</span>
          <span class="tile-name">${esc(tr(s.name))}</span>
        </a>`).join('')}
    </div>
    ${deferredInstall ? `<button class="install" data-action="install">${esc(t('install'))}</button>` : ''}
  </section>`;
}

function viewSection(id) {
  const sec = menu.sections.find((s) => s.id === id);
  if (!sec) return go('#/home');
  app.innerHTML = `
  <section class="screen">
    ${topbar({ back: true, title: tr(sec.name) })}
    <ol class="list">
      ${sec.items.map((it, i) => `
        <li>
          <a class="row ${it.ready ? '' : 'row-soon'}" href="#/game/${esc(it.id)}">
            <span class="num">${i + 1}</span>
            <span class="row-text"><strong>${esc(tr(it.name))}</strong><small>${esc(tr(it.desc))}</small></span>
            ${it.ready ? `<span class="pill pill-go">${esc(t('play'))}</span>` : `<span class="pill pill-soon">${esc(t('soon'))}</span>`}
          </a>
        </li>`).join('')}
    </ol>
  </section>`;
}

async function viewGame(id) {
  const item = menu.sections.flatMap((s) => s.items).find((i) => i.id === id);
  if (!item) return go('#/home');
  if (!item.ready) {
    app.innerHTML = `
    <section class="screen">
      ${topbar({ back: true, title: tr(item.name) })}
      <div class="card empty">
        <div class="empty-art">🪔</div>
        <h2>${esc(t('comingTitle'))}</h2>
        <p class="muted">${esc(t('comingText'))}</p>
      </div>
    </section>`;
    return;
  }
  app.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  try {
    const mod = await import(`./games/${id}.js`);
    const ctx = { store, t, tr, getLang, esc, openModal, closeModal, toast, exit: () => history.length > 1 ? history.back() : go('#/home') };
    activeGame = await mod.mount(app, ctx);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="screen">${topbar({ back: true })}<div class="card empty"><p class="error">${esc(t('errGeneric'))}</p></div></section>`;
  }
}

// ---------- Router ----------
function route() {
  if (activeGame && activeGame.unmount) { try { activeGame.unmount(); } catch { /* ignore */ } }
  activeGame = null;
  closeModal();
  const [page, id] = location.hash.replace(/^#\/?/, '').split('/');
  const user = store.currentUser();
  if (!user) { if (page !== 'login') { history.replaceState(null, '', '#/login'); } return viewLogin(); }
  if (page === 'login' || !page) { history.replaceState(null, '', '#/home'); return viewHome(); }
  if (page === 'section') return viewSection(id);
  if (page === 'game') return viewGame(id);
  return viewHome();
}

// ---------- Global actions ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'back') { history.length > 1 ? history.back() : go('#/home'); }
  else if (action === 'lang') { setLang(getLang() === 'gu' ? 'en' : 'gu'); route(); }
  else if (action === 'guest') { store.continueAsGuest(); go('#/home'); route(); }
  else if (action === 'google') { try { await store.signInGoogle(); } catch { toast(t('errGeneric')); } }
  else if (action === 'forgot') { openModal(`<h3>${esc(t('forgotPin'))}</h3><p>${esc(t('forgotPinText'))}</p><button class="btn btn-primary" data-close>${esc(t('g_close'))}</button>`); }
  else if (action === 'profile') {
    const u = store.currentUser();
    openModal(`<h3>${esc(u && u.name ? u.name : t('guestName'))}</h3>
      <p class="muted">${u && u.mode !== 'account' ? esc(t('localMode')) : '&nbsp;'}</p>
      <button class="btn btn-primary" data-action="logout">${esc(t('logout'))}</button>
      <button class="btn btn-ghost" data-close>${esc(t('g_close'))}</button>`);
  }
  else if (action === 'logout') { await store.signOut(); closeModal(); go('#/login'); route(); }
  else if (action === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; route(); }
});
modalRoot.addEventListener('click', (e) => { if (e.target.closest('[data-action]')) { /* handled by document listener */ } });

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if ((location.hash || '').startsWith('#/home')) route(); });
window.addEventListener('hashchange', route);
store.onChange(() => { if (!store.currentUser()) { go('#/login'); } else if (location.hash.startsWith('#/login')) { go('#/home'); } route(); });

// ---------- Boot ----------
(async function boot() {
  app.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  await store.init();
  try { menu = await (await fetch('data/menu.json')).json(); }
  catch { app.innerHTML = `<div class="card empty"><p class="error">${esc(t('errGeneric'))}</p></div>`; return; }
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

export { CONFIG };
