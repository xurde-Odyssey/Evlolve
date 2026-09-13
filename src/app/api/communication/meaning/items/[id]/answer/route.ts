import { NextResponse } from "next/server";
import { evaluateMeaningAnswer } from "@/application/communication/meaning";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationMessageInputSource } from "@/types/communication";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before answering meaning practice." }, { status: 401 });
  const body = (await request.json()) as { response?: string; responseMode?: CommunicationMessageInputSource; confidence?: "SURE" | "NOT_SURE"; usedHint?: boolean; timeTakenMs?: number };
  if (!body.response?.trim() || !body.responseMode || !["TEXT", "VOICE_TRANSCRIPT"].includes(body.responseMode)) return NextResponse.json({ error: "Meaning answer is incomplete." }, { status: 400 });
  try {
    const item = await context.repository.getMeaningItem(context.user.id, (await params).id);
    const result = evaluateMeaningAnswer(item, body.response);
    const attempt = await context.repository.answerMeaningItem(context.user.id, item.id, { response: body.response, responseMode: body.responseMode, correctness: result.correctness, confidence: body.confidence, usedHint: body.usedHint === true, timeTakenMs: body.timeTakenMs }, result.analysis);
    const value = result.correctness === "CORRECT" ? 92 : result.correctness === "PARTIAL" ? 68 : 24;
    const confidence = body.confidence === "NOT_SURE" ? 0.58 : 0.82;
    const assistanceLevel = body.usedHint ? "LIGHT_HINT" : "NONE";
    await context.repository.recordSkillEvidence(context.user.id, { sessionId: item.sessionId, sourceModule: "UNDERSTAND_MEANING", dimension: "understanding", value, confidence, difficulty: item.difficulty, evidenceType: item.questionType === "REALLY_SAYING" ? "CONTEXTUAL_INFERENCE" : "PHRASE_RECOGNITION", assistanceLevel, evidenceKey: `${attempt.id}:understanding`, occurredAt: attempt.createdAt, metadata: { correctness: result.correctness, confidence: body.confidence ?? "SURE" } });
    await context.repository.recordSkillEvidence(context.user.id, { sessionId: item.sessionId, sourceModule: "UNDERSTAND_MEANING", dimension: "phraseUsage", value: Math.max(20, value - 8), confidence: confidence * 0.9, difficulty: item.difficulty, evidenceType: "PHRASE_RECOGNITION", assistanceLevel, evidenceKey: `${attempt.id}:phraseUsage`, occurredAt: attempt.createdAt, metadata: { correctness: result.correctness } });
    return NextResponse.json({ attempt, result });
  } catch { return NextResponse.json({ error: "Meaning answer could not be recorded." }, { status: 500 }); }
}
