import type { Book } from "@/types/book";

const INITIAL_READING_TARGET = 5;
const MAX_READING_TARGET = 60;

export function deriveReadingTargetFromBookHistory(
  books: readonly Book[],
  fallback = INITIAL_READING_TARGET,
  currentTarget = fallback,
) {
  const completed = books
    .filter((book) => book.status === "completed" && book.finishedAt)
    .slice()
    .sort((a, b) => (a.finishedAt ?? "").localeCompare(b.finishedAt ?? ""))
    .slice(0, 3);

  if (completed.length < 2) return fallback;

  const pagesPerDay = completed.map((book) => {
    const start = Date.parse(book.startedAt);
    const finish = Date.parse(book.finishedAt ?? book.startedAt);
    const days = Math.max(1, Math.ceil((finish - start) / 86_400_000) + 1);
    return book.totalPages / days;
  });

  const ordered = [...pagesPerDay].sort((a, b) => a - b);
  const middle = ordered[Math.floor(ordered.length / 2)] ?? fallback;
  const gradualTarget = Math.min(middle, currentTarget * 1.25);
  return Math.min(MAX_READING_TARGET, Math.max(INITIAL_READING_TARGET, Math.round(gradualTarget)));
}

export const initialReadingTarget = INITIAL_READING_TARGET;
