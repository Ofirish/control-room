# Control Room (חדר בקרה) — educational control-systems game

Hebrew (RTL) web game that teaches electricity, components, circuits, sensors, signals and control loops step by step, from Ohm's law up to PID, stability, PLC and safety.

## Hosting
- GitHub Pages, deployed from branch `main`, folder `/` (root). Every push to `main` goes live at https://ofirish.github.io/control-room/ within a minute or two. No build step.
- Updates are usually requested from Ofir's phone via Claude: make the change, run the checks below, push to `main`.

## Non-negotiable teaching rules
1. Every concept, symbol, acronym and unit is explained AND demonstrated (live demo) before or at the level where it is first used. No unexplained term anywhere in the game.
2. One new idea per level. Each level has 4 steps: demonstration → guided practice (hints, cannot fail) → solo challenge → summary card.
3. Next level unlocks only after mastery (challenge passed + ~80% on the quiz).
4. Every concept card shows where it was learned and where it comes back later.
5. Every term in game text is tappable and opens its concept card without leaving the level.

## Data
- `data/concepts.json` is the single source of truth for concepts, worlds and levels (generated — do not edit by hand).
- Edit `tools/build_concepts.py`, then run:
  - `python3 tools/build_concepts.py` — rebuilds the JSON and fails if any prerequisite is introduced after the concept that needs it.
  - `python3 tools/check_terms.py` — fails if any card text uses a term before the level that teaches it.
  - `python3 tools/check_levels.py` — checks the level content in `js/world*.js`: every `[[term]]` exists and is already taught, no unmarked later term appears, every concept is introduced in its level's demo slides, every concept has a live demo.
- All three must pass before every push.
- `tools/playtest.py` plays every level end to end in a headless browser (needs playwright and a local server: `python3 -m http.server 8765`). Add a solution to its `SOL` table for every new level.

## Code layout
- `index.html` — shell + all CSS (themes via `data-theme` CSS variables: dark, retro, light).
- `js/concepts.js` — generated copy of the registry (so the game also works from file:// with no fetch).
- `js/widgets.js` — interactive widgets: `circuit` (DC nodal solver + schematic: bat, R, lamp, sw, am, vm, pot, gnd, wires; nodes are matched by identical coordinates), `flow`, `charge`, `prefix`.
- `js/world0.js` — World 0 levels (demo slides → guided tasks → challenge → 5-question quiz) and a live demo for every concept. Text markup: `[[conceptId]]` or `[[conceptId|shown text]]`. Task/challenge conditions are JS expressions over the widget `w` and `near(a, b, tol)`.
- `js/engine.js` — map, level runner, mastery gate (challenge + ≥80% quiz), concept cards (bottom sheet), encyclopedia, themes, progress in localStorage key `cr.v1`.

## Design decisions (agreed with Ofir)
- Combines all styles: campaign levels (manual control → build the loop → tune → knowledge check), endless "night shift" arcade, sandbox lab, flashcards with spaced repetition.
- Full engineering depth (transfer functions, Bode, root locus) — but always reached step by step.
- Must work well on phone, tablet and desktop (touch + mouse, responsive, single screen without page scroll; long text opens in a scrollable sheet).
- Switchable visual themes: dark engineering, retro pixel SCADA, cartoon, light/high-contrast.
- Plain HTML/CSS/JS, no external libraries or network dependencies; progress saved in localStorage (wrapped in try/catch).

## Roadmap
1. ✅ World 0 (electricity basics) + level engine (4 steps, mastery gate, concept cards, quiz) + 3 themes (dark, retro, light). Cartoon theme still to do.
2. World 1 (components) — reuse the RC and thermostat simulators built earlier as levels/boss.
3. Following worlds in order; each relies only on what came before.
