import test from "node:test";
import assert from "node:assert/strict";
import { trimConversationContext } from "../src/application/communication/prompts";
import { isMeaningfulCommunicationCompletion } from "../src/application/communication/progression";
import { normalizeCommunicationSessionStatus } from "../src/application/communication/session";

test("shared communication context keeps only bounded recent messages", () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({ role: "USER", content: `message ${index}` }));
  const trimmed = trimConversationContext(messages, 6, 1000);
  assert.equal(trimmed.length, 6);
  assert.equal(trimmed[0]?.content, "message 34");
  assert.equal(trimmed.at(-1)?.content, "message 39");
});

test("communication session statuses normalize across modules", () => {
  assert.equal(normalizeCommunicationSessionStatus("ANALYZING"), "PROCESSING");
  assert.equal(normalizeCommunicationSessionStatus("ERROR"), "FAILED");
  assert.equal(normalizeCommunicationSessionStatus("ACTIVE"), "ACTIVE");
});

test("short sessions do not receive global activity credit", () => {
  assert.equal(isMeaningfulCommunicationCompletion({ module: "DAILY_CONVERSATION", durationSeconds: 90, meaningfulUnits: 1, endedAt: new Date().toISOString() }), false);
  assert.equal(isMeaningfulCommunicationCompletion({ module: "DAILY_CONVERSATION", durationSeconds: 120, meaningfulUnits: 2, endedAt: new Date().toISOString() }), true);
});
