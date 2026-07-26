import { GameStore } from "../domain/gameStore";
import { ProceduralAudio } from "./audio";

const memoryStorage = new Map<string, string>();
const fallbackStorage = {
  getItem(key: string) {
    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    memoryStorage.set(key, value);
  },
};

const storage = typeof window !== "undefined" ? window.localStorage : fallbackStorage;

export const gameStore = new GameStore(storage);
export const gameAudio = new ProceduralAudio(() => gameStore.snapshot().settings.muted);
