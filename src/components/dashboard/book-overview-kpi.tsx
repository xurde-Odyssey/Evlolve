import { BookOpen, Library, Quote, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Book, BookMetadata } from "@/types/book";

type BookOverviewKpiProps = {
  book?: Book;
  metadata?: BookMetadata;
  completedBooks: number;
};

export function BookOverviewKpi({ book, metadata, completedBooks }: BookOverviewKpiProps) {
  if (!book) return null;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]">
            <BookOpen aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              Bookaholic overview
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              {book.title}
            </h2>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
          <Library aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
          {completedBooks} {completedBooks === 1 ? "book" : "books"} completed
        </span>
      </div>

      {metadata ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <UserRound aria-hidden="true" className="size-4 text-[var(--accent-pro)]" strokeWidth={1.8} />
              {metadata.authorName ?? "Author information unavailable"}
            </div>
            {metadata.biography ? (
              <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                {metadata.biography}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                Author biography is not available from the book catalog.
              </p>
            )}
            {metadata.sourceUrl ? (
              <a
                className="mt-3 inline-flex text-xs font-semibold text-[var(--accent-pro)] hover:underline"
                href={metadata.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View source
              </a>
            ) : null}
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              Other works
            </p>
            {metadata.otherWorks.length > 0 ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {metadata.otherWorks.map((work) => (
                  <li key={work} className="rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                    {work}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--foreground-muted)]">
                Other works are not available from the book catalog.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-md bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
          Author information will appear when the book catalog returns a match.
        </p>
      )}

      {metadata?.description ? (
        <div className="rounded-md bg-[var(--surface-elevated)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            About this book
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            {metadata.description}
          </p>
        </div>
      ) : null}

      {metadata?.quote ? (
        <blockquote className="relative overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-5 pl-6 sm:px-7 sm:py-6 sm:pl-8">
          <span
            aria-hidden="true"
            className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-[var(--accent-pro)]"
          />
          <Quote
            aria-hidden="true"
            className="mb-2 size-5 text-[var(--accent-pro)]"
            strokeWidth={1.8}
          />
          <p className="max-w-4xl font-mono text-base leading-7 text-[var(--foreground)] sm:text-lg sm:leading-8">
            {metadata.quote.text}
          </p>
          <cite className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] not-italic text-[var(--foreground-muted)]">
            {metadata.quote.source}
          </cite>
        </blockquote>
      ) : null}
    </Card>
  );
}
