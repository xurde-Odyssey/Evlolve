import { NextResponse } from "next/server";
import { lookupBookMetadata } from "@/lib/books/open-library";

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title")?.trim();
  if (!title) {
    return NextResponse.json({ error: "Book title is required." }, { status: 400 });
  }

  const metadata = await lookupBookMetadata(title);
  return NextResponse.json({ metadata: metadata ?? null });
}
