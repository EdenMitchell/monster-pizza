import { MISS_TIME_PENALTY_MS, SHIFT_DURATION_MS } from "../config/shifts";
import { AdaptivePace } from "./adaptivePace";
import type { ShiftSnapshot } from "./types";

export interface ShiftSessionOptions {
  readonly maximumTier: number;
  readonly waitForFirstServe?: boolean;
}

export class ShiftSession {
  private readonly pace: AdaptivePace;
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private served = 0;
  private endAt = 0;
  private pausedAt = 0;
  private started = false;
  private paused = false;
  private complete = false;

  constructor(private readonly options: ShiftSessionOptions) {
    this.pace = new AdaptivePace(options.maximumTier);
    if (!options.waitForFirstServe) {
      this.started = true;
    }
  }

  begin(nowMs: number): ShiftSnapshot {
    if (this.started && this.endAt === 0) {
      this.endAt = nowMs + SHIFT_DURATION_MS;
    }
    return this.snapshot(nowMs);
  }

  snapshot(nowMs: number): ShiftSnapshot {
    const referenceNow = this.paused ? this.pausedAt : nowMs;
    const remaining = !this.started || this.endAt === 0
      ? SHIFT_DURATION_MS
      : Math.max(0, this.endAt - referenceNow);
    if (this.started && remaining === 0) {
      this.complete = true;
    }
    return {
      timeRemainingMs: remaining,
      score: this.score,
      streak: this.streak,
      served: this.served,
      tier: this.pace.snapshot().tier,
      started: this.started,
      paused: this.paused,
      complete: this.complete,
    };
  }

  recordCorrect(responseTimeMs: number, nowMs: number): ShiftSnapshot {
    if (this.complete) return this.snapshot(nowMs);
    if (!this.started) {
      this.started = true;
      this.endAt = nowMs + SHIFT_DURATION_MS;
    } else if (this.endAt === 0) {
      this.endAt = nowMs + SHIFT_DURATION_MS;
    }
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.served += 1;
    this.score += 100 + 25 * Math.min(Math.max(0, this.streak - 1), 4);
    this.pace.record(true, responseTimeMs);
    return this.snapshot(nowMs);
  }

  recordMiss(responseTimeMs: number, nowMs: number): ShiftSnapshot {
    if (this.complete) return this.snapshot(nowMs);
    if (!this.started) {
      this.started = true;
      this.endAt = nowMs + SHIFT_DURATION_MS;
    } else if (this.endAt === 0) {
      this.endAt = nowMs + SHIFT_DURATION_MS;
    }
    this.streak = 0;
    this.endAt -= MISS_TIME_PENALTY_MS;
    this.pace.record(false, responseTimeMs);
    return this.snapshot(nowMs);
  }

  pause(nowMs: number): ShiftSnapshot {
    if (!this.paused && !this.complete) {
      this.paused = true;
      this.pausedAt = nowMs;
    }
    return this.snapshot(nowMs);
  }

  resume(nowMs: number): ShiftSnapshot {
    if (this.paused) {
      if (this.started && this.endAt !== 0) {
        this.endAt += Math.max(0, nowMs - this.pausedAt);
      }
      this.paused = false;
      this.pausedAt = 0;
    }
    return this.snapshot(nowMs);
  }

  finish(nowMs: number): ShiftSnapshot {
    this.complete = true;
    if (this.started) this.endAt = Math.min(this.endAt || nowMs, nowMs);
    return this.snapshot(nowMs);
  }

  getBestStreak(): number {
    return this.bestStreak;
  }
}
