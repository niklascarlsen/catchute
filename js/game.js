// One jump: the plane flies by, the cat jumps, you steer it down to a pad.

import { gsap } from 'gsap';
import { onLanguageChange, t } from './language.js';
import { playSound } from './sound.js';

const PLANE_SPEED = 150; // pixels per second
const FALL_SPEED = 70; // pixels per second, about 6 seconds to the ground
const MAX_STEER_SPEED = 300; // fastest sideways speed, pixels per second
const STEER_EASING = 3.2; // how quickly the cat speeds up and slows down
// Pull toward the pointer. Low on purpose: together with the wind below, the
// cat settles about 100 px downwind of the pointer, so pointing at a pad misses.
const STEER_GAIN = 0.85;
// Steady sideways push, plus a gust that swells and fades during the fall.
// Strong enough that you have to steer into it. Weak enough that steering
// against it can still carry the cat from one side of the screen to the other.
const WIND_SPEED = 100;
const WIND_GUST = 15;
const PAD_TOP = 598; // where the feet stop on a pad (same as .pad in CSS)
const GRASS_TOP = 650; // ...and here if it misses and lands in the grass
const PADS_LEFT = 96; // the pads are spread out between these two x positions
const PADS_WIDTH = 830;

const planeImg = document.getElementById('plane');
const jumper = document.getElementById('jumper');
const parachuteImg = document.getElementById('parachute');
const catImg = document.getElementById('cat');
const padArea = document.getElementById('pads');
const effects = document.getElementById('effects');
const windEl = document.getElementById('wind');

export const game = {
  state: 'idle', // idle, aim, falling or landed
  question: null,
  pads: [],
  planeX: -900, // middle of the plane (the image is 160 px wide)
  catX: 0, // middle of the cat
  catY: 0, // the cat's feet
  catSpeedX: 0, // sideways speed, pixels per second
  targetX: null, // where the player is pointing
  keyDirection: 0, // -1 left, 1 right, 0 no key
  wind: 0, // steady push this jump, pixels per second. Negative blows left.
  windPhase: 0,
  missedPads: false,
  jumpWhenReady: false, // tapped before the plane was on screen
  screenLeft: 0, // visible edges of the screen, set by main.js
  screenRight: 1024,
  timers: [],
  onLanded: null, // main.js sets this to show the result
};

// Get ready for a new question: new pads, and the plane comes in from the left.
export function showQuestion(question) {
  clearJump();
  game.question = question;
  game.state = 'aim';
  game.planeX = game.screenLeft - 160;
  game.targetX = null;
  game.missedPads = false;
  game.jumpWhenReady = false;

  // Spread the pads out evenly across the ground.
  padArea.innerHTML = '';
  const width = question.options.length === 3 ? 170 : 150;
  const space = PADS_WIDTH / question.options.length;
  game.pads = question.options.map((value, i) => {
    const x = PADS_LEFT + space * (i + 0.5);
    const el = document.createElement('div');
    el.className = 'pad';
    el.textContent = value;
    el.style.left = x - width / 2 + 'px';
    el.style.width = width + 'px';
    padArea.append(el);
    gsap.from(el, {
      scaleY: 0,
      transformOrigin: 'bottom',
      duration: 0.5,
      delay: 0.15 + i * 0.08,
      ease: 'back.out(2.5)',
    });
    return { value, x, width, el };
  });
  pickWind();
}

function planeOnScreen() {
  return game.planeX > 40 && game.planeX < 980;
}

export function jump() {
  if (game.state !== 'aim') return;
  // If the plane isn't on screen yet, jump as soon as it arrives.
  if (!planeOnScreen()) {
    game.jumpWhenReady = true;
    return;
  }
  game.jumpWhenReady = false;
  game.state = 'falling';
  game.catX = game.planeX;
  game.catY = 200;
  game.catSpeedX = PLANE_SPEED * 0.6; // the cat keeps some of the plane's speed
  placeJumper(0);
  jumper.hidden = false;
  gsap.fromTo(
    parachuteImg,
    { scale: 0 },
    {
      scale: 1,
      duration: 0.7,
      ease: 'elastic.out(1, 0.45)',
      transformOrigin: '50% 80%',
    },
  );
  playSound('jump');
  game.timers.push(gsap.delayedCall(0.2, () => playSound('pop')));
}

