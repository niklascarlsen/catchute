// Menu, rounds, result cards and controls.

import { gsap } from 'gsap';
import { LEVELS, makeRound, makeRetryRound } from './questions.js';
import {
  game,
  showQuestion,
  jump,
  stopGame,
  steerTo,
  steerWithKeys,
} from './game.js';
import { playSound, toggleMute, unlockSounds, isMuted } from './sound.js';
import { readSetting, writeSetting } from './storage.js';
import {
  getLanguage,
  levelName,
  onLanguageChange,
  setLanguage,
  t,
} from './language.js';

const $ = (id) => document.getElementById(id);

// The stage is always 1024 x 718. Scale it to fit the window and center it.
const stage = $('stage');
let scale = 1;
let offsetX = 0;
function fitToWindow() {
  scale = Math.min(window.innerWidth / 1024, window.innerHeight / 718);
  offsetX = (window.innerWidth - 1024 * scale) / 2;
  const offsetY = (window.innerHeight - 718 * scale) / 2;
  const move = `translate(${offsetX}px, ${offsetY}px)`;
  stage.style.transform = `${move} scale(${scale})`;

  // How far outside the game area you can see on this screen. The plane uses
  // this so it flies in from the real edge of the screen on wide monitors.
  game.screenLeft = -offsetX / scale;
  game.screenRight = 1024 + offsetX / scale;
}
window.addEventListener('resize', fitToWindow);
fitToWindow();

// The round that's being played.
const round = {
  level: null,
  questions: [],
  index: 0,
  results: [], // true or false for each question
  retry: false, // only the missed questions, doesn't count as a record
  landing: null, // kept so the result card can be translated after it shows
};

let lastLevel = LEVELS[0]; // Enter on the start screen plays this table
let hintTimer = null; // shows "tap to jump" a moment after each question

// When the result card or end screen appeared. A key that's still held down
// shouldn't skip straight past it.
let cardShownAt = 0;
const cardJustShown = () => performance.now() - cardShownAt < 300;

// Older saves used the Swedish level name as the key. The id stays the same
// when the language changes, so move those scores over once.
const OLD_RECORD_NAMES = {
  'Tvåans tabell': '2',
  'Treans tabell': '3',
  'Fyrans tabell': '4',
  'Femmans tabell': '5',
  'Sexans tabell': '6',
  'Sjuans tabell': '7',
  'Åttans tabell': '8',
  'Nians tabell': '9',
  'Tians tabell': '10',
  Blandat: 'mixed',
};

// Best score for each table, saved in the browser.
function loadRecords() {
  let records;
  try {
    records = JSON.parse(readSetting('catchute-records')) || {};
  } catch {
    return {}; // broken data, start over
  }
  let changed = false;
  for (const [name, id] of Object.entries(OLD_RECORD_NAMES)) {
    if (records[name] === undefined) continue;
    records[id] = Math.max(records[id] || 0, records[name]);
    delete records[name];
    changed = true;
  }
  if (changed) writeSetting('catchute-records', JSON.stringify(records));
  return records;
}

function saveRecord(level, score) {
  const records = loadRecords();
  if ((records[level.id] || 0) < score) {
    records[level.id] = score;
    writeSetting('catchute-records', JSON.stringify(records));
  }
}

function levelLabel(level, retry) {
  const name = levelName(level.id);
  return retry ? `${name} · ${t('practice')}` : name;
}

// Start screen

function renderMenu() {
  const records = loadRecords();
  $('levelButtons').innerHTML = '';
  for (const level of LEVELS) {
    const button = document.createElement('button');
    button.className = 'level-btn';
    const best = records[level.id];
    const bestText = best === undefined ? '' : `★ ${best} / 10`;
    button.innerHTML = `
      <span class="number">${level.table || '2–10'}</span>
      <span class="name">${levelName(level.id)}</span>
      <span class="best">${bestText}</span>`;
    button.onclick = () => startRound(level);
    $('levelButtons').append(button);
  }
}

function showMenu() {
  stopGame();
  hintTimer?.kill();
  $('hint').hidden = true;
  $('hud').hidden = true;
  $('result').hidden = true;
  $('done').hidden = true;
  $('menu').hidden = false;
  renderMenu();
}

// Playing

