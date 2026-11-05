// Fruit & Flower Memory (ફળ ફૂલ મેમરી): study a "paper" for 15/20/25 s, items vanish, drag each back to its spot.
// Rules follow the reference app: 6/9/12 items; red blinking dot at each spot; stars = 3 (0 mistakes), 2 (1-3), 1 (more).
const GID = 'memory';
const POOL = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍍', '🥭', '🍐', '🍒', '🥕', '🌽', '🍅', '🥦', '🍆', '🌸', '🌻', '🌹', '🌷', '🌺', '🌼', '🪷'];
const L = {
  gu: { title: 'ફળ ફૂલ મેમરી ગેમ', sub: 'કાગળ પર જોયેલી વસ્તુઓ યાદ રાખો, પછી દરેકને તેની જગ્યાએ પાછી મૂકો.', time: 'કાગળ કેટલી સેકન્ડ દેખાશે', count: 'કેટલી વસ્તુઓ', sec: 'સેકન્ડ', easy: 'સરળ', mid: 'મધ્યમ', hard: 'અઘરું', start: 'ગેમ શરૂ કરો',
    look: 'યાદ રાખો!', place: 'દરેકને તેની જગ્યાએ મૂકો', placeHelp: 'વસ્તુને ખેંચીને લાલ ટપકા પર છોડો, અથવા વસ્તુ પર અને પછી ટપકા પર દબાવો.', mistakes: 'ભૂલ', placed: 'મૂકાયું', best: 'શ્રેષ્ઠ',
    bravo: 'શાબાશ!', nice: 'સરસ!', noMiss: 'એક પણ ભૂલ વગર બધી વસ્તુઓ સાચી જગ્યાએ મૂકી.', withMiss: 'બધી વસ્તુઓ સાચી જગ્યાએ મૂકાઈ. ભૂલ:', again: 'ફરી રમો', settings: 'સેટિંગ બદલો', skip: 'તૈયાર છું' },
  en: { title: 'Fruit & Flower Memory', sub: 'Remember what you saw on the paper, then put each item back where it was.', time: 'How long the paper shows', count: 'How many items', sec: 'sec', easy: 'Easy', mid: 'Medium', hard: 'Hard', start: 'Start game',
    look: 'Remember!', place: 'Put each item in its place', placeHelp: 'Drag an item onto a red dot, or tap an item and then a dot.', mistakes: 'Mistakes', placed: 'Placed', best: 'Best',
    bravo: 'Well done!', nice: 'Nice!', noMiss: 'Every item in the right place with no mistakes.', withMiss: 'All items placed correctly. Mistakes:', again: 'Play again', settings: 'Change settings', skip: 'I’m ready' },
};
const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
export const starsFor = (m) => (m === 0 ? 3 : m <= 3 ? 2 : 1);

/** Spots on a 3x4 grid (cols x rows), jittered, so items never overlap. @returns {{x:number,y:number,e:string}[]} x,y in % of paper */
export function makeSpots(n) {
  const cells = shuffle([...Array(12).keys()]).slice(0, n); const emo = shuffle(POOL).slice(0, n);
  return cells.map((c, i) => ({ x: ((c % 3) + 0.5) / 3 * 100 + (Math.random() - 0.5) * 8, y: (Math.floor(c / 3) + 0.5) / 4 * 100 + (Math.random() - 0.5) * 6, e: emo[i] }));
}

