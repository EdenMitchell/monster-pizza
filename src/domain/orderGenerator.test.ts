import { describe, expect, it } from "vitest";
import { fractionsEqual } from "./fractions";
import { generateOrder, orderIsConstructivelyValid } from "./orderGenerator";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("constructive order generation", () => {
  for (let stage = 0; stage < 5; stage += 1) {
    for (let tier = 0; tier < 3; tier += 1) {
      it(`generates 1,000 valid stage ${stage + 1}, tier ${tier + 1} orders`, () => {
        const random = seededRandom(10_000 + stage * 100 + tier);
        for (let index = 0; index < 1_000; index += 1) {
          const order = generateOrder(stage, tier, index, random);
          expect(orderIsConstructivelyValid(order)).toBe(true);
          expect(order.requirements.every((item) => item.fraction.numerator > 0)).toBe(true);
          expect(
            order.requirements.reduce((sum, item) => sum + item.requiredWedges, 0),
          ).toBeLessThanOrEqual(order.boardDenominator * order.pizzaCount);
        }
      });
    }
  }

  it("uses different written and physical partitions for equivalence orders", () => {
    const random = seededRandom(77);
    for (let index = 0; index < 100; index += 1) {
      const order = generateOrder(2, 2, index, random);
      expect(order.kind).toBe("equivalent");
      expect(order.requirements[0]!.fraction.denominator).not.toBe(order.boardDenominator);
      expect(
        fractionsEqual(order.requirements[0]!.fraction, {
          numerator: order.requirements[0]!.requiredWedges,
          denominator: order.boardDenominator,
        }),
      ).toBe(true);
    }
  });

  it("interleaves mixed, equivalent, and split orders in the finale", () => {
    const kinds = Array.from(
      { length: 12 },
      (_, index) => generateOrder(4, 2, index, seededRandom(index + 1)).kind,
    );
    expect(new Set(kinds)).toEqual(new Set(["mixed", "equivalent", "split"]));
  });
});
