// The levels and the questions in them.

// One level per table from 2 to 10, and a mixed level at the end.
// The small tables get three pads instead of four, to make them a bit easier.
export const LEVELS = [
  { name: 'Tvåans tabell', table: 2, pads: 3 },
  { name: 'Treans tabell', table: 3, pads: 3 },
  { name: 'Fyrans tabell', table: 4, pads: 3 },
  { name: 'Femmans tabell', table: 5, pads: 3 },
  { name: 'Sexans tabell', table: 6, pads: 4 },
  { name: 'Sjuans tabell', table: 7, pads: 4 },
  { name: 'Åttans tabell', table: 8, pads: 4 },
  { name: 'Nians tabell', table: 9, pads: 4 },
  { name: 'Tians tabell', table: 10, pads: 4 },
  { name: 'Blandat', table: null, pads: 4 },
];

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Makes one question, like 7 · 4, together with the answers for the pads.
function makeQuestion(a, b, padCount) {
  const answer = a * b;

  // The wrong answers are mistakes kids actually make: the number next to it
  // in the table, the wrong table, or adding instead of multiplying.
  let mistakes = [
    a * (b - 1),
    a * (b + 1),
    (a - 1) * b,
    (a + 1) * b,
    a + b,
    a * (b - 2),
    a * (b + 2),
  ];
  mistakes = mistakes.filter(
    (n, i) => n > 0 && n !== answer && mistakes.indexOf(n) === i,
  );

  // Pick how many wrong answers go below the right one. Without this the right
  // answer usually ends up on the middle pad, and kids figure that out.
  const smaller = shuffle(mistakes.filter((n) => n < answer));
  const bigger = shuffle(mistakes.filter((n) => n > answer));
  let below = randomInt(0, padCount - 1);
  below = Math.min(below, smaller.length);
  below = Math.max(below, padCount - 1 - bigger.length);
  const wrong = [
    ...smaller.slice(0, below),
    ...bigger.slice(0, padCount - 1 - below),
  ];

  return {
    a,
    b,
    answer,
    // Show it both ways round, 7 · 4 and 4 · 7.
    text: Math.random() < 0.5 ? `${a} · ${b}` : `${b} · ${a}`,
    // Pads are sorted from smallest to biggest.
    options: [answer, ...wrong].sort((x, y) => x - y),
  };
}

// All the questions for one round.
export function makeRound(level) {
  if (level.table) {
    // The whole table, 1 to 10, in random order.
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    return numbers.map((n) => makeQuestion(level.table, n, level.pads));
  }

  // Mixed: ten different questions from tables 2 to 10.
  const questions = [];
  const used = [];
  while (questions.length < 10) {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    // 3 · 7 and 7 · 3 count as the same question.
    const key = Math.min(a, b) + 'x' + Math.max(a, b);
    if (used.includes(key)) continue;
    used.push(key);
    questions.push(makeQuestion(a, b, level.pads));
  }
  return questions;
}

// A new round with only the questions you got wrong. They get new pads and a
// new order, so you can't just remember where the right answer was.
export function makeRetryRound(level, missed) {
  return shuffle(missed.map((q) => makeQuestion(q.a, q.b, level.pads)));
}
