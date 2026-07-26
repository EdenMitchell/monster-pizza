import {
  FRACTION_SKILL_ORDER,
  LEADERBOARD_LIMIT,
  PLAYER_NAME_MAX_LENGTH,
} from "../config/gameConfig";
import type {
  FractionSkillId,
  LeaderboardEntry,
  RunResult,
  SliceRushSave,
  SliceRushSettings,
} from "./types";

export const SAVE_KEY = "slice-rush-save-v3";
export const LEGACY_SAVE_KEY_V2 = "slice-rush-save-v2";
export const LEGACY_SAVE_KEY_V1 = "slice-rush-save-v1";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SETTINGS: SliceRushSettings = { muted: false, reducedMotion: false };
const DEFAULT_SKILLS: readonly FractionSkillId[] = ["simple"];
const KNOWN_SKILLS = new Set<FractionSkillId>(FRACTION_SKILL_ORDER);
let entrySequence = 1;

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function sanitizePlayerName(value: string): string {
  return value
    .replace(/[^A-Za-z0-9 '\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function canonicalSkills(value: unknown): FractionSkillId[] {
  if (!Array.isArray(value)) return [...DEFAULT_SKILLS];
  const requested = new Set(
    value.filter(
      (candidate): candidate is FractionSkillId =>
        typeof candidate === "string" && KNOWN_SKILLS.has(candidate as FractionSkillId),
    ),
  );
  const ordered = FRACTION_SKILL_ORDER.filter((skill) => requested.has(skill));
  return ordered.length > 0 ? ordered : [...DEFAULT_SKILLS];
}

export function skillSetKey(skills: readonly FractionSkillId[]): string {
  return canonicalSkills(skills).join("|");
}

export function compareLeaderboardEntries(
  left: LeaderboardEntry,
  right: LeaderboardEntry,
): number {
  return (
    right.score - left.score ||
    right.served - left.served ||
    right.bestStreak - left.bestStreak ||
    left.playedAt - right.playedAt ||
    left.id.localeCompare(right.id)
  );
}

function compareLeaderboardPerformance(
  left: LeaderboardEntry,
  right: LeaderboardEntry,
): number {
  return (
    right.score - left.score ||
    right.served - left.served ||
    right.bestStreak - left.bestStreak ||
    left.playedAt - right.playedAt
  );
}

function normalizeEntry(
  value: unknown,
  fallbackSkills: readonly FractionSkillId[] = DEFAULT_SKILLS,
): LeaderboardEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const name = sanitizePlayerName(typeof raw.name === "string" ? raw.name : "");
  const id = typeof raw.id === "string" && raw.id ? raw.id : "";
  const playedAt = safeNumber(raw.playedAt);
  if (!name || !id || playedAt <= 0) return undefined;
  return {
    id,
    name,
    score: safeNumber(raw.score),
    served: safeNumber(raw.served),
    bestStreak: safeNumber(raw.bestStreak),
    playedAt,
    skills: canonicalSkills(Array.isArray(raw.skills) ? raw.skills : fallbackSkills),
  };
}

function trimLeaderboards(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const counts = new Map<string, number>();
  return [...entries]
    .sort(compareLeaderboardEntries)
    .filter((entry) => {
      const key = skillSetKey(entry.skills);
      const count = counts.get(key) ?? 0;
      if (count >= LEADERBOARD_LIMIT) return false;
      counts.set(key, count + 1);
      return true;
    });
}

function emptySave(
  settings: SliceRushSettings = DEFAULT_SETTINGS,
  leaderboard: readonly LeaderboardEntry[] = [],
  instructionsSeen = false,
): SliceRushSave {
  return {
    version: 3,
    leaderboard: trimLeaderboards(leaderboard),
    selectedSkills: [...DEFAULT_SKILLS],
    settings,
    instructionsSeen,
  };
}

function normalizeSettings(value: unknown): SliceRushSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    muted: raw.muted === true,
    reducedMotion: raw.reducedMotion === true,
  };
}

function normalizeV3(value: unknown): SliceRushSave {
  if (!value || typeof value !== "object") return emptySave();
  const raw = value as Record<string, unknown>;
  const leaderboard = Array.isArray(raw.leaderboard)
    ? raw.leaderboard
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    : [];
  return {
    version: 3,
    leaderboard: trimLeaderboards(leaderboard),
    selectedSkills: canonicalSkills(raw.selectedSkills),
    settings: normalizeSettings(raw.settings),
    instructionsSeen: raw.instructionsSeen === true,
  };
}

