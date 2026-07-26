import { describe, expect, it } from "vitest";
import {
  formatFraction,
  fractionToWedges,
  fractionsEqual,
  greatestCommonDivisor,
  normalizeFraction,
} from "./fractions";

describe("fraction arithmetic", () => {
  it("compares equivalent fractions with integer cross multiplication", () => {
    expect(fractionsEqual({ numerator: 1, denominator: 2 }, { numerator: 4, denominator: 8 }))
      .toBe(true);
    expect(fractionsEqual({ numerator: 2, denominator: 3 }, { numerator: 5, denominator: 8 }))
      .toBe(false);
  });

  it("normalizes and validates representations", () => {
    expect(greatestCommonDivisor(18, 24)).toBe(6);
    expect(normalizeFraction({ numerator: 6, denominator: 8 }))
      .toEqual({ numerator: 3, denominator: 4 });
    expect(() => normalizeFraction({ numerator: 1.5, denominator: 3 })).toThrow();
    expect(() => normalizeFraction({ numerator: 1, denominator: 0 })).toThrow();
  });

  it("converts equivalent and mixed-number shares to physical wedges", () => {
    expect(fractionToWedges({ numerator: 1, denominator: 2 }, 8)).toBe(4);
    expect(fractionToWedges({ numerator: 5, denominator: 4 }, 4, 2)).toBe(5);
    expect(formatFraction({ numerator: 7, denominator: 4 })).toBe("1 3/4");
    expect(() => fractionToWedges({ numerator: 1, denominator: 3 }, 8)).toThrow();
  });
});
