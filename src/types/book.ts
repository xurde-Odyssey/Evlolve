export type BookStatus = "reading" | "completed";

export type Book = {
  id: string;
  title: string;
  totalPages: number;
  startedAt: string;
  finishedAt?: string;
  status: BookStatus;
};
