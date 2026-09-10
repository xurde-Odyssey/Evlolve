import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDemoEvolveState,
  createEvolveApplication,
} from "../src/application/evolve/index";

describe("Learning tracks", () => {
  it("allows one active track per Learning commitment and links sessions to it", () => {
    const state = createDemoEvolveState();
    state.commitments = state.commitments.map((commitment) =>
      commitment.activityKey === "reading"
        ? { ...commitment, activityKey: "coding", title: "Learning", measurementType: "duration", targetValue: 30, unit: "minutes" }
        : commitment,
    );
    const app = createEvolveApplication(state);
    const track = app.createLearningTrack({
      title: "IBM Data Science",
      type: "course",
      provider: "IBM",
      milestones: [{ title: "Python foundations" }, { title: "Final project" }],
    });

    assert.equal(track.status, "active");
    assert.equal(track.milestones[0]?.status, "in_progress");
    assert.throws(
      () => app.createLearningTrack({ title: "Another course", type: "course" }),
      /current Learning track/i,
    );

    const result = app.logActivity({
      activityKey: "coding",
      measurementType: "duration",
      value: 45,
      unit: "minutes",
      occurredAt: "2026-08-28T15:00:00.000Z",
    });
    assert.equal(result.record.learningTrackId, track.id);
    assert.equal(result.record.learningMilestoneId, track.milestones[0]?.id);
  });

  it("preserves completed-track history and lets a new track reuse the commitment", () => {
    const state = createDemoEvolveState();
    state.commitments = state.commitments.map((commitment) =>
      commitment.activityKey === "reading"
        ? { ...commitment, activityKey: "coding", title: "Learning", measurementType: "duration", targetValue: 30, unit: "minutes" }
        : commitment,
    );
    const app = createEvolveApplication(state);
    const first = app.createLearningTrack({
      title: "Data analysis fundamentals",
      type: "course",
      milestones: [{ title: "Complete the course" }],
    });
    app.logActivity({
      activityKey: "coding",
      measurementType: "duration",
      value: 60,
      unit: "minutes",
      occurredAt: "2026-08-28T15:00:00.000Z",
    });

    app.completeLearningTrack(first.id);
    const completed = app.repositories.getState();
    assert.equal(completed.learningTracks[0]?.status, "completed");
    assert.equal(completed.activityRecords[0]?.learningTrackId, first.id);
    assert.equal(completed.achievements.some((award) => award.key === `LEARNING_TRACK_COMPLETED:${first.id}`), true);
    assert.equal(completed.journeyEvents.some((event) => event.sourceId === first.id), true);

    const second = app.createLearningTrack({
      title: "Advanced analytics portfolio",
      type: "skill",
    });
    assert.notEqual(second.id, first.id);
    assert.equal(second.commitmentId, first.commitmentId);
  });

  it("does not award a completion milestone without meaningful track evidence", () => {
    const state = createDemoEvolveState();
    state.commitments = state.commitments.map((commitment) =>
      commitment.activityKey === "reading"
        ? { ...commitment, activityKey: "coding", title: "Learning", measurementType: "duration", targetValue: 30, unit: "minutes" }
        : commitment,
    );
    const app = createEvolveApplication(state);
    const track = app.createLearningTrack({ title: "Unstarted course", type: "course" });

    app.completeLearningTrack(track.id);
    const after = app.repositories.getState();
    assert.equal(after.learningTracks[0]?.status, "completed");
    assert.equal(after.achievements.some((award) => award.key === `LEARNING_TRACK_COMPLETED:${track.id}`), false);
    assert.equal(after.journeyEvents.some((event) => event.sourceId === track.id), false);
  });
});
