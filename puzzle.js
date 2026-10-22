/*
 * Laker Logic Gym: grid logic puzzles (like Puzzle Baron's).
 *
 * A puzzle file is plain text, one "key: value" per line:
 *
 *   title: The Science Fair
 *   difficulty: Easy
 *   story: Three students entered the school science fair...
 *   Students: Amy, Ben, Cara           <- any other key is a category
 *   Projects: robot, volcano, plants
 *   Places: 1st, 2nd, 3rd
 *   clue: Ben didn't build the robot.
 *   answer: Amy, volcano, 1st           <- one per item of the first category
 *
 * Works in the browser (window.Puzzle) and in Node (require('./puzzle.js')).
 */
(function (root) {
  'use strict';

  const norm = (s) => s.trim().toLowerCase();

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // "03-science-fair.txt" -> "Science Fair"
  function titleFromFile(name) {
    const words = String(name || '').replace(/\.txt$/i, '').replace(/^\d+[\s._-]*/, '').replace(/[-_]+/g, ' ').trim();
    return words ? words.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Puzzle';
  }

  /**
   * Returns { id, title, difficulty, story, categories: [{ name, items }],
   *           clues, solution, errors }.
   * solution[c][i] is the index (in category c) of the item that goes with
   * item i of the first category. It is null when the answer lines have errors.
   */
  function parsePuzzle(text, file) {
    const p = { file, title: '', difficulty: '', story: '', categories: [], clues: [], solution: null, errors: [] };
    const answers = [];
    String(text).split(/\r?\n/).forEach((raw, n) => {
      const line = raw.trim();
      if (!line || line.startsWith('//')) return;
      let m;
      if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) { p.clues.push(m[1]); return; }
      if (!(m = /^([^:]+):\s*(.*)$/.exec(line))) {
        p.errors.push(`Line ${n + 1} ("${line}") should start with a label like "clue:" or "answer:".`);
        return;
      }
      const key = norm(m[1]);
      const value = m[2].trim();
      if (key === 'title') p.title = value;
      else if (key === 'difficulty') p.difficulty = value;
      else if (key === 'story' || key === 'intro' || key === 'note') p.story += (p.story ? ' ' : '') + value;
      else if (key === 'clue') p.clues.push(value);
      else if (key === 'answer') answers.push({ n: n + 1, items: value.split(',').map((s) => s.trim()).filter(Boolean) });
      else p.categories.push({ name: m[1].trim(), items: value.split(',').map((s) => s.trim()).filter(Boolean) });
    });

    if (!p.title) p.title = titleFromFile(file);
    p.id = 'pz-' + hash(norm(p.title));
    const cats = p.categories;
    if (cats.length < 2) p.errors.push('A puzzle needs at least two categories, like "Students: Amy, Ben, Cara".');
    const k = cats.length ? cats[0].items.length : 0;
    if (k < 2) p.errors.push('Each category needs at least two items.');
    cats.forEach((c) => {
      if (c.items.length !== k) {
        p.errors.push(`Every category needs the same number of items: "${c.name}" has ${c.items.length}, "${cats[0].name}" has ${k}.`);
      }
    });

    // Every item name must be unique so answer lines can be read in any order.
    const where = new Map();
    cats.forEach((c, ci) => c.items.forEach((item, ii) => {
      if (where.has(norm(item))) p.errors.push(`"${item}" appears in more than one category. Make every item name different.`);
      else where.set(norm(item), [ci, ii]);
    }));
    if (!p.clues.length) p.errors.push('Add at least one "clue:" line.');
    if (p.errors.length) return p;

    // Answer lines: one per item of the first category, items in any order.
    const sol = cats.map(() => Array(k).fill(null));
    const used = cats.map(() => new Set());
    let ok = true;
    const bad = (msg) => { ok = false; p.errors.push(msg); };
    if (answers.length !== k) bad(`Add ${k} "answer:" lines, one for each of the ${cats[0].name.toLowerCase()}. Found ${answers.length}.`);
    for (const a of answers) {
      const row = cats.map(() => null);
      for (const item of a.items) {
        const w = where.get(norm(item));
        if (!w) { bad(`Line ${a.n}: "${item}" isn't one of the items listed in the categories.`); continue; }
        if (row[w[0]] !== null) { bad(`Line ${a.n}: two items from "${cats[w[0]].name}".`); continue; }
        row[w[0]] = w[1];
      }
      const missing = cats.filter((_, ci) => row[ci] === null).map((c) => c.name);
      if (missing.length) { bad(`Line ${a.n}: needs one item from each category (missing ${missing.join(', ')}).`); continue; }
      row.forEach((ii, ci) => {
        if (used[ci].has(ii)) bad(`"${cats[ci].items[ii]}" is used in more than one answer line.`);
        used[ci].add(ii);
      });
      cats.forEach((_, ci) => { sol[ci][row[0]] = row[ci]; });
    }
    if (ok) p.solution = sol;
    return p;
  }

  // Grid cell key for item ia of category ca and item ib of category cb.
  function cellKey(ca, ia, cb, ib) {
    return ca < cb ? `${ca}.${ia}-${cb}.${ib}` : `${cb}.${ib}-${ca}.${ia}`;
  }

  // Whether item ia of category ca goes with item ib of category cb.
  function matches(p, ca, ia, cb, ib) {
    const e = p.solution[ca].indexOf(ia);
    return p.solution[cb][e] === ib;
  }

  // Pairs of categories shown in the grid, Puzzle Baron style: the first
  // category against every other, then the last against the rest, and so on.
  function gridBlocks(n) {
    const rows = [0];
    for (let c = n - 1; c >= 2; c--) rows.push(c);
    const cols = [];
    for (let c = 1; c < n; c++) cols.push(c);
    return { rows, cols, pairs: rows.map((r, ri) => cols.slice(0, cols.length - ri).map((c) => [r, c])) };
  }

  /**
   * Counts the solutions allowed by clue tests (functions of a helper h),
   * stopping at `limit`. Used by tests/check.js to prove a puzzle is unique.
   *   h.same(x, y)     x and y go together
   *   h.get(x, cat)    the item from category cat that goes with x
   *   h.num(x, cat)    the same, as a number ("$12" -> 12)
   */
  function countSolutions(p, tests, limit = 2) {
    const cats = p.categories;
    const k = cats[0].items.length;
    const perms = permutations(k);
    const catIndex = new Map(cats.map((c, i) => [norm(c.name), i]));
    const where = new Map();
    cats.forEach((c, ci) => c.items.forEach((item, ii) => where.set(norm(item), [ci, ii])));
    const lookup = (x) => {
      const w = where.get(norm(x));
      if (!w) throw new Error(`clue test mentions unknown item "${x}"`);
      return w;
    };
    const catOf = (name) => {
      if (!catIndex.has(norm(name))) throw new Error(`clue test mentions unknown category "${name}"`);
      return catIndex.get(norm(name));
    };

    // assign[c] is a permutation: entity i gets item assign[c][i] of category c.
    const assign = cats.map(() => null);
    assign[0] = perms[0];
    const entity = (x) => { const [c, i] = lookup(x); return assign[c].indexOf(i); };
    const h = {
      same: (x, y) => entity(x) === entity(y),
      get: (x, cat) => { const c = catOf(cat); return cats[c].items[assign[c][entity(x)]]; },
      num: (x, cat) => parseFloat(h.get(x, cat).replace(/[^0-9.-]/g, '')),
    };
    const found = [];
    (function rec(c) {
      if (found.length >= limit) return;
      if (c === cats.length) {
        if (tests.every((t) => t(h))) found.push(assign.map((a) => a.slice()));
        return;
      }
      for (const perm of perms) { assign[c] = perm; rec(c + 1); }
    })(1);
    return found;
  }

  function permutations(k) {
    if (k === 0) return [[]];
    const out = [];
    for (const rest of permutations(k - 1)) {
      for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), k - 1, ...rest.slice(i)]);
    }
    return out;
  }

  // Converts countSolutions' assign arrays to the solution format above.
  function toSolution(assign) {
    return assign.map((a) => {
      const s = Array(a.length);
      a.forEach((item, e) => { s[assign[0][e]] = item; });
      return s;
    });
  }

  const api = { parsePuzzle, cellKey, matches, gridBlocks, countSolutions, toSolution, titleFromFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Puzzle = api;
})(typeof window !== 'undefined' ? window : this);
