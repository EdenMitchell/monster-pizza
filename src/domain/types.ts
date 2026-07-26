export type ToppingId = "pepperoni" | "mushroom" | "olive" | "pepper";
export type OrderKind = "make" | "equivalent" | "split" | "mixed";

export interface FractionValue {
  readonly numerator: number;
  readonly denominator: number;
}

export interface OrderRequirement {
  readonly topping: ToppingId;
  /** The fraction printed on the customer's order. */
  readonly fraction: FractionValue;
  /** The exact number of physical board wedges that must receive this topping. */
  readonly requiredWedges: number;
}

export interface OrderChallenge {
  readonly id: string;
  readonly kind: OrderKind;
  readonly boardDenominator: number;
  readonly pizzaCount: 1 | 2;
  readonly requirements: readonly OrderRequirement[];
  readonly visualGuide: boolean;
  readonly customerIndex: number;
}

export interface OrderSelection {
  readonly wedges: readonly (ToppingId | null)[];
}

export interface ShiftSnapshot {
  readonly timeRemainingMs: number;
  readonly score: number;
  readonly streak: number;
  readonly served: number;
  readonly tier: number;
  readonly started: boolean;
  readonly paused: boolean;
  readonly complete: boolean;
}

export interface ShiftRecord {
  readonly stars: number;
  readonly bestScore: number;
  readonly bestServed: number;
  readonly bestStreak: number;
}

export interface ChefProfile {
  readonly id: string;
  readonly name: string;
  readonly avatarIndex: number;
  readonly shiftRecords: Readonly<Record<string, ShiftRecord>>;
  readonly tutorialSeen: boolean;
}

export interface SliceRushSettings {
  readonly muted: boolean;
  readonly reducedMotion: boolean;
}

export interface SliceRushSave {
  readonly version: 1;
  readonly activeProfileId?: string;
  readonly profiles: readonly ChefProfile[];
  readonly settings: SliceRushSettings;
}

export type RandomSource = () => number;
