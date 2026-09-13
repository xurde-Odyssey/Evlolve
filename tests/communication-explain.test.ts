import test from "node:test";
import assert from "node:assert/strict";
import { analyzeExplanation, buildExplainTasks, explainPromptLibrary } from "../src/application/communication/explain";

test("curated prompts cover every Explain Better practice type", () => {
  for (const type of ["SITUATION", "IDEA", "STORY", "OPINION"] as const) {
    const tasks = buildExplainTasks(type, "ADAPTIVE", 2);
    assert.equal(tasks.length, 2);
    assert.ok(tasks.every((task) => task.promptType === type));
  }
  assert.ok(explainPromptLibrary.length >= 8);
});

test("mixed task generation stays within the curated prompt library", () => {
  const tasks = buildExplainTasks("MIXED", "CHALLENGING", 3);
  assert.equal(tasks.length, 3);
  assert.deepEqual(tasks.map((task) => task.sequence), [1, 2, 3]);
  assert.ok(tasks.every((task) => explainPromptLibrary.some((prompt) => prompt.prompt === task.prompt)));
});

test("short explanations receive low-confidence evidence and a useful next step", () => {
  const analysis = analyzeExplanation("It was bad.", { promptType: "SITUATION" });
  assert.equal(analysis.clarity?.evidenceCount, 1);
  assert.ok((analysis.clarity?.confidence ?? 1) < 0.6);
  assert.equal(analysis.retryRecommended, true);
  assert.ok(analysis.improvements.some((item) => item.includes("reason")));
});

test("word-choice feedback preserves a natural spoken alternative", () => {
  const analysis = analyzeExplanation(
    "I prefer working on a silent one because I can focus better and finish my work.",
    { promptType: "IDEA" },
  );
  assert.equal(analysis.corrections.length, 1);
  assert.equal(analysis.corrections[0]?.naturalVersion, "somewhere quieter");
  assert.match(analysis.corrections[0]?.why ?? "", /more natural/i);
});

test("a developed explanation records meaningful strengths without pretending to measure pronunciation", () => {
  const analysis = analyzeExplanation(
    "The main reason is that quieter workplaces help me focus, so I make fewer mistakes. For example, I can finish difficult tasks without constantly losing my train of thought.",
    { promptType: "IDEA" },
  );
  assert.ok(analysis.strengths.length > 0);
  assert.equal(analysis.fluency?.observation, "Transcript-only fluency hook; pauses and pronunciation are not measured yet.");
  assert.ok((analysis.clarity?.confidence ?? 0) > 0.6);
});
