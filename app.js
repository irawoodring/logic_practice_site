/* Laker Logic Gym: page behavior. The proof checking lives in logic.js. */
(function () {
  'use strict';
  const L = window.Logic;
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------- storage

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
  let solved = store.get('solved', {});

  // ------------------------------------------------------------- problems

  const sets = L.parseProblemFile(window.PROBLEMS || '');
  const byId = new Map();
  sets.forEach((set, si) => set.problems.forEach((p, pi) => {
    // Problems with typos have no id; give them a position-based one.
    let id = p.id || `bad-${si}-${pi}`;
    while (byId.has(id)) id += 'x';
    p.uid = id;
    byId.set(id, { set, si, pi, problem: p });
  }));
  const ordered = [...byId.values()];

  // ------------------------------------------------------------- state

  let current = null;   // { problem, set, label, rules }
  let steps = [];
  const openSets = new Set();

  // ------------------------------------------------------------- symbols

  const SYMS = { '<->': '≡', '<=>': '≡', '<>': '≡', '=': '≡', '->': '⊃', '=>': '⊃', '>': '⊃',
    '&': '•', '*': '•', '^': '•', '.': '•', 'v': '∨', '!': '~' };
  const symbolize = (s) => s.replace(/<->|<=>|<>|->|=>|>|=|&|\*|\^|\.|v|!|[a-uw-z]/g,
    (m) => SYMS[m] || m.toUpperCase());

  const pretty = (f) => L.str(f);

  // ------------------------------------------------------------- sidebar

  function renderSidebar() {
    const list = $('set-list');
    list.innerHTML = '';
    let total = 0, done = 0;
    sets.forEach((set, si) => {
      const d = document.createElement('details');
      d.className = 'set';
      const isCurrent = current && current.set === set;
      d.open = openSets.has(si) || isCurrent;
      d.addEventListener('toggle', () => { d.open ? openSets.add(si) : openSets.delete(si); });

      const count = set.problems.filter((p) => solved[p.uid]).length;
      total += set.problems.length;
      done += count;
      const s = document.createElement('summary');
      s.innerHTML = `<span></span><span class="set-count${count === set.problems.length && count ? ' done' : ''}">${count}/${set.problems.length}</span>`;
      s.firstChild.textContent = set.title + (set.ruleErrors.length ? ' ⚠' : '');
      d.appendChild(s);

      const grid = document.createElement('div');
      grid.className = 'problem-grid';
      set.problems.forEach((p, pi) => {
        const b = document.createElement('button');
        b.className = 'pbtn';
        b.textContent = pi + 1;
        if (solved[p.uid]) b.classList.add('solved');
        if (p.error || p.invalid) { b.classList.add('broken'); b.textContent += '⚠'; }
        if (current && current.problem === p) b.classList.add('current');
        b.title = p.error ? 'Problem has a typo' : p.invalid ? 'Argument is invalid' : p.key.trim();
        b.addEventListener('click', () => go('#/p/' + p.uid));
        grid.appendChild(b);
      });
      d.appendChild(grid);
      list.appendChild(d);
    });
    $('progress-summary').textContent = total ? `${done} of ${total} problems solved` : 'No problems found in problems.js';
  }

  // ------------------------------------------------------------- views

  function show(view) {
    for (const v of ['problem-view', 'custom-view', 'welcome-view']) $(v).hidden = v !== view;
    document.body.classList.remove('menu-open');
    window.scrollTo(0, 0);
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    let m;
    if ((m = /^\/p\/(.+)$/.exec(h)) && byId.has(m[1])) {
      const e = byId.get(m[1]);
      openProblem(e.problem, e.set, `${e.set.title} · Problem ${e.pi + 1}`, e.set.rules);
    } else if ((m = /^\/custom\/(.+)$/.exec(h))) {
      const p = L.parseArgument(m[1]);
      if (p.error) { showCustom(m[1], p.error); return; }
      p.uid = 'custom-' + p.id;
      openProblem(p, null, 'Your own argument', L.ALL_RULES);
    } else if (h === '/custom') {
      showCustom('', '');
    } else {
      current = null;
      renderSidebar();
      show('welcome-view');
    }
  }

  function showCustom(text, error) {
    current = null;
    renderSidebar();
    $('custom-input').value = text;
    $('custom-error').textContent = error || '';
    show('custom-view');
    $('custom-input').focus();
  }

  function openProblem(problem, set, label, rules) {
    current = { problem, set, label, rules };
    renderSidebar();
    show('problem-view');

    $('crumb').innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = label;
    $('crumb').appendChild(strong);
    $('set-note').textContent = set ? set.description : '';
    $('set-note').hidden = !(set && set.description);

    const warn = $('problem-warn');
    warn.hidden = true;
    if (problem.error) {
      warn.hidden = false;
      warn.textContent = `This problem has a typo in problems.js: "${problem.text}". ${problem.error}`;
      $('argument').textContent = problem.text;
      $('proof').innerHTML = '';
      $('status').textContent = '';
      $('status').className = 'status';
      renderRules();
      return;
    }
    if (problem.invalid) {
      const row = Object.entries(problem.invalid).map(([k, v]) => `${k} = ${v ? 'T' : 'F'}`).join(', ');
      warn.hidden = false;
      warn.textContent = `Heads up: this argument is invalid, so it can't be proved. ` +
        `The premises are all true and the conclusion is false when ${row}.`;
    }

    const arg = $('argument');
    arg.innerHTML = '';
    if (problem.premises.length) arg.append(problem.premises.map(pretty).join(',  ') + '   ');
    const t = document.createElement('span');
    t.className = 'therefore';
    t.textContent = '∴ ';
    arg.append(t, pretty(problem.conclusion));

    steps = store.get('proof:' + problem.uid, null) || [{ text: '', just: '' }];
    renderRules();
    renderProof();
  }

  // ------------------------------------------------------------- proof table

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderProof(focus) {
    const box = $('proof');
    box.innerHTML = '';
    const head = el('div', 'row head');
    head.append(el('div', 'num', '#'), el('div', 'stmt', 'Statement'), el('div', 'just', 'Justification'), el('div'), el('div'));
    box.appendChild(head);

    const { premises } = current.problem;
    premises.forEach((f, i) => {
      const r = el('div', 'row premise');
      const stmt = el('div', 'stmt');
      stmt.appendChild(el('div', 'stmt-text', pretty(f)));
      const just = el('div', 'just');
      just.appendChild(el('div', 'just-text', 'Premise'));
      r.append(el('div', 'num', i + 1), stmt, just, el('div'), el('div'));
      box.appendChild(r);
    });

    steps.forEach((step, i) => {
      const r = el('div', 'row step');
      r.dataset.index = i;

      const stmt = el('div', 'stmt');
      const bars = el('div', 'bars');
      const si = el('input');
      si.value = step.text;
      si.setAttribute('aria-label', `Line ${premises.length + i + 1} statement`);
      si.spellcheck = false;
      si.autocomplete = 'off';
      si.dataset.col = 'text';
      stmt.append(bars, si);

      const just = el('div', 'just');
      const ji = el('input');
      ji.value = step.just;
      ji.placeholder = 'e.g. 1, 2 MP';
      ji.setAttribute('aria-label', `Line ${premises.length + i + 1} justification`);
      ji.spellcheck = false;
      ji.autocomplete = 'off';
      ji.dataset.col = 'just';
      just.appendChild(ji);

      const del = el('button', 'del', '×');
      del.title = 'Delete line';
      del.setAttribute('aria-label', 'Delete line');
      del.addEventListener('click', () => deleteStep(i));

      r.append(el('div', 'num', premises.length + i + 1), stmt, just, el('div', 'mark'), del, el('div', 'msg'));
      box.appendChild(r);

      si.addEventListener('input', () => {
        const caret = si.selectionStart;
        const before = symbolize(si.value.slice(0, caret));
        si.value = before + symbolize(si.value.slice(caret));
        si.setSelectionRange(before.length, before.length);
        step.text = si.value;
        changed();
      });
      si.addEventListener('change', () => {
        // Tidy spacing once the student leaves the box, if the statement parses.
        try { si.value = L.str(L.parse(si.value)); step.text = si.value; changed(); } catch (e) { /* leave as typed */ }
      });
      ji.addEventListener('input', () => { step.just = ji.value; changed(); });
      for (const input of [si, ji]) input.addEventListener('keydown', (e) => onKey(e, i, input));
      for (const input of [si, ji]) input.addEventListener('focus', () => { lastFocus = input; });
    });

    refresh();
    if (focus) {
      const input = box.querySelector(`.row.step[data-index="${focus.index}"] input[data-col="${focus.col || 'text'}"]`);
      if (input) input.focus();
    }
  }

  function onKey(e, i, input) {
    const col = input.dataset.col;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (col === 'text') focusCell(i, 'just');
      else if (i === steps.length - 1) addStep();
      else focusCell(i + 1, 'text');
    } else if (e.key === 'ArrowUp' && i > 0) {
      e.preventDefault();
      focusCell(i - 1, col);
    } else if (e.key === 'ArrowDown' && i < steps.length - 1) {
      e.preventDefault();
      focusCell(i + 1, col);
    } else if (e.key === 'Backspace' && col === 'text' && !steps[i].text && !steps[i].just && steps.length > 1) {
      e.preventDefault();
      deleteStep(i, true);
    }
  }

  function focusCell(i, col) {
    const input = document.querySelector(`.row.step[data-index="${i}"] input[data-col="${col}"]`);
    if (input) input.focus();
  }

  function addStep() {
    steps.push({ text: '', just: '' });
    save();
    renderProof({ index: steps.length - 1 });
  }

  function deleteStep(i, fromKeyboard) {
    steps.splice(i, 1);
    if (!steps.length) steps.push({ text: '', just: '' });
    save();
    renderProof(fromKeyboard ? { index: Math.max(0, i - 1), col: 'just' } : null);
  }

  function save() { store.set('proof:' + current.problem.uid, steps); }

  function changed() {
    save();
    refresh();
  }

  const blank = (s) => !s.text.trim() && !s.just.trim();

  function refresh() {
    // Trailing empty lines don't count against the proof.
    let n = steps.length;
    while (n > 0 && blank(steps[n - 1])) n--;
    const result = L.checkProof(current.problem, steps.slice(0, n), current.rules);

    document.querySelectorAll('.row.step').forEach((row) => {
      const i = +row.dataset.index;
      const r = result.lines[i];
      const prevDepth = i > 0 && result.lines[i - 1] ? result.lines[i - 1].depth : 0;
      const depth = r ? r.depth : prevDepth;
      row.querySelector('.bars').innerHTML = '<span></span>'.repeat(depth);
      row.classList.toggle('assume', !!(r && r.assumption));
      const touched = r && !blank(steps[i]);
      row.classList.toggle('ok', !!(touched && r.ok));
      row.classList.toggle('bad', !!(touched && !r.ok));
      row.querySelector('.mark').textContent = touched ? (r.ok ? '✓' : '✗') : '';
      row.querySelector('.msg').textContent = touched && !r.ok ? r.error : '';
    });

    const status = $('status');
    status.innerHTML = '';
    status.className = 'status' + (result.complete ? ' complete' : '');
    if (result.complete) {
      status.append('🎉 Proof complete! Nice work.');
      if (!solved[current.problem.uid]) {
        solved[current.problem.uid] = true;
        store.set('solved', solved);
        renderSidebar();
      }
      const next = nextProblem();
      if (next) {
        const b = el('button', 'btn', 'Next problem →');
        b.addEventListener('click', () => go('#/p/' + next.uid));
        status.appendChild(b);
      }
    } else {
      status.textContent = result.message;
    }
  }

  function nextProblem() {
    if (!current.set) return null;
    const idx = ordered.findIndex((e) => e.problem === current.problem);
    const rest = ordered.slice(idx + 1).concat(ordered.slice(0, idx));
    const pick = rest.find((e) => !solved[e.problem.uid] && !e.problem.error && !e.problem.invalid);
    return pick ? pick.problem : null;
  }

  // ------------------------------------------------------------- rules panel

  function renderRules() {
    const allowed = new Set(current.rules);
    const body = $('rules-body');
    body.innerHTML = '';
    const groups = [
      ['Rules of implication (whole lines only)', L.IMPLICATION_RULES.map((r) => [r, L.IMPLICATION[r].name, L.IMPLICATION[r].form])],
      ['Rules of replacement (any part of a line, either direction)', L.REPLACEMENT_RULES.map((r) => [r, L.REPLACEMENT[r].name, L.REPLACEMENT[r].forms.join('\n')])],
      ['Subproofs', ['CP', 'IP'].map((r) => [r, L.PROOF_RULES[r].name, L.PROOF_RULES[r].form])],
    ];
    for (const [title, rows] of groups) {
      body.appendChild(el('h3', '', title));
      const table = el('table', 'rule-table');
      for (const [abbr, name, form] of rows) {
        const tr = el('tr', allowed.has(abbr) ? '' : 'off');
        const f = el('td');
        form.split('\n').forEach((line, k) => { if (k) f.appendChild(document.createElement('br')); f.append(line); });
        tr.append(el('td', '', abbr), el('td', '', name), f);
        table.appendChild(tr);
      }
      body.appendChild(table);
    }
    if (allowed.size < L.ALL_RULES.length) {
      body.appendChild(el('p', 'rules-legend', "Faded rules aren't available in this set."));
    }
  }

  // ------------------------------------------------------------- toolbar

  let lastFocus = null;
  document.querySelectorAll('.palette button').forEach((b) => {
    b.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
    b.addEventListener('click', () => {
      let input = lastFocus && document.contains(lastFocus) && lastFocus.dataset.col === 'text' ? lastFocus : null;
      if (!input) input = document.querySelector('.row.step:last-child input[data-col="text"]');
      if (!input) return;
      const s = input.selectionStart ?? input.value.length;
      const e = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, s) + b.dataset.sym + input.value.slice(e);
      input.setSelectionRange(s + b.dataset.sym.length, s + b.dataset.sym.length);
      input.focus();
      input.dispatchEvent(new Event('input'));
    });
  });

  $('add-line').addEventListener('click', addStep);

  $('clear-proof').addEventListener('click', () => {
    if (!confirm('Erase your work on this problem?')) return;
    steps = [{ text: '', just: '' }];
    save();
    renderProof({ index: 0 });
  });

  $('copy-proof').addEventListener('click', () => {
    const p = current.problem;
    const lines = [current.label, ''];
    const rows = p.premises.map((f) => [pretty(f), 'Premise', 0]);
    const result = L.checkProof(p, steps, current.rules);
    steps.forEach((s, i) => rows.push([s.text, s.just, result.lines[i] ? result.lines[i].depth : 0]));
    const width = Math.max(...rows.map(([t, , d]) => t.length + d * 2)) + 4;
    rows.forEach(([t, j, d], i) => {
      const left = '| '.repeat(d) + t;
      lines.push(`${String(i + 1).padStart(2)}. ${left.padEnd(width)}${j}`);
    });
    lines.push(`    ∴ ${pretty(p.conclusion)}`);
    const text = lines.join('\n');
    const btn = $('copy-proof');
    const done = () => { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy proof'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy your proof:', text));
    else prompt('Copy your proof:', text);
  });

  $('custom-btn').addEventListener('click', () => go('#/custom'));
  $('custom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = symbolize($('custom-input').value);
    const p = L.parseArgument(text);
    if (p.error) { $('custom-error').textContent = p.error; return; }
    go('#/custom/' + encodeURIComponent(text));
  });

  $('menu-btn').addEventListener('click', () => document.body.classList.toggle('menu-open'));

  // ------------------------------------------------------------- theme

  const savedTheme = store.get('theme', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $('theme-btn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
  });

  // ------------------------------------------------------------- start

  window.addEventListener('hashchange', route);
  if (!location.hash && ordered.length) {
    const first = ordered.find((e) => !solved[e.problem.uid]) || ordered[0];
    openSets.add(first.si);
    history.replaceState(null, '', '#/p/' + first.problem.uid);
  }
  route();
})();
