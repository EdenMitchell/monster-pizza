export const ASSET = {
  exterior: "monster-exterior",
  interior: "monster-interior",
  chefWelcome: "monster-chef-welcome",
  chefCelebrate: "monster-chef-celebrate",
  chefHint: "monster-chef-hint",
  customers: [
    "monster-customer-gloop",
    "monster-customer-munch",
    "monster-customer-boggles",
    "monster-customer-fizz",
  ],
  pizzaBase: "pizza-base",
  pizzaBox: "pizza-box",
  toppings: {
    pepperoni: "monster-topping-fried-slugs",
    mushroom: "monster-topping-zombie-brains",
    olive: "monster-topping-pickled-eyes",
    pepper: "monster-topping-swamp-worms",
  },
} as const;

const ROOT = "/assets";

export const IMAGE_ASSET_MANIFEST: readonly { readonly key: string; readonly path: string }[] = [
  { key: ASSET.exterior, path: `${ROOT}/monster-exterior.webp` },
  { key: ASSET.interior, path: `${ROOT}/monster-interior.webp` },
  { key: ASSET.chefWelcome, path: `${ROOT}/monster-chef-welcome.webp` },
  { key: ASSET.chefCelebrate, path: `${ROOT}/monster-chef-celebrate.webp` },
  { key: ASSET.chefHint, path: `${ROOT}/monster-chef-hint.webp` },
  { key: ASSET.customers[0], path: `${ROOT}/monster-customer-gloop.webp` },
  { key: ASSET.customers[1], path: `${ROOT}/monster-customer-munch.webp` },
  { key: ASSET.customers[2], path: `${ROOT}/monster-customer-boggles.webp` },
  { key: ASSET.customers[3], path: `${ROOT}/monster-customer-fizz.webp` },
  { key: ASSET.pizzaBase, path: `${ROOT}/pizza-base.png` },
  { key: ASSET.pizzaBox, path: `${ROOT}/pizza-box.png` },
  {
    key: ASSET.toppings.pepperoni,
    path: `${ROOT}/monster-topping-fried-slugs.webp`,
  },
  {
    key: ASSET.toppings.mushroom,
    path: `${ROOT}/monster-topping-zombie-brains.webp`,
  },
  {
    key: ASSET.toppings.olive,
    path: `${ROOT}/monster-topping-pickled-eyes.webp`,
  },
  {
    key: ASSET.toppings.pepper,
    path: `${ROOT}/monster-topping-swamp-worms.webp`,
  },
];
