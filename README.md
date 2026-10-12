# Laker Logic Gym

A practice site where students build natural deduction proofs in propositional
logic, similar to Logic Baron. Every line is checked as the student types, and
errors come with a short explanation.

It uses the rules from Hurley's *A Concise Introduction to Logic*:

- **8 rules of implication:** MP, MT, HS, DS, CD, Simp, Conj, Add
- **10 rules of replacement:** DM, Com, Assoc, Dist, DN, Trans, Impl, Equiv, Exp, Taut
- **Conditional and indirect proof:** ACP / CP, AIP / IP

Progress and in-progress proofs are saved in each student's browser.

## Adding problems

All problems live in **`problems.js`**. Add one line per problem:

```
# 9. My New Set
rules: implication, DM, Com
note: Optional instructions shown to students.
A > B, ~B / ~A
(P v Q) . R, ~P / Q
```

- `# Title` starts a new set.
- `rules:` limits which rules students may use. Leave it out to allow every rule.
  `implication`, `replacement` and `all` are shortcuts for groups of rules.
- Each problem is `premises separated by commas / conclusion`. A theorem with
  no premises starts with the slash: `/ P > P`.
- Symbols: `~` not, `&` or `.` and, `v` or, `>` if-then, `=` iff. The real
  symbols (`•`, `∨`, `⊃`, `≡`) also work. Use capital letters and parentheses.

Refresh the page to see the new problems. A typo or an argument that can't be
proved shows up with a ⚠ in the problem list.

### Checking problems before you publish (optional)

With [Node.js](https://nodejs.org) installed:

```
node tests/check.js
```

This reports typos, duplicate problems, and invalid arguments. It also runs the
sample proofs in `tests/solutions.js` (adding solutions there is optional).

## Running the site

The site is plain HTML, CSS and JavaScript with no build step. Open
`index.html` in a browser, or host the folder anywhere that serves static
files. With GitHub Pages, go to *Settings → Pages* and deploy from the `main`
branch.

Students can also type in their own arguments with **Try your own argument**.
The address of that page links straight to the argument, so you can share it.

## Files

| File | Purpose |
| --- | --- |
| `problems.js` | The problem sets: edit this one |
| `logic.js` | Parser and proof checker |
| `app.js` | Page behavior |
| `index.html`, `style.css` | Layout and styling |
| `tests/` | Problem checker, sample solutions, checker tests |
