import assert from "node:assert/strict";
import test from "node:test";
import { getAchievementHubViewModel } from "../src/application/evolve/achievement-hub";
import type { AchievementSnapshot } from "../src/types/achievement";
import type { Book } from "../src/types/book";

function snapshot(achievements: AchievementSnapshot["achievements"]): AchievementSnapshot {
  return { achievements, titles: [] };
}

function achievement(overrides: Partial<AchievementSnapshot["achievements"][number]>) {
  return {
    id: "achievement-1",
    title: "Baseline Established",
    description: "A demonstrated baseline.",
    category: "mastery" as const,
    status: "earned" as const,
    major: true,
    earnedAt: "2026-09-10",
    ...overrides,
  };
}

const completedBook: Book = {
  id: "book-1",
  title: "The Book",
  totalPages: 100,
  startedAt: "2026-08-01",
  finishedAt: "2026-08-10",
  status: "completed",
};

test("Hub excludes locked and non-major achievements", () => {
  const view = getAchievementHubViewModel(
    snapshot([
      achievement({ id: "earned", title: "Earned" }),
      achievement({ id: "locked", title: "Locked", status: "locked" }),
      achievement({ id: "minor", title: "Minor", major: false }),
    ]),
    [],
  );

  assert.deepEqual(view.frames.map((item) => item.achievement.id), ["earned"]);
  assert.equal(view.deskArtifacts.length, 0);
});

test("Hub prioritizes desk artifacts and keeps completed books separate", () => {
  const view = getAchievementHubViewModel(
    snapshot([
      achievement({ id: "boss", title: "Boss Defeated", category: "boss" }),
      achievement({ id: "lifetime", title: "Year Complete", category: "lifetime" }),
      achievement({ id: "frame", title: "Full Month", category: "discipline" }),
    ]),
    [completedBook, { ...completedBook, id: "reading", status: "reading", finishedAt: undefined }],
  );

  assert.deepEqual(view.deskArtifacts.map((item) => item.achievement.id), ["lifetime", "boss"]);
  assert.deepEqual(view.frames.map((item) => item.achievement.id), ["frame"]);
  assert.deepEqual(view.completedBooks.map((book) => book.id), ["book-1"]);
});

test("Hub placement is deterministic for the same earned history", () => {
  const input = snapshot([
    achievement({ id: "older", title: "Older", earnedAt: "2026-01-01" }),
    achievement({ id: "newer", title: "Newer", earnedAt: "2026-09-01" }),
  ]);

  const first = getAchievementHubViewModel(input, []);
  const second = getAchievementHubViewModel(input, []);

  assert.deepEqual(first.frames.map((item) => item.slot), second.frames.map((item) => item.slot));
  assert.deepEqual(first.frames.map((item) => item.achievement.id), ["newer", "older"]);
});