function startRound(level, questions) {
  playSound('click');
  lastLevel = level;
  round.level = level;
  round.retry = Boolean(questions);
  round.questions = questions || makeRound(level);
  round.index = 0;
  round.results = [];

  $('menu').hidden = true;
  $('done').hidden = true;
  $('hud').hidden = false;
  $('levelName').textContent = levelLabel(level, round.retry);
  nextQuestion();
}

function nextQuestion() {
  const question = round.questions[round.index];
  $('result').hidden = true;
  $('questionText').textContent = question.text;
  gsap.from('#question', {
    scale: 0.5,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out(2)',
  });
  drawProgress();
  showQuestion(question);
  // Show "tap to jump" after a moment, unless the player has already tapped.
  hintTimer?.kill();
  hintTimer = gsap.delayedCall(0.7, () => {
    $('hint').hidden = game.state !== 'aim' || game.jumpWhenReady;
  });
}

// One small circle per question at the top right. Green if right, red if wrong.
function drawProgress() {
  $('progress').innerHTML = '';
  round.questions.forEach((q, i) => {
    const box = document.createElement('div');
    box.className = 'box';
    if (i < round.results.length) {
      box.classList.add(round.results[i] ? 'right' : 'wrong');
      box.textContent = round.results[i] ? '✓' : '✗';
    } else if (i === round.index) {
      box.classList.add('now');
    }
    $('progress').append(box);
  });
}

function renderResult() {
  const question = round.questions[round.index];
  const { correct, perfect, chosen } = round.landing;
  const title = $('resultTitle');
  const fact = `<b>${question.text} = ${question.answer}</b>`;
  if (correct) {
    title.textContent = perfect ? t('perfect') : t('correct');
    title.className = 'right';
    $('resultText').innerHTML = fact;
  } else if (chosen !== null) {
    title.textContent = t('wrongPad');
    title.className = 'wrong';
    $('resultText').innerHTML = t('notChosen', fact, chosen);
  } else {
    title.textContent = t('splash');
    title.className = 'wrong';
    $('resultText').innerHTML = t('missedPads', fact);
  }

  const isLast = round.index === round.questions.length - 1;
  $('nextBtn').textContent = isLast ? t('seeResults') : t('nextJump');
}

// game.js calls this when the cat has landed.
game.onLanded = (landing) => {
  round.landing = landing;
  round.results.push(landing.correct);
  drawProgress();
  $('hint').hidden = true;
  renderResult();
  $('result').hidden = false;
  gsap.from('#result', {
    y: 30,
    scale: 0.85,
    opacity: 0,
    duration: 0.45,
    ease: 'back.out(2)',
  });
  $('nextBtn').focus();
  cardShownAt = performance.now();
};

$('nextBtn').onclick = () => {
  if (cardJustShown()) return;
  playSound('click');
  round.index++;
  if (round.index < round.questions.length) {
    nextQuestion();
  } else {
    showRoundDone();
  }
};

// End of the round

function renderDone() {
  const score = round.results.filter(Boolean).length;
  const total = round.questions.length;
  const missed = round.questions.filter((q, i) => !round.results[i]);

  if (missed.length === 0) {
    $('doneTitle').textContent = round.retry ? t('gotThem') : t('allCorrect');
  } else {
    $('doneTitle').textContent =
      score / total >= 0.7 ? t('goodJob') : t('goodTry');
  }
  $('doneScore').textContent = t('score', score, total);

  // Every question from the round in order, green if right and red if wrong.
  $('doneTable').innerHTML = '';
  const inOrder = round.questions
    .map((q, i) => ({ q, correct: round.results[i] }))
    .sort((x, y) => x.q.a - y.q.a || x.q.b - y.q.b);
  for (const { q, correct } of inOrder) {
    const box = document.createElement('div');
    box.className = correct ? 'fact right' : 'fact wrong';
    box.textContent = `${q.a} · ${q.b} = ${q.answer}`;
    $('doneTable').append(box);
  }

  // The big button: practice the missed ones, or go on to the next table.
  const nextLevel = LEVELS[LEVELS.indexOf(round.level) + 1];
  $('againBtn').hidden = false;
  if (missed.length > 0) {
    $('doneBtn').textContent = t('practiceMissed', missed.length);
    $('doneBtn').onclick = () =>
      startRound(round.level, makeRetryRound(round.level, missed));
  } else if (nextLevel) {
    $('doneBtn').textContent = t('nextTable');
    $('doneBtn').onclick = () => startRound(nextLevel);
  } else {
    $('doneBtn').textContent = t('playAgain');
    $('doneBtn').onclick = () => startRound(round.level);
    $('againBtn').hidden = true;
  }
}

