import { describe, expect, it } from "vitest";
import { FRACTION_SKILL_ORDER } from "../config/gameConfig";
import { fractionsEqual } from "./fractions";
import {
  generateOrderForSkill,
  orderIsConstructivelyValid,
  SkillDeck,
} from "./orderGenerator";
import type { FractionSkillId } from "./types";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("teacher-selectable order skills", () => {
  for (const [skillIndex, skill] of FRACTION_SKILL_ORDER.entries()) {
    it(`generates 1,000 valid ${skill} orders`, () => {
      const random = seededRandom(1_000 + skillIndex);
      for (let index = 0; index < 1_000; index += 1) {
        const order = generateOrderForSkill(skill, index, random);
        const totalWedges = order.requirements.reduce(
          (sum, item) => sum + item.requiredWedges,
          0,
        );

        expect(order.skill).toBe(skill);
        expect(orderIsConstructivelyValid(order)).toBe(true);
        expect(order.requirements.every((item) => item.fraction.numerator > 0)).toBe(true);
        expect(totalWedges).toBeLessThanOrEqual(
          order.boardDenominator * order.pizzaCount,
        );

        if (skill === "simple") {
          expect(order.kind).toBe("make");
          expect([2, 4]).toContain(order.boardDenominator);
          expect(order.pizzaCount).toBe(1);
        } else if (skill === "more-parts") {
          expect(order.kind).toBe("make");
          expect([3, 6, 8]).toContain(order.boardDenominator);
          expect(order.pizzaCount).toBe(1);
        } else if (skill === "equivalent") {
          const requirement = order.requirements[0]!;
          expect(order.kind).toBe("equivalent");
          expect(requirement.fraction.denominator).not.toBe(order.boardDenominator);
          expect(
            fractionsEqual(requirement.fraction, {
              numerator: requirement.requiredWedges,
              denominator: order.boardDenominator,
            }),
          ).toBe(true);
        } else if (skill === "combining") {
          expect(order.kind).toBe("split");
          expect(order.requirements).toHaveLength(2);
          expect(
            order.requirements.every(
              (item) => item.fraction.denominator === order.boardDenominator,
            ),
          ).toBe(true);
          expect(totalWedges).toBeLessThanOrEqual(order.boardDenominator);
        } else {
          const requirement = order.requirements[0]!;
          expect(order.kind).toBe("mixed");
          expect(order.pizzaCount).toBe(2);
          expect(requirement.fraction.numerator).toBeGreaterThan(
            requirement.fraction.denominator,
          );
          expect(requirement.requiredWedges).toBeGreaterThan(order.boardDenominator);
          expect(requirement.requiredWedges).toBeLessThan(
            order.boardDenominator * 2,
          );
        }
      }
    });
  }

  it("uses every selected skill once before beginning another shuffled cycle", () => {
    const selected: readonly FractionSkillId[] = [
      "simple",
      "equivalent",
      "mixed-numbers",
    ];
    const deck = new SkillDeck(selected, seededRandom(42));
    const firstCycle = Array.from({ length: selected.length }, () => deck.next());
    const secondCycle = Array.from({ length: selected.length }, () => deck.next());
    expect(new Set(firstCycle)).toEqual(new Set(selected));
    expect(new Set(secondCycle)).toEqual(new Set(selected));
  });

  it("makes combining twice as frequent as each other selected skill", () => {
    const selected = [...FRACTION_SKILL_ORDER];
    const deck = new SkillDeck(selected, seededRandom(123));
    const twoCycles = Array.from(
      { length: (selected.length + 1) * 2 },
      () => deck.next(),
    );
    const counts = new Map<FractionSkillId, number>();
    twoCycles.forEach((skill) => counts.set(skill, (counts.get(skill) ?? 0) + 1));

    expect(counts.get("combining")).toBe(4);
    selected
      .filter((skill) => skill !== "combining")
      .forEach((skill) => expect(counts.get(skill)).toBe(2));
  });

  it("never leaks another skill when only one skill is selected", () => {
    const deck = new SkillDeck(["simple"], seededRandom(99));
    expect(Array.from({ length: 100 }, () => deck.next())).toEqual(
      Array.from({ length: 100 }, () => "simple"),
    );
  });

  it("rejects an empty skill deck", () => {
    expect(() => new SkillDeck([])).toThrow("Choose at least one fraction skill.");
  });
});
