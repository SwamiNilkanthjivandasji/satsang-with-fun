// Quiz steps after the match-3 board: identify the name, pick the foot, place on the charanvidhi picture, final master round.
// Rule from the reference app: a wrong answer never costs a heart; the player simply tries again.
const shuffle = (a, rnd = Math.random) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export const QL = {
  gu: {
    identify: 'આ ચિહ્નનું નામ શું છે?', foot: 'આ ચિહ્ન કયા ચરણમાં છે?', place: 'આ ચિહ્ન ચરણવિધિમાં ક્યાં છે?', placeHelp: 'સોનેરી ઢાંકણ પર દબાવો જ્યાં ચિહ્ન હોય, પછી “તપાસો” દબાવો.',
    check: 'તપાસો', right: 'સાચું!', wrong: 'બરાબર નથી. ફરી પ્રયત્ન કરો.', noCost: 'ખોટા જવાબથી ❤ જતું નથી.', wrongSpot: 'ત્યાં નથી. ફરી જુઓ.',
    footRight: 'ભગવાનનો જમણો ચરણ', footLeft: 'ભગવાનનો ડાબો ચરણ', footBoth: 'બંને ચરણ', done: 'આગળ', finale: 'અંતિમ પડકાર', of: '/',
    masterTitle: 'ચરણવિધિ માસ્ટર!', masterText: 'તમે બધાં ૧૬ ચિહ્નોનાં નામ ઓળખ્યાં અને સ્થાન બતાવ્યાં.', toMap: 'લેવલ નકશો', nameStep: 'નામ', placeStep: 'સ્થાન',
    onFoot: 'ચરણ', challenge: 'બોર્ડ પૂરું થયું. હવે પડકાર!', sourceNote: 'અર્થ: Charnavind: Lord’s Lotus Feet (swaminarayan.faith)',
  },
  en: {
    identify: 'What is the name of this chihna?', foot: 'Which foot is this chihna on?', place: 'Where is this chihna on the charanvidhi?', placeHelp: 'Tap the gold cover where it belongs, then press Check.',
    check: 'Check answer', right: 'Correct!', wrong: 'Not quite. Try again.', noCost: 'A wrong answer never costs a heart.', wrongSpot: 'Not there. Look again.',
    footRight: 'Bhagwan’s right foot', footLeft: 'Bhagwan’s left foot', footBoth: 'Both feet', done: 'Continue', finale: 'Finale', of: 'of',
    masterTitle: 'Charanvidhi Master!', masterText: 'You named and placed every chihna on Bhagwan’s holy feet.', toMap: 'Level map', nameStep: 'Name', placeStep: 'Place',
    onFoot: 'foot', challenge: 'Board complete. Now the challenge!', sourceNote: 'Meaning: Charnavind: Lord’s Lotus Feet (swaminarayan.faith)',
  },
};

/**
 * @param {HTMLElement} box   container to render into
 * @param {object} o  { kind:'identify'|'foot'|'place', idx, content, ctx, T, onDone, placed:Set<number> }
 */
export function runQuiz(box, o) {
  const { ctx, content } = o; const { esc, tr, getLang } = ctx;
  const Q = () => QL[getLang()] || QL.gu;
  const c = content.chihnas[o.idx];
  const name = (i) => { const x = content.chihnas[i]; return (x.name && tr(x.name)) || `#${x.order}`; };
  const meaning = (i) => { const m = content.chihnas[i].meaning; return (m && (m[getLang()] || m.gu || m.en)) || ''; };
  const footLabel = (f) => ({ right: Q().footRight, left: Q().footLeft, both: Q().footBoth })[f];
  const art = (i, cls = 'cv-big') => `<div class="${cls}"><img src="${esc(content.chihnas[i].image)}" alt="" draggable="false"></div>`;
  const explain = (i) => `<div class="qz-explain ok" role="status"><b>${esc(Q().right)} ${esc(name(i))} · ${esc(footLabel(content.chihnas[i].foot))}</b><p>${esc(meaning(i))}</p><small class="muted">${esc(Q().sourceNote)}</small></div>`;
  const nextBtn = () => `<button class="btn btn-primary" data-qz="done">${esc(Q().done)}</button>`;
  const bind = (fn) => { box.onclick = (e) => { const el = e.target.closest('[data-qz]'); if (el) fn(el.dataset.qz, el); }; };

  if (o.kind === 'identify') {
    const opts = shuffle([o.idx, ...shuffle([...Array(16).keys()].filter((i) => i !== o.idx)).slice(0, 3)]); const bad = new Set(); let ok = false;
    const draw = () => {
      box.innerHTML = `<div class="qz">${art(o.idx)}<h2 class="qz-q">${esc(Q().identify)}</h2>
        <div class="qz-opts">${opts.map((i) => `<button class="qz-opt ${ok && i === o.idx ? 'right' : ''} ${bad.has(i) ? 'wrong' : ''}" data-qz="pick:${i}" ${ok || bad.has(i) ? 'disabled' : ''}>${esc(name(i))}</button>`).join('')}</div>
        <div id="qz-fb">${ok ? explain(o.idx) + nextBtn() : bad.size ? `<div class="qz-explain no" role="status"><b>${esc(Q().wrong)}</b> ${esc(Q().noCost)}</div>` : ''}</div></div>`;
    };
    bind((cmd) => { if (cmd === 'done') return o.onDone(); if (cmd.startsWith('pick:') && !ok) { const i = Number(cmd.slice(5)); if (i === o.idx) ok = true; else bad.add(i); draw(); } });
    draw(); return;
  }

  if (o.kind === 'foot') {
    const bad = new Set(); let ok = false;
    const draw = () => {
      box.innerHTML = `<div class="qz">${art(o.idx)}<h2 class="qz-q">${esc(Q().foot)}</h2><p class="muted center small">${esc(name(o.idx))}</p>
        <div class="qz-opts three">${['right', 'left', 'both'].map((f) => `<button class="qz-opt ${ok && f === c.foot ? 'right' : ''} ${bad.has(f) ? 'wrong' : ''}" data-qz="foot:${f}" ${ok || bad.has(f) ? 'disabled' : ''}>${esc(footLabel(f))}</button>`).join('')}</div>
        <div id="qz-fb">${ok ? explain(o.idx) + nextBtn() : bad.size ? `<div class="qz-explain no" role="status"><b>${esc(Q().wrong)}</b> ${esc(Q().noCost)}</div>` : ''}</div></div>`;
    };
    bind((cmd) => { if (cmd === 'done') return o.onDone(); if (cmd.startsWith('foot:') && !ok) { const f = cmd.slice(5); if (f === c.foot) ok = true; else bad.add(f); draw(); } });
    draw(); return;
  }

  if (o.kind === 'place') { placeStep(box, o, { ...o, esc, name, meaning, explain, nextBtn, bind, Q, art, content }); return; }
}

