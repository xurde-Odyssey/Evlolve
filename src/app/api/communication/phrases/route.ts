import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationPhraseSourceType } from "@/types/communication";

export async function GET() {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before viewing your Phrase Bank." }, { status: 401 });
  try { return NextResponse.json({ phrases: await context.repository.listPhrases(context.user.id) }); } catch { return NextResponse.json({ error: "Phrases could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before saving a phrase." }, { status: 401 });
  const body = (await request.json()) as { phrase?: string; meaning?: string; example?: string; personalNote?: string; sourceType?: CommunicationPhraseSourceType; sourceSessionId?: string };
  if (!body.phrase?.trim()) return NextResponse.json({ error: "Phrase is required." }, { status: 400 });
  try { return NextResponse.json(await context.repository.createPhrase(context.user.id, { ...body, phrase: body.phrase! }), { status: 201 }); } catch { return NextResponse.json({ error: "Phrase could not be saved." }, { status: 500 }); }
}
