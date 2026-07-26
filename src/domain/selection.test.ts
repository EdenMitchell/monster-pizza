import { describe, expect, it } from "vitest";
import type { OrderChallenge } from "./types";
import {
  countTopping,
  createEmptySelection,
  selectionMatches,
  toggleWedge,
} from "./selection";

const challenge: OrderChallenge = {
  id: "split-test",
  kind: "split",
  boardDenominator: 4,
  pizzaCount: 1,
  requirements: [
    {
      topping: "pepperoni",
      fraction: { numerator: 1, denominator: 2 },
      requiredWedges: 2,
    },
    {
      topping: "mushroom",
      fraction: { numerator: 1, denominator: 4 },
      requiredWedges: 1,
    },
  ],
  visualGuide: false,
  customerIndex: 0,
};

describe("pizza selection", () => {
  it("toggles a wedge without allowing double assignment", () => {
    let selection = createEmptySelection(challenge);
    selection = toggleWedge(selection, 0, "pepperoni");
    selection = toggleWedge(selection, 0, "mushroom");
    expect(selection.wedges[0]).toBe("mushroom");
    selection = toggleWedge(selection, 0, "mushroom");
    expect(selection.wedges[0]).toBeNull();
  });

  it("matches exact topping allocations with empty wedges allowed", () => {
    let selection = createEmptySelection(challenge);
    selection = toggleWedge(selection, 0, "pepperoni");
    selection = toggleWedge(selection, 1, "pepperoni");
    selection = toggleWedge(selection, 2, "mushroom");
    expect(countTopping(selection, "pepperoni")).toBe(2);
    expect(selectionMatches(challenge, selection)).toBe(true);
    expect(selectionMatches(challenge, toggleWedge(selection, 3, "olive"))).toBe(false);
  });

  it("ignores out-of-range wedge input", () => {
    const selection = createEmptySelection(challenge);
    expect(toggleWedge(selection, 9, "olive")).toBe(selection);
  });
});
