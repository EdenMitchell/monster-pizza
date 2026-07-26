import { describe, expect, it } from "vitest";
import { AdaptivePace } from "./adaptivePace";

describe("adaptive pacing", () => {
  it("rises gradually after quick correct orders and stays bounded", () => {
    const pace = new AdaptivePace(2);
    const tiers = Array.from({ length: 20 }, () => pace.record(true, 3_000));
    expect(tiers.every((tier) => tier >= 0 && tier <= 2)).toBe(true);
    expect(tiers.at(-1)).toBe(2);
    expect(tiers.every((tier, index) => index === 0 || tier - tiers[index - 1]! <= 1)).toBe(true);
  });

  it("lowers by at most one tier for each miss or slow response", () => {
    const pace = new AdaptivePace(2);
    for (let index = 0; index < 8; index += 1) pace.record(true, 3_000);
    const beforeMiss = pace.snapshot().tier;
    const afterMiss = pace.record(false, 6_000);
    const afterSlow = pace.record(true, 22_000);
    expect(beforeMiss - afterMiss).toBeLessThanOrEqual(1);
    expect(afterMiss - afterSlow).toBeLessThanOrEqual(1);
  });
});
