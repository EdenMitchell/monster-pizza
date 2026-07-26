import { describe, expect, it } from "vitest";
import { FRACTION_SKILL_ORDER } from "../config/gameConfig";
import {
  canonicalSkills,
  GameStore,
  LEGACY_SAVE_KEY_V1,
  LEGACY_SAVE_KEY_V2,
  SAVE_KEY,
  sanitizePlayerName,
  skillSetKey,
  type StorageAdapter,
} from "./gameStore";
import type { FractionSkillId, RunResult } from "./types";

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const SIMPLE: readonly FractionSkillId[] = ["simple"];
const COMBINED: readonly FractionSkillId[] = ["simple", "combining"];
const result = (
  score: number,
  served = Math.floor(score / 100),
  bestStreak = served,
): RunResult => ({ score, served, bestStreak });

describe("skill-aware local leaderboard and settings", () => {
  it("sanitizes and limits player names", () => {
    expect(sanitizePlayerName("  Ava!!  Pizza 🍕  ")).toBe("Ava Pizza");
    expect(sanitizePlayerName("O'Neil-Jnr 12345")).toBe("O'Neil-Jnr 1");
    expect(sanitizePlayerName("@@@")).toBe("");
  });

  it("canonicalizes skill combinations in the configured order", () => {
    expect(canonicalSkills(["mixed-numbers", "simple", "simple", "not-real"]))
      .toEqual(["simple", "mixed-numbers"]);
    expect(skillSetKey(["mixed-numbers", "simple"]))
      .toBe("simple|mixed-numbers");
    expect(canonicalSkills([])).toEqual(FRACTION_SKILL_ORDER);
  });

  it("persists selections and protects the last selected skill", () => {
    const storage = new MemoryStorage();
    const store = new GameStore(storage);
    expect(store.snapshot().selectedSkills).toEqual(FRACTION_SKILL_ORDER);
    store.setSelectedSkills(SIMPLE);
    expect(store.toggleSkill("simple")).toBe(false);
    expect(store.toggleSkill("combining")).toBe(true);
    expect(store.snapshot().selectedSkills).toEqual(COMBINED);
    expect(store.toggleSkill("simple")).toBe(true);
    expect(store.snapshot().selectedSkills).toEqual(["combining"]);

    const reloaded = new GameStore(storage);
    expect(reloaded.snapshot().selectedSkills).toEqual(["combining"]);
  });

  it("ranks by score, served, streak, then earlier timestamp", () => {
    const store = new GameStore(new MemoryStorage());
    store.addLeaderboardEntry("Later", result(500, 4, 4), SIMPLE, 200);
    store.addLeaderboardEntry("More Orders", result(500, 5, 2), SIMPLE, 300);
    store.addLeaderboardEntry("More Streak", result(500, 5, 4), SIMPLE, 400);
    store.addLeaderboardEntry("Earlier", result(500, 5, 4), SIMPLE, 100);
    expect(store.leaderboardForSkills(SIMPLE).map((entry) => entry.name))
      .toEqual(["Earlier", "More Streak", "More Orders", "Later"]);
  });

  it("keeps ten scores per exact setup and allows duplicate names", () => {
    const store = new GameStore(new MemoryStorage());
    for (let index = 0; index < 12; index += 1) {
      store.addLeaderboardEntry(
        "Player",
        result(100 + index * 100),
        SIMPLE,
        100 + index,
      );
    }
    store.addLeaderboardEntry("Other Board", result(100), COMBINED, 500);

    const simpleBoard = store.leaderboardForSkills(SIMPLE);
    expect(simpleBoard).toHaveLength(10);
    expect(simpleBoard[0]?.score).toBe(1_200);
    expect(simpleBoard.at(-1)?.score).toBe(300);
    expect(store.leaderboardForSkills(COMBINED).map((entry) => entry.name))
      .toEqual(["Other Board"]);
    expect(store.snapshot().leaderboard).toHaveLength(11);
  });

  it("qualifies only against the active setup's board", () => {
    const store = new GameStore(new MemoryStorage());
    expect(store.qualifiesForLeaderboard(result(0, 0, 0), SIMPLE, 1)).toBe(false);
    for (let index = 0; index < 10; index += 1) {
      store.addLeaderboardEntry(
        `P${index}`,
        result(1_000 - index * 50, 5, 3),
        SIMPLE,
        100 + index,
      );
    }
    expect(store.qualifiesForLeaderboard(result(551, 1, 1), SIMPLE, 500)).toBe(true);
    expect(store.qualifiesForLeaderboard(result(550, 5, 3), SIMPLE, 500)).toBe(false);
    expect(store.qualifiesForLeaderboard(result(1, 1, 1), COMBINED, 500)).toBe(true);
  });

  it("persists scores, instructions, selections, and settings", () => {
    const storage = new MemoryStorage();
    const store = new GameStore(storage);
    store.addLeaderboardEntry("Milly", result(900, 7, 5), COMBINED, 1_000);
    store.setSelectedSkills(COMBINED);
    store.acknowledgeInstructions();
    store.setSettings({ muted: true, reducedMotion: true });

    const reloaded = new GameStore(storage);
    expect(reloaded.leaderboardForSkills(COMBINED)[0]?.name).toBe("Milly");
    expect(reloaded.snapshot().selectedSkills).toEqual(COMBINED);
    expect(reloaded.snapshot().instructionsSeen).toBe(true);
    expect(reloaded.snapshot().settings).toEqual({ muted: true, reducedMotion: true });
  });

  it("migrates v2 scores and defaults the selection to all skills", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SAVE_KEY_V2, JSON.stringify({
      version: 2,
      leaderboard: [{
        id: "old-score",
        name: "Eden",
        score: 1_275,
        served: 10,
        bestStreak: 6,
        playedAt: 1_000,
      }],
      settings: { muted: true, reducedMotion: false },
      instructionsSeen: true,
    }));

    const migrated = new GameStore(storage);
    expect(migrated.snapshot().version).toBe(3);
    expect(migrated.snapshot().selectedSkills).toEqual(FRACTION_SKILL_ORDER);
    expect(migrated.snapshot().leaderboard[0]?.skills).toEqual(FRACTION_SKILL_ORDER);
    expect(migrated.snapshot().settings).toEqual({ muted: true, reducedMotion: false });
    expect(migrated.snapshot().instructionsSeen).toBe(true);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it("migrates only settings from v1 and recovers corrupt v3 saves", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SAVE_KEY_V1, JSON.stringify({
      version: 1,
      profiles: [{ name: "Chef 1", shiftRecords: { old: { bestScore: 9_999 } } }],
      settings: { muted: true, reducedMotion: false },
    }));
    const migrated = new GameStore(storage);
    expect(migrated.snapshot()).toEqual({
      version: 3,
      leaderboard: [],
      selectedSkills: FRACTION_SKILL_ORDER,
      settings: { muted: true, reducedMotion: false },
      instructionsSeen: false,
    });

    storage.setItem(SAVE_KEY, "{not json");
    const recovered = new GameStore(storage);
    expect(recovered.snapshot().leaderboard).toEqual([]);
    expect(recovered.snapshot().selectedSkills).toEqual(FRACTION_SKILL_ORDER);
    expect(recovered.snapshot().settings).toEqual({ muted: false, reducedMotion: false });
  });

  it("rejects an empty name and a non-qualifying insertion", () => {
    const store = new GameStore(new MemoryStorage());
    expect(() => store.addLeaderboardEntry("@@@", result(100), SIMPLE, 1)).toThrow();
    for (let index = 0; index < 10; index += 1) {
      store.addLeaderboardEntry(
        `P${index}`,
        result(1_000 - index * 10),
        SIMPLE,
        index + 1,
      );
    }
    expect(store.addLeaderboardEntry("Slow", result(1), SIMPLE, 50)).toBeUndefined();
  });
});
