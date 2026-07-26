import { describe, expect, it } from "vitest";
import { MISS_TIME_PENALTY_MS, SHIFT_DURATION_MS } from "../config/shifts";
import { ShiftSession } from "./shiftSession";

describe("shift session", () => {
  it("holds the first-shift clock until the guided first order is served", () => {
    const session = new ShiftSession({ maximumTier: 1, waitForFirstServe: true });
    expect(session.begin(1_000).timeRemainingMs).toBe(SHIFT_DURATION_MS);
    expect(session.snapshot(21_000).started).toBe(false);
    const served = session.recordCorrect(5_000, 21_000);
    expect(served.started).toBe(true);
    expect(session.snapshot(22_000).timeRemainingMs).toBe(SHIFT_DURATION_MS - 1_000);
  });

  it("scores a capped streak bonus and resets it on a miss", () => {
    const session = new ShiftSession({ maximumTier: 2 });
    session.begin(0);
    for (let streak = 0; streak < 7; streak += 1) session.recordCorrect(4_000, streak * 100);
    expect(session.snapshot(700).score).toBe(1_150);
    expect(session.getBestStreak()).toBe(7);
    expect(session.recordMiss(5_000, 700).streak).toBe(0);
  });

  it("deducts exactly three seconds and expires safely", () => {
    const session = new ShiftSession({ maximumTier: 2 });
    session.begin(10_000);
    const before = session.snapshot(11_000).timeRemainingMs;
    const after = session.recordMiss(5_000, 11_000).timeRemainingMs;
    expect(before - after).toBe(MISS_TIME_PENALTY_MS);
    expect(session.snapshot(100_000).complete).toBe(true);
  });

  it("does not consume time while the browser is backgrounded", () => {
    const session = new ShiftSession({ maximumTier: 1 });
    session.begin(1_000);
    const paused = session.pause(11_000);
    expect(paused.paused).toBe(true);
    expect(session.snapshot(51_000).timeRemainingMs).toBe(paused.timeRemainingMs);
    const resumed = session.resume(51_000);
    expect(resumed.timeRemainingMs).toBe(paused.timeRemainingMs);
    expect(session.snapshot(52_000).timeRemainingMs).toBe(paused.timeRemainingMs - 1_000);
  });

  it("preserves the final served result before completion feedback", () => {
    const session = new ShiftSession({ maximumTier: 1 });
    session.begin(0);
    const served = session.recordCorrect(4_000, SHIFT_DURATION_MS - 1);
    expect(served.served).toBe(1);
    expect(served.score).toBe(100);
    const complete = session.snapshot(SHIFT_DURATION_MS + 1);
    expect(complete.complete).toBe(true);
    expect(complete.served).toBe(1);
  });
});
