export type ToppingId = "pepperoni" | "mushroom" | "olive" | "pepper";
export type OrderKind = "make" | "equivalent" | "split" | "mixed";
export type FractionSkillId =
  | "simple"
  | "more-parts"
  | "equivalent"
  | "combining"
  | "mixed-numbers";

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
  readonly skill: FractionSkillId;
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

export interface GameSnapshot {
  readonly timeRemainingMs: number;
  readonly score: number;
  readonly streak: number;
  readonly served: number;
  readonly started: boolean;
  readonly paused: boolean;
  readonly complete: boolean;
}

export interface RunResult {
  readonly score: number;
  readonly served: number;
  readonly bestStreak: number;
}

export interface LeaderboardEntry extends RunResult {
  readonly id: string;
  readonly name: string;
  readonly playedAt: number;
  readonly skills: readonly FractionSkillId[];
}

export interface SliceRushSettings {
  readonly muted: boolean;
  readonly reducedMotion: boolean;
}

export interface SliceRushSave {
  readonly version: 3;
  readonly leaderboard: readonly LeaderboardEntry[];
  readonly selectedSkills: readonly FractionSkillId[];
  readonly settings: SliceRushSettings;
  readonly instructionsSeen: boolean;
}

export type RandomSource = () => number;
