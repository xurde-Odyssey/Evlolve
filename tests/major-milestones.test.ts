import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoEvolveState, createEvolveApplication, getProfileViewModel } from "../src/application/evolve";

describe("Major milestones", () => {
  it("allows one milestone per active commitment and starts with no progress", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    const milestone = app.createMajorMilestone({
      title: "Be in shape",
      commitmentId: "commitment-workout",
      targetDays: 100,
    });

    assert.equal(milestone.activityKey, "workout");
    assert.throws(
      () => app.createMajorMilestone({ title: "Another shape goal", commitmentId: "commitment-workout" }),
      /already has an active major milestone/i,
    );
    const profile = getProfileViewModel(app.repositories.getState());
    assert.equal(profile.majorMilestones[0]?.progressPercent, 0);
    assert.equal(profile.majorMilestones[0]?.eligibleToComplete, false);
  });

  it("does not complete a milestone from a title alone", () => {
    const app = createEvolveApplication(createDemoEvolveState());
    app.createMajorMilestone({
      title: "Get a data job",
      commitmentId: "commitment-reading",
      targetDays: 100,
    });

    const state = app.repositories.getState();
    assert.equal(state.achievements.some((achievement) => achievement.definitionId === "major-milestone-completed"), false);
    assert.equal(state.journeyEvents.some((event) => event.sourceId.startsWith("major-milestone:")), false);
  });
});
