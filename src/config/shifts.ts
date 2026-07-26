export interface ShiftConfig {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly upgrade: string;
  readonly starThresholds: readonly [number, number, number];
  readonly maximumTier: number;
}

export const SHIFT_DURATION_MS = 90_000;
export const MISS_TIME_PENALTY_MS = 3_000;

export const SLICE_RUSH_SHIFTS: readonly ShiftConfig[] = [
  {
    id: "opening-day",
    name: "OPENING DAY",
    subtitle: "Simple slices, happy neighbours",
    upgrade: "The new striped shop sign is up!",
    starThresholds: [6, 9, 12],
    maximumTier: 1,
  },
  {
    id: "lunch-rush",
    name: "LUNCH RUSH",
    subtitle: "A busier menu hits the counter",
    upgrade: "A polished oven and pendant lights!",
    starThresholds: [5, 8, 11],
    maximumTier: 2,
  },
  {
    id: "party-orders",
    name: "PARTY ORDERS",
    subtitle: "Different cuts, same delicious share",
    upgrade: "Cosy booths are ready for parties!",
    starThresholds: [5, 8, 10],
    maximumTier: 2,
  },
  {
    id: "family-table",
    name: "FAMILY TABLE",
    subtitle: "Share toppings across every table",
    upgrade: "Fairy lights make dinner sparkle!",
    starThresholds: [4, 7, 9],
    maximumTier: 2,
  },
  {
    id: "grand-reopening",
    name: "GRAND REOPENING",
    subtitle: "Big orders for the five-star finale",
    upgrade: "The five-star trophy wall is complete!",
    starThresholds: [4, 6, 8],
    maximumTier: 2,
  },
] as const;

export function starsForServed(shiftIndex: number, served: number): number {
  const thresholds = SLICE_RUSH_SHIFTS[shiftIndex]?.starThresholds;
  if (!thresholds) return 0;
  if (served >= thresholds[2]) return 3;
  if (served >= thresholds[1]) return 2;
  if (served >= thresholds[0]) return 1;
  return 0;
}
