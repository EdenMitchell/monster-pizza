import type { FractionSkillId } from "../domain/types";

export const GAME_DURATION_MS = 90_000;
export const MISS_TIME_PENALTY_MS = 3_000;
export const LEADERBOARD_LIMIT = 10;
export const PLAYER_NAME_MAX_LENGTH = 12;

export interface FractionSkillConfig {
  readonly id: FractionSkillId;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
}

export const FRACTION_SKILLS: readonly FractionSkillConfig[] = [
  {
    id: "simple",
    title: "Simple fractions",
    shortTitle: "Simple",
    description: "Halves and quarters",
  },
  {
    id: "more-parts",
    title: "More fraction parts",
    shortTitle: "More parts",
    description: "Thirds, sixths and eighths",
  },
  {
    id: "equivalent",
    title: "Equivalent fractions",
    shortTitle: "Equivalent",
    description: "Same share, different slice counts",
  },
  {
    id: "combining",
    title: "Combining fractions",
    shortTitle: "Combining",
    description: "Two topping shares on one pizza",
  },
  {
    id: "mixed-numbers",
    title: "Mixed numbers",
    shortTitle: "Mixed numbers",
    description: "One whole and a fraction across two pizzas",
  },
] as const;

export const FRACTION_SKILL_ORDER = FRACTION_SKILLS.map(({ id }) => id);