// Runs every frame. dt is the time since the last frame, in seconds.
function update(dt) {
  // The plane keeps flying across the sky while you're choosing when to jump.
  // Once it has left on the right it starts again just outside the left edge
  // of the screen. On the menu it waits a bit longer between laps.
  game.planeX += PLANE_SPEED * dt;
  if (
    game.planeX > game.screenRight + 160 &&
    (game.state === 'aim' || game.state === 'idle')
  ) {
    game.planeX = game.screenLeft - (game.state === 'idle' ? 900 : 160);
  }
  planeImg.style.transform = `translateX(${game.planeX - 80}px)`;

  if (game.state === 'aim' && game.jumpWhenReady && planeOnScreen()) jump();

  if (game.state !== 'falling') return;

  // Steering pulls toward the pointer, or runs at full speed with the keys.
  // The wind is added on top, so the cat settles downwind of the pointer:
  // pointing straight at a pad lands you beside it. Aim into the wind.
  let wantedSpeed = 0;
  if (game.missedPads) {
    wantedSpeed = 0; // missed the pads, no more steering
  } else if (game.keyDirection) {
    wantedSpeed = game.keyDirection * MAX_STEER_SPEED;
  } else if (game.targetX !== null) {
    wantedSpeed = (game.targetX - game.catX) * STEER_GAIN;
    wantedSpeed = Math.max(
      -MAX_STEER_SPEED,
      Math.min(MAX_STEER_SPEED, wantedSpeed),
    );
  }
  game.catSpeedX +=
    (wantedSpeed - game.catSpeedX) * Math.min(1, STEER_EASING * dt);
  const wind = windNow();
  const drift = Math.max(
    -MAX_STEER_SPEED,
    Math.min(MAX_STEER_SPEED, game.catSpeedX + wind),
  );
  game.catX += drift * dt;
  game.catX = Math.max(30, Math.min(994, game.catX));

  game.catY += FALL_SPEED * dt;

  // Light up the pad the cat is above, so you can see where you'll land.
  const pad = game.missedPads ? null : padBelow(game.catX);
  for (const p of game.pads) p.el.classList.toggle('below-cat', p === pad);

  if (!game.missedPads && game.catY >= PAD_TOP) {
    if (pad) {
      game.catY = PAD_TOP;
      land(pad);
    } else {
      game.missedPads = true; // too late now, it's going into the grass
      game.catSpeedX = 0;
    }
  }
  if (game.missedPads && game.catY >= GRASS_TOP) {
    game.catY = GRASS_TOP;
    land(null);
  }

  // The cat swings a little while falling, and leans the way it's moving.
  const swing =
    game.state === 'falling'
      ? Math.sin(performance.now() / 450) * 4 + drift * 0.04
      : 0;
  placeJumper(swing);
}

// Mouse and touch: steer towards this x. The mouse takes over from the keys.
export function steerTo(x) {
  game.targetX = x;
  game.keyDirection = 0;
}

// Arrow keys: -1 for left, 1 for right, 0 when no key is held.
export function steerWithKeys(direction) {
  game.keyDirection = direction;
  if (direction) game.targetX = null; // the keys take over from the mouse
}

