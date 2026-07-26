import { describe, expect, it } from "vitest";
import {
  GameStore,
  LEGACY_SAVE_KEY,
  SAVE_KEY,
  sanitizePlayerName,
  type StorageAdapter,
} from "./gameStore";
import type { RunResult } from "./types";

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const result = (
  score: number,
  served = Math.floor(score / 100),
  bestStreak = served,
): RunResult => ({ score, served, bestStreak });

describe("local leaderboard", () => {
  it("sanitizes and limits player names", () => {
    expect(sanitizePlayerName("  Ava!!  Pizza 🍕  ")).toBe("Ava Pizza");
    expect(sanitizePlayerName("O'Neil-Jnr 12345")).toBe("O'Neil-Jnr 1");
    expect(sanitizePlayerName("@@@")).toBe("");
  });

  it("ranks by score, served, streak, then earlier timestamp", () => {
    const store = new GameStore(new MemoryStorage());
    store.addLeaderboardEntry("Later", result(500, 4, 4), 200);
    store.addLeaderboardEntry("More Orders", result(500, 5, 2), 300);
    store.addLeaderboardEntry("More Streak", result(500, 5, 4), 400);
    store.addLeaderboardEntry("Earlier", result(500, 5, 4), 100);
    expect(store.snapshot().leaderboard.map((entry) => entry.name))
      .toEqual(["Earlier", "More Streak", "More Orders", "Later"]);
  });

  it("keeps only ten scores and allows duplicate names", () => {
    const store = new GameStore(new MemoryStorage());
    for (let index = 0; index < 12; index += 1) {
      store.addLeaderboardEntry("Player", result(100 + index * 100), 100 + index);
    }
    expect(store.snapshot().leaderboard).toHaveLength(10);
    expect(store.snapshot().leaderboard[0]?.score).toBe(1_200);
    expect(store.snapshot().leaderboard.at(-1)?.score).toBe(300);
  });

  it("qualifies positive runs and rejects exact later cutoff ties", () => {
    const store = new GameStore(new MemoryStorage());
    expect(store.qualifiesForLeaderboard(result(0, 0, 0), 1)).toBe(false);
    for (let index = 0; index < 10; index += 1) {
      store.addLeaderboardEntry(`P${index}`, result(1_000 - index * 50, 5, 3), 100 + index);
    }
    expect(store.qualifiesForLeaderboard(result(551, 1, 1), 500)).toBe(true);
    expect(store.qualifiesForLeaderboard(result(550, 5, 3), 500)).toBe(false);
    expect(store.qualifiesForLeaderboard(result(550, 5, 3), 109)).toBe(false);
  });

  it("persists scores, instructions, and settings", () => {
    const storage = new MemoryStorage();
    const store = new GameStore(storage);
    store.addLeaderboardEntry("Milly", result(900, 7, 5), 1_000);
    store.acknowledgeInstructions();
    store.setSettings({ muted: true, reducedMotion: true });
    const reloaded = new GameStore(storage);
    expect(reloaded.snapshot().leaderboard[0]?.name).toBe("Milly");
    expect(reloaded.snapshot().instructionsSeen).toBe(true);
    expect(reloaded.snapshot().settings).toEqual({ muted: true, reducedMotion: true });
  });

  it("migrates only settings from v1 and recovers corrupt v2 saves", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify({
      version: 1,
      profiles: [{ name: "Chef 1", shiftRecords: { old: { bestScore: 9_999 } } }],
      settings: { muted: true, reducedMotion: false },
    }));
    const migrated = new GameStore(storage);
    expect(migrated.snapshot()).toEqual({
      version: 2,
      leaderboard: [],
      settings: { muted: true, reducedMotion: false },
      instructionsSeen: false,
    });
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();

    storage.setItem(SAVE_KEY, "{not json");
    const recovered = new GameStore(storage);
    expect(recovered.snapshot().leaderboard).toEqual([]);
    expect(recovered.snapshot().settings).toEqual({ muted: false, reducedMotion: false });
  });

  it("rejects an empty name and a non-qualifying insertion", () => {
    const store = new GameStore(new MemoryStorage());
    expect(() => store.addLeaderboardEntry("@@@", result(100), 1)).toThrow();
    for (let index = 0; index < 10; index += 1) {
      store.addLeaderboardEntry(`P${index}`, result(1_000 - index * 10), index + 1);
    }
    expect(store.addLeaderboardEntry("Slow", result(1), 50)).toBeUndefined();
  });
});
