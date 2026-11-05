// Satsang Quiz – two teams take turns opening boxes. Each box holds a question and a hidden prize.
const GID = 'prashn';
const SKEY = 'swf.prashn.settings';
const BOX_ICONS = ['🌺', '🌻', '🍃', '🦚', '🐘', '🌙', '⭐', '🪁'];
const STEP = 10; // manual +/- adjustment

export async function mount(root, ctx) {
  const { t, tr, esc, store, openModal, closeModal, toast, exit } = ctx;
  const data = await (await fetch('data/prashn.json')).json();
  const total = data.levelsTotal || 5;

  const loadSettings = () => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch { return {}; } };
  const settings = { timer: true, seconds: 30, teams: null, ...loadSettings() };
  const saveSettings = () => { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch { /* ignore */ } };
  const teamName = (i) => (settings.teams && settings.teams[i]) || t(i === 0 ? 'g_teamName1' : 'g_teamName2');

  const progress = () => {
    const p = store.getProgress(GID);
    return { unlocked: p.unlocked || {}, stars: p.stars || {} };
  };

  const S = {
    view: 'menu', group: 'spiritual', cat: null, level: 1,
    scores: [0, 0], levelScores: [0, 0], stars: [0, 0], turn: 0, boxes: [], timer: null,
  };

  const catList = () => data.categories.filter((c) => c.group === S.group);
  const levelData = (cat, lvl) => { const l = cat.levels[lvl - 1]; return l && l.length === 8 ? l : null; };
  const hasLevels = (cat) => cat.levels.some((l) => l && l.length === 8);

  function clearTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  // ---------- Screens ----------
  function header(title, backAction) {
    return `<header class="topbar">
      <button class="chip" data-g="${backAction}">${esc(t('back'))}</button>
      <div class="topbar-title">${esc(title)}</div>
      <div class="topbar-actions"><button class="chip chip-round" data-g="home" aria-label="${esc(t('home'))}">🏠</button></div>
    </header>`;
  }

  function renderMenu() {
    root.innerHTML = `<section class="screen game">
      ${header(ctx.getLang() === 'gu' ? 'સત્સંગ પ્રશ્ન' : 'Satsang Quiz', 'exit')}
      <button class="hero-card" data-g="pick">
        <span class="hero-play">▶</span>
        <span class="hero-text"><strong>${esc(t('g_play'))}</strong><small>${esc(t('g_playSub'))}</small></span>
      </button>
      <div class="trio">
        <button class="mini-card" data-g="teams"><span>👥</span><strong>${esc(t('g_teams'))}</strong></button>
        <button class="mini-card" data-g="rules"><span>📘</span><strong>${esc(t('g_rules'))}</strong></button>
        <button class="mini-card" data-g="settings"><span>⚙️</span><strong>${esc(t('g_settings'))}</strong></button>
      </div>
    </section>`;
  }

  function renderPick() {
    const p = progress();
    root.innerHTML = `<section class="screen game">
      ${header(ctx.getLang() === 'gu' ? 'સત્સંગ પ્રશ્ન' : 'Satsang Quiz', 'menu')}
      <p class="muted center">${esc(t('g_pickTitle'))}</p>
      <div class="tabs" role="tablist">
        <button class="tab ${S.group === 'spiritual' ? 'on' : ''}" data-g="group:spiritual" role="tab">${esc(t('g_spiritual'))}</button>
        <button class="tab ${S.group === 'math' ? 'on' : ''}" data-g="group:math" role="tab">${esc(t('g_math'))}</button>
      </div>
      <ol class="list">
        ${catList().map((c, i) => {
          const ready = hasLevels(c);
          const st = p.stars[c.id] || 0;
          return `<li><button class="row ${ready ? '' : 'row-soon'}" data-g="cat:${esc(c.id)}">
            <span class="num">${i + 1}</span>
            <span class="row-text"><strong>${esc(tr(c.name))}</strong>${st ? `<small>⭐ ${st}</small>` : ''}</span>
            ${ready ? '' : `<span class="pill pill-soon">${esc(t('soon'))}</span>`}
          </button></li>`;
        }).join('')}
      </ol>
    </section>`;
  }

  function renderBoard() {
    const cat = data.categories.find((c) => c.id === S.cat);
    const lvl = levelData(cat, S.level);
    const unlocked = progress().unlocked[cat.id] || 1;
    root.innerHTML = `<section class="screen game board-screen">
      <header class="topbar">
        <button class="chip" data-g="pick" aria-label="${esc(t('back'))}">←</button>
        <div class="levels" role="tablist">
          ${Array.from({ length: total }, (_, i) => {
            const n = i + 1; const open = n <= unlocked && levelData(cat, n);
            return `<button class="lvl ${n === S.level ? 'on' : ''} ${open ? '' : 'locked'}" data-g="level:${n}" aria-label="Level ${n}">${open ? n : '🔒' + n}</button>`;
          }).join('')}
        </div>
        <div class="topbar-actions">
          <button class="chip chip-round" data-g="adj:-1" aria-label="−${STEP}">−</button>
          <button class="chip chip-round" data-g="adj:1" aria-label="+${STEP}">+</button>
        </div>
      </header>
      <div class="scoreboard">
        ${[0, 1].map((i) => `<div class="team ${S.turn === i ? 'active' : ''}">
          <span class="team-name">${esc(teamName(i))}${S.turn === i ? ' · ' + esc(t('g_turn')) : ''}</span>
          <span class="team-score">${S.scores[i]}</span>
          <span class="team-stars">⭐ ${S.stars[i]}</span>
        </div>`).join('')}
      </div>
      <div class="board">
        ${lvl.map((b, i) => {
          const st = S.boxes[i];
          return `<button class="box ${st.done ? 'done ' + st.result : ''}" data-g="box:${i}" aria-label="${esc(t('g_box'))} ${i + 1}" ${st.done ? 'disabled' : ''}>
            <span class="shape s${i + 1}"></span>
            <span class="box-num">${i + 1}</span>
            <span class="box-icon">${st.done ? (st.result === 'correct' ? '✓' : '✗') : BOX_ICONS[i]}</span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  }

  // ---------- Level flow ----------
  function startCategory(id) {
    const cat = data.categories.find((c) => c.id === id);
    if (!hasLevels(cat)) { toast(t('soon')); return; }
    S.cat = id; S.scores = [0, 0]; S.stars = [0, 0]; S.turn = 0;
    startLevel(1);
  }
  function startLevel(n) {
    const cat = data.categories.find((c) => c.id === S.cat);
    if (!levelData(cat, n)) { toast(t('g_levelSoon')); return; }
    S.level = n; S.levelScores = [0, 0];
    S.boxes = Array.from({ length: 8 }, () => ({ done: false, result: null }));
    S.view = 'board'; render();
  }

  function openBox(i) {
    const cat = data.categories.find((c) => c.id === S.cat);
    const box = levelData(cat, S.level)[i];
    const team = S.turn;
    const secs = settings.timer ? (box.seconds || settings.seconds) : 0;
    let left = secs;
    let revealed = false;

    const ring = () => {
      if (!secs) return '';
      const R = 44; const C = 2 * Math.PI * R; const frac = Math.max(left, 0) / secs;
      return `<div class="ring ${left <= 5 ? 'low' : ''}"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" class="ring-bg"/><circle id="ring-fg" cx="50" cy="50" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg><span id="ring-num">${left}</span></div>`;
    };
    const body = () => `
      <div class="q-head"><button class="chip" data-close aria-label="${esc(t('back'))}">${esc(t('back'))}</button><strong>${esc(t('g_box'))} ${i + 1}</strong><span></span><button class="chip chip-round" data-close aria-label="${esc(t('g_close'))}">✕</button></div>
      <div class="q-body">
        <span class="badge">${esc(t('g_answerOf', { n: teamName(team) }))}</span>
        ${ring()}
        <h3 class="q-text">${esc(tr(box.q))}</h3>
        ${revealed ? `<div class="q-answer">${esc(tr(box.a))}</div>` : `<button class="btn btn-dashed" data-q="reveal">👁 ${esc(t('g_reveal'))}</button>`}
        <div class="q-actions">
          <button class="btn btn-ok" data-q="ok">${esc(t('g_correct'))}</button>
          <button class="btn btn-no" data-q="no">${esc(t('g_wrong'))}</button>
        </div>
        <p class="muted small">${esc(t('g_hint'))}</p>
      </div>`;

    const m = openModal(body(), { dismissible: false, onClose: clearTimer });
    const paint = () => { m.el.innerHTML = body(); bind(); };

    const tick = () => {
      left -= 1;
      const num = m.el.querySelector('#ring-num'); const fg = m.el.querySelector('#ring-fg');
      if (num) num.textContent = Math.max(left, 0);
      if (fg) { const C = 2 * Math.PI * 44; fg.style.strokeDashoffset = C * (1 - Math.max(left, 0) / secs); }
      if (left <= 5) m.el.querySelector('.ring')?.classList.add('low');
      if (left <= 0) { clearTimer(); if (num) num.textContent = '0'; toast(t('g_timeUp')); }
    };
    clearTimer();
    if (secs) S.timer = setInterval(tick, 1000);

    function bind() {
      m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { clearTimer(); closeModal(); }));
      m.el.querySelector('[data-q=reveal]')?.addEventListener('click', () => { revealed = true; paint(); });
      m.el.querySelector('[data-q=ok]')?.addEventListener('click', () => resolve(true));
      m.el.querySelector('[data-q=no]')?.addEventListener('click', () => resolve(false));
    }
    bind();

    function resolve(correct) {
      clearTimer();
      let bonus = false; let gained = 0;
      if (correct) {
        gained = (box.prize && box.prize.value) || 0;
        bonus = !!(box.prize && box.prize.kind === 'bonus');
        S.scores[team] += gained; S.levelScores[team] += gained;
      }
      S.boxes[i] = { done: true, result: correct ? 'correct' : 'wrong', team };
      m.el.innerHTML = `
        <div class="q-head"><span></span><strong>${esc(t('g_box'))} ${i + 1}</strong><span></span><span></span></div>
        <div class="q-body">
          <span class="badge">${esc(t('g_answerOf', { n: teamName(team) }))}</span>
          <h3 class="q-text">${esc(tr(box.q))}</h3>
          <div class="q-answer">${esc(tr(box.a))}</div>
          ${correct
            ? `<div class="prize reveal">🎁 ${esc(t('g_points', { n: gained }))}${bonus ? `<small>${esc(t('g_bonus'))}</small>` : ''}</div>`
            : `<div class="prize hidden">🔒 ${esc(t('g_prizeHidden'))}</div>`}
          <button class="btn btn-dark" data-q="next">${esc(t('g_next'))}</button>
        </div>`;
      m.el.querySelector('[data-q=next]').addEventListener('click', () => {
        closeModal();
        if (!(correct && bonus)) S.turn = 1 - S.turn;
        if (S.boxes.every((b) => b.done)) finishLevel(); else renderBoard();
      });
    }
  }

  function finishLevel() {
    const [a, b] = S.levelScores;
    const win = a === b ? -1 : (a > b ? 0 : 1);
    if (win === -1) { S.stars[0] += 1; S.stars[1] += 1; } else S.stars[win] += 1;

    const p = progress();
    const nextLvl = Math.min(S.level + 1, total);
    p.unlocked[S.cat] = Math.max(p.unlocked[S.cat] || 1, nextLvl);
    p.stars[S.cat] = (p.stars[S.cat] || 0) + 1;
    store.saveProgress(GID, p);

    renderBoard();
    const cat = data.categories.find((c) => c.id === S.cat);
    const canNext = S.level < total && levelData(cat, S.level + 1);
    const m = openModal(`
      <div class="q-head"><span></span><strong>${esc(t('g_levelDone'))}</strong><span></span><span></span></div>
      <div class="q-body">
        <div class="trophy">🏆</div>
        <h3>${esc(win === -1 ? t('g_tie') : t('g_winner', { n: teamName(win) }))}</h3>
        <div class="result-grid">
          ${[0, 1].map((i) => `<div class="team ${win === i || win === -1 ? 'active' : ''}"><span class="team-name">${esc(teamName(i))}</span><span class="team-score">${S.levelScores[i]}</span><span class="team-stars">⭐ ${S.stars[i]}</span></div>`).join('')}
        </div>
        ${canNext
          ? `<button class="btn btn-primary" data-r="next">${esc(t('g_nextLevel'))}</button>`
          : `<button class="btn btn-ghost" disabled>${esc(t('g_levelSoon'))}</button>`}
        <button class="btn btn-ghost" data-r="replay">${esc(t('g_replay'))}</button>
        <button class="btn btn-ghost" data-r="pick">${esc(t('g_close'))}</button>
      </div>`, { dismissible: false });
    m.el.querySelector('[data-r=next]')?.addEventListener('click', () => { closeModal(); startLevel(S.level + 1); });
    m.el.querySelector('[data-r=replay]').addEventListener('click', () => { closeModal(); startLevel(S.level); });
    m.el.querySelector('[data-r=pick]').addEventListener('click', () => { closeModal(); S.view = 'pick'; render(); });
  }

  // ---------- Dialogs ----------
  function teamsDialog() {
    const m = openModal(`<h3>👥 ${esc(t('g_teams'))}</h3>
      <label>${esc(t('g_teamName1'))}<input id="tn0" maxlength="20" value="${esc(teamName(0))}"></label>
      <label>${esc(t('g_teamName2'))}<input id="tn1" maxlength="20" value="${esc(teamName(1))}"></label>
      <button class="btn btn-primary" data-s>${esc(t('g_save'))}</button>
      <button class="btn btn-ghost" data-close>${esc(t('g_close'))}</button>`);
    m.el.querySelector('[data-s]').addEventListener('click', () => {
      const a = m.el.querySelector('#tn0').value.trim(); const b = m.el.querySelector('#tn1').value.trim();
      settings.teams = [a || t('g_teamName1'), b || t('g_teamName2')]; saveSettings(); m.close();
    });
  }
  function rulesDialog() {
    openModal(`<h3>📘 ${esc(t('g_rules'))}</h3><ol class="rules">${t('g_rulesList').map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <button class="btn btn-primary" data-close>${esc(t('g_close'))}</button>`);
  }
  function settingsDialog() {
    const m = openModal(`<h3>⚙️ ${esc(t('g_settings'))}</h3>
      <label class="check"><input id="st-timer" type="checkbox" ${settings.timer ? 'checked' : ''}> ${esc(t('g_timer'))}</label>
      <label>${esc(t('g_seconds'))}
        <select id="st-secs">${[15, 20, 30, 45, 60].map((s) => `<option value="${s}" ${s === settings.seconds ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </label>
      <button class="btn btn-primary" data-s>${esc(t('g_save'))}</button>
      <button class="btn btn-ghost" data-close>${esc(t('g_close'))}</button>`);
    m.el.querySelector('[data-s]').addEventListener('click', () => {
      settings.timer = m.el.querySelector('#st-timer').checked;
      settings.seconds = Number(m.el.querySelector('#st-secs').value) || 30;
      saveSettings(); m.close();
    });
  }

  // ---------- Wiring ----------
  function render() {
    if (S.view === 'menu') renderMenu();
    else if (S.view === 'pick') renderPick();
    else renderBoard();
  }
  const onClick = (e) => {
    const el = e.target.closest('[data-g]');
    if (!el || !root.contains(el)) return;
    const [cmd, arg] = el.dataset.g.split(':');
    switch (cmd) {
      case 'exit': clearTimer(); exit(); break;
      case 'home': clearTimer(); location.hash = '#/home'; break;
      case 'menu': S.view = 'menu'; render(); break;
      case 'pick': S.view = 'pick'; render(); break;
      case 'group': S.group = arg; render(); break;
      case 'cat': startCategory(arg); break;
      case 'teams': teamsDialog(); break;
      case 'rules': rulesDialog(); break;
      case 'settings': settingsDialog(); break;
      case 'level': {
        const n = Number(arg); const cat = data.categories.find((c) => c.id === S.cat);
        const unlocked = progress().unlocked[cat.id] || 1;
        if (n > unlocked) toast(t('g_locked'));
        else if (!levelData(cat, n)) toast(t('g_levelSoon'));
        else if (n !== S.level) startLevel(n);
        break;
      }
      case 'adj': S.scores[S.turn] = Math.max(0, S.scores[S.turn] + Number(arg) * STEP); renderBoard(); break;
      case 'box': openBox(Number(arg)); break;
      default: break;
    }
  };
  root.addEventListener('click', onClick);
  render();

  return {
    unmount() { clearTimer(); root.removeEventListener('click', onClick); },
  };
}
