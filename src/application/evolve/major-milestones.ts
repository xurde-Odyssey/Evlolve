import { defaultMajorMilestonePolicy } from "../../domain/evolve-engine/milestones/policy";
import type { JourneyProgressionEvent, AchievementAward } from "../../domain/evolve-engine";
import type { MajorMilestone, MajorMilestoneProgress, MajorMilestoneTargetDays } from "../../types/major-milestone";
import { getLocalDateKey } from "./time-policy";
import type { EvolveLocalState, GrowthCommitment } from "./types";

const qualifyingStates = new Set(["FULL", "QUALIFYING_PARTIAL"]);

export function getMajorMilestoneProgress(
  state: EvolveLocalState,
  milestone: MajorMilestone,
): MajorMilestoneProgress {
  const start = new Date(milestone.startedAt).getTime();
  const end = Math.max(start, new Date(state.now).getTime());
  const elapsedDays = Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
  const commitment = state.commitments.find((item) => item.id === milestone.commitmentId);
  const qualifyingDates = new Set(
    state.evidence
      .filter((evidence) =>
        evidence.commitmentId === milestone.commitmentId
        && qualifyingStates.has(evidence.executionState)
        && typeof evidence.occurredAt === "string"
        && new Date(evidence.occurredAt).getTime() >= start,
      )
      .map((evidence) => getLocalDateKey(evidence.occurredAt as string, state.timePolicy.timezone)),
  );
  const qualifyingDays = qualifyingDates.size;
  const expectedOpportunities = expectedOpportunityCount(commitment, elapsedDays);
  const regularityPercent = Math.min(100, Math.round((qualifyingDays / expectedOpportunities) * 10000) / 100);
  const progressPercent = Math.min(100, Math.round((qualifyingDays / milestone.targetDays) * 10000) / 100);
  const eligibleToComplete = elapsedDays >= milestone.targetDays
    && qualifyingDays >= milestone.targetDays
    && regularityPercent >= defaultMajorMilestonePolicy.regularityGate * 100;

  return {
    ...milestone,
    elapsedDays,
    qualifyingDays,
    regularityPercent,
    progressPercent,
    eligibleToComplete,
  };
}

function expectedOpportunityCount(
  commitment: EvolveLocalState["commitments"][number] | undefined,
  elapsedDays: number,
) {
  if (!commitment) return elapsedDays;
  if (commitment.schedule.type === "daily") return elapsedDays;
  if (commitment.schedule.type === "times_per_week") {
    return Math.max(1, (elapsedDays / 7) * (commitment.schedule.timesPerWeek ?? 0));
  }
  if (commitment.schedule.type === "weekday") return Math.max(1, (elapsedDays / 7) * 5);
  return Math.max(1, (elapsedDays / 7) * commitment.schedule.weekdays.length);
}

export function createMajorMilestone(
  state: EvolveLocalState,
  input: {
    title: string;
    commitmentId: string;
    targetDays?: MajorMilestoneTargetDays;
  },
): MajorMilestone {
  const commitment = state.commitments.find((item) => item.id === input.commitmentId && item.status === "active");
  if (!commitment) throw new Error("Choose an active commitment for this milestone.");
  if (state.majorMilestones.some((milestone) => milestone.commitmentId === commitment.id && milestone.status === "active")) {
    throw new Error("This commitment already has an active major milestone.");
  }

  const title = input.title.trim();
  if (!title) throw new Error("A major milestone title is required.");
  const targetDays = input.targetDays ?? defaultMajorMilestonePolicy.defaultTargetDays;
  if (![100, 150, 200].includes(targetDays)) throw new Error("Major milestone duration must be 100, 150, or 200 days.");

  return {
    id: `major-milestone:${commitment.id}:${crypto.randomUUID()}`,
    title,
    commitmentId: commitment.id,
    activityKey: commitment.activityKey,
    targetDays,
    startedAt: state.now,
    status: "active",
    policyVersion: defaultMajorMilestonePolicy.version,
  };
}

export function refreshMajorMilestones(state: EvolveLocalState): EvolveLocalState {
  let achievements = state.achievements;
  let journeyEvents = state.journeyEvents;
  const majorMilestones = state.majorMilestones.map((milestone) => {
    if (milestone.status !== "active") return milestone;
    const progress = getMajorMilestoneProgress(state, milestone);
    if (!progress.eligibleToComplete) return milestone;

    const completed = { ...milestone, status: "completed" as const, completedAt: state.now };
    const sourceKey = `MAJOR_MILESTONE_COMPLETED:${milestone.id}`;
    if (!achievements.some((award) => award.key === sourceKey)) {
      achievements = [...achievements, {
        id: `achievement-${milestone.id}`,
        definitionId: "major-milestone-completed",
        key: sourceKey,
        name: milestone.title,
        category: "MILESTONE" as const,
        major: true,
        earnedAt: state.now,
        supportingEvidence: [milestone.id, milestone.commitmentId],
        policyVersion: defaultMajorMilestonePolicy.version,
      } satisfies AchievementAward];
    }
    if (!journeyEvents.some((event) => event.sourceId === milestone.id)) {
      journeyEvents = [...journeyEvents, {
        id: `journey-${milestone.id}`,
        type: "MAJOR_SKILL_MILESTONE" as const,
        occurredAt: state.now,
        title: milestone.title,
        description: "A long-term development milestone was established through sustained evidence.",
        sourceId: milestone.id,
        evidenceRefs: [milestone.id, milestone.commitmentId],
        policyVersion: defaultMajorMilestonePolicy.version,
      } satisfies JourneyProgressionEvent];
    }
    return completed;
  });

  return { ...state, majorMilestones, achievements, journeyEvents };
}

export function commitmentForMajorMilestone(
  state: EvolveLocalState,
  milestone: MajorMilestone,
): GrowthCommitment | undefined {
  return state.commitments.find((commitment) => commitment.id === milestone.commitmentId);
}
