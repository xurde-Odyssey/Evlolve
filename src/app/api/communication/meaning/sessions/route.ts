import { NextResponse } from "next/server";
import { buildMeaningItems } from "@/application/communication/meaning";
import { normalizePhrase } from "@/application/communication/mastery";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationDifficulty, CommunicationInputMode } from "@/types/communication";

const difficulties = new Set<CommunicationDifficulty>(["ADAPTIVE", "EASY", "NORMAL", "CHALLENGING"]);

export async function POST(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before starting Understand Meaning." }, { status: 401 });
  const body = (await request.json()) as { difficulty?: CommunicationDifficulty; inputMode?: CommunicationInputMode; targetItemCount?: number };
  if (!body.difficulty || !difficulties.has(body.difficulty) || !body.inputMode || !["VOICE_TEXT", "TEXT_ONLY"].includes(body.inputMode)) return NextResponse.json({ error: "Meaning practice setup is incomplete." }, { status: 400 });
  const targetItemCount = body.targetItemCount === 5 || body.targetItemCount === 12 ? body.targetItemCount : 8;
  try {
    const phrases = await context.repository.listPhrases(context.user.id);
    const phraseIds = new Map(phrases.map((phrase) => [normalizePhrase(phrase.phrase), phrase.id]));
    const items = buildMeaningItems(body.difficulty, targetItemCount).map((item) => ({ ...item, phraseId: item.content.phrase ? phraseIds.get(normalizePhrase(item.content.phrase)) : undefined }));
    return NextResponse.json(await context.repository.createMeaningSession(context.user.id, { difficulty: body.difficulty, inputMode: body.inputMode, targetItemCount }, items));
  } catch { return NextResponse.json({ error: "Understand Meaning could not start." }, { status: 500 }); }
}
