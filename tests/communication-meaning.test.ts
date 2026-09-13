import test from "node:test";
import assert from "node:assert/strict";
import { buildMeaningItems, evaluateMeaningAnswer, meaningLibrary, normalize } from "../src/application/communication/meaning";

test("curated meaning content covers all five practice types", () => {
  const types = new Set(meaningLibrary.map((item) => item.questionType));
  assert.deepEqual([...types].sort(), ["BEST_RESPONSE", "MINI_CONVERSATION", "REALLY_SAYING", "SAME_MEANING", "WHAT_DOES_IT_MEAN"]);
});

test("meaning sessions create the requested bounded number of items", () => {
  const items = buildMeaningItems("ADAPTIVE", 8);
  assert.equal(items.length, 8);
  assert.deepEqual(items.map((item) => item.sequence), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(items.every((item) => item.content.context && item.content.explanation));
});

test("contextual multiple-choice answers are evaluated semantically", () => {
  const item = buildMeaningItems("EASY", 1)[0];
  assert.ok(item);
  const result = evaluateMeaningAnswer(item, item.content.correctAnswer);
  assert.equal(result.correctness, "CORRECT");
  assert.ok(result.analysis.explanation.length > 20);
});

test("indirect refusal content teaches intended meaning instead of literal translation", () => {
  const item = buildMeaningItems("ADAPTIVE", meaningLibrary.length).find((entry) => entry.content.phrase === "I've got an early start tomorrow");
  assert.ok(item);
  assert.match(item.content.explanation, /indirect.*refusal/i);
  assert.equal(evaluateMeaningAnswer(item, "B is probably declining").correctness, "CORRECT");
});

test("mini conversation accepts a natural equivalent as partial evidence", () => {
  const item = buildMeaningItems("ADAPTIVE", meaningLibrary.length).find((entry) => entry.questionType === "MINI_CONVERSATION");
  assert.ok(item);
  const result = evaluateMeaningAnswer(item, "Okay, that works for me.");
  assert.equal(result.correctness, "CORRECT");
});

test("normalization prevents punctuation and casing from changing an answer", () => {
  assert.equal(normalize(" Fair Enough! "), "fair enough");
});
