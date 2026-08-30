import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActivityDevelopmentState,
  buildPillarStates,
  classifyExecution,
  createMonthlyBehaviorReport,
  deriveBehavioralDebt,
  deriveBehavioralFriction,
  deriveDevelopmentPressure,
  detectBehaviorInterference,
  detectCoreWeaknesses,
  evaluateRestraintContract,
  summarizeDisciplineDevelopment,
  type ActivityDevelopmentState,
  type ActivityExecutionEvidence,
  type BehaviorEvent,
  type BehaviorInterferenceSignal,
  type RestraintContract,
} from "../src/domain/evolve-engine/index";

const anchorDate = "2026-08-30T00:00:00.000Z";

function activityEvidence({
  id,
  activityId,
  day,
  actualValue,
  targetValue = 5,
  missed = false,
  excluded = false,
}: {
  id: string;
  activityId: string;
  day: number;
  actualValue?: number;
  targetValue?: number;
  missed?: boolean;
  excluded?: boolean;
}): ActivityExecutionEvidence {
  const scheduledFor = new Date(Date.UTC(2026, 7, day, 9)).toISOString();

  if (excluded) {
    return classifyExecution({
      id,
      activityId,
      scheduledFor,
      targetValue,
      requirementState: "EXCLUDED",
      exclusionState: "INACTIVE",
      deadlineState: "NO_DEADLINE",
      createdAt: scheduledFor,
    });
  }

  if (missed) {
    return classifyExecution({
      id,
      activityId,
      scheduledFor,
      targetValue,
      requirementState: "MISSED",
      deadlineState: "ON_TIME",
      createdAt: scheduledFor,
    });
  }

  return classifyExecution({
    id,
    activityId,
    occurredAt: scheduledFor,
    scheduledFor,
    targetValue,
    actualValue,
    unit: "units",
    requirementState: "REQUIRED",
    deadlineState: "ON_TIME",
    createdAt: scheduledFor,
  });
}

function behaviorEvent({
  id,
  behaviorId,
  day,
  category = "LIFESTYLE",
}: {
  id: string;
  behaviorId: string;
  day: number;
  category?: BehaviorEvent["category"];
}): BehaviorEvent {
  return {
    id,
    behaviorId,
    behaviorType: behaviorId,
    category,
    occurredAt: new Date(Date.UTC(2026, 7, day, 21)).toISOString(),
    source: "MANUAL",
    createdAt: new Date(Date.UTC(2026, 7, day, 21)).toISOString(),
  };
}

function developmentState(
  activityId: string,
  values: readonly (number | "missed" | "excluded")[],
  targetValue = 5,
): ActivityDevelopmentState {
  const evidence = values.map((value, index) =>
    activityEvidence({
      id: `${activityId}-${index}`,
      activityId,
      day: 1 + index,
      targetValue,
      actualValue: typeof value === "number" ? value : undefined,
      missed: value === "missed",
      excluded: value === "excluded",
    }),
  );

  return buildActivityDevelopmentState(evidence, {
    activityId,
    anchorDate,
    currentTargetValue: targetValue,
  });
}

