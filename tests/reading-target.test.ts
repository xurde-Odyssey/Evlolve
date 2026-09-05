import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveReadingTargetFromBookHistory, initialReadingTarget } from "../src/domain/evolve-engine";
import type { Book } from "../src/types/book";

const book = (id: string, totalPages: number, startedAt: string, finishedAt?: string): Book => ({
  id,
  title: id,
  totalPages,
  startedAt,
  finishedAt,
  status: finishedAt ? "completed" : "reading",
});

describe("Bookaholic target policy", () => {
  it("starts at five pages until there is enough completion history", () => {
    assert.equal(deriveReadingTargetFromBookHistory([]), initialReadingTarget);
    assert.equal(
      deriveReadingTargetFromBookHistory([book("one", 200, "2026-01-01", "2026-01-10")]),
      5,
    );
  });

  it("uses a conservative pace from the first two or three completed books", () => {
    const history = [
      book("one", 100, "2026-01-01", "2026-01-10"),
      book("two", 150, "2026-02-01", "2026-02-10"),
      book("three", 600, "2026-03-01", "2026-03-03"),
    ];

    assert.equal(deriveReadingTargetFromBookHistory(history), 6);
    assert.equal(deriveReadingTargetFromBookHistory(history, 5, 12), 15);
  });
});
