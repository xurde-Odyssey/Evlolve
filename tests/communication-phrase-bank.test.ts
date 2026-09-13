import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePhraseMastery, normalizePhrase } from "../src/application/communication/mastery";
import type { CommunicationPhrase, CommunicationPhraseEvent } from "../src/types/communication";

const phrase: CommunicationPhrase = { id: "phrase-1", phrase: "fair enough", meaning: "acknowledgement", example: "Fair enough.", status: "NEW" };

function event(eventType: CommunicationPhraseEvent["eventType"], day: string): CommunicationPhraseEvent {
  return { id: `${eventType}-${day}`, phraseId: phrase.id, eventType, occurredAt: `${day}T12:00:00.000Z` };
}

test("normalizes obvious phrase punctuation and casing duplicates", () => {
  assert.equal(normalizePhrase(" Fair enough. "), "fair enough");
  assert.equal(normalizePhrase("fair   enough"), "fair enough");
});

test("one exposure does not create mastery", () => {
  const decision = evaluatePhraseMastery(phrase, [event("EXPOSED", "2026-09-13")], "2026-09-13T18:00:00.000Z");
  assert.equal(decision.status, "NEW");
});

test("recognition and repeated usage progress a phrase across days", () => {
  const events = [
    event("RECOGNIZED", "2026-09-13"),
    event("RECALLED", "2026-09-14"),
    event("USED_UNPROMPTED", "2026-09-15"),
    event("USED_CORRECTLY", "2026-09-17"),
    event("USED_UNPROMPTED", "2026-09-19"),
  ];
  const decision = evaluatePhraseMastery(phrase, events, "2026-09-19T18:00:00.000Z");
  assert.equal(decision.status, "MASTERED");
  assert.ok(decision.masteredAt);
});

test("repeated recent failures can regress a mastered phrase", () => {
  const events = [
    event("USED_UNPROMPTED", "2026-09-13"),
    event("USED_UNPROMPTED", "2026-09-14"),
    event("USED_UNPROMPTED", "2026-09-15"),
    event("REVIEW_FAILED", "2026-09-18"),
    event("REVIEW_FAILED", "2026-09-19"),
  ];
  const decision = evaluatePhraseMastery({ ...phrase, status: "MASTERED" }, events, "2026-09-19T18:00:00.000Z");
  assert.equal(decision.status, "PRACTICING");
});
