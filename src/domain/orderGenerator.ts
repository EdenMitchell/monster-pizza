import { fractionToWedges, normalizeFraction } from "./fractions";
import type {
  FractionSkillId,
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

function challengeId(skill: FractionSkillId, orderIndex: number, random: RandomSource) {
  return `order-${skill}-${orderIndex}-${Math.floor(random() * 1_000_000)}`;
}

function makeChallenge(
  skill: "simple" | "more-parts",
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick(skill === "simple" ? [2, 4] : [3, 6, 8], random);
  const numerator = integer(1, boardDenominator - 1, random);
  const topping = TOPPINGS[orderIndex % TOPPINGS.length]!;
  const fraction = { numerator, denominator: boardDenominator };
  return {
    id: challengeId(skill, orderIndex, random),
    skill,
    kind: "make",
    boardDenominator,
    pizzaCount: 1,
    requirements: [requirement(topping, fraction, boardDenominator)],
    visualGuide: skill === "simple",
    customerIndex: integer(0, 3, random),
  };
}

function equivalentChallenge(
  orderIndex: number,
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
  const topping = TOPPINGS[(orderIndex + 1) % TOPPINGS.length]!;
  return {
    id: challengeId("equivalent", orderIndex, random),
    skill: "equivalent",
    kind: "equivalent",
    boardDenominator: selected.board,
    pizzaCount: 1,
    requirements: [requirement(topping, selected.display, selected.board)],
    visualGuide: false,
    customerIndex: integer(0, 3, random),
  };
}

function splitChallenge(
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick([4, 6, 8], random);
  const firstWedges = integer(1, Math.max(1, Math.floor(boardDenominator / 2)), random);
  const maximumSecond = Math.max(1, boardDenominator - firstWedges);
  const secondWedges = integer(1, maximumSecond, random);
  const firstTopping = TOPPINGS[orderIndex % TOPPINGS.length]!;
  const secondTopping = TOPPINGS[(orderIndex + 1) % TOPPINGS.length]!;
  return {
    id: challengeId("combining", orderIndex, random),
    skill: "combining",
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
  orderIndex: number,
  random: RandomSource,
): OrderChallenge {
  const boardDenominator = pick([3, 4, 6], random);
  const remainder = integer(1, boardDenominator - 1, random);
  const improper = {
    numerator: boardDenominator + remainder,
    denominator: boardDenominator,
  };
  const topping = TOPPINGS[(orderIndex + 2) % TOPPINGS.length]!;
  return {
    id: challengeId("mixed-numbers", orderIndex, random),
    skill: "mixed-numbers",
    kind: "mixed",
    boardDenominator,
    pizzaCount: 2,
    requirements: [requirement(topping, improper, boardDenominator, 2)],
    visualGuide: false,
    customerIndex: integer(0, 3, random),
  };
}

export function generateOrderForSkill(
  skill: FractionSkillId,
  orderIndex: number,
  random: RandomSource = Math.random,
): OrderChallenge {
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new Error("Order index must be a non-negative integer.");
  }
  if (skill === "simple" || skill === "more-parts") {
    return makeChallenge(skill, orderIndex, random);
  }
  if (skill === "equivalent") return equivalentChallenge(orderIndex, random);
  if (skill === "combining") return splitChallenge(orderIndex, random);
  if (skill === "mixed-numbers") return mixedChallenge(orderIndex, random);
  throw new Error("Unknown fraction skill.");
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

export class SkillDeck {
  private queue: FractionSkillId[] = [];

  constructor(
    private readonly skills: readonly FractionSkillId[],
    private readonly random: RandomSource = Math.random,
  ) {
    if (skills.length === 0) throw new Error("Choose at least one fraction skill.");
  }

  next(): FractionSkillId {
    if (this.queue.length === 0) this.queue = shuffle(this.skills, this.random);
    return this.queue.shift()!;
  }
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