// The jumper box is 128 x 172 px. This puts the middle of the cat at catX and
// its feet at catY.
function placeJumper(rotation) {
  const x = game.catX - 64;
  const y = game.catY - 168;
  jumper.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

function padBelow(x) {
  return game.pads.find((p) => Math.abs(x - p.x) < p.width / 2 - 4) || null;
}

// A new wind for this jump, blowing left or right, and the arrow that shows it.
function pickWind() {
  game.wind = (Math.random() < 0.5 ? -1 : 1) * WIND_SPEED;
  game.windPhase = Math.random() * Math.PI * 2;
  drawWind();
}

function windNow() {
  return (
    game.wind + Math.sin(performance.now() / 1100 + game.windPhase) * WIND_GUST
  );
}

function drawWind() {
  const left = game.wind < 0;
  windEl.hidden = false;
  windEl.classList.toggle('blows-left', left);
  windEl.classList.toggle('blows-right', !left);
  windEl.setAttribute('aria-label', t(left ? 'windLeft' : 'windRight'));
}

function hideWind() {
  windEl.hidden = true;
  windEl.classList.remove('blows-left', 'blows-right');
}

onLanguageChange(() => {
  if (!windEl.hidden) drawWind();
});

function land(pad) {
  game.state = 'landed';
  hideWind();
  const rightPad = game.pads.find((p) => p.value === game.question.answer);
  const correct = pad === rightPad;
  // Landing right in the middle gets confetti, but doesn't change the score.
  const perfect = correct && Math.abs(game.catX - pad.x) < pad.width * 0.08;

  playSound('land');
  for (const p of game.pads) p.el.classList.remove('below-cat');

  // Squash the cat when it lands, and let the parachute fall over.
  gsap.fromTo(
    catImg,
    { scaleX: 1.25, scaleY: 0.72 },
    {
      scaleX: 1,
      scaleY: 1,
      duration: 0.6,
      ease: 'elastic.out(1, 0.35)',
      transformOrigin: '50% 98%',
    },
  );
  gsap.to(parachuteImg, {
    rotation: 80,
    x: 50,
    y: 70,
    opacity: 0,
    duration: 0.9,
    ease: 'power2.in',
    transformOrigin: '50% 80%',
  });

  game.timers.push(
    gsap.delayedCall(0.35, () => {
      rightPad.el.classList.add('right');
      if (correct) {
        playSound(perfect ? 'perfect' : 'right');
        // Happy jumps.
        gsap.to(catImg, { y: -16, duration: 0.16, yoyo: true, repeat: 3 });
        if (perfect) confetti(game.catX, PAD_TOP - 70);
      } else {
        playSound('wrong');
        if (pad) pad.el.classList.add('wrong');
        // Falls over and gets back up.
        gsap.to(catImg, {
          rotation: -80,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          repeatDelay: 1.1,
          transformOrigin: '50% 98%',
        });
      }
    }),
  );

  game.timers.push(
    gsap.delayedCall(1.2, () => {
      game.onLanded({ correct, perfect, chosen: pad ? pad.value : null });
    }),
  );
}

function confetti(x, y) {
  const colors = [
    '#ef4444',
    '#facc15',
    '#22c55e',
    '#3b82f6',
    '#a855f7',
    '#f97316',
  ];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.background = colors[i % colors.length];
    effects.append(piece);
    const dx = (Math.random() - 0.5) * 420;
    gsap
      .timeline({ onComplete: () => piece.remove() })
      .set(piece, { x, y, rotation: Math.random() * 360 })
      .to(piece, {
        x: x + dx * 0.6,
        y: y - 120 - Math.random() * 220,
        rotation: '+=360',
        duration: 0.5,
        ease: 'power2.out',
      })
      .to(piece, {
        x: x + dx,
        y: y + 80,
        rotation: '+=540',
        opacity: 0,
        duration: 1.2,
        ease: 'power1.in',
      });
  }
}

// Removes the cat and stops everything left over from the last jump.
function clearJump() {
  game.timers.forEach((timer) => timer.kill());
  game.timers = [];
  game.wind = 0;
  hideWind();
  gsap.killTweensOf([catImg, parachuteImg, ...effects.children]);
  gsap.set([catImg, parachuteImg], { clearProps: 'all' });
  jumper.hidden = true;
  effects.innerHTML = '';
}

export function stopGame() {
  clearJump();
  game.state = 'idle';
  padArea.innerHTML = '';
  game.pads = [];
}

// The plane and the steering are updated every frame on GSAP's ticker, since
// they follow the player's input. The capped dt stops the cat from jumping
// forward after the tab has been in the background.
gsap.ticker.add((time, deltaTime) => update(Math.min(deltaTime / 1000, 0.05)));
