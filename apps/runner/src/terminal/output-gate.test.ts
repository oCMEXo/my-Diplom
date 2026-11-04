import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOutputGate } from "./output-gate.js";

describe("createOutputGate", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  function setup() {
    const state = { waiting: 0, calls: [] as string[] };
    const gate = createOutputGate({
      buffered: () => state.waiting,
      pause: () => state.calls.push("pause"),
      resume: () => state.calls.push("resume"),
      high: 100,
      low: 10,
      checkMs: 50,
    });
    return { state, gate };
  }

  it("leaves the output alone while little is waiting", () => {
    const { state, gate } = setup();
    state.waiting = 100;
    gate.check();
    expect(state.calls).toEqual([]);
  });

  it("pauses once when too much is waiting and resumes only after most of it has gone", () => {
    const { state, gate } = setup();
    state.waiting = 101;
    gate.check();
    gate.check();
    expect(state.calls).toEqual(["pause"]);

    state.waiting = 50;
    vi.advanceTimersByTime(200);
    expect(state.calls).toEqual(["pause"]);

    state.waiting = 10;
    vi.advanceTimersByTime(50);
    expect(state.calls).toEqual(["pause", "resume"]);

    state.waiting = 101;
    gate.check();
    expect(state.calls).toEqual(["pause", "resume", "pause"]);
  });

  it("does not resume anything after the connection has gone", () => {
    const { state, gate } = setup();
    state.waiting = 101;
    gate.check();
    gate.stop();
    state.waiting = 0;
    vi.advanceTimersByTime(200);
    expect(state.calls).toEqual(["pause"]);
  });
});
