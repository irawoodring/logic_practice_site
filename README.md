# Laker Logic Gym

A practice site for logic students, similar to Logic Baron:

- **Natural deduction proofs** in propositional and predicate logic. Every line
  is checked as the student types, and errors come with a short explanation.
- **Truth tables** for classifying statements (tautologous, self-contradictory,
  contingent), comparing statements (equivalent, contradictory, consistent,
  inconsistent) and testing arguments (valid, invalid).

Proofs use the rules from Hurley's *A Concise Introduction to Logic*:

- **8 rules of implication:** MP, MT, HS, DS, CD, Simp, Conj, Add
- **10 rules of replacement:** DM, Com, Assoc, Dist, DN, Trans, Impl, Equiv, Exp, Taut
- **Quantifier rules:** UI, UG, EI, EG (with Hurley's restrictions) and QN,
  including relational predicates like `Lxy`
- **Conditional and indirect proof:** ACP / CP, AIP / IP

Identity (`a = b`) isn't supported yet.

There's also a page of **logic puzzles** like Puzzle Baron's grid puzzles, from
the `puzzles/` folder, and a searchable **Vocabulary** page of definitions,
from the `glossary/` folder.


## Adding problems

Every problem is a text file in the **`problems/`** folder, one folder per set:

```
problems/
  01-modus-ponens-modus-tollens/
    set.txt      title: Modus Ponens & Modus Tollens
                 rules: MP, MT
    01.txt       P > Q, P / Q
    02.txt       P > Q, ~Q / ~P
```

To add a problem, create a new file in a set's folder (on GitHub: **Add file →
Create new file**) containing the problem, and commit it. To add a set, create a
new folder with a `set.txt`. The site rebuilds itself within a minute or two.

[`problems/README.md`](problems/README.md) has the full format: rules, symbols,
predicate logic and truth-table sets.

Typos and arguments that can't be proved show a ⚠ on the site. GitHub also
checks every commit: a red ✗ on the **Actions** tab (and an email) names the
file with the mistake.

## Adding logic puzzles

Each file in **`puzzles/`** is one grid puzzle: a story, categories, clues and
the answer.

```
title: The Science Fair
difficulty: Easy
story: Three students entered the school science fair...
Students: Amy, Ben, Cara
Projects: robot, volcano, plant growth
Places: 1st, 2nd, 3rd
clue: Ben didn't build the robot.
answer: Amy, volcano, 1st
```

Students mark the grid with ✕ and ●, cross off clues, and can check for
errors. The site records solved puzzles and best times. See
[`puzzles/README.md`](puzzles/README.md) for the full format and how to make
sure a puzzle has exactly one answer.

## Adding vocabulary

Each file in **`glossary/`** is a topic on the Vocabulary page, and each line
is a term:

```
title: Truth Tables
Tautologous: Describes a statement that is true in every row of its truth table.
```

Add a line to add a term, or a new `.txt` file to add a topic. See
[`glossary/README.md`](glossary/README.md).

## Publishing with GitHub Pages

The page can't list a folder by itself, so a GitHub Action
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) collects
`problems/`, `glossary/` and `puzzles/` into one file on every push to
`main` and publishes the site.

One-time setup: in the repository, go to **Settings → Pages** and set
**Source** to **GitHub Actions**. The site will be at
`https://<your-username>.github.io/<repository-name>/`.

## Previewing on your own computer (optional)

With [Node.js](https://nodejs.org) installed:

```
node build.js          # collects problems/, glossary/ and puzzles/ into generated.js
node tests/check.js    # reports typos, invalid arguments and puzzle mistakes
```

Then open `index.html` in a browser. Run `node build.js` again after changing
problems, puzzles or vocabulary. `tests/solutions.js` holds sample proofs that the check script runs
(adding solutions there is optional).

Students can also type in their own problems with **Try your own problem**.
The address of that page links straight to the problem, so you can share it.
Progress is saved in each student's browser.

## Files

| File | Purpose |
| --- | --- |
| `problems/` | The problems: add files here |
| `puzzles/` | Grid logic puzzles: add files here |
| `glossary/` | Vocabulary terms: add lines or files here |
| `build.js` | Collects `problems/`, `glossary/` and `puzzles/` into `generated.js` |
| `logic.js` | Parser, proof checker and truth tables |
| `puzzle.js`, `puzzles-ui.js` | Logic puzzle format and puzzle pages |
| `app.js` | Page behavior |
| `index.html`, `style.css` | Layout and styling |
| `.github/workflows/deploy.yml` | Builds and publishes the site |
| `tests/` | Problem checker, sample solutions, puzzle clue checks, checker tests |
