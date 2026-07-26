# Slice Rush

Slice Rush is a polished, device-local fractions game for ages 6–12. Players
run Chef Pip's pizza parlour, portion topping shares directly onto pizzas, and
earn stars that transform the restaurant over five 90-second shifts.

## Play

```bash
npm install
npm run dev
```

The Phaser runtime uses a 1280×720 logical canvas and scales for pointer, touch,
and keyboard play. Use the arrow keys to focus wedges, Space to place or remove
a topping, 1/2 to switch toppings, Enter to serve, and Escape to return to the
shop.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

The tests cover exact fraction arithmetic, constructive order generation,
selection rules, adaptive pacing, shift timing and scoring, progression,
persistence, migration recovery, and the complete asset manifest.

## Architecture

- `src/domain` contains deterministic maths, selection, session, and save logic.
- `src/game` contains Phaser scenes, rendering, and procedural Web Audio.
- `public/assets` contains the optimized original ImageGen art used at runtime.
- `art-source/ART_DIRECTION.md` records the generated asset set and briefs.

Progress is stored only in local storage. There are no accounts, analytics,
advertising, purchases, leaderboards, or backend services.