function showRoundDone() {
  const score = round.results.filter(Boolean).length;
  if (!round.retry) saveRecord(round.level, score);
  renderDone();

  $('result').hidden = true;
  $('done').hidden = false;
  gsap.from('.done-card', {
    scale: 0.7,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out(2)',
  });
  playSound('done');
  $('doneBtn').focus();
  cardShownAt = performance.now();
}

$('againBtn').onclick = () => startRound(round.level);
$('menuBtn').onclick = showMenu;
$('homeBtn').onclick = showMenu;

// Language. Static text is swapped in language.js. Screens that build their
// own text are drawn again so a switch mid-round updates what is showing.
function refreshLanguage() {
  renderMenu();
  if (round.level) {
    $('levelName').textContent = levelLabel(round.level, round.retry);
  }
  if (!$('result').hidden) renderResult();
  if (!$('done').hidden) renderDone();
}
onLanguageChange(refreshLanguage);

$('langSwitch').onclick = (event) => {
  const button = event.target.closest('button');
  if (!button || button.dataset.lang === getLanguage()) return;
  playSound('click');
  setLanguage(button.dataset.lang);
};

// Sound on and off

function drawMuteButton() {
  $('muteBtn').textContent = isMuted() ? '🔇' : '🔊';
}
$('muteBtn').onclick = () => {
  toggleMute();
  drawMuteButton();
};
drawMuteButton();

// Controls

// Turns a mouse or finger position into an x position on the stage.
function stageX(event) {
  return (event.clientX - offsetX) / scale;
}

let fingerDown = false;

window.addEventListener('pointerdown', (event) => {
  // Buttons and cards handle their own clicks.
  if (event.target.closest('button, .card, .overlay, #langSwitch')) return;
  fingerDown = true;
  steerTo(stageX(event));
  if (game.state === 'aim') {
    jump();
    $('hint').hidden = true;
  }
});

// A mouse steers just by moving. A finger steers while it's touching.
window.addEventListener('pointermove', (event) => {
  if (game.state !== 'falling') return;
  if (fingerDown || event.pointerType === 'mouse') steerTo(stageX(event));
});

window.addEventListener('pointerup', () => {
  fingerDown = false;
  unlockSounds();
});
window.addEventListener('pointercancel', () => {
  fingerDown = false;
});

// Arrow keys (or A and D) steer. Left and right are tracked separately, so
// letting go of one key doesn't cancel the other.
const keysDown = { left: false, right: false };

function updateKeyDirection() {
  steerWithKeys((keysDown.right ? 1 : 0) - (keysDown.left ? 1 : 0));
}

window.addEventListener('keydown', (event) => {
  unlockSounds();
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') keysDown.left = true;
  if (key === 'arrowright' || key === 'd') keysDown.right = true;
  if (event.key.startsWith('Arrow')) event.preventDefault(); // no scrolling
  updateKeyDirection();

  // Enter and Space. If a button has focus the browser clicks it for us,
  // otherwise we do whatever makes sense on the screen that's showing.
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.repeat || cardJustShown()) {
    event.preventDefault(); // a held key shouldn't click through the screens
    return;
  }
  if (document.activeElement.tagName === 'BUTTON') return;
  event.preventDefault();

  if (!$('menu').hidden) {
    startRound(lastLevel);
  } else if (!$('done').hidden) {
    $('doneBtn').click();
  } else if (!$('result').hidden) {
    $('nextBtn').click();
  } else if (game.state === 'aim') {
    jump();
    $('hint').hidden = true;
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keysDown.left = false;
  if (key === 'arrowright' || key === 'd') keysDown.right = false;
  updateKeyDirection();
});

// If the window loses focus while a key is held, we never get the keyup.
window.addEventListener('blur', () => {
  keysDown.left = false;
  keysDown.right = false;
  updateKeyDirection();
});

// Every button blurs itself after a click, so Space goes back to jumping.
document.addEventListener('click', (event) => {
  unlockSounds();
  if (event.target.closest('button')) event.target.closest('button').blur();
});

showMenu();
