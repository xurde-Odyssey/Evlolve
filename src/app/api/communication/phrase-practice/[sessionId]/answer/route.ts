import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationPracticeActivityType, CommunicationPracticeResult } from "@/types/communication";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before answering phrase practice." }, { status: 401 });
  const body = (await request.json()) as { phraseId?: string; activityType?: CommunicationPracticeActivityType; result?: CommunicationPracticeResult; response?: string };
  if (!body.phraseId || !body.activityType || !body.result) return NextResponse.json({ error: "Practice answer is incomplete." }, { status: 400 });
  try {
    const sessionId = (await params).sessionId;
    const answer = await context.repository.answerPractice(context.user.id, sessionId, { phraseId: body.phraseId, activityType: body.activityType, result: body.result, response: body.response });
    const value = body.result === "PASS" ? 88 : body.result === "PARTIAL" ? 64 : 22;
    await context.repository.recordSkillEvidence(context.user.id, { sourceModule: "PHRASE_BANK", dimension: body.activityType === "RECALL" ? "understanding" : "phraseUsage", value, confidence: body.result === "PASS" ? 0.78 : 0.58, difficulty: "NORMAL", evidenceType: body.activityType === "NATURAL_USAGE" || body.activityType === "CONVERSATION_USAGE" ? "PHRASE_USAGE" : "PHRASE_RECOGNITION", assistanceLevel: body.activityType === "NATURAL_USAGE" || body.activityType === "CONVERSATION_USAGE" ? "NONE" : "DIRECT_PROMPT", evidenceKey: `${sessionId}:${body.phraseId}:${answer.session.currentIndex}`, occurredAt: new Date().toISOString(), metadata: { activityType: body.activityType, result: body.result } });
    return NextResponse.json(answer);
  } catch { return NextResponse.json({ error: "Practice answer could not be recorded." }, { status: 500 }); }
}
