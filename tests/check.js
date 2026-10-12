#!/usr/bin/env node
// Checks problems.js for typos and unprovable (invalid) arguments, and runs
// the sample solutions in tests/solutions.js through the proof checker.
//
//   node tests/check.js
'use strict';
const fs = require('fs');
const path = require('path');
const Logic = require('../logic.js');
const SOLUTIONS = require('./solutions.js');
const UNIT = require('./unit.js');

const window = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'problems.js'), 'utf8'))(window);
const sets = Logic.parseProblemFile(window.PROBLEMS);

let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };

let count = 0, solved = 0;
const seen = new Map();
for (const set of sets) {
  console.log(set.title);
  if (set.ruleErrors.length) fail(`unknown rule name(s): ${set.ruleErrors.join(', ')}`);
  for (const p of set.problems) {
    count++;
    if (p.error) { fail(`"${p.text}": ${p.error}`); continue; }
    if (p.invalid) { fail(`"${p.text}" is invalid, so it can't be proved`); continue; }
    if (seen.has(p.id)) fail(`"${p.text}" duplicates a problem in "${seen.get(p.id)}"`);
    seen.set(p.id, set.title);
    const sol = SOLUTIONS[p.key];
    if (!sol) continue;
    const steps = sol.map(([text, just]) => ({ text, just }));
    const result = Logic.checkProof(p, steps, set.rules);
    if (result.complete) { solved++; continue; }
    const bad = result.lines.find((l) => !l.ok);
    fail(`"${p.text}": ${bad ? `line ${bad.line}: ${bad.error}` : result.message}`);
  }
}

for (const key of Object.keys(SOLUTIONS)) {
  if (![...sets].some((s) => s.problems.some((p) => p.key === key))) {
    console.log(`  (note) solution for "${key}" doesn't match any problem`);
  }
}

console.log('\nChecker unit tests');
for (const [name, fn] of Object.entries(UNIT)) {
  try { fn(Logic); } catch (e) { fail(`${name}: ${e.message}`); }
}

console.log(`\n${count} problems, ${solved} verified with sample solutions, ${failures} problem(s) found.`);
process.exit(failures ? 1 : 0);
