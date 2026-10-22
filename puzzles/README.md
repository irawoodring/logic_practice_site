# Logic puzzles

Each file in this folder is one grid logic puzzle on the site's **Puzzles**
page, like the ones on Puzzle Baron. To add a puzzle, create a `.txt` file and
commit it. Puzzles are listed in file-name order.

```
title: The Science Fair
difficulty: Easy
story: Three students entered the school science fair, each with a different project.
Students: Amy, Ben, Cara
Projects: robot, volcano, plant growth
Places: 1st, 2nd, 3rd
clue: Amy finished ahead of the student who built the robot.
clue: Ben didn't build the robot.
clue: The plant growth project came in 3rd.
answer: Amy, volcano, 1st
answer: Ben, plant growth, 3rd
answer: Cara, robot, 2nd
```

| Line | Meaning |
| --- | --- |
| `title:` | The puzzle's name (optional; the file name is used otherwise) |
| `difficulty:` | Shown as a badge. `Easy`, `Medium` and `Hard` get colors; anything else works too |
| `story:` | The introduction shown above the grid |
| `Anything: a, b, c` | A **category** and its items. Every other label is a category |
| `clue:` | One clue per line, in the order shown |
| `answer:` | One line per item of the **first** category, listing what goes with it |

Rules the site checks for you:

- Every category needs the same number of items (3 to 5 works well; 3 or 4
  categories fit best on a screen).
- Every item name must be different, even across categories, so answer lines
  can list items in any order.
- There must be one `answer:` line for each item of the first category, naming
  one item from every category.

If a file breaks one of these, the puzzle shows a ⚠ on the site with what's
wrong, and the check on the **Actions** tab fails and names the file.

## Making sure a puzzle has exactly one answer

The site can't read English clues, so it can't tell whether your clues are
enough to pin down a single answer. Students are told every puzzle has exactly
one answer, so it's worth checking. Two ways:

1. **Solve it yourself on the site** using only the clues. If you get stuck
   with two possibilities left, add a clue.
2. **Have the computer prove it (optional).** Add your clues in checkable form
   to `tests/puzzle_clues.js`, under the puzzle's file name. The check then
   tries every possible answer and reports whether exactly one fits, and
   whether it matches your `answer:` lines. The bundled puzzles all have
   entries there to copy from:

   ```js
   '01-science-fair.txt': [
     (h) => h.num('Amy', 'Places') < h.num('robot', 'Places'),  // Amy finished ahead of the robot
     (h) => !h.same('Ben', 'robot'),                            // Ben didn't build the robot
     (h) => h.same('plant growth', '3rd'),                      // plant growth came in 3rd
   ],
   ```

   `h.same(x, y)` means x and y go together, `h.get(x, 'Category')` is the item
   from that category that goes with x, and `h.num(x, 'Category')` is the same
   thing as a number (`$12` becomes 12).
