import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function POST(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before starting phrase practice." }, { status: 401 });
  const body = (await request.json()) as { limit?: 5 | 10 | "ALL" };
  const limit = body.limit === "ALL" ? 10 : body.limit === 10 ? 10 : 5;
  try { return NextResponse.json(await context.repository.startPractice(context.user.id, limit)); } catch { return NextResponse.json({ error: "Phrase practice could not start." }, { status: 500 }); }
}
