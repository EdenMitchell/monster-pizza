import { describe, expect, it } from "vitest";
import { GAME_DURATION_MS, MISS_TIME_PENALTY_MS } from "../config/gameConfig";
import { GameSession } from "./gameSession";

describe("90-second game session", () => {
  it("holds the full clock until the countdown starts the run", () => {
    const session = new GameSession();
    expect(session.snapshot(1_000).started).toBe(false);
    expect(session.snapshot(4_000).timeRemainingMs).toBe(GAME_DURATION_MS);
    session.begin(4_000);
    expect(session.snapshot(5_000).timeRemainingMs).toBe(GAME_DURATION_MS - 1_000);
  });

  it("starts the clock immediately when the game begins", () => {
    const session = new GameSession();
    const started = session.begin(1_000);
    expect(started.started).toBe(true);
    expect(started.timeRemainingMs).toBe(GAME_DURATION_MS);
    expect(session.snapshot(2_000).timeRemainingMs).toBe(GAME_DURATION_MS - 1_000);
  });

  it("scores a capped streak bonus and resets it on a miss", () => {
    const session = new GameSession();
    session.begin(0);
    for (let streak = 0; streak < 7; streak += 1) session.recordCorrect(4_000, streak * 100);
    expect(session.snapshot(700).score).toBe(1_150);
    expect(session.getBestStreak()).toBe(7);
    expect(session.recordMiss(5_000, 700).streak).toBe(0);
  });

  it("deducts exactly three seconds and expires safely", () => {
    const session = new GameSession();
    session.begin(10_000);
    const before = session.snapshot(11_000).timeRemainingMs;
    const after = session.recordMiss(5_000, 11_000).timeRemainingMs;
    expect(before - after).toBe(MISS_TIME_PENALTY_MS);
    expect(session.snapshot(100_000).complete).toBe(true);
  });

  it("does not consume time while the browser is backgrounded", () => {
    const session = new GameSession();
    session.begin(1_000);
    const paused = session.pause(11_000);
    expect(paused.paused).toBe(true);
    expect(session.snapshot(51_000).timeRemainingMs).toBe(paused.timeRemainingMs);
    const resumed = session.resume(51_000);
    expect(resumed.timeRemainingMs).toBe(paused.timeRemainingMs);
    expect(session.snapshot(52_000).timeRemainingMs).toBe(paused.timeRemainingMs - 1_000);
  });

  it("preserves a final result committed before time feedback", () => {
    const session = new GameSession();
    session.begin(0);
    const served = session.recordCorrect(4_000, GAME_DURATION_MS - 1);
    expect(served.served).toBe(1);
    expect(served.score).toBe(100);
    const complete = session.snapshot(GAME_DURATION_MS + 1);
    expect(complete.complete).toBe(true);
    expect(complete.served).toBe(1);
  });
});
