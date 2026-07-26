# Slice Rush

Slice Rush is a polished, device-local fractions game for ages 6–12. Players
have 90 seconds to portion topping shares directly onto pizzas, build a hot
streak, and earn a place on the device-local top-10 leaderboard.

## Play

```bash
npm install
npm run dev
```

Press `START GAME` and the timer begins immediately. The Phaser runtime uses a
1280×720 logical canvas and scales for pointer, touch, and keyboard play. Use
the arrow keys to focus wedges, Space to place or remove a topping, 1/2 to
switch toppings, Enter to serve, and Escape to return to the menu.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

The tests cover exact fraction arithmetic, constructive order generation,
selection rules, the single-run difficulty ramp, 90-second timing and scoring,
leaderboard ordering, persistence, migration recovery, and the complete asset
manifest.

## Architecture

- `src/domain` contains deterministic maths, selection, session, leaderboard,
  and save logic.
- `src/game` contains Phaser scenes, rendering, and procedural Web Audio.
- `public/assets` contains the optimized original ImageGen art used at runtime.
- `art-source/ART_DIRECTION.md` records the generated asset set and briefs.

Settings and the top 10 are stored only in local storage. There are no accounts,
analytics, advertising, purchases, online leaderboards, or backend services.
