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
  'UG cannot generalize from a constant'(L) {
    assert(/name/.test(firstError(run(L, '(x)Fx / (x)Fx', [['Fa', '1 UI'], ['(x)Fx', '2 UG']]))), 'UG on a constant accepted');
  },
  'EI needs a new name'(L) {
    const r = run(L, '(Ex)Fx, (Ex)Gx / (Ex)(Fx . Gx)', [['Fa', '1 EI'], ['Ga', '2 EI'], ['Fa . Ga', '3, 4 Conj'], ['(Ex)(Fx . Gx)', '5 EG']]);
    assert(/new/.test(firstError(r)), 'reused EI name accepted');
  },
  'UG blocked on a variable free in an EI line'(L) {
    const r = run(L, '(x)(Ey)Lxy / (Ey)(x)Lxy', [['(Ey)Lxy', '1 UI'], ['Lxa', '2 EI'], ['(x)Lxa', '3 UG'], ['(Ey)(x)Lxy', '4 EG']]);
    assert(/EI/.test(firstError(r)), 'quantifier-shift fallacy accepted');
  },
  'UG blocked inside a subproof on its assumption variable'(L) {
    const r = run(L, '(x)(Fx > Gx) / (x)(Fx > (x)Gx)', [['Fx', 'ACP'], ['(x)Fx', '2 UG']]);
    assert(/assumption/.test(firstError(r)), 'UG on assumption variable accepted');
  },
  'UI must replace every occurrence the same way'(L) {
    assert(firstError(run(L, '(x)Lxx / Lab', [['Lab', '1 UI']])), 'inconsistent UI accepted');
  },
  'UI cannot capture a variable'(L) {
    assert(firstError(run(L, '(x)(Ey)Lxy / (Ey)Lyy', [['(Ey)Lyy', '1 UI']])), 'captured UI accepted');
  },
  'QN works inside a line'(L) {
    const r = run(L, 'Pa > ~(x)Fx / Pa > (Ex)~Fx', [['Pa > (Ex)~Fx', '1 QN']]);
    assert(r.complete, firstError(r) || r.message);
  },
  'truth tables classify correctly'(L) {
    assert(L.parseTruthTable('P v ~P').answer === 'Tautologous', 'tautology');
    assert(L.parseTruthTable('P > Q, ~P v Q').answer === 'Logically equivalent', 'equivalent');
    assert(L.parseTruthTable('P . Q, ~P').answer === 'Inconsistent', 'inconsistent');
    assert(L.parseTruthTable('P > Q, Q / P').answer === 'Invalid', 'invalid argument');
  },
  'puzzle format mistakes are reported'(L) {
    const P = require('../puzzle.js');
    const base = 'Names: Amy, Ben\nPets: cat, dog\nclue: Amy has the cat.\n';
    assert(!P.parsePuzzle(base + 'answer: Amy, cat\nanswer: dog, Ben\n', 'a.txt').errors.length, 'valid puzzle rejected');
    assert(/same number/.test(P.parsePuzzle('Names: Amy, Ben\nPets: cat\nclue: x\n', 'a.txt').errors.join()), 'uneven categories accepted');
    assert(/more than one category/.test(P.parsePuzzle('Names: Amy, Ben\nPets: Amy, dog\nclue: x\n', 'a.txt').errors.join()), 'duplicate item accepted');
    assert(/answer/.test(P.parsePuzzle(base + 'answer: Amy, cat\n', 'a.txt').errors.join()), 'missing answer line accepted');
    assert(/isn't one of the items/.test(P.parsePuzzle(base + 'answer: Amy, cat\nanswer: Ben, cow\n', 'a.txt').errors.join()), 'unknown item accepted');
  },
  'puzzle solver finds every answer'(L) {
    const P = require('../puzzle.js');
    const p = P.parsePuzzle('Names: Amy, Ben, Cy\nPets: cat, dog, eel\nclue: x\nanswer: Amy, cat\nanswer: Ben, dog\nanswer: Cy, eel\n', 'a.txt');
    assert(P.countSolutions(p, [], 10).length === 6, 'no clues should allow 3! answers');
    assert(P.countSolutions(p, [(h) => h.same('Amy', 'cat')], 10).length === 2, 'one clue should allow 2');
  },
};