describe("behavior interference", () => {
  it("does not manufacture interference from social activity when development remains strong", () => {
    const events = [2, 6, 10, 14].map((day, index) =>
      behaviorEvent({ id: `social-${index}`, behaviorId: "social", day }),
    );
    const evidence = [3, 7, 11, 15].map((day, index) =>
      activityEvidence({
        id: `learning-${index}`,
        activityId: "reading",
        day,
        targetValue: 30,
        actualValue: 34,
      }),
    );
    const activityStates = [
      buildActivityDevelopmentState(evidence, {
        activityId: "reading",
        anchorDate,
        currentTargetValue: 30,
      }),
    ];
    const signal = detectBehaviorInterference({
      behaviorId: "social",
      events,
      evidence,
      activityStates,
      policy: {
        lookaheadDays: 1,
        affectedActivityId: "reading",
        affectedPillar: "BALANCE",
      },
    });

    assert.equal(signal.impactDirection, "NO_MEANINGFUL_INTERFERENCE");
  });

  it("detects repeated behavior associations with weak execution when evidence is sufficient", () => {
    const events = [2, 5, 8, 11, 14, 17].map((day, index) =>
      behaviorEvent({ id: `late-${index}`, behaviorId: "late-night", day }),
    );
    const evidence = [3, 6, 9, 12, 15, 18].map((day, index) =>
      activityEvidence({
        id: `learning-miss-${index}`,
        activityId: "reading",
        day,
        targetValue: 30,
        actualValue: index % 2 === 0 ? 12 : undefined,
        missed: index % 2 === 1,
      }),
    );
    const activityStates = [
      buildActivityDevelopmentState(evidence, {
        activityId: "reading",
        anchorDate,
        currentTargetValue: 30,
      }),
    ];
    const signal = detectBehaviorInterference({
      behaviorId: "late-night",
      events,
      evidence,
      activityStates,
      policy: {
        lookaheadDays: 1,
        affectedActivityId: "reading",
        affectedPillar: "CAPABILITY",
      },
    });

    assert.equal(signal.impactDirection, "NEGATIVE_ASSOCIATION");
    assert.equal(signal.recurringPattern, true);
  });

  it("keeps one isolated behavior event from becoming strong interference", () => {
    const events = [behaviorEvent({ id: "late-1", behaviorId: "late-night", day: 2 })];
    const evidence = [
      activityEvidence({
        id: "learning-weak-1",
        activityId: "reading",
        day: 3,
        targetValue: 30,
        actualValue: 10,
      }),
    ];
    const signal = detectBehaviorInterference({
      behaviorId: "late-night",
      events,
      evidence,
      activityStates: [],
      policy: {
        lookaheadDays: 1,
        affectedActivityId: "reading",
        affectedPillar: "CAPABILITY",
      },
    });

    assert.notEqual(signal.impactDirection, "NEGATIVE_ASSOCIATION");
    assert.equal(signal.recurringPattern, false);
  });

  it("marks low-confidence associations as informational", () => {
    const events = [2, 5, 8].map((day, index) =>
      behaviorEvent({ id: `late-low-${index}`, behaviorId: "late-night", day }),
    );
    const evidence = [3, 6, 9].map((day, index) =>
      activityEvidence({
        id: `learning-low-${index}`,
        activityId: "reading",
        day,
        targetValue: 30,
        actualValue: index === 0 ? 12 : 31,
      }),
    );
    const signal = detectBehaviorInterference({
      behaviorId: "late-night",
      events,
      evidence,
      activityStates: [],
      policy: {
        lookaheadDays: 1,
        affectedActivityId: "reading",
        affectedPillar: "CAPABILITY",
      },
    });

    assert.ok(signal.confidence < 0.35);
    assert.notEqual(signal.impactDirection, "NEGATIVE_ASSOCIATION");
  });

  it("does not interpret approved inactive/rest periods as lifestyle interference", () => {
    const events = [2, 5, 8, 11].map((day, index) =>
      behaviorEvent({ id: `social-rest-${index}`, behaviorId: "social", day }),
    );
    const evidence = [3, 6, 9, 12].map((day, index) =>
      activityEvidence({
        id: `rest-${index}`,
        activityId: "running",
        day,
        excluded: true,
      }),
    );
    const signal = detectBehaviorInterference({
      behaviorId: "social",
      events,
      evidence,
      activityStates: [],
      policy: {
        lookaheadDays: 1,
        affectedActivityId: "running",
        affectedPillar: "HEALTH",
      },
    });

    assert.equal(signal.impactDirection, "NO_MEANINGFUL_INTERFERENCE");
    assert.equal(signal.sampleCount, 0);
  });
});

describe("restraint, friction, and debt", () => {
  const contract = {
    id: "alcohol-weekly",
    behaviorId: "alcohol",
    mode: "FREQUENCY_CAP",
    period: "WEEK",
    allowedOccurrences: 1,
    active: true,
    startedAt: "2026-08-01T00:00:00.000Z",
  } satisfies RestraintContract;

  it("does not treat an occurrence within the restraint limit as a violation", () => {
    const evaluation = evaluateRestraintContract({
      contract,
      events: [behaviorEvent({ id: "alcohol-1", behaviorId: "alcohol", day: 3, category: "RESTRICTED" })],
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-08T00:00:00.000Z",
    });

    assert.notEqual(evaluation.status, "VIOLATED");
    assert.equal(evaluation.violations, 0);
  });

  it("detects frequency-cap restraint violations", () => {
    const evaluation = evaluateRestraintContract({
      contract,
      events: [
        behaviorEvent({ id: "alcohol-1", behaviorId: "alcohol", day: 3, category: "RESTRICTED" }),
        behaviorEvent({ id: "alcohol-2", behaviorId: "alcohol", day: 4, category: "RESTRICTED" }),
      ],
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-08T00:00:00.000Z",
    });

    assert.equal(evaluation.status, "VIOLATED");
    assert.equal(evaluation.violations, 1);
  });

  it("uses repeated restraint violations as behavioral friction evidence", () => {
    const evaluation = evaluateRestraintContract({
      contract,
      events: [3, 4, 5].map((day, index) =>
        behaviorEvent({
          id: `alcohol-${index}`,
          behaviorId: "alcohol",
          day,
          category: "RESTRICTED",
        }),
      ),
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-08T00:00:00.000Z",
    });
    const friction = deriveBehavioralFriction({
      signals: [],
      restraintEvaluations: [evaluation],
    });

    assert.equal(evaluation.status, "REPEATED_VIOLATION");
    assert.notEqual(friction.state, "NONE");
  });

  it("does not create behavioral debt from high lifestyle activity without deterioration", () => {
    const signal: BehaviorInterferenceSignal = {
      behaviorId: "social",
      affectedPillar: "BALANCE",
      impactDirection: "NO_MEANINGFUL_INTERFERENCE",
      estimatedStrength: null,
      confidence: 0.8,
      sampleCount: 8,
      recurringPattern: false,
      evidenceRefs: [],
      explanation: "No meaningful interference detected.",
    };
    const friction = deriveBehavioralFriction({ signals: [signal] });
    const debt = deriveBehavioralDebt({ friction });

    assert.equal(friction.state, "NONE");
    assert.equal(debt.state, "NONE");
  });

  it("keeps behavior events immutable during evaluation", () => {
    const events = [behaviorEvent({ id: "social-immutable", behaviorId: "social", day: 2 })];
    const before = structuredClone(events);

    evaluateRestraintContract({
      contract: { ...contract, behaviorId: "social" },
      events,
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-08T00:00:00.000Z",
    });

    assert.deepEqual(events, before);
  });
});

