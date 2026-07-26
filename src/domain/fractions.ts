import type { FractionValue } from "./types";

export function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(Math.trunc(left));
  let b = Math.abs(Math.trunc(right));
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

export function normalizeFraction(value: FractionValue): FractionValue {
  if (!Number.isInteger(value.numerator) || !Number.isInteger(value.denominator)) {
    throw new Error("Fractions require integer values.");
  }
  if (value.denominator <= 0 || value.numerator < 0) {
    throw new Error("Fractions require a positive denominator and non-negative numerator.");
  }
  const divisor = greatestCommonDivisor(value.numerator, value.denominator);
  return {
    numerator: value.numerator / divisor,
    denominator: value.denominator / divisor,
  };
}

export function fractionsEqual(left: FractionValue, right: FractionValue): boolean {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

export function fractionToWedges(
  value: FractionValue,
  boardDenominator: number,
  pizzaCount = 1,
): number {
  const scaledNumerator = value.numerator * boardDenominator;
  if (scaledNumerator % value.denominator !== 0) {
    throw new Error("Fraction does not align with the physical pizza partition.");
  }
  const wedges = scaledNumerator / value.denominator;
  if (wedges <= 0 || wedges > boardDenominator * pizzaCount) {
    throw new Error("Fraction falls outside the available pizza board.");
  }
  return wedges;
}

export function formatFraction(value: FractionValue): string {
  if (value.numerator > value.denominator) {
    const whole = Math.floor(value.numerator / value.denominator);
    const remainder = value.numerator % value.denominator;
    return remainder === 0 ? String(whole) : `${whole} ${remainder}/${value.denominator}`;
  }
  return `${value.numerator}/${value.denominator}`;
}
