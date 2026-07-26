import type { OrderChallenge, OrderSelection, ToppingId } from "./types";

export function createEmptySelection(challenge: OrderChallenge): OrderSelection {
  return {
    wedges: Array.from(
      { length: challenge.boardDenominator * challenge.pizzaCount },
      () => null,
    ),
  };
}

export function toggleWedge(
  selection: OrderSelection,
  wedgeIndex: number,
  topping: ToppingId,
): OrderSelection {
  if (!Number.isInteger(wedgeIndex) || wedgeIndex < 0 || wedgeIndex >= selection.wedges.length) {
    return selection;
  }
  const wedges = [...selection.wedges];
  wedges[wedgeIndex] = wedges[wedgeIndex] === topping ? null : topping;
  return { wedges };
}

export function countTopping(selection: OrderSelection, topping: ToppingId): number {
  return selection.wedges.filter((candidate) => candidate === topping).length;
}

export function selectionMatches(
  challenge: OrderChallenge,
  selection: OrderSelection,
): boolean {
  if (selection.wedges.length !== challenge.boardDenominator * challenge.pizzaCount) {
    return false;
  }
  const allowed = new Set(challenge.requirements.map((requirement) => requirement.topping));
  if (selection.wedges.some((topping) => topping !== null && !allowed.has(topping))) {
    return false;
  }
  return challenge.requirements.every(
    (requirement) =>
      countTopping(selection, requirement.topping) === requirement.requiredWedges,
  );
}
