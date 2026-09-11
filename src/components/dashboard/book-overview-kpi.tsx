import { BookOpen, Library, Quote, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Book, BookMetadata, BookQuote } from "@/types/book";

type BookOverviewKpiProps = {
  book?: Book;
  metadata?: BookMetadata;
  completedBooks: number;
};

function selectRotatingQuote(bookId: string, metadata?: BookMetadata): BookQuote | undefined {
  const quotes = metadata?.quotes?.length ? metadata.quotes : metadata?.quote ? [metadata.quote] : [];
  if (quotes.length === 0) return undefined;
  if (quotes.length === 1) return quotes[0];

  // Keep the same quote across refreshes, then rotate to another one every 72 hours.
  const window = Math.floor(Date.now() / (72 * 60 * 60 * 1000));
  const seed = [...bookId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return quotes[(seed + window) % quotes.length];
}

export function BookOverviewKpi({ book, metadata, completedBooks }: BookOverviewKpiProps) {
  if (!book) return null;
  const quote = selectRotatingQuote(book.id, metadata);

  return (
    <Card className="book-overview-card p-3 sm:p-5">
      <div className="book-overview-book">
        <header className="book-overview-cover">
          <div className="flex items-start gap-3">
            <span className="book-overview-mark grid size-10 shrink-0 place-items-center rounded-full">
              <BookOpen aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="book-overview-kicker">Bookaholic overview</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-[var(--foreground)]">
                {book.title}
              </h2>
            </div>
          </div>
          <span className="book-overview-count">
            <Library aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
            {completedBooks} {completedBooks === 1 ? "book" : "books"} completed
          </span>
        </header>

        <div className="book-overview-spread">
          <section className="book-overview-page book-overview-page-left">
            <p className="book-overview-label">Author</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <UserRound aria-hidden="true" className="size-4 text-[var(--accent-pro)]" strokeWidth={1.8} />
              {metadata?.authorName ?? "Author information unavailable"}
            </div>
            <p className="mt-4 max-w-[68ch] text-left text-sm leading-7 text-pretty text-[var(--foreground-muted)]">
              {metadata?.biography ?? "Author biography is not available from the book catalog."}
            </p>
            {metadata?.sourceUrl ? (
              <a
                className="mt-4 inline-flex text-xs font-semibold text-[var(--accent-pro)] hover:underline"
                href={metadata.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View source
              </a>
            ) : null}
          </section>

          <section className="book-overview-page book-overview-page-right">
            <p className="book-overview-label">Other works</p>
            {metadata?.otherWorks.length ? (
              <ul className="book-overview-works mt-3">
                {metadata.otherWorks.map((work) => (
                  <li key={work}>{work}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--foreground-muted)]">
                Other works are not available from the book catalog.
              </p>
            )}

            {metadata?.description ? (
              <div className="book-overview-about mt-6">
                <p className="book-overview-label">About this book</p>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                  {metadata.description}
                </p>
              </div>
            ) : null}

            {quote ? (
              <blockquote className="book-overview-quote mt-6">
                <Quote aria-hidden="true" className="size-4 shrink-0 text-[var(--accent-pro)]" strokeWidth={1.8} />
                <div>
                  <p className="font-mono text-sm leading-6 text-[var(--foreground)]">
                    {quote.text}
                  </p>
                  <cite className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] not-italic text-[var(--foreground-muted)]">
                    {quote.source}
                  </cite>
                </div>
              </blockquote>
            ) : null}
          </section>
        </div>
      </div>
    </Card>
  );
}
