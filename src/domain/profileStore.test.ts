import { describe, expect, it } from "vitest";
import { SLICE_RUSH_SHIFTS, starsForServed } from "../config/shifts";
import {
  MAX_LOCAL_PROFILES,
  ProfileStore,
  SAVE_KEY,
  type StorageAdapter,
} from "./profileStore";

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("local chef profiles and progression", () => {
  it("creates, selects, persists, and limits no-entry chef profiles", () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    const first = store.ensureDefaultProfile();
    expect(first.name).toBe("Chef 1");
    while (store.snapshot().profiles.length < MAX_LOCAL_PROFILES) store.createProfile();
    expect(store.snapshot().profiles.map((profile) => profile.name))
      .toEqual(["Chef 1", "Chef 2", "Chef 3", "Chef 4"]);
    expect(() => store.createProfile()).toThrow();

    const selected = store.snapshot().profiles[1]!;
    store.selectProfile(selected.id);
    expect(new ProfileStore(storage).activeProfile()?.id).toBe(selected.id);
  });

  it("awards exact shift stars and unlocks one stage at a time", () => {
    const store = new ProfileStore(new MemoryStorage());
    let profile = store.ensureDefaultProfile();
    expect(store.isShiftUnlocked(profile, 0)).toBe(true);
    expect(store.isShiftUnlocked(profile, 1)).toBe(false);
    profile = store.completeShift(profile.id, 0, 600, 6, 2);
    expect(profile.shiftRecords[SLICE_RUSH_SHIFTS[0]!.id]?.stars).toBe(1);
    expect(store.isShiftUnlocked(profile, 1)).toBe(true);
    expect(store.makeoverStage(profile)).toBe(1);
    expect(starsForServed(4, 8)).toBe(3);
  });

  it("never overwrites a better prior result", () => {
    const store = new ProfileStore(new MemoryStorage());
    let profile = store.ensureDefaultProfile();
    profile = store.completeShift(profile.id, 0, 1_600, 12, 5);
    profile = store.completeShift(profile.id, 0, 400, 6, 1);
    expect(profile.shiftRecords[SLICE_RUSH_SHIFTS[0]!.id])
      .toEqual({ stars: 3, bestScore: 1_600, bestServed: 12, bestStreak: 5 });
  });

  it("migrates loose versioned data and recovers from corrupt saves", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: 0,
      activeProfileId: "old",
      profiles: [{
        id: "old",
        name: "  Pizza Wizard with a very long name  ",
        avatarIndex: 9,
        shiftRecords: { "opening-day": { stars: 99, bestScore: -4 } },
        tutorialSeen: true,
      }],
      settings: { muted: true, reducedMotion: true },
    }));
    const migrated = new ProfileStore(storage);
    expect(migrated.snapshot().version).toBe(1);
    expect(migrated.activeProfile()?.name.length).toBeLessThanOrEqual(12);
    expect(migrated.activeProfile()?.shiftRecords["opening-day"]?.stars).toBe(3);
    expect(migrated.snapshot().settings).toEqual({ muted: true, reducedMotion: true });

    storage.setItem(SAVE_KEY, "{ definitely not json");
    const recovered = new ProfileStore(storage);
    expect(recovered.snapshot().profiles).toEqual([]);
    expect(recovered.snapshot().settings).toEqual({ muted: false, reducedMotion: false });
  });

  it("persists tutorial and accessibility settings", () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    const profile = store.ensureDefaultProfile();
    store.setTutorialSeen(profile.id);
    store.setSettings({ muted: true, reducedMotion: true });
    const reloaded = new ProfileStore(storage);
    expect(reloaded.activeProfile()?.tutorialSeen).toBe(true);
    expect(reloaded.snapshot().settings).toEqual({ muted: true, reducedMotion: true });
  });
});