export async function mount(root, ctx) {
  const { store, esc, getLang } = ctx; const T = () => L[getLang()] || L.gu;
  let cfg = { time: 20, count: 6 }; let alive = true; let timer = null; let st = null; let drag = null; let sel = null; let suppress = false;
  const prog = () => ({ best: {}, ...store.getProgress(GID) });

  function setup() {
    const t = T(); const p = prog(); clearInterval(timer);
    root.innerHTML = `<section class="screen memory"><header class="topbar"><button class="chip" data-m="exit">${esc(ctx.t('back'))}</button><div class="topbar-title">${esc(t.title)}</div><div class="topbar-actions"></div></header>
      <p class="muted center">${esc(t.sub)}</p>
      <div class="panel mem-setup">
        <div class="mem-row"><span>${esc(t.time)}</span><div class="seg">${[15, 20, 25].map((v) => `<button data-m="time:${v}" aria-pressed="${cfg.time === v}">${v} ${esc(t.sec)}</button>`).join('')}</div></div>
        <div class="mem-row"><span>${esc(t.count)}</span><div class="seg">${[[6, t.easy], [9, t.mid], [12, t.hard]].map(([v, n]) => `<button data-m="count:${v}" aria-pressed="${cfg.count === v}">${esc(n)} · ${v}</button>`).join('')}</div></div>
        <p class="muted small center">${esc(t.best)}: ${'★'.repeat(p.best[cfg.count] || 0) || '–'}</p>
        <button class="btn btn-primary" data-m="start">${esc(t.start)}</button></div></section>`;
  }

  function start() {
    const spots = makeSpots(cfg.count);
    st = { spots, phase: 'look', left: cfg.time, mist: 0, done: new Set(), order: shuffle(spots.map((_, i) => i)) };
    draw(); if (localStorage.getItem('swf.debug') === '1') window.__memory = st;
    clearInterval(timer);
    timer = setInterval(() => { if (!alive) return; st.left -= 1; if (st.left <= 0) recall(); else tick(); }, 1000);
  }
  function recall() { clearInterval(timer); st.phase = 'recall'; sel = null; draw(); }
  function tick() { const c = root.querySelector('#mem-clock'); if (c) c.textContent = st.left; const f = root.querySelector('#mem-bar i'); if (f) f.style.width = `${(st.left / cfg.time) * 100}%`; }

  function draw() {
    const t = T(); const look = st.phase === 'look';
    root.innerHTML = `<section class="screen memory"><header class="topbar"><button class="chip" data-m="setup" aria-label="↺">↺</button><div class="topbar-title">${esc(look ? t.look : t.place)}</div>
        <div class="topbar-actions">${look ? `<span class="chip chip-round" id="mem-clock">${st.left}</span>` : ''}</div></header>
      ${look ? `<div class="bar" id="mem-bar"><i style="width:${(st.left / cfg.time) * 100}%"></i></div>` : `<p class="muted center small">${esc(t.placeHelp)} · ${esc(t.mistakes)}: <b>${st.mist}</b> · ${esc(t.placed)}: <b>${st.done.size}/${st.spots.length}</b></p>`}
      <div class="mem-paper" id="mem-paper">
        ${st.spots.map((s, i) => look || st.done.has(i) ? `<span class="mem-item ${st.done.has(i) ? 'locked' : ''}" style="left:${s.x}%;top:${s.y}%">${s.e}</span>` : `<button class="mem-dot" data-spot="${i}" style="left:${s.x}%;top:${s.y}%" aria-label="spot ${i + 1}"></button>`).join('')}
      </div>
      ${look ? `<button class="btn btn-ghost" data-m="ready">${esc(t.skip)}</button>` : `<div class="mem-tray" id="mem-tray">${st.order.filter((i) => !st.done.has(i)).map((i) => `<button class="mem-piece ${sel === i ? 'sel' : ''}" data-piece="${i}">${st.spots[i].e}</button>`).join('')}</div>`}</section>`;
  }

  function tryPlace(piece, spot) {
    if (piece === spot) { st.done.add(piece); sel = null; if (st.done.size === st.spots.length) return finish(); }
    else { st.mist += 1; sel = null; const el = root.querySelector(`[data-spot="${spot}"]`); el?.classList.add('shake'); }
    draw();
  }
  function finish() {
    st.phase = 'end'; const t = T(); const stars = starsFor(st.mist); const p = prog();
    p.best[cfg.count] = Math.max(p.best[cfg.count] || 0, stars); store.saveProgress(GID, p);
    draw();
    const m = ctx.openModal(`<div class="q-body"><div class="stars-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h3>${esc(st.mist === 0 ? t.bravo : t.nice)}</h3>
      <p class="muted">${esc(st.mist === 0 ? t.noMiss : `${t.withMiss} ${st.mist}`)}</p>
      <button class="btn btn-primary" data-x="again">${esc(t.again)}</button><button class="btn btn-ghost" data-x="set">${esc(t.settings)}</button></div>`, { dismissible: false });
    m.el.querySelector('[data-x=again]').addEventListener('click', () => { m.close(); start(); });
    m.el.querySelector('[data-x=set]').addEventListener('click', () => { m.close(); setup(); });
  }

  const onClick = (e) => {
    const b = e.target.closest('[data-m],[data-spot],[data-piece]'); if (!b || !root.contains(b) || suppress) return;
    if (b.dataset.m) {
      const [cmd, arg] = b.dataset.m.split(':');
      if (cmd === 'exit') ctx.exit(); else if (cmd === 'setup') setup(); else if (cmd === 'start') start(); else if (cmd === 'ready') recall();
      else if (cmd === 'time') { cfg.time = Number(arg); setup(); } else if (cmd === 'count') { cfg.count = Number(arg); setup(); }
    } else if (st && st.phase === 'recall') {
      if (b.dataset.piece !== undefined) { sel = sel === Number(b.dataset.piece) ? null : Number(b.dataset.piece); draw(); }
      else if (b.dataset.spot !== undefined && sel !== null) tryPlace(sel, Number(b.dataset.spot));
    }
  };
  // Drag a tray piece onto a dot (pointer events; works with touch and mouse).
  const onDown = (e) => {
    const p = e.target.closest('[data-piece]'); if (!p || !st || st.phase !== 'recall') return;
    const r = p.getBoundingClientRect(); const ghost = p.cloneNode(true); ghost.className = 'mem-piece ghost'; ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;z-index:50`;
    drag = { piece: Number(p.dataset.piece), sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, ghost, moved: false };
    p.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return; const dx = e.clientX - drag.sx; const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; document.body.appendChild(drag.ghost); }
    if (drag.moved) { drag.ghost.style.left = `${drag.ox + dx}px`; drag.ghost.style.top = `${drag.oy + dy}px`; }
  };
  const onUp = (e) => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved) return; d.ghost.remove(); suppress = true; setTimeout(() => { suppress = false; }, 0);
    const spotEls = [...root.querySelectorAll('.mem-dot')]; let best = null; let bd = 1e9;
    spotEls.forEach((el) => { const r = el.getBoundingClientRect(); const dd = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (dd < bd) { bd = dd; best = el; } });
    if (best && bd < 44) tryPlace(d.piece, Number(best.dataset.spot));
  };
  root.addEventListener('click', onClick); root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  setup();
  return { unmount() { alive = false; clearInterval(timer); root.removeEventListener('click', onClick); root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); drag?.ghost?.remove(); } };
}
