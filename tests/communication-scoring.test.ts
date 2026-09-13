import test from "node:test";
import assert from "node:assert/strict";
import { bandFor, scoreCommunicationSkills } from "../src/application/communication/scoring";
import type { CommunicationSkillEvidence } from "../src/types/communication";

function evidence(overrides: Partial<CommunicationSkillEvidence> = {}): CommunicationSkillEvidence {
  return { id: overrides.id ?? crypto.randomUUID(), sourceModule: "EXPLAIN_BETTER", dimension: "wordChoice", value: 70, confidence: 0.8, difficulty: "NORMAL", evidenceType: "NATURAL_WORD_CHOICE", assistanceLevel: "NONE", occurredAt: "2026-09-13T12:00:00.000Z", ...overrides };
}

test("low-data dimensions remain insufficient instead of fabricating a stable score", () => {
  const result = scoreCommunicationSkills([evidence({ dimension: "understanding", value: 90 })], "2026-09-13T18:00:00.000Z");
  const understanding = result.dimensions.find((item) => item.dimension === "understanding");
  assert.equal(understanding?.status, "EARLY");
  assert.ok((understanding?.confidence ?? 1) < 0.3);
  assert.equal(result.dimensions.find((item) => item.dimension === "fluency")?.score, null);
});

test("assistance and difficulty influence evidence without overwhelming the score", () => {
  const assisted = scoreCommunicationSkills([evidence({ id: "assisted", value: 100, assistanceLevel: "STRONG_HINT", difficulty: "EASY" })], "2026-09-13T18:00:00.000Z");
  const independent = scoreCommunicationSkills([evidence({ id: "independent", value: 100, assistanceLevel: "NONE", difficulty: "CHALLENGING" })], "2026-09-13T18:00:00.000Z");
  assert.ok((independent.dimensions.find((item) => item.dimension === "wordChoice")?.confidence ?? 0) >= (assisted.dimensions.find((item) => item.dimension === "wordChoice")?.confidence ?? 0));
  assert.equal(independent.dimensions.find((item) => item.dimension === "wordChoice")?.score, 100);
});

test("repeated identical evidence is dampened and does not inflate mastery", () => {
  const items = Array.from({ length: 12 }, (_, index) => evidence({ id: `repeat-${index}`, evidenceKey: "same-task", value: index === 0 ? 100 : 30 }));
  const result = scoreCommunicationSkills(items, "2026-09-13T18:00:00.000Z");
  const score = result.dimensions.find((item) => item.dimension === "wordChoice")?.score ?? 0;
  assert.ok(score < 60);
});

test("recent evidence can identify an improving trend without deleting history", () => {
  const items = [
    ...Array.from({ length: 4 }, (_, index) => evidence({ id: `old-${index}`, value: 45, occurredAt: `2026-08-${String(20 + index).padStart(2, "0")}T12:00:00.000Z` })),
    ...Array.from({ length: 4 }, (_, index) => evidence({ id: `new-${index}`, value: 78, occurredAt: `2026-09-${String(10 + index).padStart(2, "0")}T12:00:00.000Z` })),
  ];
  assert.equal(scoreCommunicationSkills(items, "2026-09-13T18:00:00.000Z").dimensions.find((item) => item.dimension === "wordChoice")?.trend, "IMPROVING");
});

test("overall score renormalizes when dimensions have no evidence", () => {
  const result = scoreCommunicationSkills([evidence({ dimension: "understanding", value: 80 })], "2026-09-13T18:00:00.000Z");
  assert.equal(result.overallScore, 80);
  assert.equal(bandFor(null), "Not enough data");
});
