# AGENTS.md

## Project

Asteroids clone in vanilla HTML5 Canvas. All game logic lives in `game.js`; `index.html` just hosts the canvas and loads the script. No dependencies, no bundler, no build step.

## Run / verify

- Load `index.html` directly in a browser, or `npx serve .` -> `http://localhost:3000`.
- There is **no test, lint, or typecheck tooling** — verification is manual: open the page and play.

## Conventions

- Spanish: README, code comments, and all on-canvas user-facing strings (HUD `SCORE`/`NIVEL`, overlays `GAME OVER`) are in Spanish. Match this for new comments and strings.
- Canvas is hardcoded to 800x600. The `W`/`H` constants at the top of `game.js` are the single source of truth; the `<canvas>` attributes in `index.html` must stay in sync if they change.
- `game.js` uses `'use strict'`, ES6 classes, and `requestAnimationFrame` with delta-time (`dt`) updates. Fine to follow existing patterns.