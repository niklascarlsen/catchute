// The words on screen, in Swedish and English.
// Elements with data-i18n or data-i18n-aria are filled from here.
// Text that changes during a round (the score, the result) uses t() instead.

import { readSetting, writeSetting } from './storage.js';

const TEXT = {
  sv: {
    toMenu: 'Till menyn',
    sound: 'Ljud av/på',
    language: 'Språk',
    swedish: 'Svenska',
    english: 'English',
    landOn: 'Landa på svaret',
    tapToJump: 'Tryck för att hoppa!',
    steerHint: 'Styr sen till plattan med rätt svar',
    nextJump: 'Nästa hopp',
    seeResults: 'Se resultat',
    tagline: 'Gångertabellen – hoppa ur planet och landa på rätt svar!',
    playAgain: 'Spela igen',
    chooseTable: 'Välj tabell',
    practice: 'Övning',
    perfect: 'Rätt – mitt i prick!',
    correct: 'Rätt!',
    wrongPad: 'Oj, fel platta!',
    splash: 'Plums!',
    allCorrect: 'Alla rätt!',
    gotThem: 'Nu sitter de!',
    goodJob: 'Bra jobbat!',
    goodTry: 'Bra kämpat!',
    nextTable: 'Nästa tabell',
    notChosen: (fact, chosen) => `${fact}, inte ${chosen}.`,
    missedPads: (fact) => `Du missade plattorna. ${fact}`,
    score: (score, total) => `${score} av ${total} rätt`,
    practiceMissed: (count) => `Öva på missade (${count})`,
    levels: {
      2: 'Tvåans tabell',
      3: 'Treans tabell',
      4: 'Fyrans tabell',
      5: 'Femmans tabell',
      6: 'Sexans tabell',
      7: 'Sjuans tabell',
      8: 'Åttans tabell',
      9: 'Nians tabell',
      10: 'Tians tabell',
      mixed: 'Blandat',
    },
  },
  en: {
    toMenu: 'Back to menu',
    sound: 'Sound on or off',
    language: 'Language',
    swedish: 'Svenska',
    english: 'English',
    landOn: 'Land on the answer',
    tapToJump: 'Tap to jump!',
    steerHint: 'Then steer to the pad with the correct answer',
    nextJump: 'Next jump',
    seeResults: 'See results',
    tagline:
      'Times tables – jump out of the plane and land on the correct answer!',
    playAgain: 'Play again',
    chooseTable: 'Choose a table',
    practice: 'Practice',
    perfect: 'Correct – bullseye!',
    correct: 'Correct!',
    wrongPad: 'Oops, wrong pad!',
    splash: 'Splat!',
    allCorrect: 'All correct!',
    gotThem: 'You know them!',
    goodJob: 'Well done!',
    goodTry: 'Good effort!',
    nextTable: 'Next table',
    notChosen: (fact, chosen) => `${fact}, not ${chosen}.`,
    missedPads: (fact) => `You missed the pads. ${fact}`,
    score: (score, total) => `${score} out of ${total} correct`,
    practiceMissed: (count) => `Practice missed (${count})`,
    levels: {
      2: '2 times table',
      3: '3 times table',
      4: '4 times table',
      5: '5 times table',
      6: '6 times table',
      7: '7 times table',
      8: '8 times table',
      9: '9 times table',
      10: '10 times table',
      mixed: 'Mixed',
    },
  },
};

let language = readSetting('catchute-lang') === 'en' ? 'en' : 'sv';
const listeners = [];

export function getLanguage() {
  return language;
}

export function t(key, ...args) {
  const value = TEXT[language][key];
  return typeof value === 'function' ? value(...args) : value;
}

export function levelName(id) {
  return TEXT[language].levels[id];
}

// Fills in the text that is always on the page, and marks the chosen language.
function applyLanguage() {
  document.documentElement.lang = language;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  for (const button of document.querySelectorAll('#langSwitch button')) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.lang === language),
    );
  }
}

export function setLanguage(next) {
  if ((next !== 'sv' && next !== 'en') || next === language) return;
  language = next;
  writeSetting('catchute-lang', language);
  applyLanguage();
  for (const fn of listeners) fn();
}

export function onLanguageChange(fn) {
  listeners.push(fn);
}

applyLanguage();
