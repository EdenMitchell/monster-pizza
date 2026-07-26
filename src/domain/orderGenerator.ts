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

export type SpeedOrderPhase = "basics" | "eighths" | "equivalence" | "split" | "finale";

export function speedOrderPhase(servedCount: number): SpeedOrderPhase {
  if (servedCount < 2) return "basics";
  if (servedCount < 4) return "eighths";
  if (servedCount < 6) return "equivalence";
  if (servedCount < 8) return "split";
  return "finale";
}

function challengeId(phase: SpeedOrderPhase, servedCount: number, random: RandomSource) {
  return `order-${phase}-${servedCount}-${Math.floor(random() * 1_000_000)}`;
}

function makeChallenge(
  phase: "basics" | "eighths",
  servedCount: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick(phase === "basics" ? [2, 4] : [3, 6, 8], random);
  const numerator = integer(1, boardDenominator - 1, random);
  const topping = TOPPINGS[servedCount % TOPPINGS.length]!;
  const fraction = { numerator, denominator: boardDenominator };
  return {
    id: challengeId(phase, servedCount, random),
    kind: "make",
    boardDenominator,
    pizzaCount: 1,
    requirements: [requirement(topping, fraction, boardDenominator)],
    visualGuide: phase === "basics",
    customerIndex: integer(0, 3, random),
  };
}

function equivalentChallenge(
  phase: "equivalence" | "finale",
  servedCount: number,
  random: RandomSource,
): OrderChallenge {
  const candidates = [
    { display: { numerator: 1, denominator: 2 }, board: 4 },
    { display: { numerator: 1, denominator: 2 }, board: 6 },
    { display: { numerator: 1, denominator: 3 }, board: 6 },
    { display: { numerator: 2, denominator: 3 }, board: 6 },
    { display: { numerator: 1, denominator: 4 }, board: 8 },
    { display: { numerator: 3, denominator: 4 }, board: 8 },
  ];
  const selected = pick(candidates, random);
  const topping = TOPPINGS[(servedCount + 1) % TOPPINGS.length]!;
  return {
    id: challengeId(phase, servedCount, random),
    kind: "equivalent",
    boardDenominator: selected.board,
    pizzaCount: 1,
    requirements: [requirement(topping, selected.display, selected.board)],
    visualGuide: false,
    customerIndex: integer(0, 3, random),
  };
}

function splitChallenge(
  phase: "split" | "finale",
  servedCount: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick(phase === "split" ? [4, 6] : [6, 8], random);
  const firstWedges = integer(1, Math.max(1, Math.floor(boardDenominator / 2)), random);
  const maximumSecond = Math.max(1, boardDenominator - firstWedges);
  const secondWedges = integer(1, maximumSecond, random);
  const firstTopping = TOPPINGS[servedCount % TOPPINGS.length]!;
  const secondTopping = TOPPINGS[(servedCount + 1) % TOPPINGS.length]!;
  return {
    id: challengeId(phase, servedCount, random),
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
    visualGuide: false,
    customerIndex: integer(0, 3, random),
  };
}

function mixedChallenge(
  servedCount: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick([3, 4, 6], random);
  const remainder = integer(1, boardDenominator - 1, random);
  const improper = {
    numerator: boardDenominator + remainder,
    denominator: boardDenominator,
  };
  const topping = TOPPINGS[(servedCount + 2) % TOPPINGS.length]!;
  return {
    id: challengeId("finale", servedCount, random),
    kind: "mixed",
    boardDenominator,
    pizzaCount: 2,
    requirements: [requirement(topping, improper, boardDenominator, 2)],
    visualGuide: false,
    customerIndex: integer(0, 3, random),
  };
}

export function generateSpeedOrder(
  servedCount: number,
  random: RandomSource = Math.random,
): OrderChallenge {
  if (!Number.isInteger(servedCount) || servedCount < 0) {
    throw new Error("Served count must be a non-negative integer.");
  }
  const phase = speedOrderPhase(servedCount);
  if (phase === "basics" || phase === "eighths") {
    return makeChallenge(phase, servedCount, random);
  }
  if (phase === "equivalence") return equivalentChallenge(phase, servedCount, random);
  if (phase === "split") return splitChallenge(phase, servedCount, random);
  const finaleIndex = (servedCount - 8) % 3;
  if (finaleIndex === 0) return mixedChallenge(servedCount, random);
  if (finaleIndex === 1) return equivalentChallenge("finale", servedCount, random);
  return splitChallenge("finale", servedCount, random);
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
