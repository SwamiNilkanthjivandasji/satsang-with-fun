// Charanvidhi Master (ચરણવિધિ માસ્ટર) – match-3 that unlocks the 16 chihnas, one per level.
import { Board, makeRng, COLS, ROWS } from './charan-engine.js';
import { levelConfig, PHASE1_LEVELS } from './charan-levels.js';

const GID = 'charan';
const HEARTS_MAX = 5;
const REFILL_MS = 15 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Original placeholder glyphs (replace per chihna via data/charan.json "image").
const GLYPHS = [
  ['#E8742A', '<circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="24" cy="24" r="5" fill="currentColor"/>'],
  ['#C9A227', '<path d="M24 6 42 38H6z" fill="currentColor"/><path d="M24 17 33 33H15z" fill="#fff6d8"/>'],
  ['#D9534F', '<path d="M24 5 43 24 24 43 5 24z" fill="currentColor"/><circle cx="24" cy="24" r="6" fill="#fff6d8"/>'],
  ['#3F8FB8', '<rect x="9" y="9" width="30" height="30" rx="6" fill="currentColor"/><rect x="17" y="17" width="14" height="14" rx="3" fill="#e9f6ff"/>'],
  ['#4E9A62', '<path d="M14 6h20l10 18-10 18H14L4 24z" fill="currentColor"/><path d="M18 14h12l6 10-6 10H18l-6-10z" fill="#eaf8ee"/>'],
  ['#8E5BC8', '<path d="M24 3c2 12 9 19 21 21-12 2-19 9-21 21-2-12-9-19-21-21 12-2 19-9 21-21z" fill="currentColor"/>'],
  ['#E0A82E', '<path d="M32 6a19 19 0 1 0 0 36 15 15 0 1 1 0-36z" fill="currentColor"/>'],
  ['#D9689A', '<g fill="currentColor"><ellipse cx="24" cy="15" rx="6" ry="11"/><ellipse cx="24" cy="15" rx="6" ry="11" transform="rotate(60 24 28)"/><ellipse cx="24" cy="15" rx="6" ry="11" transform="rotate(-60 24 28)"/></g><circle cx="24" cy="28" r="5" fill="#ffe08a"/>'],
  ['#2F8F9D', '<path d="M4 18c5-6 9-6 14 0s9 6 14 0 9-6 12 0M4 30c5-6 9-6 14 0s9 6 14 0 9-6 12 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  ['#B5642B', '<path d="M18 4h12v14h14v12H30v14H18V30H4V18h14z" fill="currentColor"/>'],
  ['#6E9D5B', '<path d="M8 40C8 18 22 8 42 6 42 26 32 40 8 40z" fill="currentColor"/><path d="M10 38C18 28 26 20 36 12" stroke="#eaf8ee" stroke-width="3" fill="none"/>'],
  ['#4A90D9', '<path d="M24 4C34 17 40 24 40 31a16 16 0 0 1-32 0c0-7 6-14 16-27z" fill="currentColor"/>'],
  ['#C25B8C', '<path d="M24 24m0 0a4 4 0 0 1 8 0 8 8 0 0 1-16 0 12 12 0 0 1 24 0 16 16 0 0 1-32 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'],
  ['#7A5AA8', '<path d="M8 42V22C8 11 15 5 24 5s16 6 16 17v20z" fill="currentColor"/><path d="M16 42V24c0-6 3-10 8-10s8 4 8 10v18z" fill="#f3eaff"/>'],
  ['#D97B2B', '<path d="M12 6v38" stroke="#6b2a18" stroke-width="4"/><path d="M12 8h26l-8 9 8 9H12z" fill="currentColor"/>'],
  ['#F0A020', '<circle cx="24" cy="24" r="9" fill="currentColor"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5"/></g>'],
];
const glyphSvg = (i, size = 40) => `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="color:${GLYPHS[i % GLYPHS.length][0]}" aria-hidden="true">${GLYPHS[i % GLYPHS.length][1]}</svg>`;

const L = {
  gu: {
    title: 'ચરણવિધિ માસ્ટર', phase: 'તબક્કો', discover: 'શોધ', phaseHelp: 'ટાઇલ મેળવો, પછી ખજાનાની પેટી ખોલીને નવું ચિહ્ન શોધો.',
    level: 'લેવલ', play: 'રમો', myChihnas: 'મારાં ચિહ્નો', of: '/', levelsDone: 'પૂરાં થયેલાં લેવલ', tag: 'સ્વામિનારાયણ સત્સંગ પડકાર',
    tagLine: 'ચરણનાં ૧૬ ચિહ્નો શોધો અને શીખો', soon: 'ટૂંક સમયમાં', collect: 'એકઠાં કરો', movesLeft: 'ચાલ બાકી', score: 'સ્કોર',
    how: 'કેવી રીતે રમવું', howText: 'બાજુ-બાજુની બે ટાઇલ અદલાબદલી કરીને ૩ કે વધુ સરખી ટાઇલની લાઇન બનાવો. ચાલ પૂરી થાય એ પહેલાં લક્ષ્ય પૂરું કરો.',
    howSpecial: '૪ની લાઇનથી આડી/ઊભી લાઇન સાફ કરતી ટાઇલ બને. L કે T આકારથી વિસ્ફોટ. ૫ની લાઇનથી તારો: તેને બીજી ટાઇલ સાથે બદલતા તે પ્રકારની બધી ટાઇલ સાફ.',
    letsPlay: 'ચાલો રમીએ', win: 'લક્ષ્ય પૂરું!', openChest: 'પેટી ખોલો', tapChest: 'પેટી ઉપર દબાવો', chihna: 'ચિહ્ન', newChihna: 'નવું ચિહ્ન મળ્યું!',
    already: 'આ ચિહ્ન તમે પહેલાં જ શોધેલું છે.', needText: 'આ ચિહ્નનું નામ અને અર્થ ઉમેરવાના બાકી છે.', next: 'આગળનું લેવલ', back: 'નકશા પર',
    lose: 'ચાલ પૂરી થઈ', retry: 'ફરી પ્રયત્ન', collection: 'મારો સંગ્રહ', discovered: 'ચિહ્નો શોધાયાં', collectionHelp: 'ચિહ્ન ઉપર દબાવીને તેના વિશે વાંચો.',
    noHearts: 'બધાં ❤ પૂરાં થયાં. થોડી વાર આરામ કરો.', heartsIn: 'નવાં ❤ મળશે', locked: 'આ લેવલ લૉક છે', pause: 'થોભાવો', resume: 'ચાલુ રાખો', menu: 'નકશા પર જાઓ',
    hint: 'સંકેત', reshuffle: 'ટાઇલ ફરી ગોઠવાઈ', close: 'બંધ કરો', phaseSoon: 'આ તબક્કો આગળ ઉમેરાશે',
  },
  en: {
    title: 'Charanvidhi Master', phase: 'Phase', discover: 'Discover', phaseHelp: 'Match tiles, then open a treasure chest to discover a new chihna.',
    level: 'Level', play: 'Play', myChihnas: 'My chihnas', of: 'of', levelsDone: 'Levels complete', tag: 'A Swaminarayan Satsang challenge',
    tagLine: 'Discover and learn the 16 chihnas of the holy feet', soon: 'Coming soon', collect: 'Collect', movesLeft: 'moves left', score: 'Score',
    how: 'How to play', howText: 'Swap two neighbouring tiles to make a line of 3 or more matching tiles. Reach the goal before the moves run out.',
    howSpecial: 'A line of 4 makes a row/column clearer. An L or T shape makes a burst. A line of 5 makes a star: swap it with any tile to clear every tile of that kind.',
    letsPlay: 'Let’s play', win: 'Goal reached!', openChest: 'Open chest', tapChest: 'Tap the chest', chihna: 'Chihna', newChihna: 'New chihna discovered!',
    already: 'You have already discovered this chihna.', needText: 'The name and meaning of this chihna are still to be added.', next: 'Next level', back: 'Back to map',
    lose: 'Out of moves', retry: 'Try again', collection: 'My collection', discovered: 'chihnas discovered', collectionHelp: 'Tap a chihna to read about it.',
    noHearts: 'No hearts left. Take a short rest.', heartsIn: 'New hearts in', locked: 'This level is locked', pause: 'Pause', resume: 'Resume', menu: 'Back to map',
    hint: 'Hint', reshuffle: 'Tiles reshuffled', close: 'Close', phaseSoon: 'This phase will be added later',
  },
};

export async function mount(root, ctx) {
  const { store, esc, getLang, tr, exit } = ctx;
  const T = () => L[getLang()] || L.gu;
  const content = await (await fetch('data/charan.json')).json();
  const chihnaName = (i) => { const c = content.chihnas[i]; return (c && c.name && tr(c.name)) || `${T().chihna} ${i + 1}`; };

  const prog = () => {
    const p = store.getProgress(GID);
    return { unlocked: 1, done: [], discovered: [], best: {}, hearts: HEARTS_MAX, refillAt: 0, ...p };
  };
  const save = (p) => store.saveProgress(GID, p);
  function refreshHearts(p) {
    if (p.hearts <= 0 && p.refillAt && Date.now() >= p.refillAt) { p.hearts = HEARTS_MAX; p.refillAt = 0; save(p); }
    return p;
  }

  let screen = 'map'; let cur = null; let busy = false; let timer = null; let selected = null; let alive = true;

  // ---------- Header bits ----------
  const heartsHtml = (p) => `<span class="hearts" aria-label="${p.hearts}/${HEARTS_MAX}">${'❤'.repeat(p.hearts)}${'♡'.repeat(HEARTS_MAX - p.hearts)} <small>${p.hearts}/${HEARTS_MAX}</small></span>`;

  // ---------- Map ----------
  function renderMap() {
    const t = T(); const p = refreshHearts(prog());
    screen = 'map';
    root.innerHTML = `<section class="screen charan">
      <header class="topbar">
        <button class="chip" data-c="exit">${esc(ctx.t('back'))}</button>
        <div class="topbar-title">${esc(t.title)}</div>
        <div class="topbar-actions">${heartsHtml(p)}</div>
      </header>
      <div class="phase-head"><h2>${esc(t.discover)}</h2><p class="muted small">${esc(t.phase)} 1 / 5</p>
        <div class="phase-dots">${[1, 2, 3, 4, 5].map((n) => `<button class="pdot ${n === 1 ? 'on' : ''}" data-c="phase:${n}" aria-label="${esc(t.phase)} ${n}">${n === 1 ? 1 : '🔒'}</button>`).join('')}</div>
        <p class="phase-help">${esc(t.phaseHelp)}</p></div>
      <div class="lvl-grid">
        ${Array.from({ length: PHASE1_LEVELS }, (_, i) => {
          const n = i + 1; const lock = n > p.unlocked; const done = p.done.includes(n);
          return `<button class="lv ${lock ? 'lock' : ''} ${done ? 'done' : ''} ${n === p.unlocked ? 'now' : ''}" data-c="level:${n}" aria-label="${esc(t.level)} ${n}">${lock ? '🔒' : n}${done ? '<i>✓</i>' : ''}</button>`;
        }).join('')}
      </div>
      <div class="stats">
        <button class="stat" data-c="collection"><span>${esc(t.myChihnas)}</span><strong>${p.discovered.length} ${esc(t.of)} 16</strong><em>›</em></button>
        <div class="stat"><span>${esc(t.levelsDone)}</span><strong>${p.done.length} ${esc(t.of)} 65</strong>
          <div class="bar"><i style="width:${(p.done.length / 65) * 100}%"></i></div></div>
      </div>
      <p class="stage-best">${esc(t.tag)}</p><p class="muted center small">${esc(t.tagLine)}</p>
    </section>`;
    if (p.hearts <= 0) tickRefill(p);
  }
  function tickRefill(p) {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!alive) return;
      const left = p.refillAt - Date.now();
      if (left <= 0) { clearInterval(timer); if (screen === 'map') renderMap(); }
    }, 1000);
  }

  function renderCollection() {
    const t = T(); const p = prog(); screen = 'collection';
    root.innerHTML = `<section class="screen charan">
      <header class="topbar"><button class="chip" data-c="map">${esc(ctx.t('back'))}</button><div class="topbar-title">${esc(t.collection)}</div><div class="topbar-actions">${heartsHtml(p)}</div></header>
      <p class="muted center">${p.discovered.length} ${esc(t.of)} 16 ${esc(t.discovered)}. ${esc(t.collectionHelp)}</p>
      <div class="coll">
        ${Array.from({ length: 16 }, (_, i) => {
          const got = p.discovered.includes(i + 1);
          return `<button class="coll-item ${got ? 'got' : ''}" data-c="chihna:${i + 1}" ${got ? '' : 'disabled'}>
            <span class="coll-art">${got ? (content.chihnas[i].image ? `<img src="${esc(content.chihnas[i].image)}" alt="" width="40" height="40">` : glyphSvg(i)) : '?'}</span>
            <strong>${esc(got ? chihnaName(i) : `${t.chihna} ${i + 1}`)}</strong><small>${esc(t.level)} ${i + 1}</small></button>`;
        }).join('')}
      </div></section>`;
  }
  function chihnaCard(i, { fresh = false, onDone } = {}) {
    const t = T(); const c = content.chihnas[i];
    const m = ctx.openModal(`<div class="q-body">
      ${fresh ? `<span class="badge">✨ ${esc(t.newChihna)}</span>` : ''}
      <div class="chihna-art">${c.image ? `<img src="${esc(c.image)}" alt="" width="84" height="84">` : glyphSvg(i, 84)}</div>
      <h3>${esc(chihnaName(i))}</h3>
      <p class="muted">${esc((c.meaning && tr(c.meaning)) || t.needText)}</p>
      <button class="btn btn-primary" data-d>${esc(fresh ? t.next : t.close)}</button></div>`, { dismissible: !fresh });
    m.el.querySelector('[data-d]').addEventListener('click', () => { m.close(); onDone && onDone(); });
  }

  // ---------- Level ----------
  function startLevel(n) {
    const t = T(); const p = refreshHearts(prog());
    if (n > p.unlocked) { ctx.toast(t.locked); return; }
    if (p.hearts <= 0) { ctx.toast(`${t.noHearts}`); return; }
    const cfg = levelConfig(n);
    cur = { n, cfg, board: new Board(cfg.types, makeRng(cfg.seed + Math.floor(Math.random() * 1e6))), moves: cfg.moves, got: 0, score: 0, over: false };
    screen = 'level'; selected = null; busy = false;
    renderLevel();
    if (localStorage.getItem('swf.debug') === '1') window.__charan = cur;
    if (!localStorage.getItem('swf.charan.seen')) { howModal(); localStorage.setItem('swf.charan.seen', '1'); }
  }
  function howModal() {
    const t = T();
    const m = ctx.openModal(`<h3>${esc(t.how)}</h3><p>${esc(t.howText)}</p><p class="muted">${esc(t.howSpecial)}</p><button class="btn btn-primary" data-d>${esc(t.letsPlay)}</button>`);
    m.el.querySelector('[data-d]').addEventListener('click', m.close);
  }

  function cellHtml(c, r, col) {
    const badge = { row: '↔', col: '↕', burst: '✹', star: '★' }[c.s] || '';
    return `<button class="cell ${c.s ? 'sp sp-' + c.s : ''} ${selected && selected[0] === r && selected[1] === col ? 'sel' : ''}" data-r="${r}" data-k="${col}" aria-label="${r + 1},${col + 1}">${glyphSvg(c.t, 100)}${badge ? `<b class="badge-s">${badge}</b>` : ''}</button>`;
  }
  function boardHtml(grid) { return grid.map((row, r) => row.map((c, col) => cellHtml(c, r, col)).join('')).join(''); }

  function hudHtml() {
    const t = T(); const p = prog();
    const pct = Math.min(100, (cur.got / cur.cfg.goalCount) * 100);
    return `<div class="goal"><div class="goal-top"><span>${esc(t.collect)} <strong>${cur.cfg.goalCount}</strong></span><span class="goal-ico">${glyphSvg(cur.cfg.goalType, 30)}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div><small>${Math.min(cur.got, cur.cfg.goalCount)}/${cur.cfg.goalCount}</small></div>
      <div class="moves"><strong>${cur.moves}</strong><small>${esc(t.movesLeft)}</small></div>
      <div class="scorebox"><small>${esc(t.score)}</small><strong>${cur.score}</strong></div>
      <div class="hearts-box">${heartsHtml(p)}</div>`;
  }
  function renderLevel() {
    const t = T();
    root.innerHTML = `<section class="screen charan level">
      <header class="topbar"><button class="chip chip-round" data-c="pause" aria-label="${esc(t.pause)}">Ⅱ</button>
        <div class="topbar-title">${esc(t.discover)} · ${esc(t.level)} ${cur.n}</div>
        <div class="topbar-actions"><button class="chip chip-round" data-c="hint" aria-label="${esc(t.hint)}">💡</button></div></header>
      <div class="hud" id="hud">${hudHtml()}</div>
      <div class="mboard" id="mboard" style="--cols:${COLS}">${boardHtml(cur.board.g)}</div>
    </section>`;
  }
  const refreshHud = () => { const h = root.querySelector('#hud'); if (h) h.innerHTML = hudHtml(); };
  const mb = () => root.querySelector('#mboard');
  const cellEl = (r, c) => root.querySelector(`.cell[data-r="${r}"][data-k="${c}"]`);

  async function attemptSwap(a, b) {
    if (busy || !cur || cur.over) return;
    busy = true; selected = null;
    const res = cur.board.swap(a, b);
    if (!res.ok) {
      [a, b].forEach(([r, c]) => cellEl(r, c)?.classList.add('shake'));
      await sleep(320); if (!alive) return;
      renderBoardOnly(); busy = false; return;
    }
    cur.moves -= 1;
    // Animate frames
    let prev = null;
    for (const f of res.frames) {
      for (const cl of f.cleared) cellEl(cl.r, cl.c)?.classList.add('pop');
      await sleep(f.cleared.length ? 230 : 60); if (!alive) return;
      const maxR = {}; f.cleared.forEach((x) => { maxR[x.c] = Math.max(maxR[x.c] ?? -1, x.r); });
      const html = f.grid.map((row, r) => row.map((c, col) => {
        const h = cellHtml(c, r, col);
        return (maxR[col] !== undefined && r <= maxR[col]) ? h.replace('class="cell', 'class="cell fall') : h;
      }).join('')).join('');
      if (mb()) mb().innerHTML = html;
      prev = f;
      await sleep(190); if (!alive) return;
    }
    cur.got += res.collected[cur.cfg.goalType] || 0;
    cur.score += res.score;
    refreshHud();
    if (res.reshuffled) ctx.toast(T().reshuffle);
    busy = false;
    if (cur.got >= cur.cfg.goalCount) return win();
    if (cur.moves <= 0) return lose();
    return prev;
  }
  function renderBoardOnly() { if (mb()) mb().innerHTML = boardHtml(cur.board.g); }

  function win() {
    cur.over = true;
    const t = T(); const p = prog();
    const first = !p.done.includes(cur.n);
    if (first) p.done.push(cur.n);
    p.unlocked = Math.max(p.unlocked, Math.min(cur.n + 1, PHASE1_LEVELS));
    p.best[cur.n] = Math.max(p.best[cur.n] || 0, cur.score);
    const isNew = !p.discovered.includes(cur.n);
    if (isNew) p.discovered.push(cur.n);
    save(p);
    const m = ctx.openModal(`<div class="q-body"><h3>${esc(t.win)}</h3><p class="q-answer">${esc(t.score)}: ${cur.score}</p>
      <button class="chest" data-d aria-label="${esc(t.openChest)}">🎁</button><p class="muted">${esc(t.tapChest)}</p></div>`, { dismissible: false });
    m.el.querySelector('[data-d]').addEventListener('click', () => {
      m.close();
      const next = () => {
        const nextN = cur.n + 1;
        const cont = ctx.openModal(`<div class="q-body"><div class="trophy">🏆</div>
          ${nextN <= PHASE1_LEVELS ? `<button class="btn btn-primary" data-x="next">${esc(t.next)}</button>` : ''}
          <button class="btn btn-ghost" data-x="map">${esc(t.back)}</button></div>`, { dismissible: false });
        cont.el.querySelector('[data-x=next]')?.addEventListener('click', () => { cont.close(); startLevel(nextN); });
        cont.el.querySelector('[data-x=map]').addEventListener('click', () => { cont.close(); renderMap(); });
      };
      if (isNew) chihnaCard(cur.n - 1, { fresh: true, onDone: next });
      else {
        const m2 = ctx.openModal(`<div class="q-body"><p>${esc(t.already)}</p><button class="btn btn-primary" data-d>${esc(t.next)}</button></div>`, { dismissible: false });
        m2.el.querySelector('[data-d]').addEventListener('click', () => { m2.close(); next(); });
      }
    });
  }
  function lose() {
    cur.over = true;
    const t = T(); const p = prog();
    p.hearts = Math.max(0, p.hearts - 1);
    if (p.hearts === 0) p.refillAt = Date.now() + REFILL_MS;
    save(p);
    const m = ctx.openModal(`<div class="q-body"><div class="trophy">🌸</div><h3>${esc(t.lose)}</h3><div>${heartsHtml(p)}</div>
      ${p.hearts > 0 ? `<button class="btn btn-primary" data-x="retry">${esc(t.retry)}</button>` : `<p class="muted">${esc(t.noHearts)}</p>`}
      <button class="btn btn-ghost" data-x="map">${esc(t.back)}</button></div>`, { dismissible: false });
    m.el.querySelector('[data-x=retry]')?.addEventListener('click', () => { m.close(); startLevel(cur.n); });
    m.el.querySelector('[data-x=map]').addEventListener('click', () => { m.close(); renderMap(); });
  }
  function hint() {
    if (busy || !cur || cur.over) return;
    const moves = cur.board.validSwaps(); if (!moves.length) return;
    const [a, b] = moves[0];
    [a, b].forEach(([r, c]) => cellEl(r, c)?.classList.add('hint'));
    setTimeout(() => { [a, b].forEach(([r, c]) => cellEl(r, c)?.classList.remove('hint')); }, 1400);
  }

  // ---------- Input ----------
  let down = null;
  const cellFrom = (el) => { const b = el.closest('.cell'); return b ? [Number(b.dataset.r), Number(b.dataset.k)] : null; };
  const onDown = (e) => { if (screen !== 'level') return; const c = cellFrom(e.target); if (c) down = { c, x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (screen !== 'level' || !down || busy) { down = null; return; }
    const dx = e.clientX - down.x; const dy = e.clientY - down.y; const [r, c] = down.c; down = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      const [r2, c2] = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) attemptSwap([r, c], [r2, c2]);
      return;
    }
    // tap: select / swap with neighbour
    if (selected && Math.abs(selected[0] - r) + Math.abs(selected[1] - c) === 1) { const a = selected; attemptSwap(a, [r, c]); return; }
    if (selected && selected[0] === r && selected[1] === c) { selected = null; } else selected = [r, c];
    root.querySelectorAll('.cell.sel').forEach((x) => x.classList.remove('sel'));
    if (selected) cellEl(r, c)?.classList.add('sel');
  };

  const onClick = (e) => {
    const el = e.target.closest('[data-c]'); if (!el || !root.contains(el)) return;
    const [cmd, arg] = el.dataset.c.split(':'); const t = T();
    if (cmd === 'exit') { exit(); }
    else if (cmd === 'map') renderMap();
    else if (cmd === 'level') startLevel(Number(arg));
    else if (cmd === 'collection') renderCollection();
    else if (cmd === 'chihna') chihnaCard(Number(arg) - 1);
    else if (cmd === 'phase') { if (arg !== '1') ctx.toast(`${t.phaseSoon}`); }
    else if (cmd === 'hint') hint();
    else if (cmd === 'pause') {
      const m = ctx.openModal(`<h3>Ⅱ ${esc(t.pause)}</h3><button class="btn btn-primary" data-x="r">${esc(t.resume)}</button><button class="btn btn-ghost" data-x="m">${esc(t.menu)}</button>`, { dismissible: false });
      m.el.querySelector('[data-x=r]').addEventListener('click', m.close);
      m.el.querySelector('[data-x=m]').addEventListener('click', () => { m.close(); renderMap(); });
    }
  };
  root.addEventListener('click', onClick);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  renderMap();

  return {
    unmount() { alive = false; clearInterval(timer); root.removeEventListener('click', onClick); root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointerup', onUp); },
  };
}
