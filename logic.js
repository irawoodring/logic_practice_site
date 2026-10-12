/*
 * Laker Logic Gym: propositional logic parser and proof checker.
 *
 * Uses the natural deduction system from Hurley's "A Concise Introduction to
 * Logic": 8 rules of implication, 10 rules of replacement, conditional proof
 * (CP) and indirect proof (IP).
 *
 * Works in the browser (window.Logic) and in Node (require('./logic.js')).
 */
(function (root) {
  'use strict';

  class LogicError extends Error {}

  // ---------------------------------------------------------------- formulas

  const SYMBOL = { not: '~', and: '•', or: '∨', imp: '⊃', iff: '≡' };
  const BINARY = ['and', 'or', 'imp', 'iff'];

  const Var = (name) => ({ op: 'var', name });
  const Not = (a) => ({ op: 'not', a });
  const Bin = (op, a, b) => ({ op, a, b });

  function str(f) {
    if (f.op === 'var') return f.name;
    if (f.op === 'not') return '~' + wrap(f.a);
    return wrap(f.a) + ' ' + SYMBOL[f.op] + ' ' + wrap(f.b);
  }
  function wrap(f) {
    return BINARY.includes(f.op) ? '(' + str(f) + ')' : str(f);
  }
  const eq = (x, y) => str(x) === str(y);

  // ----------------------------------------------------------------- parsing

  // Students can type plain keyboard characters; each maps to a connective.
  const TOKENS = [
    ['iff', /^(<->|<=>|<>|≡|↔|=)/],
    ['imp', /^(->|=>|⊃|→|>)/],
    ['and', /^(•|·|∙|&|\^|\*|∧|\.)/],
    ['or', /^(∨|v|\|)/],
    ['not', /^(~|¬|!|∼)/],
    ['lp', /^[([{]/],
    ['rp', /^[)\]}]/],
    ['var', /^[A-Z]/],
  ];
  const CLOSE = { '(': ')', '[': ']', '{': '}' };

  function tokenize(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const rest = s.slice(i);
      const ws = /^\s+/.exec(rest);
      if (ws) { i += ws[0].length; continue; }
      let m = null, type = null;
      for (const [t, re] of TOKENS) {
        m = re.exec(rest);
        if (m) { type = t; break; }
      }
      if (!m) {
        const hint = /[a-z]/.test(rest[0]) ? ' (use capital letters for statements)' : '';
        throw new LogicError(`Unexpected symbol "${rest[0]}"${hint}.`);
      }
      out.push({ type, text: m[0] });
      i += m[0].length;
    }
    return out;
  }

  // Grammar (as in Hurley, binary connectives must be grouped explicitly):
  //   formula := unary [binop unary]
  //   unary   := '~' unary | VAR | '(' formula ')'
  function parse(s) {
    const toks = tokenize(String(s));
    if (!toks.length) throw new LogicError('Empty statement.');
    let k = 0;

    function formula() {
      const left = unary();
      const t = toks[k];
      if (t && BINARY.includes(t.type)) {
        k++;
        const right = unary();
        const t2 = toks[k];
        if (t2 && BINARY.includes(t2.type)) {
          throw new LogicError(`Add parentheses to show how "${t.text}" and "${t2.text}" group.`);
        }
        return Bin(t.type, left, right);
      }
      return left;
    }

    function unary() {
      const t = toks[k++];
      if (!t) throw new LogicError('The statement ends too soon.');
      if (t.type === 'not') return Not(unary());
      if (t.type === 'var') return Var(t.text);
      if (t.type === 'lp') {
        const f = formula();
        const c = toks[k++];
        if (!c || c.type !== 'rp') throw new LogicError(`Missing "${CLOSE[t.text]}".`);
        if (c.text !== CLOSE[t.text]) throw new LogicError(`"${t.text}" is closed by "${c.text}".`);
        return f;
      }
      throw new LogicError(`Unexpected "${t.text}".`);
    }

    const f = formula();
    if (k < toks.length) throw new LogicError(`Unexpected "${toks[k].text}".`);
    return f;
  }

  // ------------------------------------------------------- rules of implication

  const IMPLICATION = {
    MP: { name: 'Modus Ponens', form: 'p ⊃ q, p ∴ q', n: 2,
      test: (p, q, c) => p.op === 'imp' && eq(p.a, q) && eq(p.b, c) },
    MT: { name: 'Modus Tollens', form: 'p ⊃ q, ~q ∴ ~p', n: 2,
      test: (p, q, c) => p.op === 'imp' && q.op === 'not' && eq(q.a, p.b) && c.op === 'not' && eq(c.a, p.a) },
    HS: { name: 'Hypothetical Syllogism', form: 'p ⊃ q, q ⊃ r ∴ p ⊃ r', n: 2,
      test: (p, q, c) => p.op === 'imp' && q.op === 'imp' && eq(p.b, q.a) && c.op === 'imp' && eq(c.a, p.a) && eq(c.b, q.b) },
    DS: { name: 'Disjunctive Syllogism', form: 'p ∨ q, ~p ∴ q', n: 2,
      test: (p, q, c) => p.op === 'or' && q.op === 'not' && eq(q.a, p.a) && eq(c, p.b) },
    CD: { name: 'Constructive Dilemma', form: '(p ⊃ q) • (r ⊃ s), p ∨ r ∴ q ∨ s', n: 2,
      test: (p, q, c) => p.op === 'and' && p.a.op === 'imp' && p.b.op === 'imp' && q.op === 'or' &&
        eq(q.a, p.a.a) && eq(q.b, p.b.a) && c.op === 'or' && eq(c.a, p.a.b) && eq(c.b, p.b.b) },
    Simp: { name: 'Simplification', form: 'p • q ∴ p', n: 1,
      test: (p, c) => p.op === 'and' && eq(p.a, c) },
    Conj: { name: 'Conjunction', form: 'p, q ∴ p • q', n: 2,
      test: (p, q, c) => c.op === 'and' && eq(c.a, p) && eq(c.b, q) },
    Add: { name: 'Addition', form: 'p ∴ p ∨ q', n: 1,
      test: (p, c) => c.op === 'or' && eq(c.a, p) },
  };

  // Friendly hints for the most common near-misses.
  function implicationHint(rule, fs, c) {
    const [p, q] = fs;
    if (rule === 'Simp' && p.op === 'and' && eq(p.b, c)) {
      return 'Simp only gives the left conjunct. Use Com first to swap the sides.';
    }
    if (rule === 'Add' && c.op === 'or' && eq(c.b, p)) {
      return 'Add puts the new disjunct on the right. Use Com afterward to swap the sides.';
    }
    if (rule === 'DS' && q) {
      for (const [d, n] of [[p, q], [q, p]]) {
        if (d.op === 'or' && n.op === 'not' && eq(n.a, d.b) && eq(c, d.a)) {
          return 'DS removes the left disjunct. Use Com first to swap the sides.';
        }
      }
    }
    if (rule === 'MT' && q) {
      for (const [i, n] of [[p, q], [q, p]]) {
        if (i.op === 'imp' && eq(n, i.b) && n.op !== 'not') {
          return 'MT needs the negation of the consequent, ~q.';
        }
      }
    }
    return null;
  }

  // -------------------------------------------------------- rules of replacement
  // Each generator lists every formula reachable from x by one application of
  // the rule *at the top level*, in either direction.

  const isAO = (x) => x.op === 'and' || x.op === 'or';

  const REPLACEMENT = {
    DM: { name: "De Morgan's Rule", forms: ['~(p • q) :: ~p ∨ ~q', '~(p ∨ q) :: ~p • ~q'],
      gen(x) {
        const r = [];
        if (x.op === 'not' && x.a.op === 'and') r.push(Bin('or', Not(x.a.a), Not(x.a.b)));
        if (x.op === 'not' && x.a.op === 'or') r.push(Bin('and', Not(x.a.a), Not(x.a.b)));
        if (x.op === 'or' && x.a.op === 'not' && x.b.op === 'not') r.push(Not(Bin('and', x.a.a, x.b.a)));
        if (x.op === 'and' && x.a.op === 'not' && x.b.op === 'not') r.push(Not(Bin('or', x.a.a, x.b.a)));
        return r;
      } },
    Com: { name: 'Commutativity', forms: ['p ∨ q :: q ∨ p', 'p • q :: q • p'],
      gen: (x) => (isAO(x) ? [Bin(x.op, x.b, x.a)] : []) },
    Assoc: { name: 'Associativity', forms: ['p ∨ (q ∨ r) :: (p ∨ q) ∨ r', 'p • (q • r) :: (p • q) • r'],
      gen(x) {
        const r = [];
        if (isAO(x) && x.b.op === x.op) r.push(Bin(x.op, Bin(x.op, x.a, x.b.a), x.b.b));
        if (isAO(x) && x.a.op === x.op) r.push(Bin(x.op, x.a.a, Bin(x.op, x.a.b, x.b)));
        return r;
      } },
    Dist: { name: 'Distribution', forms: ['p • (q ∨ r) :: (p • q) ∨ (p • r)', 'p ∨ (q • r) :: (p ∨ q) • (p ∨ r)'],
      gen(x) {
        const r = [];
        if (x.op === 'and' && x.b.op === 'or') r.push(Bin('or', Bin('and', x.a, x.b.a), Bin('and', x.a, x.b.b)));
        if (x.op === 'or' && x.b.op === 'and') r.push(Bin('and', Bin('or', x.a, x.b.a), Bin('or', x.a, x.b.b)));
        if (x.op === 'or' && x.a.op === 'and' && x.b.op === 'and' && eq(x.a.a, x.b.a)) {
          r.push(Bin('and', x.a.a, Bin('or', x.a.b, x.b.b)));
        }
        if (x.op === 'and' && x.a.op === 'or' && x.b.op === 'or' && eq(x.a.a, x.b.a)) {
          r.push(Bin('or', x.a.a, Bin('and', x.a.b, x.b.b)));
        }
        return r;
      } },
    DN: { name: 'Double Negation', forms: ['p :: ~~p'],
      gen(x) {
        const r = [Not(Not(x))];
        if (x.op === 'not' && x.a.op === 'not') r.push(x.a.a);
        return r;
      } },
    Trans: { name: 'Transposition', forms: ['p ⊃ q :: ~q ⊃ ~p'],
      gen(x) {
        const r = [];
        if (x.op === 'imp') r.push(Bin('imp', Not(x.b), Not(x.a)));
        if (x.op === 'imp' && x.a.op === 'not' && x.b.op === 'not') r.push(Bin('imp', x.b.a, x.a.a));
        return r;
      } },
    Impl: { name: 'Material Implication', forms: ['p ⊃ q :: ~p ∨ q'],
      gen(x) {
        const r = [];
        if (x.op === 'imp') r.push(Bin('or', Not(x.a), x.b));
        if (x.op === 'or' && x.a.op === 'not') r.push(Bin('imp', x.a.a, x.b));
        return r;
      } },
    Equiv: { name: 'Material Equivalence', forms: ['p ≡ q :: (p ⊃ q) • (q ⊃ p)', 'p ≡ q :: (p • q) ∨ (~p • ~q)'],
      gen(x) {
        const r = [];
        if (x.op === 'iff') {
          r.push(Bin('and', Bin('imp', x.a, x.b), Bin('imp', x.b, x.a)));
          r.push(Bin('or', Bin('and', x.a, x.b), Bin('and', Not(x.a), Not(x.b))));
        }
        if (x.op === 'and' && x.a.op === 'imp' && x.b.op === 'imp' && eq(x.a.a, x.b.b) && eq(x.a.b, x.b.a)) {
          r.push(Bin('iff', x.a.a, x.a.b));
        }
        if (x.op === 'or' && x.a.op === 'and' && x.b.op === 'and' && x.b.a.op === 'not' && x.b.b.op === 'not' &&
            eq(x.a.a, x.b.a.a) && eq(x.a.b, x.b.b.a)) {
          r.push(Bin('iff', x.a.a, x.a.b));
        }
        return r;
      } },
    Exp: { name: 'Exportation', forms: ['(p • q) ⊃ r :: p ⊃ (q ⊃ r)'],
      gen(x) {
        const r = [];
        if (x.op === 'imp' && x.a.op === 'and') r.push(Bin('imp', x.a.a, Bin('imp', x.a.b, x.b)));
        if (x.op === 'imp' && x.b.op === 'imp') r.push(Bin('imp', Bin('and', x.a, x.b.a), x.b.b));
        return r;
      } },
    Taut: { name: 'Tautology', forms: ['p :: p ∨ p', 'p :: p • p'],
      gen(x) {
        const r = [Bin('or', x, x), Bin('and', x, x)];
        if (isAO(x) && eq(x.a, x.b)) r.push(x.a);
        return r;
      } },
  };

  // True when y is x with exactly one subformula rewritten by the rule.
  function replaces(x, y, gen) {
    if (gen(x).some((g) => eq(g, y))) return true;
    if (x.op !== y.op || x.op === 'var') return false;
    if (x.op === 'not') return replaces(x.a, y.a, gen);
    return (eq(x.a, y.a) && replaces(x.b, y.b, gen)) || (eq(x.b, y.b) && replaces(x.a, y.a, gen));
  }

  const PROOF_RULES = {
    CP: { name: 'Conditional Proof', form: 'Assume p (ACP), derive q, conclude p ⊃ q' },
    IP: { name: 'Indirect Proof', form: 'Assume p (AIP), derive q • ~q, conclude ~p' },
  };

  const IMPLICATION_RULES = Object.keys(IMPLICATION);
  const REPLACEMENT_RULES = Object.keys(REPLACEMENT);
  const ALL_RULES = [...IMPLICATION_RULES, ...REPLACEMENT_RULES, 'CP', 'IP'];

  const ALIASES = {};
  for (const r of ALL_RULES) ALIASES[r.toLowerCase()] = r;
  Object.assign(ALIASES, { comm: 'Com', imp: 'Impl', contra: 'Trans', contrap: 'Trans', taut: 'Taut' });

  const canonicalRule = (name) => ALIASES[String(name).toLowerCase()] || null;

  // "implication", "replacement" and "all" expand to groups of rules.
  function parseRuleList(text) {
    const rules = new Set();
    const unknown = [];
    for (const word of text.split(/[\s,]+/).filter(Boolean)) {
      const w = word.toLowerCase();
      if (w === 'all') ALL_RULES.forEach((r) => rules.add(r));
      else if (w === 'implication') IMPLICATION_RULES.forEach((r) => rules.add(r));
      else if (w === 'replacement') REPLACEMENT_RULES.forEach((r) => rules.add(r));
      else if (canonicalRule(w)) rules.add(canonicalRule(w));
      else unknown.push(word);
    }
    return { rules: ALL_RULES.filter((r) => rules.has(r)), unknown };
  }

  // ------------------------------------------------------------ justifications

  function parseJustification(s) {
    s = String(s || '').trim();
    let m;
    if (!s) return { error: 'Add a justification, e.g. "1, 2 MP".' };
    if ((m = /^(ACP|AIP)$/i.exec(s))) return { kind: 'assume', rule: m[1].toUpperCase() };
    if ((m = /^(\d+)\s*[-–—]\s*(\d+)\s*,?\s*(CP|IP)$/i.exec(s))) {
      return { kind: 'discharge', from: +m[1], to: +m[2], rule: m[3].toUpperCase() };
    }
    if (/^(CP|IP)$/i.test(s)) return { error: `Cite the subproof's lines, e.g. "3-5 ${s.toUpperCase()}".` };
    if ((m = /^(\d+(?:\s*[,\s]\s*\d+)*)\s*,?\s*([A-Za-z]+)\.?$/.exec(s))) {
      return { kind: 'rule', lines: m[1].split(/[\s,]+/).map(Number), rule: m[2] };
    }
    if ((m = /^([A-Za-z]+)\.?\s*,?\s*(\d+(?:\s*[,\s]\s*\d+)*)$/.exec(s))) {
      return { kind: 'rule', lines: m[2].split(/[\s,]+/).map(Number), rule: m[1] };
    }
    if (/^[A-Za-z]+$/.test(s)) return { error: `Say which lines ${s} uses, e.g. "1, 2 ${s}".` };
    return { error: 'Write justifications like "1, 2 MP", "3 DM", "ACP" or "4-6 CP".' };
  }

  const isContradiction = (f) => f.op === 'and' && (eq(f.b, Not(f.a)) || eq(f.a, Not(f.b)));
  const isPrefix = (a, b) => a.length <= b.length && a.every((x, i) => x === b[i]);

  // --------------------------------------------------------------- the checker

  /**
   * problem: { premises: [formula], conclusion: formula }
   * steps:   [{ text, just }] for the lines after the premises
   * allowed: array of rule names (defaults to every rule)
   *
   * Returns { lines: [{ line, depth, ok, error, formula, assumption }],
   *           complete, message }
   * Line numbers count the premises first, as in the textbook.
   */
  function checkProof(problem, steps, allowed) {
    const allowedSet = new Set(allowed || ALL_RULES);
    const all = problem.premises.map((f) => ({ formula: f, scope: [] }));
    const stack = [];
    let nextId = 1;
    const results = [];

    steps.forEach((step, idx) => {
      const lineNo = problem.premises.length + idx + 1;
      const res = { line: lineNo, depth: 0, ok: false, error: null, formula: null, assumption: false };
      const fail = (msg) => { if (!res.error) res.error = msg; };

      let formula = null;
      try { formula = parse(step.text); } catch (e) { fail(e.message); }
      res.formula = formula;

      const j = parseJustification(step.just);
      const scope = () => stack.map((s) => s.id);

      if (j.error) {
        fail(j.error);
      } else if (j.kind === 'assume') {
        res.assumption = true;
        const r = j.rule === 'ACP' ? 'CP' : 'IP';
        if (!allowedSet.has(r)) fail(`${r} (${PROOF_RULES[r].name}) isn't available in this set.`);
        stack.push({ id: nextId++, start: lineNo, rule: j.rule });
      } else if (j.kind === 'discharge') {
        const top = stack[stack.length - 1];
        if (!allowedSet.has(j.rule)) fail(`${j.rule} (${PROOF_RULES[j.rule].name}) isn't available in this set.`);
        if (!top) {
          fail('There is no open subproof to close. Start one with ACP or AIP.');
        } else {
          stack.pop();
          const range = `${top.start}-${lineNo - 1} ${j.rule}`;
          if (j.from !== top.start || j.to !== lineNo - 1) {
            fail(`This closes the subproof that starts on line ${top.start}, so cite "${range}".`);
          } else {
            const A = all[top.start - 1].formula;
            const B = all[lineNo - 2].formula;
            if (!A || !B) {
              fail('Fix the errors inside the subproof first.');
            } else if (formula && j.rule === 'CP') {
              const want = Bin('imp', A, B);
              if (!eq(formula, want)) fail(`CP on lines ${top.start}-${lineNo - 1} gives ${str(want)}.`);
            } else if (formula && j.rule === 'IP') {
              if (!isContradiction(B)) {
                fail(`Line ${lineNo - 1} must be a contradiction of the form p • ~p.`);
              } else if (!(eq(formula, Not(A)) || (A.op === 'not' && eq(formula, A.a)))) {
                fail(`IP on lines ${top.start}-${lineNo - 1} gives ${str(Not(A))}.`);
              }
            }
          }
        }
      } else {
        const rule = canonicalRule(j.rule);
        if (!rule) {
          fail(`Unknown rule "${j.rule}".`);
        } else if (rule === 'CP' || rule === 'IP') {
          fail(`Cite the subproof's lines, e.g. "3-5 ${rule}".`);
        } else if (!allowedSet.has(rule)) {
          fail(`${rule} isn't available in this set.`);
        } else {
          const def = IMPLICATION[rule] || REPLACEMENT[rule];
          const need = IMPLICATION[rule] ? def.n : 1;
          const here = scope();
          for (const c of j.lines) {
            if (c < 1 || c >= lineNo) fail(`Line ${c} isn't an earlier line.`);
            else if (!isPrefix(all[c - 1].scope, here)) fail(`Line ${c} is inside a closed subproof, so it can't be used here.`);
            else if (!all[c - 1].formula) fail(`Line ${c} has an error.`);
          }
          if (j.lines.length !== need) {
            fail(`${rule} cites ${need} line${need > 1 ? 's' : ''}.`);
          }
          if (!res.error && formula) {
            const fs = j.lines.map((c) => all[c - 1].formula);
            let ok;
            if (IMPLICATION[rule]) {
              ok = need === 1 ? def.test(fs[0], formula)
                : def.test(fs[0], fs[1], formula) || def.test(fs[1], fs[0], formula);
            } else {
              ok = replaces(fs[0], formula, def.gen);
            }
            if (!ok) {
              const form = IMPLICATION[rule] ? def.form : def.forms.join('; ');
              const hint = IMPLICATION[rule] ? implicationHint(rule, fs, formula) : null;
              fail(hint || `This doesn't follow from line${need > 1 ? 's' : ''} ${j.lines.join(', ')} by ${rule} (${form}).`);
            }
          }
        }
      }

      res.depth = stack.length;
      res.ok = !res.error;
      results.push(res);
      all.push({ formula, scope: scope() });
    });

    let complete = false, message = '';
    const last = results[results.length - 1];
    if (!results.length) {
      message = 'Add lines to build your proof.';
    } else if (results.some((r) => !r.ok)) {
      message = 'Fix the lines marked with errors.';
    } else if (stack.length) {
      message = `Close the subproof that starts on line ${stack[stack.length - 1].start} with CP or IP.`;
    } else if (!eq(last.formula, problem.conclusion)) {
      message = `Every line checks out. Keep going until you reach ${str(problem.conclusion)}.`;
    } else {
      complete = true;
      message = 'Proof complete!';
    }
    return { lines: results, complete, message };
  }

  // ------------------------------------------------------------- truth tables

  function variables(f, set = new Set()) {
    if (f.op === 'var') set.add(f.name);
    else if (f.op === 'not') variables(f.a, set);
    else { variables(f.a, set); variables(f.b, set); }
    return set;
  }

  function evaluate(f, v) {
    switch (f.op) {
      case 'var': return v[f.name];
      case 'not': return !evaluate(f.a, v);
      case 'and': return evaluate(f.a, v) && evaluate(f.b, v);
      case 'or': return evaluate(f.a, v) || evaluate(f.b, v);
      case 'imp': return !evaluate(f.a, v) || evaluate(f.b, v);
      default: return evaluate(f.a, v) === evaluate(f.b, v);
    }
  }

  // Returns null if the argument is valid, otherwise a counterexample row.
  function counterexample(premises, conclusion) {
    const set = new Set();
    [...premises, conclusion].forEach((f) => variables(f, set));
    const names = [...set].sort();
    if (names.length > 16) return null;
    for (let mask = 0; mask < 1 << names.length; mask++) {
      const v = {};
      names.forEach((n, i) => { v[n] = !(mask & (1 << (names.length - 1 - i))); });
      if (premises.every((p) => evaluate(p, v)) && !evaluate(conclusion, v)) return v;
    }
    return null;
  }

  // ------------------------------------------------------------- problem files

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // "P ⊃ Q, P / Q" -> { premises, conclusion, id } (or { error })
  function parseArgument(line) {
    const parts = line.split(/\/|∴/);
    if (parts.length !== 2) {
      return { text: line, error: 'Write the problem as "premise, premise / conclusion".' };
    }
    try {
      const premises = parts[0].trim() ? parts[0].split(',').map((p) => parse(p)) : [];
      const conclusion = parse(parts[1]);
      const key = premises.map(str).join(', ') + ' / ' + str(conclusion);
      const cx = counterexample(premises, conclusion);
      return { text: line, premises, conclusion, id: hash(key), key, invalid: cx };
    } catch (e) {
      return { text: line, error: e.message };
    }
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'set';
  }

  function parseProblemFile(text) {
    const sets = [];
    let cur = null;
    const newSet = (title) => {
      cur = { title, slug: slug(title), description: '', rules: ALL_RULES.slice(), ruleErrors: [], problems: [] };
      sets.push(cur);
    };
    String(text).split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line || line.startsWith('//')) return;
      if ((m = /^#+\s*(.+)$/.exec(line))) { newSet(m[1].trim()); return; }
      if (!cur) newSet('Problems');
      if ((m = /^rules\s*:(.*)$/i.exec(line))) {
        const r = parseRuleList(m[1]);
        cur.rules = r.rules;
        cur.ruleErrors = r.unknown;
        return;
      }
      if ((m = /^(?:note|description|about)\s*:(.*)$/i.exec(line))) {
        cur.description += (cur.description ? ' ' : '') + m[1].trim();
        return;
      }
      cur.problems.push(parseArgument(line));
    });
    return sets;
  }

  const api = {
    LogicError, parse, str, eq, Var, Not, Bin, SYMBOL,
    IMPLICATION, REPLACEMENT, PROOF_RULES, IMPLICATION_RULES, REPLACEMENT_RULES, ALL_RULES,
    canonicalRule, parseRuleList, parseJustification, checkProof,
    counterexample, parseArgument, parseProblemFile, hash,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : this);
