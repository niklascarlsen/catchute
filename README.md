# Catchute

A simple game for kids learning the multiplication tables. A cat jumps out of a plane, you work out the answer and steer the parachute so the cat lands on the pad with the right number.

Each table from 2 to 10 has its own level with all ten questions, plus a mixed level. At the end of a round you see the whole table with the ones you got right and wrong, and you can practice the ones you missed.

Built with plain HTML, CSS and JavaScript. Animations use [GSAP](https://gsap.com).

## Files

- `index.html` is the page
- `style.css` is the styling
- `js/questions.js` has the tables and makes the questions and answer options
- `js/sound.js` plays the sounds
- `js/storage.js` saves settings and records in the browser
- `js/game.js` handles the jump itself: the plane, the fall, the pads and the landing
- `js/main.js` handles the menu, rounds, results and controls
- `images/` and `sounds/` hold the graphics and sound effects
- `lib/gsap.js` and `fonts/` are local copies of GSAP and the Fredoka font

## Running it

Run `npx serve` in the project folder and open the address it prints, or open `index.html` with a live server extension in your editor. Opening `index.html` directly won't work, since the code uses JavaScript modules.

`npm install` is only needed for editor support (GSAP types and Prettier).
