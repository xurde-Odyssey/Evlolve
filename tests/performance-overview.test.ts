import assert from "node:assert/strict";
import test from "node:test";
import { createDemoEvolveState, getPerformanceOverviewSet } from "../src/application/evolve/index";

test("performance overview uses the user's selected commitments", () => {
  const state = createDemoEvolveState();
  const performance = getPerformanceOverviewSet(state)["4W"];
  const labels = performance.series.filter((series) => series.kind === "ACTIVITY_CONSISTENCY").map((series) => series.label);

  assert.ok(labels.includes("Running"));
  assert.ok(labels.includes("Bookaholic"));
  assert.equal(labels.includes("Meditation"), false);
  assert.equal(performance.series.some((series) => series.kind === "BOUNDARY_ADHERENCE"), false);
});

test("performance overview keeps insufficient activity history unknown", () => {
  const state = createDemoEvolveState();
  const base = state.commitments[0];
  assert.ok(base);
  state.commitments = [{ ...base, id: "commitment-new-skill", title: "Language Practice", activityKey: "custom", startedAt: state.now }];

  const series = getPerformanceOverviewSet(state)["4W"].series[0];
  assert.ok(series);
  assert.equal(series.points.every((point) => point.value === null), true);
});

test("performance overview uses yearly points for ALL history", () => {
  const performance = getPerformanceOverviewSet(createDemoEvolveState())["ALL"];

  assert.equal(performance.granularity, "YEAR");
  assert.ok(performance.series.every((series) => series.points.every((point) => /^\d{4}$/.test(point.label))));
});

test("six-month performance view uses three weekly points per month", () => {
  const performance = getPerformanceOverviewSet(createDemoEvolveState())["6M"];

  assert.equal(performance.granularity, "WEEK");
  assert.equal(performance.series[0]?.points.length, 18);
});
