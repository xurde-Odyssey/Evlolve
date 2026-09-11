import "server-only";

import type { BookMetadata, BookQuote } from "@/types/book";

type OpenLibrarySearchResponse = {
  docs?: Array<{
    key?: string;
    title?: string;
    author_name?: string[];
    author_key?: string[];
    first_publish_year?: number;
    cover_i?: number;
  }>;
};

type OpenLibraryAuthor = {
  name?: string;
  bio?: string | { value?: string };
  photos?: number[];
};

type OpenLibraryWorksResponse = {
  entries?: Array<{ title?: string }>;
};

type GoogleBooksResponse = {
  items?: Array<{
    volumeInfo?: {
      description?: string;
      authors?: string[];
      infoLink?: string;
    };
  }>;
};

type WikimediaSearchResponse = {
  pages?: Array<{ key?: string; title?: string }>;
};

type WikimediaSummary = {
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

export async function lookupBookMetadata(title: string): Promise<BookMetadata | undefined> {
  const query = title.trim();
  if (!query) return undefined;

  try {
    const search = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=25&fields=key,title,author_name,author_key,first_publish_year,cover_i`,
      {
        headers: { "User-Agent": "Evolve personal-development app" },
        next: { revalidate: 86_400 },
      },
    );
    if (!search.ok) return undefined;

    const result = (await search.json()) as OpenLibrarySearchResponse;
    const [googleBook, wikipediaBook] = await Promise.all([
      fetchGoogleBook(query),
      fetchWikipediaBio(query),
    ]);
    const inferredAuthor = inferBookAuthor(wikipediaBook);
    const match = chooseBestBookMatch(result.docs ?? [], query, inferredAuthor);
    if (!match && !googleBook) return undefined;

    const authorId = match?.author_key?.[0];
    const authorName = inferredAuthor ?? match?.author_name?.[0] ?? googleBook?.authors?.[0];
    const workId = match?.key?.startsWith("/works/")
      ? match.key.slice("/works/".length)
      : undefined;
    const [author, works, wikipediaBio, quotes] = await Promise.all([
      authorId ? fetchOpenLibrary<OpenLibraryAuthor>(`https://openlibrary.org/authors/${authorId}.json`) : null,
      authorId ? fetchOpenLibrary<OpenLibraryWorksResponse>(`https://openlibrary.org/authors/${authorId}/works.json?limit=8`) : null,
      authorName ? fetchWikipediaBio(authorName) : null,
      fetchWikiquote(query, authorName),
    ]);

    const biography = typeof author?.bio === "string" ? author.bio : author?.bio?.value;
    const otherWorks = (works?.entries ?? [])
      .map((work) => work.title?.trim())
      .filter((work): work is string => typeof work === "string" && work.toLowerCase() !== query.toLowerCase())
      .slice(0, 5);

    return {
      source: "OPEN_LIBRARY",
      workId,
      authorId,
      authorName: authorName ?? googleBook?.authors?.[0],
      biography: biography?.trim() || wikipediaBio?.extract?.trim() || undefined,
      description: googleBook?.description?.trim() || undefined,
      otherWorks,
      coverUrl: match?.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-M.jpg` : undefined,
      sourceUrl:
        wikipediaBio?.content_urls?.desktop?.page ??
        wikipediaBook?.content_urls?.desktop?.page ??
        googleBook?.infoLink,
      quote: quotes?.[0],
      quotes: quotes?.length ? quotes : undefined,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

function chooseBestBookMatch(
  docs: NonNullable<OpenLibrarySearchResponse["docs"]>,
  query: string,
  preferredAuthor?: string,
) {
  const normalizedQuery = normalizeBookTitle(query);
  const exactTitleMatches = docs.filter(
    (item) => normalizeBookTitle(item.title ?? "") === normalizedQuery,
  );
  const candidates = exactTitleMatches.length > 0 ? exactTitleMatches : docs;

  if (preferredAuthor) {
    const normalizedAuthor = normalizePersonName(preferredAuthor);
    const authorMatch = candidates.find((item) =>
      (item.author_name ?? []).some((author) => {
        const normalizedCandidate = normalizePersonName(author);
        return normalizedCandidate.includes(normalizedAuthor) || normalizedAuthor.includes(normalizedCandidate);
      }),
    );
    // When an independent book source has identified the original author,
    // never fall back to a translator/editor record from the same title.
    return authorMatch;
  }

  return [...candidates]
    .filter((item) => item.author_key?.[0] && item.author_name?.[0])
    .sort((left, right) => {
      const leftYear = left.first_publish_year ?? Number.MAX_SAFE_INTEGER;
      const rightYear = right.first_publish_year ?? Number.MAX_SAFE_INTEGER;
      return leftYear - rightYear;
    })[0];
}

function inferBookAuthor(summary: WikimediaSummary | undefined) {
  // Wikimedia descriptions usually identify the original author directly, which
  // avoids mistaking a translator or editor returned by book catalogs for the author.
  const descriptionMatch = summary?.description?.match(/\bby\s+([^.!?]+)/i);
  const match = descriptionMatch ?? summary?.extract?.match(/\b(?:a|an)\s+[^.!?]*?\bby\s+([^.!?]+)/i);
  if (!match) return undefined;

  const author = match.at(1)
  if (!author) return undefined;

  const cleanedAuthor = author
    .trim()
    .replace(/^(?:the\s+)?(?:[a-z-]+\s+)?(?:author|writer|poet|novelist)\s+/i, "")
    .trim();

  return cleanedAuthor.split(/\s+/).length <= 6 ? cleanedAuthor : undefined;
}

function normalizeBookTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePersonName(value: string) {
  return normalizeBookTitle(value)
    .replace(/^(fyodor|fedor)\s+/, "")
    .trim();
}

async function fetchGoogleBook(title: string) {
  const result = await fetchOpenLibrary<GoogleBooksResponse>(
    `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=1`,
  );
  return result?.items?.[0]?.volumeInfo;
}

async function fetchWikipediaBio(authorName: string) {
  const search = await fetchOpenLibrary<WikimediaSearchResponse>(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(authorName)}&limit=1`,
  );
  const key = search?.pages?.[0]?.key;
  return key
    ? fetchOpenLibrary<WikimediaSummary>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`,
      )
    : undefined;
}

async function fetchWikiquote(bookTitle: string, authorName?: string): Promise<BookQuote[] | undefined> {
  const titles = [bookTitle, authorName].filter((value): value is string => Boolean(value));
  const quotes: BookQuote[] = [];

  for (const title of titles) {
    const response = await fetchOpenLibrary<{
      query?: { pages?: Record<string, { extract?: string }> };
    }>(
      `https://en.wikiquote.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`,
    );
    const extract = Object.values(response?.query?.pages ?? {})[0]?.extract;
    const quoteLines = extract
      ?.split("\n")
      .map((line) => line.trim().replace(/^[-*]\s*/, ""))
      .filter((line) => /[“”\"]/.test(line) && line.length > 20 && line.length <= 240);

    for (const quoteLine of quoteLines ?? []) {
      if (!quotes.some((quote) => quote.text === quoteLine)) {
        quotes.push({
          text: quoteLine,
          source: "Wikiquote",
        });
      }
    }
  }

  return quotes.length > 0 ? quotes.slice(0, 8) : undefined;
}

async function fetchOpenLibrary<T>(url: string): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Evolve personal-development app" },
      next: { revalidate: 86_400 },
    });
    return response.ok ? ((await response.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}
