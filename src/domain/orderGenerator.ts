import { fractionToWedges, normalizeFraction } from "./fractions";
import type {
  FractionValue,
  OrderChallenge,
  OrderRequirement,
  RandomSource,
  ToppingId,
} from "./types";

const TOPPINGS: readonly ToppingId[] = ["pepperoni", "mushroom", "olive", "pepper"];

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

function integer(minimum: number, maximum: number, random: RandomSource): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function requirement(
  topping: ToppingId,
  fraction: FractionValue,
  boardDenominator: number,
  pizzaCount: 1 | 2 = 1,
): OrderRequirement {
  return {
    topping,
    fraction,
    requiredWedges: fractionToWedges(fraction, boardDenominator, pizzaCount),
  };
}

function challengeId(stageIndex: number, tier: number, orderIndex: number, random: RandomSource) {
  return `order-${stageIndex}-${tier}-${orderIndex}-${Math.floor(random() * 1_000_000)}`;
}

function makeChallenge(
  stageIndex: number,
  tier: number,
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const denominatorSets = stageIndex === 0
    ? tier === 0 ? [2] : [2, 4]
    : tier === 0 ? [3] : tier === 1 ? [3, 6] : [6, 8];
  const boardDenominator = pick(denominatorSets, random);
  const numerator = integer(1, boardDenominator - 1, random);
  const topping = TOPPINGS[(stageIndex + orderIndex) % TOPPINGS.length]!;
  const fraction = { numerator, denominator: boardDenominator };
  return {
    id: challengeId(stageIndex, tier, orderIndex, random),
    kind: "make",
    boardDenominator,
    pizzaCount: 1,
    requirements: [requirement(topping, fraction, boardDenominator)],
    visualGuide: stageIndex === 0 || tier === 0,
    customerIndex: integer(0, 3, random),
  };
}

function equivalentChallenge(
  stageIndex: number,
  tier: number,
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const candidates = tier === 0
    ? [
        { display: { numerator: 1, denominator: 2 }, board: 4 },
        { display: { numerator: 1, denominator: 2 }, board: 6 },
      ]
    : tier === 1
      ? [
          { display: { numerator: 1, denominator: 3 }, board: 6 },
          { display: { numerator: 2, denominator: 3 }, board: 6 },
          { display: { numerator: 1, denominator: 2 }, board: 8 },
        ]
      : [
          { display: { numerator: 1, denominator: 4 }, board: 8 },
          { display: { numerator: 3, denominator: 4 }, board: 8 },
          { display: { numerator: 2, denominator: 3 }, board: 6 },
          { display: { numerator: 1, denominator: 2 }, board: 8 },
        ];
  const selected = pick(candidates, random);
  const topping = TOPPINGS[(orderIndex + 1) % TOPPINGS.length]!;
  return {
    id: challengeId(stageIndex, tier, orderIndex, random),
    kind: "equivalent",
    boardDenominator: selected.board,
    pizzaCount: 1,
    requirements: [requirement(topping, selected.display, selected.board)],
    visualGuide: tier === 0 && orderIndex < 2,
    customerIndex: integer(0, 3, random),
  };
}

function splitChallenge(
  stageIndex: number,
  tier: number,
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick(tier === 0 ? [4] : tier === 1 ? [4, 6] : [6, 8], random);
  const firstWedges = integer(1, Math.max(1, Math.floor(boardDenominator / 2)), random);
  const maximumSecond = Math.max(1, boardDenominator - firstWedges);
  const secondWedges = integer(1, maximumSecond, random);
  const firstTopping = TOPPINGS[orderIndex % TOPPINGS.length]!;
  const secondTopping = TOPPINGS[(orderIndex + 1) % TOPPINGS.length]!;
  return {
    id: challengeId(stageIndex, tier, orderIndex, random),
    kind: "split",
    boardDenominator,
    pizzaCount: 1,
    requirements: [
      requirement(
        firstTopping,
        { numerator: firstWedges, denominator: boardDenominator },
        boardDenominator,
      ),
      requirement(
        secondTopping,
        { numerator: secondWedges, denominator: boardDenominator },
        boardDenominator,
      ),
    ],
    visualGuide: tier === 0 && orderIndex < 2,
    customerIndex: integer(0, 3, random),
  };
}

function mixedChallenge(
  stageIndex: number,
  tier: number,
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick(tier === 0 ? [2] : tier === 1 ? [2, 3, 4] : [3, 4, 6], random);
  const remainder = integer(1, boardDenominator - 1, random);
  const improper = {
    numerator: boardDenominator + remainder,
    denominator: boardDenominator,
  };
  const topping = TOPPINGS[(orderIndex + 2) % TOPPINGS.length]!;
  return {
    id: challengeId(stageIndex, tier, orderIndex, random),
    kind: "mixed",
    boardDenominator,
    pizzaCount: 2,
    requirements: [requirement(topping, improper, boardDenominator, 2)],
    visualGuide: tier === 0 && orderIndex < 2,
    customerIndex: integer(0, 3, random),
  };
}

export function generateOrder(
  stageIndex: number,
  tier: number,
  orderIndex: number,
  random: RandomSource = Math.random,
): OrderChallenge {
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > 4) {
    throw new Error("Unknown Slice Rush shift.");
  }
  if (!Number.isInteger(tier) || tier < 0 || tier > 2) {
    throw new Error("Unknown Slice Rush difficulty tier.");
  }
  if (stageIndex <= 1) return makeChallenge(stageIndex, tier, orderIndex, random);
  if (stageIndex === 2) return equivalentChallenge(stageIndex, tier, orderIndex, random);
  if (stageIndex === 3) return splitChallenge(stageIndex, tier, orderIndex, random);
  if (orderIndex % 3 === 0) return mixedChallenge(stageIndex, tier, orderIndex, random);
  if (orderIndex % 3 === 1) {
    return equivalentChallenge(stageIndex, tier, orderIndex, random);
  }
  return splitChallenge(stageIndex, tier, orderIndex, random);
}

export function orderIsConstructivelyValid(order: OrderChallenge): boolean {
  if (order.pizzaCount !== 1 && order.pizzaCount !== 2) return false;
  if (![2, 3, 4, 6, 8].includes(order.boardDenominator)) return false;
  if (order.requirements.length < 1 || order.requirements.length > 2) return false;
  const capacity = order.boardDenominator * order.pizzaCount;
  const totalWedges = order.requirements.reduce(
    (sum, candidate) => sum + candidate.requiredWedges,
    0,
  );
  if (totalWedges <= 0 || totalWedges > capacity) return false;
  const toppingIds = new Set(order.requirements.map((candidate) => candidate.topping));
  if (toppingIds.size !== order.requirements.length) return false;
  return order.requirements.every((candidate) => {
    const normalized = normalizeFraction(candidate.fraction);
    return (
      normalized.denominator > 0 &&
      candidate.requiredWedges > 0 &&
      candidate.requiredWedges <= capacity &&
      fractionToWedges(candidate.fraction, order.boardDenominator, order.pizzaCount) ===
        candidate.requiredWedges
    );
  });
}
