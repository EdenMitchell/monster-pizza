export class AdaptivePace {
  private rating = 0;
  private tier = 0;

  constructor(private readonly maximumTier: number) {
    if (!Number.isInteger(maximumTier) || maximumTier < 0) {
      throw new Error("Adaptive pace needs a non-negative maximum tier.");
    }
  }

  snapshot(): { readonly rating: number; readonly tier: number } {
    return { rating: this.rating, tier: this.tier };
  }

  record(correct: boolean, responseTimeMs: number): number {
    const response = Math.min(Math.max(responseTimeMs, 1_500), 24_000);
    let adjustment: number;
    if (!correct) {
      adjustment = -0.85;
    } else if (response < 7_000) {
      adjustment = 0.58;
    } else if (response <= 12_000) {
      adjustment = 0.3;
    } else if (response > 18_000) {
      adjustment = -0.28;
    } else {
      adjustment = 0.08;
    }
    this.rating = Math.min(Math.max(this.rating + adjustment, 0), this.maximumTier);
    const candidate = Math.round(this.rating);
    this.tier = Math.min(
      this.maximumTier,
      Math.max(0, candidate, this.tier - 1),
      this.tier + 1,
    );
    return this.tier;
  }
}
