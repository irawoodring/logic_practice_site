// Checkable versions of each puzzle's clues, keyed by file name. tests/check.js
// uses them to prove a puzzle has exactly one solution and that it matches the
// file's answer lines. Optional: puzzles without an entry here are still
// checked for format mistakes.
//
//   h.same(x, y)      x and y go together
//   h.get(x, 'Cat')   the item from category Cat that goes with x
//   h.num(x, 'Cat')   the same, as a number ("$12" -> 12)
module.exports = {
  '01-science-fair.txt': [
    (h) => h.num('Amy', 'Places') < h.num('robot', 'Places'),
    (h) => !h.same('Ben', 'robot'),
    (h) => h.same('plant growth', '3rd'),
  ],
  '02-pet-adoption.txt': [
    (h) => h.same('Fiona', 'parrot') || h.same('Fiona', 'cat'),
    (h) => h.same('dog', 'Ziggy'),
    (h) => !h.same('Gus', 'rabbit') && !h.same('Gus', 'dog') && !h.same('Gus', 'Biscuit'),
    (h) => h.same('Mochi', 'rabbit'),
    (h) => !h.same('Dana', 'dog'),
    (h) => !h.same('Pepper', 'parrot'),
  ],
  '03-book-club.txt': [
    (h) => h.num('poetry', 'Pages') === h.num('biography', 'Pages') - 25,
    (h) => h.num('June', 'Pages') > h.num('Hana', 'Pages'),
    (h) => h.same('grapes', 'mystery'),
    (h) => h.same('Kofi', 'popcorn'),
    (h) => h.same('Ivan', '50'),
    (h) => !h.same('sci-fi', 'cookies'),
    (h) => h.num('mystery', 'Pages') === h.num('Ivan', 'Pages') + 50,
    (h) => !h.same('Kofi', 'sci-fi'),
  ],
  '04-summer-jobs.txt': [
    (h) => h.same('tutor', '$16'),
    (h) => DAYS.indexOf(h.get('Marco', 'Start days')) === DAYS.indexOf(h.get('Omar', 'Start days')) - 1,
    (h) => h.same('dog walker', 'Thursday') && h.same('dog walker', '$10'),
    (h) => !h.same('Nia', 'tutor') && !h.same('Marco', 'tutor'),
    (h) => h.num('Omar', 'Pay') < h.num('Marco', 'Pay'),
    (h) => h.num('cashier', 'Pay') === h.num('lifeguard', 'Pay') - 2,
    (h) => h.same('Lena', 'Wednesday'),
  ],
  '05-science-olympiad.txt': [
    (h) => h.num('robotics', 'Scores') === h.num('Lincoln', 'Scores') + 10,
    (h) => h.same('Rosa', '60') && !h.same('Rosa', 'Lincoln') && !h.same('Rosa', 'Kennedy') && !h.same('Rosa', 'Adams'),
    (h) => h.same('Adams', 'geology'),
    (h) => h.same('Sam', 'anatomy') && !h.same('Sam', 'Hayes'),
    (h) => h.num('Quinn', 'Scores') > h.num('Pat', 'Scores') && h.num('Pat', 'Scores') > h.num('Tess', 'Scores'),
    (h) => h.same('astronomy', 'Kennedy'),
    (h) => !h.same('Quinn', 'Grant') && !h.same('Pat', 'astronomy'),
    (h) => h.num('Sam', 'Scores') > h.num('Pat', 'Scores'),
  ],
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
