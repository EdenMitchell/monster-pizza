# Slice Rush ImageGen art direction

All raster artwork in `public/assets` and `public/og.png` was created with the
built-in ImageGen workflow specifically for Slice Rush. No artwork was copied
from the `maths-gamer` reference project.

## Shared direction

Warm, premium 3D-cartoon pizza parlour; friendly for ages 6–12; tomato red,
mozzarella cream, basil green, teal, and golden yellow; rounded forms, tactile
materials, soft cinematic lighting, readable silhouettes, no watermarks, no
embedded instructional text, and open areas reserved for code-rendered UI.

## Generated sets

- `exterior.webp`: inviting evening shopfront and menu backdrop.
- `interior-1.webp` through `interior-5.webp`: one consistent room that gains,
  in order, signage, oven equipment and pendant lights, booths, fairy lights,
  and a five-star trophy wall.
- `chef-welcome.webp`, `chef-celebrate.webp`, `chef-hint.webp`: framed Chef Pip
  red-panda portraits with welcoming, triumphant, and gentle coaching poses.
- Four customer cards: koala, rabbit, otter, and tortoise, each visually
  distinct but in the same framed portrait system.
- `pizza-base.png` and `pizza-box.png`: isolated top-down food and serving
  sprites generated against chroma key, keyed with the ImageGen helper, and
  inspected for clean alpha edges.
- Four topping icons: pepperoni, mushroom, olive, and green pepper, each on a
  consistent simple background and reinforced in play with a unique symbol.
- `og.png`: Chef Pip presents a sliced pizza in the completed parlour beside
  the exact dimensional title “SLICE RUSH”.

The first interior was used as the reference anchor for the remaining four
interiors. All fraction text, slice divisions, icons, and game-state labels are
rendered in code so the mathematical geometry is exact.
