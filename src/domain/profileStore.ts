import { SLICE_RUSH_SHIFTS, starsForServed } from "../config/shifts";
import type {
  ChefProfile,
  ShiftRecord,
  SliceRushSave,
  SliceRushSettings,
} from "./types";

export const SAVE_KEY = "slice-rush-save-v1";
export const MAX_LOCAL_PROFILES = 4;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SETTINGS: SliceRushSettings = { muted: false, reducedMotion: false };
let profileSequence = 1;

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeRecord(value: unknown): ShiftRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  return {
    stars: Math.min(3, Math.floor(safeNumber(raw.stars))),
    bestScore: safeNumber(raw.bestScore),
    bestServed: safeNumber(raw.bestServed),
    bestStreak: safeNumber(raw.bestStreak),
  };
}

function normalizeProfile(value: unknown, index: number): ChefProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const shiftRecords: Record<string, ShiftRecord> = {};
  if (raw.shiftRecords && typeof raw.shiftRecords === "object") {
    for (const [shiftId, record] of Object.entries(raw.shiftRecords as Record<string, unknown>)) {
      const normalized = normalizeRecord(record);
      if (normalized) shiftRecords[shiftId] = normalized;
    }
  }
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `chef-migrated-${index + 1}`,
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, 12)
        : `Chef ${index + 1}`,
    avatarIndex: Math.floor(safeNumber(raw.avatarIndex)) % 4,
    shiftRecords,
    tutorialSeen: raw.tutorialSeen === true,
  };
}

function emptySave(): SliceRushSave {
  return { version: 1, profiles: [], settings: DEFAULT_SETTINGS };
}

function normalizeSave(value: unknown): SliceRushSave {
  if (!value || typeof value !== "object") return emptySave();
  const raw = value as Record<string, unknown>;
  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles
        .map(normalizeProfile)
        .filter((profile): profile is ChefProfile => Boolean(profile))
        .slice(0, MAX_LOCAL_PROFILES)
    : [];
  const rawSettings = raw.settings && typeof raw.settings === "object"
    ? raw.settings as Record<string, unknown>
    : {};
  const requestedId = typeof raw.activeProfileId === "string" ? raw.activeProfileId : undefined;
  return {
    version: 1,
    activeProfileId: profiles.some((profile) => profile.id === requestedId)
      ? requestedId
      : profiles[0]?.id,
    profiles,
    settings: {
      muted: rawSettings.muted === true,
      reducedMotion: rawSettings.reducedMotion === true,
    },
  };
}

export class ProfileStore {
  private data: SliceRushSave;

  constructor(private readonly storage: StorageAdapter) {
    this.data = this.read();
  }

  snapshot(): SliceRushSave {
    return this.data;
  }

  activeProfile(): ChefProfile | undefined {
    return this.data.profiles.find((profile) => profile.id === this.data.activeProfileId);
  }

  ensureDefaultProfile(): ChefProfile {
    return this.activeProfile() ?? this.createProfile();
  }

  createProfile(): ChefProfile {
    if (this.data.profiles.length >= MAX_LOCAL_PROFILES) {
      throw new Error("Slice Rush supports up to four local chefs.");
    }
    const number = this.data.profiles.length + 1;
    const profile: ChefProfile = {
      id: `chef-${Date.now()}-${profileSequence++}`,
      name: `Chef ${number}`,
      avatarIndex: (number - 1) % 4,
      shiftRecords: {},
      tutorialSeen: false,
    };
    this.data = {
      ...this.data,
      activeProfileId: profile.id,
      profiles: [...this.data.profiles, profile],
    };
    this.write();
    return profile;
  }

  selectProfile(profileId: string): ChefProfile {
    const profile = this.requireProfile(profileId);
    this.data = { ...this.data, activeProfileId: profileId };
    this.write();
    return profile;
  }

  deleteProfile(profileId: string): void {
    const profiles = this.data.profiles.filter((profile) => profile.id !== profileId);
    this.data = {
      ...this.data,
      profiles,
      activeProfileId:
        this.data.activeProfileId === profileId ? profiles[0]?.id : this.data.activeProfileId,
    };
    this.write();
  }

  setTutorialSeen(profileId: string): ChefProfile {
    return this.updateProfile(profileId, (profile) => ({ ...profile, tutorialSeen: true }));
  }

  setSettings(settings: Partial<SliceRushSettings>): SliceRushSave {
    this.data = {
      ...this.data,
      settings: { ...this.data.settings, ...settings },
    };
    this.write();
    return this.data;
  }

  completeShift(
    profileId: string,
    shiftIndex: number,
    score: number,
    served: number,
    bestStreak: number,
  ): ChefProfile {
    const shift = SLICE_RUSH_SHIFTS[shiftIndex];
    if (!shift) throw new Error("Unknown Slice Rush shift.");
    const stars = starsForServed(shiftIndex, served);
    return this.updateProfile(profileId, (profile) => {
      const previous = profile.shiftRecords[shift.id];
      return {
        ...profile,
        shiftRecords: {
          ...profile.shiftRecords,
          [shift.id]: {
            stars: Math.max(stars, previous?.stars ?? 0),
            bestScore: Math.max(score, previous?.bestScore ?? 0),
            bestServed: Math.max(served, previous?.bestServed ?? 0),
            bestStreak: Math.max(bestStreak, previous?.bestStreak ?? 0),
          },
        },
      };
    });
  }

  totalStars(profile: ChefProfile): number {
    return Object.values(profile.shiftRecords).reduce((sum, record) => sum + record.stars, 0);
  }

  isShiftUnlocked(profile: ChefProfile, shiftIndex: number): boolean {
    if (shiftIndex === 0) return true;
    const previous = SLICE_RUSH_SHIFTS[shiftIndex - 1];
    return Boolean(previous && (profile.shiftRecords[previous.id]?.stars ?? 0) >= 1);
  }

  makeoverStage(profile: ChefProfile): number {
    return SLICE_RUSH_SHIFTS.reduce(
      (count, shift) => count + ((profile.shiftRecords[shift.id]?.stars ?? 0) >= 1 ? 1 : 0),
      0,
    );
  }

  private requireProfile(profileId: string): ChefProfile {
    const profile = this.data.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) throw new Error(`Unknown chef profile: ${profileId}`);
    return profile;
  }

  private updateProfile(
    profileId: string,
    update: (profile: ChefProfile) => ChefProfile,
  ): ChefProfile {
    const before = this.requireProfile(profileId);
    const after = update(before);
    this.data = {
      ...this.data,
      profiles: this.data.profiles.map((profile) => (profile.id === profileId ? after : profile)),
    };
    this.write();
    return after;
  }

  private read(): SliceRushSave {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      return raw ? normalizeSave(JSON.parse(raw)) : emptySave();
    } catch {
      return emptySave();
    }
  }

  private write(): void {
    this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }
}
