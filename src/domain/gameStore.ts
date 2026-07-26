import {
  LEADERBOARD_LIMIT,
  PLAYER_NAME_MAX_LENGTH,
} from "../config/gameConfig";
import type {
  LeaderboardEntry,
  RunResult,
  SliceRushSave,
  SliceRushSettings,
} from "./types";

export const SAVE_KEY = "slice-rush-save-v2";
export const LEGACY_SAVE_KEY = "slice-rush-save-v1";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SETTINGS: SliceRushSettings = { muted: false, reducedMotion: false };
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

function normalizeEntry(value: unknown): LeaderboardEntry | undefined {
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
  };
}

function emptySave(settings: SliceRushSettings = DEFAULT_SETTINGS): SliceRushSave {
  return {
    version: 2,
    leaderboard: [],
    settings,
    instructionsSeen: false,
  };
}

function normalizeSettings(value: unknown): SliceRushSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    muted: raw.muted === true,
    reducedMotion: raw.reducedMotion === true,
  };
}

function normalizeSave(value: unknown): SliceRushSave {
  if (!value || typeof value !== "object") return emptySave();
  const raw = value as Record<string, unknown>;
  const leaderboard = Array.isArray(raw.leaderboard)
    ? raw.leaderboard
        .map(normalizeEntry)
        .filter((entry): entry is LeaderboardEntry => Boolean(entry))
        .sort(compareLeaderboardEntries)
        .slice(0, LEADERBOARD_LIMIT)
    : [];
  return {
    version: 2,
    leaderboard,
    settings: normalizeSettings(raw.settings),
    instructionsSeen: raw.instructionsSeen === true,
  };
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

  acknowledgeInstructions(): SliceRushSave {
    if (!this.data.instructionsSeen) {
      this.data = { ...this.data, instructionsSeen: true };
      this.write();
    }
    return this.data;
  }

  qualifiesForLeaderboard(result: RunResult, playedAt = Date.now()): boolean {
    if (result.score <= 0 || result.served <= 0) return false;
    if (this.data.leaderboard.length < LEADERBOARD_LIMIT) return true;
    const candidate: LeaderboardEntry = {
      id: "candidate",
      name: "PLAYER",
      ...result,
      playedAt,
    };
    const cutoff = this.data.leaderboard[LEADERBOARD_LIMIT - 1]!;
    return compareLeaderboardPerformance(candidate, cutoff) < 0;
  }

  addLeaderboardEntry(
    name: string,
    result: RunResult,
    playedAt = Date.now(),
  ): LeaderboardEntry | undefined {
    const cleanName = sanitizePlayerName(name);
    if (!cleanName) throw new Error("Enter at least one letter or number.");
    if (!this.qualifiesForLeaderboard(result, playedAt)) return undefined;
    const entry: LeaderboardEntry = {
      id: `score-${playedAt}-${entrySequence++}`,
      name: cleanName,
      ...result,
      playedAt,
    };
    const leaderboard = [...this.data.leaderboard, entry]
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
    if (!leaderboard.some((candidate) => candidate.id === entry.id)) return undefined;
    this.data = { ...this.data, leaderboard };
    this.write();
    return entry;
  }

  private read(): SliceRushSave {
    const current = this.storage.getItem(SAVE_KEY);
    if (current) {
      try {
        return normalizeSave(JSON.parse(current));
      } catch {
        return emptySave();
      }
    }

    const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
    if (!legacy) return emptySave();
    try {
      const raw = JSON.parse(legacy) as Record<string, unknown>;
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