describe("pillars, pressure, and weaknesses", () => {
  it("keeps weak Core Learning visible even when Running is strong", () => {
    const running = developmentState("running", [6, 6, 6, 6, 6, 6, 6, 6]);
    const learning = developmentState(
      "reading",
      [30, "missed", "missed", 28, "missed", 25, "missed", 24, 26, "missed", 27, "missed"],
      30,
    );
    const weaknesses = detectCoreWeaknesses({
      activityStates: [running, learning],
      commitments: [
        { commitmentId: "core-running", activityId: "running", pillar: "HEALTH", tier: "CORE" },
        { commitmentId: "core-reading", activityId: "reading", pillar: "CAPABILITY", tier: "CORE" },
      ],
    });

    assert.equal(
      weaknesses.some((weakness) => weakness.commitmentId === "core-reading"),
      true,
    );
  });

  it("preserves weak Core areas in capability aggregation", () => {
    const running = developmentState("running", [6, 6, 6, 6, 6, 6, 6, 6]);
    const reading = developmentState(
      "reading",
      [30, "missed", "missed", 28, "missed", 25, "missed", 24, 26, "missed", 27, "missed"],
      30,
    );
    const pillars = buildPillarStates([running, reading]);
    const capability = pillars.find((pillar) => pillar.pillar === "CAPABILITY");

    assert.equal(capability?.weakActivities.includes("reading"), true);
  });

  it("targets Health pressure without prescribing arbitrary exercise", () => {
    const pressure = deriveDevelopmentPressure({
      interferenceSignals: [
        {
          behaviorId: "late-night",
          affectedActivityId: "running",
          affectedPillar: "HEALTH",
          impactDirection: "NEGATIVE_ASSOCIATION",
          estimatedStrength: 0.5,
          confidence: 0.7,
          sampleCount: 6,
          recurringPattern: true,
          evidenceRefs: ["run-1"],
          explanation: "Repeated association detected.",
        },
      ],
    });

    assert.equal(pressure[0]?.pillar, "HEALTH");
    assert.match(pressure[0]?.reason ?? "", /development/i);
  });

  it("summarizes Discipline from cross-domain reliability rather than a single activity", () => {
    const running = developmentState("running", [5, 5, 5, 5, 5, 5, 5, 5]);
    const reading = developmentState(
      "reading",
      [30, "missed", 30, "missed", 30, "missed", 30, "missed", 30, "missed", 30, "missed"],
      30,
    );
    const discipline = summarizeDisciplineDevelopment({
      activityStates: [running, reading],
    });

    assert.equal(discipline.majorStrengths.includes("running"), true);
    assert.equal(discipline.majorWeaknesses.includes("reading"), true);
  });

  it("returns low confidence rather than guessing when pillar sample size is low", () => {
    const sparse = developmentState("running", [5]);
    const pillars = buildPillarStates([sparse]);
    const health = pillars.find((pillar) => pillar.pillar === "HEALTH");

    assert.ok((health?.confidence ?? 1) < 0.35);
  });

  it("creates monthly behavior reports with careful factual labels", () => {
    const events = [behaviorEvent({ id: "social-1", behaviorId: "social", day: 2 })];
    const report = createMonthlyBehaviorReport({
      behaviorId: "social",
      behaviorLabel: "Social outings",
      events,
      interferenceSignals: [],
    });

    assert.equal(report.detectedInterference, false);
    assert.equal(report.summary, "No meaningful interference detected.");
  });
});
