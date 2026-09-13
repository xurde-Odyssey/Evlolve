import { NextResponse } from "next/server";
import { analyzeExplanation } from "@/application/communication/explain";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationMessageInputSource } from "@/types/communication";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before submitting an explanation." }, { status: 401 });
  const body = (await request.json()) as { transcript?: string; inputSource?: CommunicationMessageInputSource; usedHints?: string[] };
  if (!body.transcript?.trim()) return NextResponse.json({ error: "Add an explanation before submitting." }, { status: 400 });
  try {
    const taskId = (await params).id;
    const task = await context.repository.getExplainTask(context.user.id, taskId);
    const analysis = analyzeExplanation(body.transcript, task);
    const attempt = await context.repository.analyzeExplainAttempt(context.user.id, taskId, { transcript: body.transcript, inputSource: body.inputSource === "VOICE_TRANSCRIPT" ? "VOICE_TRANSCRIPT" : "TEXT", usedHints: body.usedHints ?? [] }, analysis);
    const assistanceLevel = body.usedHints?.length ? body.usedHints.length > 1 ? "STRONG_HINT" : "LIGHT_HINT" : "NONE";
    const metrics = [["explanationClarity", analysis.clarity], ["wordChoice", analysis.wordChoice], ["fluency", analysis.fluency], ["conversationFlow", analysis.structure]] as const;
    for (const [dimension, metric] of metrics) {
      if (metric.value === null) continue;
      await context.repository.recordSkillEvidence(context.user.id, { sourceModule: "EXPLAIN_BETTER", dimension, value: metric.value, confidence: metric.confidence, difficulty: task.difficulty, evidenceType: analysis.corrections.length && dimension === "wordChoice" ? "NATURAL_WORD_CHOICE" : dimension === "explanationClarity" ? "STRUCTURED_EXPLANATION" : "SESSION_OBSERVATION", assistanceLevel, evidenceKey: `${attempt.id}:${dimension}`, occurredAt: attempt.submittedAt, metadata: { attemptId: attempt.id, evidenceCount: metric.evidenceCount } });
    }
    return NextResponse.json({ attempt });
  } catch { return NextResponse.json({ error: "The explanation could not be analyzed. Your response can be submitted again." }, { status: 500 }); }
}
