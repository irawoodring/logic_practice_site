# Problems

Every problem on the site is a small text file in this folder. To add one,
create a file and commit it. The site rebuilds itself within a minute or two.

```
problems/
  01-modus-ponens-modus-tollens/     ← a problem set (one folder per set)
    set.txt                          ← the set's title and settings (optional)
    01.txt                           ← one problem per file
    02.txt
  02-hypothetical-disjunctive-syllogism/
    ...
```

Sets appear in the order of their folder names, and problems in the order of
their file names. Numbers sort naturally, so `2.txt` comes before `10.txt`.
Any file ending in `.txt` (other than `set.txt`) is a problem; other files,
like this README, are ignored.

## Adding a problem

On GitHub, open a set's folder, choose **Add file → Create new file**, name it
something like `07.txt`, and type the problem:

```
P > Q, Q > R / P > R
```

That is: the premises separated by commas, a slash, then the conclusion. A
theorem with no premises starts with the slash: `/ P > (Q > P)`.

## Adding a set

Create a new folder, such as `16-more-practice`, with a `set.txt` inside it:

```
title: More Practice
rules: implication, DM, Com
note: Optional instructions shown above the problems.
```

All three lines are optional. Without a title, the folder name is used
("16-more-practice" becomes "More Practice"). The site numbers the sets for you.

- `rules:` limits which rules students may use. Leave it out to allow every rule.
  Rule names: `MP MT HS DS CD Simp Conj Add`, `DM Com Assoc Dist DN Trans Impl
  Equiv Exp Taut`, `UI UG EI EG QN`, `CP IP`. Shortcuts: `implication` (the
  first 8), `replacement` (the next 10), `quantifier` (UI UG EI EG QN), `all`.
- `type: truth table` makes the set a truth-table set (see below).
- `columns: main` (truth tables only) has students fill in just each
  statement's main column instead of every part.

## Writing statements

Type the keyboard version or the real symbol:

| Meaning | Type | Symbol |
| --- | --- | --- |
| not | `~` | ~ |
| and | `&` or `.` | • |
| or | `v` | ∨ |
| if-then | `>` or `->` | ⊃ |
| if and only if | `=` or `<->` | ≡ |
| for all x | `(x)` | (x) |
| there is an x | `(Ex)` | (∃x) |

- Use capital letters for statements and parentheses for grouping:
  `(A v B) > ~C`.
- Predicates are a capital letter followed by lowercase terms: `Fa`, `Lxy`.
  The letters a–w (except v) name individuals; x, y and z are variables.
  Example: `(x)(Hx > Mx), Hs / Ms`

## Truth-table problems

In a set whose `set.txt` says `type: truth table`, each file holds one of:

```
P > (Q > P)          one statement: tautologous, self-contradictory or contingent
P > Q, ~Q > ~P       statements to compare: equivalent, contradictory, consistent...
P > Q, Q / P         an argument: valid or invalid
```

## Mistakes

A typo, or an argument that can't be proved, shows up on the site with a ⚠
next to the problem, along with what's wrong. After each commit, GitHub also
runs a check (the **Actions** tab). If it finds a problem, the run is marked
with a red ✗, it names the file, and GitHub emails you. The site still updates
either way.

Lines starting with `//` are comments. A file may hold several problems, one
per line, but one per file is simplest.
