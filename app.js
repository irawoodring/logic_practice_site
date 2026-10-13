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

  // Shown when generated.js is missing: the site was published without running build.js.
  const NOT_BUILT = location.protocol === 'file:'
    ? 'Nothing loaded yet. Run "node build.js" in this folder, then reload.'
    : 'Nothing loaded: the site was published without its build step. ' +
      'In the GitHub repository, open Settings → Pages and set Source to "GitHub Actions".';

  // ------------------------------------------------------------- state

  let current = null;   // { problem, set, label, rules }
  let steps = [];
  const openSets = new Set();

  // ------------------------------------------------------------- symbols

  const SYMS = { '<->': '≡', '<=>': '≡', '<>': '≡', '=': '≡', '->': '⊃', '=>': '⊃', '>': '⊃',
    '&': '•', '*': '•', '^': '•', '.': '•', 'v': '∨', '!': '~' };
  // Converts keyboard shortcuts to symbols and capitalizes a lone lowercase
  // letter (a statement), leaving terms like the "a" in "Fa" and x, y, z alone.
  const symbolize = (s) => s
    .replace(/<->|<=>|<>|->|=>|>|=|&|\*|\^|\.|v|!/g, (m) => SYMS[m])
    .replace(/(^|[^A-Za-z])([a-uw])(?![A-Za-z])/g, (m, before, c) => before + c.toUpperCase());

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
      s.firstChild.textContent = `${si + 1}. ${set.title}` + (set.ruleErrors.length ? ' ⚠' : '');
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
    $('progress-summary').textContent = total ? `${done} of ${total} problems solved` : NOT_BUILT;
  }

  // ------------------------------------------------------------- views

  function show(view) {
    for (const v of ['problem-view', 'custom-view', 'glossary-view', 'welcome-view']) $(v).hidden = v !== view;
    $('vocab-link').classList.toggle('active', view === 'glossary-view');
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
      openProblem(e.problem, e.set, `${e.si + 1}. ${e.set.title} · Problem ${e.pi + 1}`, e.set.rules);
    } else if ((m = /^\/custom(tt)?\/(.+)$/.exec(h))) {
      const tt = !!m[1];
      const p = tt ? L.parseTruthTable(m[2]) : L.parseArgument(m[2]);
      if (p.error) { showCustom(m[2], p.error, tt); return; }
      p.uid = 'custom-' + p.id;
      openProblem(p, null, tt ? 'Your own truth table' : 'Your own argument', L.ALL_RULES);
    } else if (h === '/glossary') {
      current = null;
      renderSidebar();
      show('glossary-view');
      renderGlossary();
    } else if (h === '/custom') {
      showCustom('', '', false);
    } else {
      current = null;
      renderSidebar();
      show('welcome-view');
    }
  }

  function showCustom(text, error, tt) {
    current = null;
    renderSidebar();
    document.querySelector(`input[name=mode][value=${tt ? 'tt' : 'proof'}]`).checked = true;
    customHelp();
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

    const tt = problem.type === 'truthtable';
    $('proof-area').hidden = tt || !!problem.error;
    $('tt-area').hidden = !tt || !!problem.error;
    document.body.classList.toggle('predicate', !!problem.predicate);

    const warn = $('problem-warn');
    warn.hidden = true;
    if (problem.error) {
      warn.hidden = false;
      warn.textContent = `This problem has a typo in the problems/ folder: "${problem.text}". ${problem.error}`;
      $('argument').textContent = problem.text;
      return;
    }
    if (problem.invalid) {
      warn.hidden = false;
      warn.textContent = `Heads up: this argument is invalid, so it can't be proved. ` +
        `The premises can all be true while the conclusion is false, ${problem.invalid}.`;
    }
    if (tt) { openTruthTable(problem, set); return; }

    const arg = $('argument');
    arg.innerHTML = '';
    if (problem.premises.length) arg.append(problem.premises.map(pretty).join(',  ') + '   ');
    const t = document.createElement('span');
    t.className = 'therefore';
    t.textContent = '∴ ';
    arg.append(t, pretty(problem.conclusion));

    steps = store.get('proof:' + problem.uid, null) || [{ text: '', just: '' }];
    // Keep the instructions open until the student has finished a proof.
    $('howto').open = !Object.keys(solved).length;
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
      si.placeholder = i === 0 ? 'Type a statement, e.g. P' : 'Statement';
      si.autocomplete = 'off';
      si.dataset.col = 'text';
      stmt.append(bars, si);

      const just = el('div', 'just');
      const ji = el('input');
      ji.value = step.just;
      ji.placeholder = i === 0 ? 'e.g. 1 Simp' : 'e.g. 1, 2 MP';
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
      markSolved();
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
    if (current.problem.predicate) {
      groups.splice(2, 0, ['Quantifier rules (UI, UG, EI, EG on whole lines; QN anywhere)', L.QUANTIFIER_RULES.map((r) =>
        [r, L.QUANTIFIER[r].name, L.QUANTIFIER[r].form || L.QUANTIFIER[r].forms.join('\n')])]);
    }
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

  // ------------------------------------------------------------- truth tables

  let tt = null; // { problem, columns: [{ formula, statement, main, start }], answers, choice }

  function openTruthTable(problem, set) {
    const mode = set ? set.columns : 'all';
    const names = problem.kind === 'argument'
      ? problem.statements.map((_, i) => (i === problem.statements.length - 1 ? 'Conclusion' : `Premise ${i + 1}`))
      : problem.statements.map((_, i) => (problem.statements.length > 1 ? `Statement ${i + 1}` : 'Statement'));
    const columns = [];
    problem.statements.forEach((f, si) => {
      L.tableColumns(f, mode).forEach((c, k) => {
        columns.push({ formula: c, statement: si, main: L.eq(c, f), start: k === 0 });
      });
    });
    const saved = store.get('tt:' + problem.uid, null) || {};
    tt = { problem, columns, names, answers: saved.answers || {}, choice: saved.choice || '' };

    const arg = $('argument');
    arg.innerHTML = '';
    if (problem.kind === 'argument') {
      const last = problem.statements.length - 1;
      arg.append(problem.statements.slice(0, last).map(pretty).join(',  ') + '   ');
      const t = el('span', 'therefore', '∴ ');
      arg.append(t, pretty(problem.statements[last]));
    } else {
      arg.append(problem.statements.map(pretty).join(',    '));
    }
    renderTruthTable();
  }

  function renderTruthTable() {
    const { problem, columns, names } = tt;
    const table = $('tt');
    table.innerHTML = '';
    const thead = el('thead');
    const top = el('tr');
    const letters = el('th', '', '');
    letters.colSpan = problem.letters.length;
    top.appendChild(letters);
    names.forEach((name, si) => {
      const th = el('th', 'start', name);
      th.colSpan = columns.filter((c) => c.statement === si).length;
      top.appendChild(th);
    });
    const head = el('tr');
    problem.letters.forEach((l) => head.appendChild(el('th', '', l)));
    columns.forEach((c) => head.appendChild(el('th', (c.start ? 'start ' : '') + (c.main ? 'main' : ''), pretty(c.formula))));
    thead.append(top, head);

    const tbody = el('tbody');
    problem.rows.forEach((row, r) => {
      const tr = el('tr');
      problem.letters.forEach((l) => tr.appendChild(el('td', 'given', row[l] ? 'T' : 'F')));
      columns.forEach((c, ci) => {
        const td = el('td', (c.start ? 'start ' : '') + (c.main ? 'main' : ''));
        const b = el('button', 'cell', tt.answers[`${ci}-${r}`] || '');
        b.dataset.c = ci;
        b.dataset.r = r;
        b.setAttribute('aria-label', `${pretty(c.formula)}, row ${r + 1}`);
        b.addEventListener('click', () => {
          const order = ['', 'T', 'F'];
          setCell(b, order[(order.indexOf(b.textContent) + 1) % 3]);
        });
        b.addEventListener('keydown', (e) => cellKey(e, ci, r, b));
        td.appendChild(b);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);

    const fs = $('tt-choices');
    fs.innerHTML = '';
    fs.appendChild(el('legend', '', problem.kind === 'argument' ? 'The argument is'
      : problem.kind === 'statement' ? 'The statement is' : 'The statements are'));
    problem.choices.forEach((choice) => {
      const label = el('label');
      const input = el('input');
      input.type = 'radio';
      input.name = 'tt-choice';
      input.value = choice;
      input.checked = tt.choice === choice;
      input.addEventListener('change', () => { tt.choice = choice; saveTT(); clearMarks(); });
      label.append(input, choice);
      fs.appendChild(label);
    });
    clearMarks();
  }

  function setCell(b, value) {
    b.textContent = value;
    b.classList.remove('right', 'wrong', 'missing');
    const key = `${b.dataset.c}-${b.dataset.r}`;
    if (value) tt.answers[key] = value;
    else delete tt.answers[key];
    saveTT();
  }

  function cellKey(e, c, r, b) {
    const k = e.key.toLowerCase();
    const move = (dc, dr) => {
      const next = document.querySelector(`#tt .cell[data-c="${c + dc}"][data-r="${r + dr}"]`);
      if (next) next.focus();
    };
    if (k === 't' || k === 'f') { setCell(b, k.toUpperCase()); move(0, 1); e.preventDefault(); }
    else if (k === 'backspace' || k === 'delete') { setCell(b, ''); e.preventDefault(); }
    else if (k === 'arrowdown') { move(0, 1); e.preventDefault(); }
    else if (k === 'arrowup') { move(0, -1); e.preventDefault(); }
    else if (k === 'arrowright') { move(1, 0); e.preventDefault(); }
    else if (k === 'arrowleft') { move(-1, 0); e.preventDefault(); }
  }

  function saveTT() { store.set('tt:' + tt.problem.uid, { answers: tt.answers, choice: tt.choice }); }

  function clearMarks() {
    document.querySelectorAll('#tt-choices label').forEach((l) => l.classList.remove('right', 'wrong'));
    const status = $('tt-status');
    status.className = 'status';
    status.textContent = solved[tt.problem.uid]
      ? 'You solved this one already. Check again any time.'
      : 'Fill in every cell, choose an answer, then check your table.';
  }

  function checkTruthTable() {
    let wrong = 0, missing = 0;
    document.querySelectorAll('#tt .cell').forEach((b) => {
      const col = tt.columns[+b.dataset.c];
      const want = L.evaluate(col.formula, tt.problem.rows[+b.dataset.r]) ? 'T' : 'F';
      b.classList.remove('right', 'wrong', 'missing');
      if (!b.textContent) { missing++; b.classList.add('missing'); }
      else if (b.textContent === want) b.classList.add('right');
      else { wrong++; b.classList.add('wrong'); }
    });
    const choiceOk = tt.choice === tt.problem.answer;
    document.querySelectorAll('#tt-choices label').forEach((l) => {
      const v = l.querySelector('input').value;
      if (v === tt.choice) l.classList.add(choiceOk ? 'right' : 'wrong');
    });

    const status = $('tt-status');
    status.innerHTML = '';
    if (!wrong && !missing && choiceOk) {
      status.className = 'status complete';
      status.append('🎉 Truth table complete! Nice work.');
      markSolved();
      return;
    }
    status.className = 'status';
    const parts = [];
    if (wrong) parts.push(`${wrong} cell${wrong > 1 ? 's are' : ' is'} wrong`);
    if (missing) parts.push(`${missing} cell${missing > 1 ? 's are' : ' is'} empty`);
    if (!tt.choice) parts.push('you still need to choose an answer');
    else if (!choiceOk) parts.push(`"${tt.choice}" isn't right`);
    const msg = parts.join(', ');
    status.textContent = msg[0].toUpperCase() + msg.slice(1) + '.';
  }

  // Records a solved problem and offers the next one in the status box.
  function markSolved() {
    const status = current.problem.type === 'truthtable' ? $('tt-status') : $('status');
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
  }

  $('tt-check').addEventListener('click', checkTruthTable);
  $('tt-clear').addEventListener('click', () => {
    if (!confirm('Erase your table?')) return;
    tt.answers = {};
    tt.choice = '';
    saveTT();
    renderTruthTable();
  });

  // ------------------------------------------------------------- glossary

  const glossary = window.GLOSSARY || [];

  // Appends text to parent, wrapping each case-insensitive match of q in <mark>.
  function appendHighlighted(parent, text, q) {
    if (!q) { parent.append(text); return; }
    const lower = text.toLowerCase();
    let i = 0, j;
    while ((j = lower.indexOf(q, i)) !== -1) {
      parent.append(text.slice(i, j), el('mark', '', text.slice(j, j + q.length)));
      i = j + q.length;
    }
    parent.append(text.slice(i));
  }

  function renderGlossary() {
    const q = $('glossary-search').value.trim().toLowerCase();
    const body = $('glossary-body');
    const topics = $('glossary-topics');
    body.innerHTML = '';
    topics.innerHTML = '';
    let shown = 0;
    glossary.forEach((topic, ti) => {
      const terms = topic.terms.filter((t) => !q ||
        t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
      if (!terms.length) return;
      shown += terms.length;

      const section = el('section', 'glossary-topic');
      section.id = 'topic-' + ti;
      section.appendChild(el('h3', '', topic.title));
      if (topic.note && !q) section.appendChild(el('p', 'note', topic.note));
      const dl = el('dl');
      for (const t of terms) {
        const dt = el('dt');
        appendHighlighted(dt, t.term, q);
        const dd = el('dd');
        appendHighlighted(dd, t.definition, q);
        dl.append(dt, dd);
      }
      section.appendChild(dl);
      body.appendChild(section);

      const chip = el('button', 'chip', topic.title);
      chip.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      topics.appendChild(chip);
    });
    $('glossary-empty').hidden = shown > 0;
    $('glossary-empty').textContent = glossary.length ? 'No matching terms.' : NOT_BUILT;
  }

  $('glossary-search').addEventListener('input', renderGlossary);

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
  const customTT = () => document.querySelector('input[name=mode]:checked').value === 'tt';
  function customHelp() {
    $('custom-help').textContent = customTT()
      ? 'Type one statement, several statements separated by commas, or an argument (premises / conclusion).'
      : 'Type the premises separated by commas, then a slash, then the conclusion. All rules are available.';
    $('custom-input').placeholder = customTT() ? 'P > Q, ~Q > ~P' : 'P > Q, Q > R / P > R';
  }
  document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', customHelp));
  $('custom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = symbolize($('custom-input').value);
    const p = customTT() ? L.parseTruthTable(text) : L.parseArgument(text);
    if (p.error) { $('custom-error').textContent = p.error; return; }
    go((customTT() ? '#/customtt/' : '#/custom/') + encodeURIComponent(text));
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
