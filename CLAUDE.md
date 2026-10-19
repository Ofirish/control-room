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
- Both must pass before every push. Level texts added later must be covered by the same check.

## Design decisions (agreed with Ofir)
- Combines all styles: campaign levels (manual control → build the loop → tune → knowledge check), endless "night shift" arcade, sandbox lab, flashcards with spaced repetition.
- Full engineering depth (transfer functions, Bode, root locus) — but always reached step by step.
- Must work well on phone, tablet and desktop (touch + mouse, responsive, single screen without page scroll; long text opens in a scrollable sheet).
- Switchable visual themes: dark engineering, retro pixel SCADA, cartoon, light/high-contrast.
- Plain HTML/CSS/JS, no external libraries or network dependencies; progress saved in localStorage (wrapped in try/catch).

## Roadmap
1. World 0 (electricity basics) + level engine (4 steps, mastery gate, concept cards, quiz) + 2 themes.
2. World 1 (components) — reuse the RC and thermostat simulators built earlier as levels/boss.
3. Following worlds in order; each relies only on what came before.
