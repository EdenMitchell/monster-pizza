export const ASSET = {
  exterior: "exterior",
  interior: "interior-5",
  chefWelcome: "chef-welcome",
  chefCelebrate: "chef-celebrate",
  chefHint: "chef-hint",
  customers: ["customer-koala", "customer-rabbit", "customer-otter", "customer-tortoise"],
  pizzaBase: "pizza-base",
  pizzaBox: "pizza-box",
  toppings: {
    pepperoni: "topping-pepperoni",
    mushroom: "topping-mushroom",
    olive: "topping-olive",
    pepper: "topping-pepper",
  },
} as const;

const ROOT = "/assets";

export const IMAGE_ASSET_MANIFEST: readonly { readonly key: string; readonly path: string }[] = [
  { key: ASSET.exterior, path: `${ROOT}/exterior.webp` },
  { key: ASSET.interior, path: `${ROOT}/interior-5.webp` },
  { key: ASSET.chefWelcome, path: `${ROOT}/chef-welcome.webp` },
  { key: ASSET.chefCelebrate, path: `${ROOT}/chef-celebrate.webp` },
  { key: ASSET.chefHint, path: `${ROOT}/chef-hint.webp` },
  { key: ASSET.customers[0], path: `${ROOT}/customer-koala.webp` },
  { key: ASSET.customers[1], path: `${ROOT}/customer-rabbit.webp` },
  { key: ASSET.customers[2], path: `${ROOT}/customer-otter.webp` },
  { key: ASSET.customers[3], path: `${ROOT}/customer-tortoise.webp` },
  { key: ASSET.pizzaBase, path: `${ROOT}/pizza-base.png` },
  { key: ASSET.pizzaBox, path: `${ROOT}/pizza-box.png` },
  { key: ASSET.toppings.pepperoni, path: `${ROOT}/topping-pepperoni.webp` },
  { key: ASSET.toppings.mushroom, path: `${ROOT}/topping-mushroom.webp` },
  { key: ASSET.toppings.olive, path: `${ROOT}/topping-olive.webp` },
  { key: ASSET.toppings.pepper, path: `${ROOT}/topping-pepper.webp` },
];
