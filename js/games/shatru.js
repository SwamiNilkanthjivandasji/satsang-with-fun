// Inner Enemies (અંતઃશત્રુ વિજય) – canvas renderer + UI around shatru-core.js
import {
  W, H, FAULTS, GEMS, TOTAL_WAVES, POWER_SECONDS, createState, update, nextWave, enemyPos,
} from './shatru-core.js';

const GID = 'shatru';
const L = {
  gu: {
    title: 'અંતઃશત્રુ વિજય', sub: 'દિવ્ય તેજ પાંખ', presents: '✦ સત્સંગ વિથ ફન ✦', enter: '✦ પ્રવેશ કરો ✦',
    start: '▶ રમત શરૂ કરો', how: '? શક્તિઓ સમજાવો', best: 'શ્રેષ્ઠ સ્કોર', wave: 'તરંગ', pause: 'થોભાવ્યું',
    resume: 'ચાલુ રાખો', menu: 'મેનુ', replay: 'ફરી રમો', next: 'આગળનું તરંગ', cleared: 'તરંગ પૂરું!',
    won: 'વિજય! બધા અંતઃશત્રુ હાર્યા', lost: 'રમત પૂરી', score: 'સ્કોર', newBest: 'નવો શ્રેષ્ઠ સ્કોર!', close: 'સમજાયું',
    helpTitle: 'ગુણશક્તિ અને નિયંત્રણ',
    helpIntro: 'દરેક દોષ હારે ત્યારે તેનો ગુણરત્ન નીચે પડે છે. રત્નને યાન વડે પકડો. એક જ પ્રકારનાં ૩ રત્ન ભેગાં થાય ત્યારે શક્તિ જાતે ચાલુ થાય છે.',
    helpChain: 'નારંગી ઝબકતા દોષો ફાટે ત્યારે આસપાસના દોષો પણ બળે છે.',
    helpCtl: 'ફોનમાં આંગળીથી યાન ખસેડો. કીબોર્ડમાં ← → અથવા A D. P થોભાવવા માટે. ગોળીબાર આપોઆપ ચાલે છે.',
    powers: ['ક્ષમા કવચ: થોડા સમય માટે રક્ષણ', 'વિવેક પ્રકાશ: વધુ શક્તિશાળી ગોળીઓ', 'સંતોષ આકર્ષણ: રત્નો યાન તરફ આવે', 'સત્સંગ પ્રકાશવર્ષા: બધા શત્રુઓને નુકસાન'],
    faultsLine: 'છ અંતઃશત્રુ: કામ, ક્રોધ, લોભ, મોહ, મદ, મત્સર',
  },
  en: {
    title: 'Inner Enemies', sub: 'Wings of Divine Light', presents: '✦ Satsang with Fun ✦', enter: '✦ Enter ✦',
    start: '▶ Start game', how: '? How the powers work', best: 'Best score', wave: 'Wave', pause: 'Paused',
    resume: 'Resume', menu: 'Menu', replay: 'Play again', next: 'Next wave', cleared: 'Wave cleared!',
    won: 'Victory! All inner enemies defeated', lost: 'Game over', score: 'Score', newBest: 'New best score!', close: 'Got it',
    helpTitle: 'Virtue powers & controls',
    helpIntro: 'Each time a fault is defeated, its virtue gem falls. Catch it with your ship. Three gems of the same kind switch on a power automatically.',
    helpChain: 'When a blinking orange fault bursts, the faults around it burn too.',
    helpCtl: 'On a phone, drag your finger to move the ship. On a keyboard use ← → or A D. P pauses. Firing is automatic.',
    powers: ['Forgiveness shield: brief protection', 'Discernment light: stronger shots', 'Contentment pull: gems fly to your ship', 'Satsang light-rain: damages every enemy'],
    faultsLine: 'The six inner enemies: Kaam, Krodh, Lobh, Moh, Mad, Matsar',
  },
};

