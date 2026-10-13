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

  // Atoms: a capital letter followed by zero or more lowercase terms. "P" is a
  // simple statement; "Fa" and "Lxy" are predicates applied to terms.
  const Var = (name, args = []) => ({ op: 'var', name, args });
  // Quantifiers: op 'all' is (x), op 'some' is (∃x).
  const Quant = (op, v, a) => ({ op, v, a });
  const isVariable = (t) => /^[xyz]$/.test(t);
  const Not = (a) => ({ op: 'not', a });
  const Bin = (op, a, b) => ({ op, a, b });

  function str(f) {
    if (f.op === 'var') return f.name + f.args.join('');
    if (f.op === 'not') return '~' + wrap(f.a);
    if (f.op === 'all') return '(' + f.v + ')' + wrap(f.a);
    if (f.op === 'some') return '(∃' + f.v + ')' + wrap(f.a);
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
    // (x) and ∀x are universal; (∃x), ∃x and (Ex) are existential. "(Ex)" only
    // counts as a quantifier when a formula follows it; otherwise it is the atom Ex.
    ['all', /^(?:\(\s*∀?\s*([xyz])\s*\)|∀\s*([xyz]))/],
    ['some', /^(?:\(\s*∃\s*([xyz])\s*\)|∃\s*([xyz])|\(\s*E\s*([xyz])\s*\)(?=\s*[~¬!∼([{A-Z∀∃]))/],
    ['lp', /^[([{]/],
    ['rp', /^[)\]}]/],
    ['var', /^[A-Z][a-uw-z]*/],
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
        const hint = /[a-z]/.test(rest[0])
          ? ' (capital letters stand for statements and predicates; lowercase letters go right after a predicate, like Fa)'
          : '';
        throw new LogicError(`Unexpected symbol "${rest[0]}"${hint}.`);
      }
      out.push({ type, text: m[0], v: m[1] || m[2] || m[3] });
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
      if (t.type === 'var') return Var(t.text[0], t.text.slice(1).split(''));
      if (t.type === 'all' || t.type === 'some') return Quant(t.type, t.v, unary());
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
    if (x.op === 'all' || x.op === 'some') return x.v === y.v && replaces(x.a, y.a, gen);
    return (eq(x.a, y.a) && replaces(x.b, y.b, gen)) || (eq(x.b, y.b) && replaces(x.a, y.a, gen));
  }

  // ------------------------------------------------------- quantifier rules

  function freeVars(f, bound = new Set(), out = new Set()) {
    if (f.op === 'var') f.args.forEach((t) => { if (isVariable(t) && !bound.has(t)) out.add(t); });
    else if (f.op === 'not') freeVars(f.a, bound, out);
    else if (f.op === 'all' || f.op === 'some') freeVars(f.a, new Set([...bound, f.v]), out);
    else { freeVars(f.a, bound, out); freeVars(f.b, bound, out); }
    return out;
  }

  function constants(f, out = new Set()) {
    if (f.op === 'var') f.args.forEach((t) => { if (!isVariable(t)) out.add(t); });
    else if (f.op === 'not' || f.op === 'all' || f.op === 'some') constants(f.a, out);
    else { constants(f.a, out); constants(f.b, out); }
    return out;
  }

  const isPredicate = (f) => f.op === 'all' || f.op === 'some' || (f.op === 'var' ? f.args.length > 0
    : f.op === 'not' ? isPredicate(f.a) : isPredicate(f.a) || isPredicate(f.b));

  // Does `target` equal `body` with every free x replaced by one term t?
  // Returns { t } (t is null when x never occurs free) or null. A variable t
  // that would be captured by a quantifier inside body doesn't count.
  function instance(body, target, x) {
    let t = null;
    function go(b, f, bound) {
      if (b.op !== f.op) return false;
      if (b.op === 'var') {
        if (b.name !== f.name || b.args.length !== f.args.length) return false;
        return b.args.every((ba, i) => {
          const fa = f.args[i];
          if (ba !== x || bound.has(x)) return ba === fa;
          if (isVariable(fa) && bound.has(fa)) return false;
          if (t === null) t = fa;
          return t === fa;
        });
      }
      if (b.op === 'not') return go(b.a, f.a, bound);
      if (b.op === 'all' || b.op === 'some') return b.v === f.v && go(b.a, f.a, new Set([...bound, b.v]));
      return go(b.a, f.a, bound) && go(b.b, f.b, bound);
    }
    return go(body, target, new Set()) ? { t } : null;
  }

  const QUANTIFIER = {
    UI: { name: 'Universal Instantiation', form: '(x)ℱx ∴ ℱy  or  ℱa' },
    UG: { name: 'Universal Generalization', form: 'ℱy ∴ (x)ℱx  (y a variable, with restrictions)' },
    EI: { name: 'Existential Instantiation', form: '(∃x)ℱx ∴ ℱa  (a must be a new name)' },
    EG: { name: 'Existential Generalization', form: 'ℱa  or  ℱy ∴ (∃x)ℱx' },
    QN: { name: 'Quantifier Negation', forms: ['(x)ℱx :: ~(∃x)~ℱx', '(∃x)ℱx :: ~(x)~ℱx', '~(x)ℱx :: (∃x)~ℱx', '~(∃x)ℱx :: (x)~ℱx'],
      gen(x) {
        const flip = { all: 'some', some: 'all' };
        const r = [];
        if (flip[x.op]) {
          r.push(Not(Quant(flip[x.op], x.v, Not(x.a))));
          if (x.a.op === 'not') r.push(Not(Quant(flip[x.op], x.v, x.a.a)));
        }
        if (x.op === 'not' && flip[x.a.op]) {
          r.push(Quant(flip[x.a.op], x.a.v, Not(x.a.a)));
          if (x.a.a.op === 'not') r.push(Quant(flip[x.a.op], x.a.v, x.a.a.a));
        }
        return r;
      } },
  };

  // Checks UI, UG, EI and EG. Returns an error message or null.
  // ctx: { earlier: formulas of all earlier lines, conclusion,
  //        guarded: formulas whose free variables UG may not generalize on,
  //        eiLines: accessible lines obtained by EI }
  function checkQuantifierRule(rule, p, c, ctx) {
    const q = rule === 'UI' || rule === 'EI' ? p : c;
    const want = rule === 'EI' || rule === 'EG' ? 'some' : 'all';
    if (q.op !== want) {
      const shape = want === 'all' ? '(x)' : '(∃x)';
      return rule === 'UI' || rule === 'EI'
        ? `${rule} works on a line that starts with ${shape}, applied to the whole line.`
        : `${rule} produces a line that starts with ${shape}.`;
    }
    const m = rule === 'UI' || rule === 'EI' ? instance(q.a, c, q.v) : instance(q.a, p, q.v);
    if (!m) {
      return rule === 'UI' || rule === 'EI'
        ? `Drop the quantifier and replace every ${q.v} it binds with the same name or variable.`
        : `Every ${q.v} the new quantifier binds must stand where the cited line has one and the same name or variable.`;
    }
    const t = m.t;
    if (rule === 'EI' && t) {
      if (isVariable(t)) return 'EI must use a name (a, b, c, ...), not a variable.';
      if (ctx.earlier.some((f) => f && constants(f).has(t)) || constants(ctx.conclusion).has(t)) {
        return `EI needs a name that's new to the proof, but ${t} already appears earlier or in the conclusion.`;
      }
    }
    if (rule === 'UG' && t) {
      if (!isVariable(t)) return `UG can't generalize from a name like ${t}. Instantiate with a variable (x, y, z) instead.`;
      if (freeVars(c).has(t)) return `UG must replace every free ${t}.`;
      if (ctx.guarded.some((f) => freeVars(f).has(t))) {
        return `UG can't generalize on ${t} here: ${t} is free in a premise or in the assumption of an open subproof.`;
      }
      if (ctx.eiLines.some((f) => freeVars(f).has(t))) {
        return `UG can't generalize on ${t}: ${t} is free in a line obtained by EI.`;
      }
    }
    return null;
  }

  const PROOF_RULES = {
    CP: { name: 'Conditional Proof', form: 'Assume p (ACP), derive q, conclude p ⊃ q' },
    IP: { name: 'Indirect Proof', form: 'Assume p (AIP), derive q • ~q, conclude ~p' },
  };

  const IMPLICATION_RULES = Object.keys(IMPLICATION);
  const REPLACEMENT_RULES = Object.keys(REPLACEMENT);
  const QUANTIFIER_RULES = Object.keys(QUANTIFIER);
  const ALL_RULES = [...IMPLICATION_RULES, ...REPLACEMENT_RULES, ...QUANTIFIER_RULES, 'CP', 'IP'];

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
      else if (w === 'quantifier' || w === 'quantifiers') QUANTIFIER_RULES.forEach((r) => rules.add(r));
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
    const all = problem.premises.map((f) => ({ formula: f, scope: [], ei: false }));
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
          res.rule = rule;
          const def = IMPLICATION[rule] || REPLACEMENT[rule] || QUANTIFIER[rule];
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
            let qerr = null;
            if (rule !== 'QN' && QUANTIFIER[rule]) {
              const accessible = all.filter((l) => isPrefix(l.scope, here));
              qerr = checkQuantifierRule(rule, fs[0], formula, {
                earlier: all.map((l) => l.formula),
                conclusion: problem.conclusion,
                guarded: [...problem.premises, ...stack.map((sp) => all[sp.start - 1].formula).filter(Boolean)],
                eiLines: accessible.filter((l) => l.ei).map((l) => l.formula),
              });
              ok = !qerr;
            } else if (IMPLICATION[rule]) {
              ok = need === 1 ? def.test(fs[0], formula)
                : def.test(fs[0], fs[1], formula) || def.test(fs[1], fs[0], formula);
            } else {
              ok = replaces(fs[0], formula, def.gen);
            }
            if (qerr) {
              fail(qerr);
            } else if (!ok) {
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
      all.push({ formula, scope: scope(), ei: res.ok && res.rule === 'EI' });
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
    else if (f.op === 'not' || f.op === 'all' || f.op === 'some') variables(f.a, set);
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

  // Rows in textbook order: the first letter is T for the top half, and so on.
  function truthRows(names) {
    const rows = [];
    for (let r = 0; r < 1 << names.length; r++) {
      const v = {};
      names.forEach((n, i) => { v[n] = !(r & (1 << (names.length - 1 - i))); });
      rows.push(v);
    }
    return rows;
  }

  // ------------------------------------------------------- predicate models

  // Map of predicate letter -> number of terms; throws if a letter is used
  // with different numbers of terms.
  function signature(fs) {
    const sig = new Map();
    const walk = (f) => {
      if (f.op === 'var') {
        if (sig.has(f.name) && sig.get(f.name) !== f.args.length) {
          throw new LogicError(`${f.name} is used with different numbers of terms.`);
        }
        sig.set(f.name, f.args.length);
      } else if (f.op === 'not' || f.op === 'all' || f.op === 'some') walk(f.a);
      else { walk(f.a); walk(f.b); }
    };
    fs.forEach(walk);
    return sig;
  }

  function evalModel(f, m, env) {
    switch (f.op) {
      case 'var': return m.ext[f.name].has(f.args.map((t) => (isVariable(t) ? env[t] : m.consts[t])).join(','));
      case 'not': return !evalModel(f.a, m, env);
      case 'and': return evalModel(f.a, m, env) && evalModel(f.b, m, env);
      case 'or': return evalModel(f.a, m, env) || evalModel(f.b, m, env);
      case 'imp': return !evalModel(f.a, m, env) || evalModel(f.b, m, env);
      case 'iff': return evalModel(f.a, m, env) === evalModel(f.b, m, env);
      default: {
        for (let d = 0; d < m.size; d++) {
          const r = evalModel(f.a, m, Object.assign({}, env, { [f.v]: d }));
          if (f.op === 'all' && !r) return false;
          if (f.op === 'some' && r) return true;
        }
        return f.op === 'all';
      }
    }
  }

  function tuples(size, arity) {
    let out = [[]];
    for (let i = 0; i < arity; i++) out = out.flatMap((t) => [...Array(size).keys()].map((d) => [...t, d]));
    return out.map((t) => t.join(','));
  }

  // Searches small domains (1 to 3 objects) for an interpretation that makes
  // the premises true and the conclusion false. Returns a description or null.
  function modelCounterexample(premises, conclusion) {
    const sig = signature([...premises, conclusion]);
    const consts = new Set();
    [...premises, conclusion].forEach((f) => constants(f, consts));
    const preds = [...sig.keys()].sort();
    const names = [...consts].sort();
    for (let size = 1; size <= 3; size++) {
      const tup = preds.map((p) => tuples(size, sig.get(p)));
      const radix = [...tup.map((t) => 2 ** t.length), ...names.map(() => size)];
      if (radix.reduce((a, b) => a * b, 1) > 200000) continue;
      const digits = radix.map(() => 0);
      for (;;) {
        const m = { size, ext: {}, consts: {} };
        preds.forEach((p, i) => { m.ext[p] = new Set(tup[i].filter((_, k) => digits[i] & (1 << k))); });
        names.forEach((c, i) => { m.consts[c] = digits[preds.length + i]; });
        if (premises.every((f) => evalModel(f, m, {})) && !evalModel(conclusion, m, {})) {
          return describeModel(m, preds, sig, names);
        }
        let k = 0;
        while (k < digits.length && ++digits[k] === radix[k]) digits[k++] = 0;
        if (k === digits.length) break;
      }
    }
    return null;
  }

  function describeModel(m, preds, sig, names) {
    const obj = (d) => String(d + 1);
    const parts = [`a domain of ${m.size} object${m.size > 1 ? 's' : ''} {${[...Array(m.size).keys()].map(obj).join(', ')}}`];
    for (const p of preds) {
      const items = [...m.ext[p]];
      if (sig.get(p) === 0) parts.push(`${p} is ${items.length ? 'true' : 'false'}`);
      else {
        const shown = items.map((k) => {
          const t = k.split(',').map((d) => obj(+d));
          return t.length > 1 ? `(${t.join(', ')})` : t[0];
        });
        parts.push(`${p} is true of ${shown.length ? shown.join(', ') : 'nothing'}`);
      }
    }
    names.forEach((c) => parts.push(`${c} names ${obj(m.consts[c])}`));
    return 'in ' + parts.join('; ');
  }

  // Returns null if no counterexample was found, otherwise a description.
  function counterexample(premises, conclusion) {
    if ([...premises, conclusion].some(isPredicate)) return modelCounterexample(premises, conclusion);
    const set = new Set();
    [...premises, conclusion].forEach((f) => variables(f, set));
    const names = [...set].sort();
    if (names.length > 16) return null;
    for (const v of truthRows(names)) {
      if (premises.every((p) => evaluate(p, v)) && !evaluate(conclusion, v)) {
        return 'when ' + names.map((n) => `${n} = ${v[n] ? 'T' : 'F'}`).join(', ');
      }
    }
    return null;
  }

  // ------------------------------------------------------------- problem files

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // Splits "A, B / C" into statements; the conclusion is null without a slash.
  function splitArgument(line) {
    const parts = line.split(/\/|∴/);
    if (parts.length > 2) throw new LogicError('Use only one slash, before the conclusion.');
    const left = parts[0].trim() ? parts[0].split(',').map((p) => parse(p)) : [];
    const conclusion = parts.length === 2 ? parse(parts[1]) : null;
    return { left, conclusion };
  }

  // "P ⊃ Q, P / Q" -> { premises, conclusion, id } (or { error })
  function parseArgument(line) {
    try {
      const { left: premises, conclusion } = splitArgument(line);
      if (!conclusion) throw new LogicError('Write the problem as "premise, premise / conclusion".');
      const all = [...premises, conclusion];
      for (const f of all) {
        const free = [...freeVars(f)];
        if (free.length) throw new LogicError(`In ${str(f)}, ${free.join(', ')} needs a quantifier such as (${free[0]}).`);
      }
      signature(all);
      const key = premises.map(str).join(', ') + ' / ' + str(conclusion);
      return {
        text: line, type: 'proof', premises, conclusion, id: hash(key), key,
        predicate: all.some(isPredicate), invalid: counterexample(premises, conclusion),
      };
    } catch (e) {
      return { text: line, type: 'proof', error: e.message };
    }
  }

  const TT_CHOICES = {
    statement: ['Tautologous', 'Self-contradictory', 'Contingent'],
    pair: ['Logically equivalent', 'Contradictory', 'Consistent', 'Inconsistent'],
    set: ['Consistent', 'Inconsistent'],
    argument: ['Valid', 'Invalid'],
  };

  // The columns a student fills in for one statement: every compound part
  // (smallest first) when mode is 'all', or just the whole statement.
  function tableColumns(f, mode) {
    if (mode === 'main') return [f];
    const out = [];
    const seen = new Set();
    const walk = (g) => {
      if (g.op === 'var') return;
      if (g.op === 'not') walk(g.a);
      else { walk(g.a); walk(g.b); }
      if (!seen.has(str(g))) { seen.add(str(g)); out.push(g); }
    };
    walk(f);
    return out.length ? out : [f];
  }

  function classify(kind, statements, rows) {
    const vals = statements.map((f) => rows.map((v) => evaluate(f, v)));
    if (kind === 'statement') {
      return vals[0].every(Boolean) ? 'Tautologous' : vals[0].some(Boolean) ? 'Contingent' : 'Self-contradictory';
    }
    if (kind === 'argument') {
      const last = vals.length - 1;
      return rows.some((_, r) => vals.slice(0, last).every((c) => c[r]) && !vals[last][r]) ? 'Invalid' : 'Valid';
    }
    if (kind === 'pair') {
      if (rows.every((_, r) => vals[0][r] === vals[1][r])) return 'Logically equivalent';
      if (rows.every((_, r) => vals[0][r] !== vals[1][r])) return 'Contradictory';
    }
    return rows.some((_, r) => vals.every((c) => c[r])) ? 'Consistent' : 'Inconsistent';
  }

  // "P ⊃ Q" (one statement), "A, B" (compare statements) or "A, B / C" (argument).
  function parseTruthTable(line) {
    try {
      const { left, conclusion } = splitArgument(line);
      const statements = conclusion ? [...left, conclusion] : left;
      if (!statements.length) throw new LogicError('Give at least one statement.');
      if (statements.some(isPredicate)) {
        throw new LogicError('Truth tables are for statements without predicates or quantifiers.');
      }
      const names = new Set();
      statements.forEach((f) => variables(f, names));
      const letters = [...names].sort();
      if (letters.length > 6) throw new LogicError('Truth tables are limited to 6 letters (64 rows).');
      const kind = conclusion ? 'argument' : ['', 'statement', 'pair'][statements.length] || 'set';
      const key = conclusion ? left.map(str).join(', ') + ' / ' + str(conclusion) : statements.map(str).join(', ');
      const rows = truthRows(letters);
      return {
        text: line, type: 'truthtable', kind, statements, letters, rows, key, id: hash('tt ' + key),
        choices: TT_CHOICES[kind], answer: classify(kind, statements, rows),
      };
    } catch (e) {
      return { text: line, type: 'truthtable', error: e.message };
    }
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'set';
  }

  function parseProblemFile(text) {
    const sets = [];
    let cur = null;
    const newSet = (title) => {
      cur = {
        title, slug: slug(title), description: '', type: 'proof', columns: 'all',
        rules: ALL_RULES.slice(), ruleErrors: [], problems: [], lines: [],
      };
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
      if ((m = /^type\s*:(.*)$/i.exec(line))) {
        cur.type = /truth/i.test(m[1]) ? 'truthtable' : 'proof';
        return;
      }
      if ((m = /^columns\s*:(.*)$/i.exec(line))) {
        cur.columns = /main/i.test(m[1]) ? 'main' : 'all';
        return;
      }
      if ((m = /^(?:note|description|about)\s*:(.*)$/i.exec(line))) {
        cur.description += (cur.description ? ' ' : '') + m[1].trim();
        return;
      }
      cur.lines.push(line);
    });
    // Problems are parsed last so "type:" can appear anywhere in a set.
    for (const set of sets) {
      set.problems = set.lines.map((l) => (set.type === 'truthtable' ? parseTruthTable(l) : parseArgument(l)));
      delete set.lines;
    }
    return sets;
  }

  const api = {
    LogicError, parse, str, eq, Var, Not, Bin, Quant, SYMBOL,
    IMPLICATION, REPLACEMENT, QUANTIFIER, PROOF_RULES,
    IMPLICATION_RULES, REPLACEMENT_RULES, QUANTIFIER_RULES, ALL_RULES,
    canonicalRule, parseRuleList, parseJustification, checkProof,
    counterexample, parseArgument, parseTruthTable, parseProblemFile, hash,
    evaluate, tableColumns, isPredicate,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : this);
