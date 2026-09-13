import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationPhraseEventType } from "@/types/communication";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before saving a phrase." }, { status: 401 });
  const body = (await request.json()) as { phraseId?: string; phrase?: string; meaning?: string; example?: string; eventType?: CommunicationPhraseEventType };
  if ((!body.phraseId && !body.phrase) || !body.eventType) return NextResponse.json({ error: "Phrase event is incomplete." }, { status: 400 });
  try {
    const sessionId = (await params).id;
    const savedPhrase = body.phraseId
      ? { phrase: await context.repository.getPhrase(context.user.id, body.phraseId), created: false }
      : await context.repository.createPhrase(context.user.id, { phrase: body.phrase!, meaning: body.meaning, example: body.example, sourceType: "CONVERSATION", sourceSessionId: sessionId });
    const phrase = await context.repository.savePhraseEvent(context.user.id, sessionId, savedPhrase.phrase.id, body.eventType);
    return NextResponse.json({ saved: true, phrase });
  } catch {
    return NextResponse.json({ error: "The phrase could not be saved yet." }, { status: 500 });
  }
}
