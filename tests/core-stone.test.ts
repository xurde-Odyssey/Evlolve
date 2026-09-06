import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCoreStoneStage } from "../src/components/profile/core-stone-stage";

describe("Core Stone stage mapping", () => {
  const cases = [
    [1, "ORIGIN"], [9, "ORIGIN"], [10, "AWAKENING"], [20, "FORMING"],
    [30, "REFINED"], [40, "STABILIZED"], [50, "ASCENDANT"], [60, "EMPOWERED"],
    [70, "MASTERED"], [80, "EVOLVED"], [90, "TRANSCENDENT"], [100, "APEX"], [140, "APEX"],
  ] as const;

  for (const [level, expected] of cases) {
    it(`maps level ${level} to ${expected}`, () => {
      assert.equal(getCoreStoneStage(level).key, expected);
    });
  }

  it("normalizes invalid and negative levels to Origin", () => {
    assert.equal(getCoreStoneStage(-4).key, "ORIGIN");
    assert.equal(getCoreStoneStage(Number.NaN).key, "ORIGIN");
  });
});