/** Place a chihna on the picture. `o.placed` = indices of chihnas already uncovered (earlier levels). `o.onPlaced` optional. */
export function placeStep(box, o, h) {
  const { content, esc, name, Q } = h;
  const spots = content.chihnas.flatMap((x, k) => x.spots.map((p) => ({ ...p, k })));
  let sel = null; let ok = false; const bad = new Set(); const placed = o.placed || new Set();
  const draw = () => {
    box.innerHTML = `<div class="qz"><div class="qz-card">${h.art(o.idx, 'qz-mini')}<div><span class="eyebrow">${esc(Q().place)}</span><h2>${esc(name(o.idx))}</h2><p class="muted small">${esc(Q().placeHelp)}</p></div></div>
      <div class="cv-diagram"><img src="${esc(content.reference)}" alt="" draggable="false">
        ${spots.map((p, n) => { const open = placed.has(p.k) || (ok && p.k === o.idx); return `<button class="cv-spot ${open ? 'open' : ''} ${ok && p.k === o.idx ? 'right' : ''} ${bad.has(n) ? 'wrong' : ''} ${sel === n ? 'sel' : ''}" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${p.d * 100}%" data-qz="spot:${n}" ${open || ok || bad.has(n) ? 'disabled' : ''} aria-label="${open ? esc(name(p.k)) : 'cover ' + (n + 1)}"></button>`; }).join('')}
      </div>
      <div id="qz-fb">${ok ? (o.final ? '' : h.explain(o.idx)) : bad.size ? `<div class="qz-explain no" role="status"><b>${esc(Q().wrongSpot)}</b> ${esc(Q().noCost)}</div>` : ''}</div>
      ${ok ? h.nextBtn() : `<button class="btn btn-primary" data-qz="check" ${sel === null ? 'disabled' : ''}>${esc(Q().check)}</button>`}</div>`;
  };
  h.bind((cmd) => {
    if (cmd === 'done') return o.onDone();
    if (ok) return;
    if (cmd.startsWith('spot:')) { sel = Number(cmd.slice(5)); draw(); }
    else if (cmd === 'check' && sel !== null) { if (spots[sel].k === o.idx) ok = true; else { bad.add(sel); sel = null; } draw(); }
  });
  draw();
}

/** Final level: name and place all 16 chihnas in random order, then the Master screen. */
export function runMaster(box, o) {
  const { ctx, content } = o; const { esc, tr, getLang } = ctx; const Q = () => QL[getLang()] || QL.gu;
  const order = shuffle([...Array(16).keys()]); const placed = new Set(); let pos = 0;
  const step = () => {
    if (pos >= 16) { finish(); return; }
    const idx = order[pos]; const label = `${Q().finale} · ${pos + 1} ${Q().of} 16`;
    box.innerHTML = `<div class="qz"><p class="eyebrow center">${esc(label)}</p><div class="bar"><i style="width:${(pos / 16) * 100}%"></i></div><div id="qz-in"></div></div>`;
    const inner = box.querySelector('#qz-in');
    runQuiz(inner, { kind: 'identify', idx, content, ctx, onDone: () => {
      const h = { esc, name: (i) => tr(content.chihnas[i].name), Q, art: (i, cls) => `<div class="${cls}"><img src="${esc(content.chihnas[i].image)}" alt="" draggable="false"></div>`, content,
        explain: () => '', nextBtn: () => `<button class="btn btn-primary" data-qz="done">${esc(Q().done)}</button>`,
        bind: (fn) => { inner.onclick = (e) => { const el = e.target.closest('[data-qz]'); if (el) fn(el.dataset.qz, el); }; } };
      placeStep(inner, { idx, placed, final: true, onDone: () => { placed.add(idx); pos += 1; step(); } }, h);
    } });
  };
  const finish = () => {
    const spots = content.chihnas.flatMap((x) => x.spots);
    box.innerHTML = `<div class="qz"><div class="trophy">🏆</div><h1 class="qz-master">${esc(Q().masterTitle)}</h1><p class="muted center">${esc(Q().masterText)}</p>
      <div class="cv-diagram"><img src="${esc(content.reference)}" alt="">${spots.map((p) => `<span class="cv-spot open right" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${p.d * 100}%"></span>`).join('')}</div>
      <button class="btn btn-primary" data-qz="map">${esc(Q().toMap)}</button></div>`;
    box.onclick = (e) => { if (e.target.closest('[data-qz=map]')) o.onDone(); };
  };
  step();
}
