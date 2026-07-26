import { GAME_DURATION_MS, MISS_TIME_PENALTY_MS } from "../config/gameConfig";
import type { GameSnapshot } from "./types";

export class GameSession {
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private served = 0;
  private endAt = 0;
  private pausedAt = 0;
  private started = false;
  private paused = false;
  private complete = false;

  begin(nowMs: number): GameSnapshot {
    if (!this.started) {
      this.started = true;
      this.endAt = nowMs + GAME_DURATION_MS;
    }
    return this.snapshot(nowMs);
  }

  snapshot(nowMs: number): GameSnapshot {
    const referenceNow = this.paused ? this.pausedAt : nowMs;
    const remaining = !this.started || this.endAt === 0
      ? GAME_DURATION_MS
      : Math.max(0, this.endAt - referenceNow);
    if (this.started && remaining === 0) {
      this.complete = true;
    }
    return {
      timeRemainingMs: remaining,
      score: this.score,
      streak: this.streak,
      served: this.served,
      started: this.started,
      paused: this.paused,
      complete: this.complete,
    };
  }

  recordCorrect(responseTimeMs: number, nowMs: number): GameSnapshot {
    const current = this.snapshot(nowMs);
    if (current.complete) return current;
    if (!this.started) {
      this.begin(nowMs);
    } else if (this.endAt === 0) {
      this.endAt = nowMs + GAME_DURATION_MS;
    }
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.served += 1;
    this.score += 100 + 25 * Math.min(Math.max(0, this.streak - 1), 4);
    void responseTimeMs;
    return this.snapshot(nowMs);
  }

  recordMiss(responseTimeMs: number, nowMs: number): GameSnapshot {
    const current = this.snapshot(nowMs);
    if (current.complete) return current;
    if (!this.started) {
      this.begin(nowMs);
    } else if (this.endAt === 0) {
      this.endAt = nowMs + GAME_DURATION_MS;
    }
    this.streak = 0;
    this.endAt -= MISS_TIME_PENALTY_MS;
    void responseTimeMs;
    return this.snapshot(nowMs);
  }

  pause(nowMs: number): GameSnapshot {
    if (!this.paused && !this.complete) {
      this.paused = true;
      this.pausedAt = nowMs;
    }
    return this.snapshot(nowMs);
  }

  resume(nowMs: number): GameSnapshot {
    if (this.paused) {
      if (this.started && this.endAt !== 0) {
        this.endAt += Math.max(0, nowMs - this.pausedAt);
      }
      this.paused = false;
      this.pausedAt = 0;
    }
    return this.snapshot(nowMs);
  }

  finish(nowMs: number): GameSnapshot {
    this.complete = true;
    if (this.started) this.endAt = Math.min(this.endAt || nowMs, nowMs);
    return this.snapshot(nowMs);
  }

  getBestStreak(): number {
    return this.bestStreak;
  }
}
