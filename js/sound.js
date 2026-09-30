// Plays the sound files in the sounds folder with the Web Audio API.

import { readSetting, writeSetting } from './storage.js';

const NAMES = [
  'click',
  'jump',
  'pop',
  'land',
  'right',
  'wrong',
  'perfect',
  'done',
];

const audio = new AudioContext();
const buffers = {};

for (const name of NAMES) {
  fetch(`sounds/${name}.wav`)
    .then((response) => response.arrayBuffer())
    .then((data) => audio.decodeAudioData(data))
    .then((buffer) => {
      buffers[name] = buffer;
    });
}

let muted = readSetting('catchute-muted') === '1';

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  writeSetting('catchute-muted', muted ? '1' : '0');
}

export function playSound(name) {
  if (muted || !buffers[name]) return;
  const source = audio.createBufferSource();
  source.buffer = buffers[name];
  source.connect(audio.destination);
  source.start();
}

// Browsers keep audio paused until the user has tapped or pressed a key.
export function unlockSounds() {
  if (audio.state === 'suspended') audio.resume();
}
