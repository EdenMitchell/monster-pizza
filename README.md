# Monster Pizza

Monster Pizza is a polished, device-local fractions game for ages 6–12.
Teachers choose the fraction skills, then players have 90 seconds to portion
fried slugs, zombie brains, pickled eyes, and swamp worms directly onto pizzas,
build a hot streak, and earn a place on that skill setup's device-local top-10
leaderboard.

## Play

```bash
npm install
npm run dev
```

Choose one or more skills, then press `START GAME`; the timer begins
immediately. On the menu, 1–5 toggle skills, `L` opens the active setup's
leaderboard, Enter starts, and Escape closes the leaderboard. During play, use
the arrow keys to focus wedges, Space to place or remove an ingredient, number
keys to switch ingredients, Enter to serve, and Escape to return to the menu.

All five skills are selected on a fresh installation. Selected skills appear
in a shuffled deck that guarantees every skill is used, with Combining
Fractions included twice per cycle so multi-topping pizzas appear frequently.
Selections persist on the device and are captured when a run starts. Every
exact skill combination has its own local top 10.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

The tests cover exact fraction arithmetic, at least 1,000 constructive orders
for every selectable skill, shuffled-deck balance, selection rules, 90-second
timing and scoring, per-setup leaderboard ordering, persistence, migration
recovery, and the complete asset manifest.

## Architecture

- `src/domain` contains deterministic maths, selection, session, leaderboard,
  and save logic.
- `src/game` contains Phaser scenes, rendering, and procedural Web Audio.
- `public/assets` contains the optimized original ImageGen art used at runtime.
- `art-source/ART_DIRECTION.md` records the generated asset set and briefs.

Settings, skill selections, and leaderboards are stored only in local storage.
There are no accounts, analytics, advertising, purchases, online leaderboards,
or backend services.
