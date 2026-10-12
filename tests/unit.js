// Checks that the proof checker rejects common mistakes.
'use strict';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function run(L, problem, steps, rules) {
  const p = L.parseArgument(problem);
  return L.checkProof(p, steps.map(([text, just]) => ({ text, just })), rules);
}

function firstError(r) {
  const bad = r.lines.find((l) => !l.ok);
  return bad ? bad.error : null;
}

module.exports = {
  'parser accepts keyboard and unicode symbols'(L) {
    assert(L.str(L.parse('(A & B) -> ~C')) === '(A • B) ⊃ ~C', 'ascii');
    assert(L.str(L.parse('[A ∨ B] ≡ {C}')) === '(A ∨ B) ≡ C', 'brackets');
    assert(L.str(L.parse('~~(P <-> Q)')) === '~~(P ≡ Q)', 'iff');
  },
  'parser requires grouping'(L) {
    let threw = false;
    try { L.parse('A v B v C'); } catch (e) { threw = true; }
    assert(threw, 'A v B v C should need parentheses');
  },
  'rejects a wrong MP'(L) {
    assert(firstError(run(L, 'P > Q, Q / P', [['P', '1, 2 MP']])), 'affirming the consequent accepted');
  },
  'Simp right conjunct gives a hint'(L) {
    assert(/Com/.test(firstError(run(L, 'P . Q / Q', [['Q', '1 Simp']]))), 'no Com hint');
  },
  'replacement acts on a subformula'(L) {
    const r = run(L, '(~~A v B) > C / (A v B) > C', [['(A v B) > C', '1 DN']]);
    assert(r.complete, firstError(r) || r.message);
  },
  'replacement may change only one place'(L) {
    assert(firstError(run(L, '~~A . ~~B / A . B', [['A . B', '1 DN']])), 'two DN rewrites accepted');
  },
  'rules outside the set are refused'(L) {
    assert(/available/.test(firstError(run(L, 'P . Q / P', [['P', '1 Simp']], ['MP']))), 'Simp allowed');
  },
  'closed subproof lines cannot be cited'(L) {
    const r = run(L, 'P > Q / Q', [['P', 'ACP'], ['Q', '1, 2 MP'], ['P > Q', '2-3 CP'], ['Q', '1, 2 MP']]);
    assert(/closed subproof/.test(firstError(r)), 'cited a closed line');
  },
  'open subproof blocks completion'(L) {
    const r = run(L, 'P > Q / Q', [['P', 'ACP'], ['Q', '1, 2 MP']]);
    assert(!r.complete, 'unfinished subproof accepted');
  },
  'IP needs a contradiction'(L) {
    assert(firstError(run(L, 'P / ~~P', [['~P', 'AIP'], ['~~P', '1-2 IP']])), 'IP without contradiction accepted');
  },
  'validity check finds counterexamples'(L) {
    assert(L.parseArgument('P > Q, Q / P').invalid, 'invalid argument not flagged');
    assert(!L.parseArgument('P > Q, P / Q').invalid, 'valid argument flagged');
  },
};
