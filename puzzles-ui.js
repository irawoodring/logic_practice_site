/* Laker Logic Gym: the grid logic puzzle pages. Parsing lives in puzzle.js. */
(function () {
  'use strict';
  const P = window.Puzzle;
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('llg:' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('llg:' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    },
  };

  const puzzles = (window.PUZZLES || []).map(({ file, text }) => P.parsePuzzle(text, file.split('/').pop()));
  const byId = new Map(puzzles.map((p) => [p.id, p]));

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const loadState = (p) => Object.assign({ marks: {}, crossed: [], elapsed: 0, solved: false, best: null },
    store.get('pz:' + p.id, {}));

  // ------------------------------------------------------------- list

  function renderList() {
    const list = $('puzzle-list');
    list.innerHTML = '';
    if (!puzzles.length) {
      list.appendChild(el('p', 'note', 'No puzzles yet. Add a file to the puzzles/ folder.'));
      return;
    }
    puzzles.forEach((p) => {
      const s = loadState(p);
      const card = el('a', 'puzzle-card' + (p.errors.length ? ' broken' : '') + (s.solved ? ' solved' : ''));
      card.href = '#/puzzle/' + p.id;
      const top = el('div', 'puzzle-card-top');
      top.appendChild(el('strong', '', p.title));
      if (p.difficulty) top.appendChild(el('span', 'badge ' + p.difficulty.toLowerCase(), p.difficulty));
      card.appendChild(top);
      if (p.errors.length) {
        card.appendChild(el('p', 'puzzle-card-meta', '⚠ ' + p.errors[0]));
      } else {
        const k = p.categories[0].items.length;
        let meta = `${p.categories.length} categories × ${k} items`;
        if (s.solved) meta += ` · ✓ Solved${s.best !== null ? ' in ' + fmtTime(s.best) : ''}`;
        card.appendChild(el('p', 'puzzle-card-meta', meta));
      }
      list.appendChild(card);
    });
  }

  // ------------------------------------------------------------- one puzzle

  let cur = null; // { p, s, history, timer, checked }

  function open(id) {
    stopTimer();
    const p = byId.get(id);
    const view = $('puzzle-body');
    view.innerHTML = '';
    if (!p) { view.appendChild(el('p', 'note', 'Puzzle not found.')); return; }

    $('puzzle-title').textContent = p.title;
    $('puzzle-difficulty').textContent = p.difficulty;
    $('puzzle-difficulty').className = 'badge ' + (p.difficulty || '').toLowerCase();
    $('puzzle-difficulty').hidden = !p.difficulty;
    $('puzzle-story').textContent = p.story;

    if (p.errors.length) {
      const warn = el('div', 'warn');
      warn.appendChild(el('strong', '', `This puzzle (${p.file}) has a mistake: `));
      warn.append(p.errors.join(' '));
      view.appendChild(warn);
      $('puzzle-tools').hidden = true;
      return;
    }
    $('puzzle-tools').hidden = false;
    cur = { p, s: loadState(p), history: [], checked: false };
    $('auto-x').checked = store.get('pz-autox', true);
    render();
    startTimer();
  }

  function save() { store.set('pz:' + cur.p.id, cur.s); }

  // Marks the student placed, plus the ✕s implied by each ● when auto-fill is on.
  function cellState(ca, ia, cb, ib) {
    const mark = cur.s.marks[P.cellKey(ca, ia, cb, ib)];
    if (mark) return mark;
    if (!$('auto-x').checked) return '';
    const k = cur.p.categories[0].items.length;
    for (let j = 0; j < k; j++) {
      if (j !== ib && cur.s.marks[P.cellKey(ca, ia, cb, j)] === 'O') return 'x';
      if (j !== ia && cur.s.marks[P.cellKey(ca, j, cb, ib)] === 'O') return 'x';
    }
    return '';
  }

  function render() {
    const { p } = cur;
    const body = $('puzzle-body');
    body.innerHTML = '';
    const layout = el('div', 'puzzle-layout');
    const left = el('div', 'puzzle-left');
    const right = el('div', 'puzzle-right');

    const wrap = el('div', 'grid-wrap');
    wrap.appendChild(buildGrid());
    left.appendChild(wrap);
    left.appendChild(buildAnswers());

    right.appendChild(el('h3', '', 'Clues'));
    right.appendChild(el('p', 'note small', 'Click a clue to cross it off.'));
    const ol = el('ol', 'clues');
    p.clues.forEach((c, i) => {
      const li = el('li', cur.s.crossed.includes(i) ? 'crossed' : '', c);
      li.tabIndex = 0;
      const toggle = () => {
        const at = cur.s.crossed.indexOf(i);
        if (at === -1) cur.s.crossed.push(i); else cur.s.crossed.splice(at, 1);
        li.classList.toggle('crossed');
        save();
      };
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      ol.appendChild(li);
    });
    right.appendChild(ol);

    layout.append(left, right);
    body.appendChild(layout);
    updateStatus();
  }

  function buildGrid() {
    const { p } = cur;
    const cats = p.categories;
    const k = cats[0].items.length;
    const { rows, cols, pairs } = P.gridBlocks(cats.length);
    const table = el('table', 'pgrid');

    const h1 = el('tr');
    const corner = el('th', 'corner');
    corner.colSpan = 2;
    corner.rowSpan = 2;
    h1.appendChild(corner);
    cols.forEach((c) => {
      const th = el('th', 'cat-h', cats[c].name);
      th.colSpan = k;
      h1.appendChild(th);
    });
    const h2 = el('tr');
    cols.forEach((c) => cats[c].items.forEach((item, i) => {
      const th = el('th', 'item-h' + (i === 0 ? ' bl' : ''));
      th.dataset.h = `c${c}.${i}`;
      th.appendChild(el('span', '', item));
      h2.appendChild(th);
    }));
    const thead = el('thead');
    thead.append(h1, h2);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach((r, ri) => {
      cats[r].items.forEach((item, ir) => {
        const tr = el('tr');
        if (ir === 0) {
          const th = el('th', 'cat-v');
          th.rowSpan = k;
          th.appendChild(el('span', '', cats[r].name));
          tr.appendChild(th);
        }
        const rh = el('th', 'item-r', item);
        rh.dataset.h = `r${r}.${ir}`;
        tr.appendChild(rh);
        cols.forEach((c, ci) => {
          if (ci >= pairs[ri].length) {
            if (ir === 0) {
              const td = el('td', 'blank');
              td.colSpan = k;
              td.rowSpan = k;
              tr.appendChild(td);
            }
            return;
          }
          for (let ic = 0; ic < k; ic++) {
            // Thick lines around each box.
            const edges = [ic === 0 && 'bl', ic === k - 1 && 'br', ir === 0 && 'bt', ir === k - 1 && 'bb'];
            const td = el('td', edges.filter(Boolean).join(' '));
            const b = el('button', 'pcell');
            b.dataset.ca = r; b.dataset.ia = ir; b.dataset.cb = c; b.dataset.ib = ic;
            b.setAttribute('aria-label', `${item} and ${cats[c].items[ic]}`);
            paintCell(b);
            b.addEventListener('click', () => cycle(b));
            b.addEventListener('keydown', (e) => cellKey(e, b));
            b.addEventListener('mouseenter', () => highlight(r, ir, c, ic, true));
            b.addEventListener('mouseleave', () => highlight(r, ir, c, ic, false));
            td.appendChild(b);
            tr.appendChild(td);
          }
        });
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    return table;
  }

  function highlight(r, ir, c, ic, on) {
    document.querySelectorAll(`.pgrid [data-h="r${r}.${ir}"], .pgrid [data-h="c${c}.${ic}"]`)
      .forEach((h) => h.classList.toggle('hl', on));
  }

  function paintCell(b) {
    const st = cellState(+b.dataset.ca, +b.dataset.ia, +b.dataset.cb, +b.dataset.ib);
    b.textContent = st === 'O' ? '●' : st ? '✕' : '';
    b.className = 'pcell' + (st === 'O' ? ' o' : st === 'X' ? ' x' : st === 'x' ? ' x auto' : '');
  }

  function setMark(b, value) {
    const key = P.cellKey(+b.dataset.ca, +b.dataset.ia, +b.dataset.cb, +b.dataset.ib);
    if ((cur.s.marks[key] || '') === value) return;
    cur.history.push(JSON.stringify(cur.s.marks));
    if (cur.history.length > 200) cur.history.shift();
    if (value) cur.s.marks[key] = value; else delete cur.s.marks[key];
    changed();
  }

  // Blank -> ✕ -> ● -> blank. A square already crossed out automatically goes straight to ●.
  function cycle(b) {
    const key = P.cellKey(+b.dataset.ca, +b.dataset.ia, +b.dataset.cb, +b.dataset.ib);
    const mark = cur.s.marks[key] || '';
    const auto = !mark && b.classList.contains('auto');
    setMark(b, mark === 'X' || auto ? 'O' : mark === 'O' ? '' : 'X');
  }

  function cellKey(e, b) {
    const k = e.key.toLowerCase();
    if (k === 'x') { setMark(b, 'X'); e.preventDefault(); }
    else if (k === 'o' || k === '0') { setMark(b, 'O'); e.preventDefault(); }
    else if (k === 'backspace' || k === 'delete') { setMark(b, ''); e.preventDefault(); }
    else if (k.startsWith('arrow')) {
      const cells = [...document.querySelectorAll('.pcell')];
      const rect = b.getBoundingClientRect();
      const dir = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] }[k];
      let best = null, bestD = Infinity;
      for (const c of cells) {
        const r = c.getBoundingClientRect();
        const dx = r.left - rect.left, dy = r.top - rect.top;
        if (dir[0] && Math.sign(dx) === dir[0] && Math.abs(dy) < 2 && Math.abs(dx) < bestD) { best = c; bestD = Math.abs(dx); }
        if (dir[1] && Math.sign(dy) === dir[1] && Math.abs(dx) < 2 && Math.abs(dy) < bestD) { best = c; bestD = Math.abs(dy); }
      }
      if (best) best.focus();
      e.preventDefault();
    }
  }

  function changed() {
    cur.checked = false;
    document.querySelectorAll('.pcell').forEach(paintCell);
    const ans = document.querySelector('.answers');
    if (ans) ans.replaceWith(buildAnswers());
    if (!cur.s.solved && isSolved()) {
      cur.s.solved = true;
      if (cur.s.best === null || cur.s.elapsed < cur.s.best) cur.s.best = cur.s.elapsed;
    }
    save();
    updateStatus();
  }

  // The ●s across the grid, compared with the answer: each pair of categories
  // needs exactly the right ●s.
  function tally() {
    const { p } = cur;
    const k = p.categories[0].items.length;
    let right = 0, wrong = 0, total = 0;
    for (const pair of P.gridBlocks(p.categories.length).pairs.flat()) {
      const [ca, cb] = pair;
      for (let ia = 0; ia < k; ia++) {
        for (let ib = 0; ib < k; ib++) {
          const mark = cur.s.marks[P.cellKey(ca, ia, cb, ib)];
          const match = P.matches(p, ca, ia, cb, ib);
          if (match) total++;
          if (mark === 'O') { if (match) right++; else wrong++; }
          if (mark === 'X' && match) wrong++;
        }
      }
    }
    return { right, wrong, total };
  }

  const isSolved = () => { const t = tally(); return t.wrong === 0 && t.right === t.total; };

  function buildAnswers() {
    const { p } = cur;
    const cats = p.categories;
    const table = el('table', 'answers');
    const head = el('tr');
    cats.forEach((c) => head.appendChild(el('th', '', c.name)));
    table.appendChild(el('thead')).appendChild(head);
    const tbody = el('tbody');
    cats[0].items.forEach((item, i) => {
      const tr = el('tr');
      tr.appendChild(el('td', '', item));
      for (let c = 1; c < cats.length; c++) {
        const j = cats[c].items.findIndex((_, jj) => cur.s.marks[P.cellKey(0, i, c, jj)] === 'O');
        tr.appendChild(el('td', j === -1 ? 'empty' : '', j === -1 ? '—' : cats[c].items[j]));
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const box = el('div', 'answers');
    box.appendChild(el('h3', '', 'Your answers'));
    box.appendChild(table);
    return box;
  }

  function updateStatus() {
    const status = $('puzzle-status');
    status.innerHTML = '';
    if (cur.s.solved) {
      status.className = 'status complete';
      status.append(`🎉 Solved${cur.s.best !== null ? ` in ${fmtTime(cur.s.best)}` : ''}! Every match is correct.`);
      const next = puzzles.find((q) => q !== cur.p && !q.errors.length && !loadState(q).solved);
      if (next) {
        const a = el('a', 'btn', 'Next puzzle →');
        a.href = '#/puzzle/' + next.id;
        status.appendChild(a);
      }
    } else {
      status.className = 'status';
      status.textContent = 'Mark ✕ where two things can\'t go together and ● where they must. ' +
        'Every square in the grid needs to be right to finish.';
    }
    $('puzzle-timer').textContent = fmtTime(cur.s.elapsed);
  }

  function checkErrors() {
    const { p } = cur;
    let wrong = 0;
    document.querySelectorAll('.pcell').forEach((b) => {
      const ca = +b.dataset.ca, ia = +b.dataset.ia, cb = +b.dataset.cb, ib = +b.dataset.ib;
      const mark = cur.s.marks[P.cellKey(ca, ia, cb, ib)];
      const match = P.matches(p, ca, ia, cb, ib);
      const bad = (mark === 'O' && !match) || (mark === 'X' && match);
      b.classList.toggle('wrong', bad);
      if (bad) wrong++;
    });
    const status = $('puzzle-status');
    status.className = 'status' + (wrong ? ' bad' : '');
    const t = tally();
    status.textContent = wrong
      ? `${wrong} square${wrong > 1 ? 's are' : ' is'} wrong (outlined in red). Undo back to before the mistake, or fix ${wrong > 1 ? 'them' : 'it'}.`
      : `No mistakes so far. You've found ${t.right} of ${t.total} matches.`;
  }

  // ------------------------------------------------------------- timer

  let timer = null;
  function startTimer() {
    timer = setInterval(() => {
      if (!cur || $('puzzle-view').hidden || cur.s.solved || document.hidden) return;
      cur.s.elapsed++;
      $('puzzle-timer').textContent = fmtTime(cur.s.elapsed);
      if (cur.s.elapsed % 5 === 0) save();
    }, 1000);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
    if (cur) save();
  }

  // ------------------------------------------------------------- toolbar

  $('pz-undo').addEventListener('click', () => {
    if (!cur || !cur.history.length) return;
    cur.s.marks = JSON.parse(cur.history.pop());
    changed();
  });
  $('pz-check').addEventListener('click', () => { if (cur) checkErrors(); });
  $('pz-clear').addEventListener('click', () => {
    if (!cur || !confirm('Clear the whole grid and start this puzzle over?')) return;
    cur.history.push(JSON.stringify(cur.s.marks));
    cur.s = Object.assign(loadState(cur.p), { marks: {}, crossed: [], elapsed: 0, solved: false });
    save();
    render();
  });
  $('auto-x').addEventListener('change', () => {
    store.set('pz-autox', $('auto-x').checked);
    if (cur) document.querySelectorAll('.pcell').forEach(paintCell);
  });

  window.PuzzleUI = { renderList, open, stop: stopTimer, count: () => puzzles.length };
})();
