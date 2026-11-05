// Match-3 engine for Charanvidhi Master. Pure logic, no DOM.
// Cell: { t: tileType(0..n-1), s: null | 'row' | 'col' | 'burst' | 'star' }
export const COLS = 8;
export const ROWS = 8;

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (r, c) => r * COLS + c;
const inb = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

export class Board {
  constructor(types, rng = makeRng(1)) {
    this.types = types;
    this.rng = rng;
    this.g = [];
    this.fill();
  }

  rand() { return Math.floor(this.rng() * this.types); }
  newCell() { return { t: this.rand(), s: null }; }
  clone(seed = 99) {
    const b = new Board(this.types, makeRng(seed));
    b.g = this.g.map((row) => row.map((c) => (c ? { ...c } : null)));
    return b;
  }
  snapshot() { return this.g.map((row) => row.map((c) => (c ? { ...c } : null))); }

  /** Fill the board with no starting matches and at least one valid move. */
  fill() {
    do {
      this.g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let t; let guard = 0;
          do {
            t = this.rand(); guard++;
          } while (guard < 30 && (
            (c >= 2 && this.g[r][c - 1].t === t && this.g[r][c - 2].t === t) ||
            (r >= 2 && this.g[r - 1][c].t === t && this.g[r - 2][c].t === t)));
          this.g[r][c] = { t, s: null };
        }
      }
    } while (this.findGroups().length || !this.hasMove());
  }

  /** Groups of matching cells: [{cells:[[r,c]], type, shape, runs}] */
  findGroups() {
    const runs = [];
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        let e = c;
        while (e + 1 < COLS && this.g[r][e + 1].t === this.g[r][c].t) e++;
        if (e - c + 1 >= 3) runs.push({ dir: 'h', t: this.g[r][c].t, cells: Array.from({ length: e - c + 1 }, (_, i) => [r, c + i]) });
        c = e + 1;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        let e = r;
        while (e + 1 < ROWS && this.g[e + 1][c].t === this.g[r][c].t) e++;
        if (e - r + 1 >= 3) runs.push({ dir: 'v', t: this.g[r][c].t, cells: Array.from({ length: e - r + 1 }, (_, i) => [r + i, c]) });
        r = e + 1;
      }
    }
    // merge runs that share a cell (same type)
    const parent = runs.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map();
    runs.forEach((run, i) => run.cells.forEach(([r, c]) => {
      const k = key(r, c);
      if (owner.has(k)) parent[find(i)] = find(owner.get(k)); else owner.set(k, i);
    }));
    const buckets = new Map();
    runs.forEach((run, i) => { const root = find(i); if (!buckets.has(root)) buckets.set(root, []); buckets.get(root).push(run); });
    return [...buckets.values()].map((rs) => {
      const cells = new Map();
      rs.forEach((run) => run.cells.forEach(([r, c]) => cells.set(key(r, c), [r, c])));
      const hasH = rs.some((x) => x.dir === 'h'); const hasV = rs.some((x) => x.dir === 'v');
      const longest = rs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      let shape = null;
      if (longest.cells.length >= 5) shape = 'star';
      else if (hasH && hasV) shape = 'burst';
      else if (longest.cells.length === 4) shape = longest.dir === 'h' ? 'row' : 'col';
      return { cells: [...cells.values()], type: rs[0].t, shape, longest };
    });
  }

  hasMove() {
    if (this.g.some((row) => row.some((c) => c && c.s === 'star'))) return true;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr; const c2 = c + dc;
          if (!inb(r2, c2)) continue;
          this.swapRaw([r, c], [r2, c2]);
          const ok = this.findGroups().length > 0;
          this.swapRaw([r, c], [r2, c2]);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  swapRaw([r1, c1], [r2, c2]) {
    const tmp = this.g[r1][c1]; this.g[r1][c1] = this.g[r2][c2]; this.g[r2][c2] = tmp;
  }

  /** All valid swaps (used by hints and by the test bot). */
  validSwaps() {
    const out = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr; const c2 = c + dc;
          if (!inb(r2, c2)) continue;
          if (this.g[r][c].s === 'star' || this.g[r2][c2].s === 'star') { out.push([[r, c], [r2, c2]]); continue; }
          this.swapRaw([r, c], [r2, c2]);
          if (this.findGroups().length) out.push([[r, c], [r2, c2]]);
          this.swapRaw([r, c], [r2, c2]);
        }
      }
    }
    return out;
  }

  /** Expand special pieces inside a set of cell keys (chain reactions included). */
  expand(set) {
    const queue = [...set];
    while (queue.length) {
      const k = queue.pop(); const r = Math.floor(k / COLS); const c = k % COLS;
      const cell = this.g[r][c]; if (!cell || !cell.s) continue;
      const add = (rr, cc) => { if (!inb(rr, cc)) return; const kk = key(rr, cc); if (!set.has(kk)) { set.add(kk); queue.push(kk); } };
      if (cell.s === 'row') for (let cc = 0; cc < COLS; cc++) add(r, cc);
      else if (cell.s === 'col') for (let rr = 0; rr < ROWS; rr++) add(rr, c);
      else if (cell.s === 'burst') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(r + dr, c + dc);
      else if (cell.s === 'star') for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) if (this.g[rr][cc] && this.g[rr][cc].t === cell.t) add(rr, cc);
    }
  }

  gravityAndRefill() {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.g[r][c]) { if (write !== r) { this.g[write][c] = this.g[r][c]; this.g[r][c] = null; } write--; }
      }
      for (let r = write; r >= 0; r--) this.g[r][c] = this.newCell();
    }
  }

  /** Attempt a swap. Returns { ok:false } or { ok:true, frames, collected, score, reshuffled }. */
  swap(a, b) {
    if (!inb(a[0], a[1]) || !inb(b[0], b[1])) return { ok: false };
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return { ok: false };
    const ca = this.g[a[0]][a[1]]; const cb = this.g[b[0]][b[1]];
    const starSwap = ca.s === 'star' || cb.s === 'star';
    this.swapRaw(a, b);
    if (!starSwap && this.findGroups().length === 0) { this.swapRaw(a, b); return { ok: false }; }

    const frames = []; const collected = {}; let score = 0; let chain = 0;
    const clearSet = (set, created) => {
      this.expand(set);
      const cleared = [];
      for (const k of set) {
        const r = Math.floor(k / COLS); const c = k % COLS; const cell = this.g[r][c];
        if (!cell) continue;
        cleared.push({ r, c, t: cell.t, s: cell.s });
        collected[cell.t] = (collected[cell.t] || 0) + 1;
        this.g[r][c] = null;
      }
      const gained = Math.round(cleared.length * 10 * (1 + 0.5 * chain));
      score += gained; chain++;
      for (const cr of created) this.g[cr.r][cr.c] = { t: cr.t, s: cr.s };
      this.gravityAndRefill();
      frames.push({ cleared, created, grid: this.snapshot(), gained, chain });
    };

    if (starSwap) {
      // a star swapped with a tile clears every tile of that tile's type (two stars clear everything)
      const set = new Set();
      const starCells = [a, b].filter(([r, c]) => this.g[r][c].s === 'star');
      const other = [a, b].find(([r, c]) => this.g[r][c].s !== 'star');
      starCells.forEach(([r, c]) => set.add(key(r, c)));
      if (!other) { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) set.add(key(r, c)); }
      else {
        const t = this.g[other[0]][other[1]].t;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.g[r][c].t === t) set.add(key(r, c));
      }
      clearSet(set, []);
    }

    let hints = [a, b];
    for (let guard = 0; guard < 40; guard++) {
      const groups = this.findGroups();
      if (!groups.length) break;
      const set = new Set(); const created = [];
      for (const gp of groups) {
        gp.cells.forEach(([r, c]) => set.add(key(r, c)));
        if (gp.shape) {
          const hint = hints.find(([r, c]) => gp.cells.some(([rr, cc]) => rr === r && cc === c));
          const pos = hint || gp.longest.cells[Math.floor(gp.longest.cells.length / 2)];
          created.push({ r: pos[0], c: pos[1], t: gp.type, s: gp.shape });
        }
      }
      // a piece that is about to be created must survive the clear
      const keep = new Set(created.map((x) => key(x.r, x.c)));
      this.expand(set);
      keep.forEach((k) => set.delete(k));
      clearSet(set, created);
      hints = [];
    }

    let reshuffled = false;
    if (!this.hasMove()) { this.fill(); reshuffled = true; frames.push({ cleared: [], created: [], grid: this.snapshot(), gained: 0, chain: 0, reshuffled: true }); }
    return { ok: true, frames, collected, score, reshuffled };
  }
}
