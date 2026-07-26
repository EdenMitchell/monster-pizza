import { describe, expect, it } from "vitest";
import { fractionsEqual } from "./fractions";
import {
  generateSpeedOrder,
  orderIsConstructivelyValid,
  speedOrderPhase,
} from "./orderGenerator";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("single-run order ramp", () => {
  const phaseCases = [
    { served: 0, phase: "basics", kinds: ["make"] },
    { served: 2, phase: "eighths", kinds: ["make"] },
    { served: 4, phase: "equivalence", kinds: ["equivalent"] },
    { served: 6, phase: "split", kinds: ["split"] },
    { served: 8, phase: "finale", kinds: ["mixed", "equivalent", "split"] },
  ] as const;

  for (const [caseIndex, phaseCase] of phaseCases.entries()) {
    it(`generates 1,000 valid ${phaseCase.phase} orders`, () => {
      const random = seededRandom(1_000 + caseIndex);
      const observedKinds = new Set<string>();
      for (let index = 0; index < 1_000; index += 1) {
        const served = phaseCase.phase === "finale"
          ? phaseCase.served + (index % 3)
          : phaseCase.served;
        const order = generateSpeedOrder(served, random);
        observedKinds.add(order.kind);
        expect(orderIsConstructivelyValid(order)).toBe(true);
        expect(order.requirements.every((item) => item.fraction.numerator > 0)).toBe(true);
        expect(order.requirements.reduce((sum, item) => sum + item.requiredWedges, 0))
          .toBeLessThanOrEqual(order.boardDenominator * order.pizzaCount);
      }
      expect(observedKinds).toEqual(new Set(phaseCase.kinds));
    });
  }

  it("changes phase only at the documented served-count boundaries", () => {
    expect(Array.from({ length: 11 }, (_, served) => speedOrderPhase(served))).toEqual([
      "basics",
      "basics",
      "eighths",
      "eighths",
      "equivalence",
      "equivalence",
      "split",
      "split",
      "finale",
      "finale",
      "finale",
    ]);
  });

  it("keeps written fractions equivalent to physical slices", () => {
    const random = seededRandom(77);
    for (let index = 0; index < 100; index += 1) {
      const order = generateSpeedOrder(4, random);
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
});
