export type BookStatus = "reading" | "completed";

export type BookMetadata = {
  source: "OPEN_LIBRARY" | "GOOGLE_BOOKS" | "WIKIMEDIA";
  workId?: string;
  authorId?: string;
  authorName?: string;
  biography?: string;
  description?: string;
  otherWorks: string[];
  coverUrl?: string;
  sourceUrl?: string;
  quote?: {
    text: string;
    source: string;
  };
  fetchedAt: string;
};

export type Book = {
  id: string;
  title: string;
  totalPages: number;
  startedAt: string;
  finishedAt?: string;
  status: BookStatus;
  metadata?: BookMetadata;
};