function migrateV2(value: unknown): SliceRushSave {
  if (!value || typeof value !== "object") return emptySave();
  const raw = value as Record<string, unknown>;
  const leaderboard = Array.isArray(raw.leaderboard)
    ? raw.leaderboard
        .map((entry) => normalizeEntry(entry, FRACTION_SKILL_ORDER))
        .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    : [];
  return emptySave(
    normalizeSettings(raw.settings),
    leaderboard,
    raw.instructionsSeen === true,
  );
}

export class GameStore {
  private data: SliceRushSave;

  constructor(private readonly storage: StorageAdapter) {
    this.data = this.read();
  }

  snapshot(): SliceRushSave {
    return this.data;
  }

  setSettings(settings: Partial<SliceRushSettings>): SliceRushSave {
    this.data = {
      ...this.data,
      settings: { ...this.data.settings, ...settings },
    };
    this.write();
    return this.data;
  }

  setSelectedSkills(skills: readonly FractionSkillId[]): SliceRushSave {
    this.data = { ...this.data, selectedSkills: canonicalSkills(skills) };
    this.write();
    return this.data;
  }

  toggleSkill(skill: FractionSkillId): boolean {
    if (!KNOWN_SKILLS.has(skill)) return false;
    const selected = new Set(this.data.selectedSkills);
    if (selected.has(skill)) {
      if (selected.size === 1) return false;
      selected.delete(skill);
    } else {
      selected.add(skill);
    }
    this.setSelectedSkills([...selected]);
    return true;
  }

  acknowledgeInstructions(): SliceRushSave {
    if (!this.data.instructionsSeen) {
      this.data = { ...this.data, instructionsSeen: true };
      this.write();
    }
    return this.data;
  }

  leaderboardForSkills(
    skills: readonly FractionSkillId[] = this.data.selectedSkills,
  ): readonly LeaderboardEntry[] {
    const key = skillSetKey(skills);
    return this.data.leaderboard
      .filter((entry) => skillSetKey(entry.skills) === key)
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
  }

  qualifiesForLeaderboard(
    result: RunResult,
    skills: readonly FractionSkillId[] = this.data.selectedSkills,
    playedAt = Date.now(),
  ): boolean {
    if (result.score <= 0 || result.served <= 0) return false;
    const board = this.leaderboardForSkills(skills);
    if (board.length < LEADERBOARD_LIMIT) return true;
    const candidate: LeaderboardEntry = {
      id: "candidate",
      name: "PLAYER",
      ...result,
      playedAt,
      skills: canonicalSkills(skills),
    };
    return compareLeaderboardPerformance(candidate, board[LEADERBOARD_LIMIT - 1]!) < 0;
  }

  addLeaderboardEntry(
    name: string,
    result: RunResult,
    skills: readonly FractionSkillId[] = this.data.selectedSkills,
    playedAt = Date.now(),
  ): LeaderboardEntry | undefined {
    const cleanName = sanitizePlayerName(name);
    if (!cleanName) throw new Error("Enter at least one letter or number.");
    const canonical = canonicalSkills(skills);
    if (!this.qualifiesForLeaderboard(result, canonical, playedAt)) return undefined;
    const entry: LeaderboardEntry = {
      id: `score-${playedAt}-${entrySequence++}`,
      name: cleanName,
      ...result,
      playedAt,
      skills: canonical,
    };
    const leaderboard = trimLeaderboards([...this.data.leaderboard, entry]);
    if (!leaderboard.some((candidate) => candidate.id === entry.id)) return undefined;
    this.data = { ...this.data, leaderboard };
    this.write();
    return entry;
  }

  private read(): SliceRushSave {
    const current = this.storage.getItem(SAVE_KEY);
    if (current) {
      try {
        return normalizeV3(JSON.parse(current));
      } catch {
        return emptySave();
      }
    }

    const legacyV2 = this.storage.getItem(LEGACY_SAVE_KEY_V2);
    if (legacyV2) {
      try {
        const migrated = migrateV2(JSON.parse(legacyV2));
        this.storage.setItem(SAVE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {
        return emptySave();
      }
    }

    const legacyV1 = this.storage.getItem(LEGACY_SAVE_KEY_V1);
    if (!legacyV1) return emptySave();
    try {
      const raw = JSON.parse(legacyV1) as Record<string, unknown>;
      const migrated = emptySave(normalizeSettings(raw.settings));
      this.storage.setItem(SAVE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return emptySave();
    }
  }

  private write(): void {
    this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }
}