export async function mount(root, ctx) {
  const { store, esc, getLang, exit } = ctx;
  const T = () => L[getLang()] || L.gu;
  const progress = () => ({ best: 0, wins: 0, ...store.getProgress(GID) });
  let S = null; let raf = 0; let last = 0; let paused = false; let screen = 'intro';
  let targetX = null; const keys = { left: false, right: false };
  let canvas; let g2; let scale = 1;
  const stars = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % W, y: (i * 211) % H, r: 0.6 + ((i * 7) % 10) / 12, sp: 6 + (i % 5) * 4 }));

  // ---------- Screens ----------
  function bar(back) {
    return `<header class="topbar">
      <button class="chip" data-s="${back}">${esc(ctx.t('back'))}</button><div class="topbar-title"></div>
      <div class="topbar-actions"><button class="chip chip-round" data-s="home" aria-label="${esc(ctx.t('home'))}">🏠</button></div></header>`;
  }
  function renderIntro() {
    const t = T(); const p = progress();
    root.innerHTML = `<section class="screen shatru-intro">
      ${bar('exit')}
      <div class="stage-card">
        <div class="stage-glow" aria-hidden="true"></div>
        <p class="stage-kicker">${esc(t.presents)}</p>
        <h1 class="stage-title">${esc(t.title)}</h1>
        <p class="stage-sub">${esc(t.sub)}</p>
        <div class="stage-foes" aria-hidden="true">${FAULTS.map((f) => `<span style="--c:${f.color}">${esc(f.gu)}</span>`).join('')}</div>
        <button class="btn btn-primary" data-s="start">${esc(t.start)}</button>
        <button class="btn btn-ghost" data-s="help">${esc(t.how)}</button>
        <p class="stage-best">${esc(t.best)}: <strong>${p.best}</strong></p>
      </div></section>`;
  }

  function renderPlay() {
    const t = T();
    root.innerHTML = `<section class="screen shatru-play">
      <div class="hud">
        <button class="chip chip-round" data-s="pause" aria-label="${esc(t.pause)}">Ⅱ</button>
        <div class="hud-mid"><span id="h-score">◆ 0</span><span id="h-wave"></span></div>
        <div id="h-lives" class="hud-lives"></div>
      </div>
      <div class="canvas-wrap"><canvas id="cv" aria-label="${esc(t.title)}"></canvas><div id="toasts"></div></div>
      <div class="gembar" id="gembar"></div>
    </section>`;
    canvas = root.querySelector('#cv');
    g2 = canvas.getContext('2d');
    fit();
    const wrap = root.querySelector('.canvas-wrap');
    const toX = (e) => { const r = canvas.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
    wrap.addEventListener('pointerdown', (e) => { targetX = toX(e); wrap.setPointerCapture?.(e.pointerId); });
    wrap.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) targetX = toX(e); });
    wrap.style.touchAction = 'none';
  }

  function fit() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const maxW = Math.min(wrap.clientWidth || 360, 480);
    const maxH = Math.max(320, window.innerHeight - 150);
    const w = Math.min(maxW, maxH * (W / H));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`; canvas.style.height = `${w * (H / W)}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * (H / W) * dpr);
    scale = (w * dpr) / W;
  }

  function overlay(html, dismiss) {
    const m = ctx.openModal(html, { dismissible: false });
    if (dismiss) m.el.querySelector('[data-close]')?.addEventListener('click', dismiss);
    return m;
  }
  function helpModal(after) {
    const t = T();
    const m = ctx.openModal(`<h3>✦ ${esc(t.helpTitle)}</h3><p>${esc(t.helpIntro)}</p>
      <ol class="rules">${t.powers.map((p, i) => `<li><strong style="color:${GEMS[i].color}">${GEMS[i].icon}</strong> ${esc(p)}</li>`).join('')}</ol>
      <p>${esc(t.helpChain)}</p><p class="muted small">${esc(t.faultsLine)}</p><p class="muted small">${esc(t.helpCtl)}</p>
      <button class="btn btn-primary" data-close>${esc(t.close)}</button>`, { onClose: after });
    return m;
  }

  // ---------- Game flow ----------
  function startGame() {
    S = createState({ wave: 1 });
    screen = 'play'; paused = false; targetX = null;
    renderPlay(); updateHud(true);
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    if (localStorage.getItem('swf.debug') === '1') window.__shatru = S;
  }
  function pauseGame() {
    if (screen !== 'play' || paused || !S || S.phase !== 'play') return;
    paused = true; const t = T();
    const m = overlay(`<h3>Ⅱ ${esc(t.pause)}</h3>
      <button class="btn btn-primary" data-r="resume">${esc(t.resume)}</button>
      <button class="btn btn-ghost" data-r="menu">${esc(t.menu)}</button>`);
    m.el.querySelector('[data-r=resume]').addEventListener('click', () => { m.close(); paused = false; last = performance.now(); });
    m.el.querySelector('[data-r=menu]').addEventListener('click', () => { m.close(); toIntro(); });
  }
  function toIntro() { cancelAnimationFrame(raf); screen = 'intro'; paused = false; renderIntro(); }

  function finish(won) {
    const t = T(); const p = progress();
    const isBest = S.score > p.best;
    const next = { best: Math.max(p.best, S.score), wins: p.wins + (won ? 1 : 0) };
    store.saveProgress(GID, next);
    const m = overlay(`<div class="q-body"><div class="trophy">${won ? '🏆' : '🌱'}</div>
      <h3>${esc(won ? t.won : t.lost)}</h3>
      <p class="q-answer">${esc(t.score)}: ${S.score}</p>
      ${isBest ? `<p class="prize reveal">⭐ ${esc(t.newBest)}</p>` : ''}
      <button class="btn btn-primary" data-r="again">${esc(t.replay)}</button>
      <button class="btn btn-ghost" data-r="menu">${esc(t.menu)}</button></div>`);
    m.el.querySelector('[data-r=again]').addEventListener('click', () => { m.close(); startGame(); });
    m.el.querySelector('[data-r=menu]').addEventListener('click', () => { m.close(); toIntro(); });
  }
  function waveCleared() {
    const t = T(); paused = true;
    const m = overlay(`<div class="q-body"><div class="trophy">✨</div><h3>${esc(t.cleared)}</h3>
      <p class="muted">${esc(t.wave)} ${S.wave}/${TOTAL_WAVES}</p>
      <button class="btn btn-primary" data-r="next">${esc(t.next)}</button></div>`);
    m.el.querySelector('[data-r=next]').addEventListener('click', () => { m.close(); nextWave(S); paused = false; last = performance.now(); });
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (screen !== 'play' || !S) return;
    const dt = (now - last) / 1000; last = now;
    if (!paused) {
      const was = S.phase;
      update(S, dt, { targetX, left: keys.left, right: keys.right });
      for (const e of S.events) popup(e);
      if (S.phase !== was) {
        if (S.phase === 'cleared') waveCleared();
        else if (S.phase === 'won') finish(true);
        else if (S.phase === 'lost') finish(false);
      }
    }
    draw(now / 1000);
    updateHud(false);
  }

  let hudKey = '';
  function updateHud(force) {
    const t = T();
    const key = `${S.score}|${S.wave}|${S.lives}|${S.gemCount}|${Object.values(S.power).map((v) => Math.ceil(v)).join(',')}`;
    if (!force && key === hudKey) return;
    hudKey = key;
    root.querySelector('#h-score').textContent = `◆ ${S.score}`;
    root.querySelector('#h-wave').textContent = `${t.wave} ${S.wave}/${TOTAL_WAVES}`;
    root.querySelector('#h-lives').textContent = '❤'.repeat(Math.max(S.lives, 0)) + '♡'.repeat(Math.max(3 - S.lives, 0));
    root.querySelector('#gembar').innerHTML = GEMS.map((gm, i) => {
      const p = gm.power; const on = p !== 'rain' && S.power[p] > 0;
      return `<span class="gem ${on ? 'on' : ''}" style="--c:${gm.color}"><b>${gm.icon}</b><i>${'●'.repeat(S.gemCount[i])}${'○'.repeat(3 - S.gemCount[i])}</i>${on ? `<em>${Math.ceil(S.power[p])}s</em>` : ''}</span>`;
    }).join('');
  }
  function popup(e) {
    const el = root.querySelector('#toasts'); if (!el) return;
    let txt = '';
    if (e.type === 'power') { const gm = GEMS.find((x) => x.power === e.power); txt = `${gm.icon} ${getLang() === 'gu' ? gm.gu : gm.en}!`; }
    else if (e.type === 'hit') txt = '💥';
    else if (e.type === 'blocked') txt = '🛡';
    if (!txt) return;
    const d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; el.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  // ---------- Drawing ----------
  function draw(time) {
    const c = g2; c.setTransform(scale, 0, 0, scale, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2A0F26'); bg.addColorStop(0.55, '#4A1A30'); bg.addColorStop(1, '#7A2E22');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,230,180,.7)';
    for (const s of stars) { const y = (s.y + time * s.sp) % H; c.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(time + s.x)); c.beginPath(); c.arc(s.x, y, s.r, 0, 7); c.fill(); }
    c.globalAlpha = 1;

    for (const f of S.effects) drawEffect(c, f);
    for (const e of S.enemies) drawEnemy(c, e, time);
    for (const o of S.orbs) { c.fillStyle = o.color; c.shadowColor = o.color; c.shadowBlur = 10; c.beginPath(); c.arc(o.x, o.y, 6, 0, 7); c.fill(); c.shadowBlur = 0; }
    for (const b of S.bullets) {
      c.fillStyle = b.strong ? '#9FE3FF' : '#FFD66B'; c.shadowColor = c.fillStyle; c.shadowBlur = 8;
      const w = b.strong ? 6 : 3.5; c.fillRect(b.x - w / 2, b.y - 9, w, 18); c.shadowBlur = 0;
    }
    for (const gm of S.gems) drawGem(c, gm, time);
    drawShip(c, time);
  }
  function drawEnemy(c, e, time) {
    const p = enemyPos(S, e); const f = FAULTS[e.type]; const R = 18;
    c.save(); c.translate(p.x, p.y);
    if (e.flame) {
      const k = 0.55 + 0.45 * Math.abs(Math.sin(time * 7));
      c.shadowColor = '#FF8A1F'; c.shadowBlur = 16 * k;
      c.strokeStyle = `rgba(255,150,40,${k})`; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, R + 4, 0, 7); c.stroke(); c.shadowBlur = 0;
    }
    if (e.burn >= 0) { c.fillStyle = 'rgba(255,120,30,.55)'; c.beginPath(); c.arc(0, 0, R + 6, 0, 7); c.fill(); }
    const grd = c.createRadialGradient(-5, -6, 3, 0, 0, R);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.25, f.color); grd.addColorStop(1, '#2b1022');
    c.fillStyle = grd; c.beginPath();
    c.moveTo(-R, 6); c.quadraticCurveTo(-R, -R, 0, -R); c.quadraticCurveTo(R, -R, R, 6);
    c.lineTo(R * 0.55, R * 0.9); c.lineTo(R * 0.2, R * 0.55); c.lineTo(-R * 0.2, R * 0.9); c.lineTo(-R * 0.55, R * 0.55); c.closePath(); c.fill();
    if (e.maxHp > 1) { c.strokeStyle = e.hp >= e.maxHp ? '#FFE9A6' : 'rgba(255,233,166,.45)'; c.lineWidth = 2; c.stroke(); }
    // eyes follow the ship
    const dx = Math.max(-1.6, Math.min(1.6, (S.ship.x - p.x) / 60));
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-6, -4, 4.6, 5.4, 0, 0, 7); c.ellipse(6, -4, 4.6, 5.4, 0, 0, 7); c.fill();
    c.fillStyle = '#220'; c.beginPath(); c.arc(-6 + dx, -3, 2.2, 0, 7); c.arc(6 + dx, -3, 2.2, 0, 7); c.fill();
    c.strokeStyle = '#220'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, -11); c.lineTo(-2, -8); c.moveTo(11, -11); c.lineTo(2, -8); c.stroke();
    c.fillStyle = '#fff'; c.font = '700 10px "Noto Sans Gujarati", system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText(f.gu, 0, 11);
    c.restore();
  }
  function drawGem(c, gm, time) {
    const info = GEMS[gm.kind]; c.save(); c.translate(gm.x, gm.y); c.rotate(Math.sin(time * 3 + gm.x) * 0.15);
    c.shadowColor = info.color; c.shadowBlur = 12; c.fillStyle = info.color;
    c.beginPath(); c.moveTo(0, -12); c.lineTo(10, 0); c.lineTo(0, 12); c.lineTo(-10, 0); c.closePath(); c.fill(); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(0, -12); c.lineTo(4, -2); c.lineTo(-4, -2); c.closePath(); c.fill();
    c.fillStyle = '#2b1022'; c.font = '700 10px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(info.icon, 0, 4);
    c.restore();
  }
  function drawEffect(c, f) {
    const k = f.t / f.life;
    if (f.rain) { c.fillStyle = `rgba(255,231,160,${0.5 * (1 - k)})`; c.fillRect(0, 0, W, H); return; }
    c.strokeStyle = f.color; c.globalAlpha = 1 - k; c.lineWidth = 3;
    c.beginPath(); c.arc(f.x, f.y, 10 + k * (f.flame ? 46 : 28), 0, 7); c.stroke(); c.globalAlpha = 1;
  }
  function drawShip(c, time) {
    const x = S.ship.x; const y = H - 70;
    if (S.ship.hit > 0 && Math.floor(time * 14) % 2 === 0) return;
    c.save(); c.translate(x, y);
    const gl = c.createRadialGradient(0, 8, 2, 0, 8, 34); gl.addColorStop(0, 'rgba(255,214,107,.55)'); gl.addColorStop(1, 'rgba(255,214,107,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(0, 8, 34, 0, 7); c.fill();
    // lotus-wing body
    c.fillStyle = '#F3B544';
    for (const a of [-0.9, 0.9]) { c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, -2, 6, 20, 0, 0, 7); c.fill(); c.restore(); }
    c.fillStyle = '#FFE08A'; c.beginPath(); c.ellipse(0, -2, 7, 22, 0, 0, 7); c.fill();
    c.fillStyle = '#E8742A'; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(7, -2, 0, 8); c.quadraticCurveTo(-7, -2, 0, -14); c.fill();
    c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(0, -2, 3, 0, 7); c.fill();
    if (S.power.shield > 0) { c.strokeStyle = 'rgba(120,200,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.stroke(); c.fillStyle = 'rgba(120,200,255,.15)'; c.fill(); }
    if (S.power.magnet > 0) { c.strokeStyle = 'rgba(108,194,122,.7)'; c.setLineDash([4, 5]); c.beginPath(); c.arc(0, 0, 40 + 3 * Math.sin(time * 6), 0, 7); c.stroke(); c.setLineDash([]); }
    c.restore();
  }

  // ---------- Wiring ----------
  const onClick = (e) => {
    const el = e.target.closest('[data-s]'); if (!el || !root.contains(el)) return;
    const a = el.dataset.s;
    if (a === 'exit') { cancelAnimationFrame(raf); exit(); }
    else if (a === 'home') { cancelAnimationFrame(raf); location.hash = '#/home'; }
    else if (a === 'start') startGame();
    else if (a === 'help') helpModal();
    else if (a === 'pause') pauseGame();
  };
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { keys.left = e.type === 'keydown'; if (e.type === 'keydown') targetX = null; }
    else if (k === 'arrowright' || k === 'd') { keys.right = e.type === 'keydown'; if (e.type === 'keydown') targetX = null; }
    else if (k === 'p' && e.type === 'keydown') pauseGame();
    if (['arrowleft', 'arrowright', ' '].includes(k) && screen === 'play') e.preventDefault();
  };
  const onVis = () => { if (document.hidden) pauseGame(); };
  const onResize = () => fit();
  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  document.addEventListener('visibilitychange', onVis); window.addEventListener('resize', onResize);
  renderIntro();

  return {
    unmount() {
      cancelAnimationFrame(raf);
      root.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
    },
  };
}

export { POWER_SECONDS };
