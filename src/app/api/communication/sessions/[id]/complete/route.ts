import { NextResponse } from "next/server";
import { getConversationProvider, phraseCandidatesFor } from "@/application/communication/providers";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationSessionReview } from "@/types/communication";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before completing a Communication session." }, { status: 401 });
  const sessionId = (await params).id;
  try {
    const current = await context.repository.getSession(context.user.id, sessionId);
    const setup = { targetDurationMinutes: current.session.targetDurationMinutes as 5 | 10 | 15 | 20, inputMode: current.session.inputMode, difficulty: current.session.difficulty, conversationStyle: current.session.conversationStyle };
    const skillObservations = await getConversationProvider().analyze({ setup, messages: current.messages });
    const review: CommunicationSessionReview = { session: { ...current.session, status: current.messages.filter((message) => message.role === "USER").length >= 1 ? "COMPLETED" : "INCOMPLETE", messageCount: current.messages.length, summary: "A provisional review is ready. More sessions will make these observations more reliable." }, strengths: current.messages.filter((message) => message.role === "USER").length >= 2 ? ["You kept the exchange moving by responding with enough detail to create a follow-up."] : [], improvements: current.messages.filter((message) => message.role === "USER").length < 2 ? ["Try completing a few more turns next time so the conversation produces stronger evidence."] : ["Add one reason or example when an answer feels brief; it makes the conversation flow more naturally."], corrections: [], phraseCandidates: phraseCandidatesFor(current.messages), skillObservations };
    const session = await context.repository.completeSession(context.user.id, sessionId, review);
    for (const [dimension, observation] of Object.entries(skillObservations)) {
      if (!observation || observation.score === null) continue;
      await context.repository.recordSkillEvidence(context.user.id, { sessionId, sourceModule: "DAILY_CONVERSATION", dimension: dimension as keyof typeof skillObservations & string, value: observation.score, confidence: observation.confidence, difficulty: current.session.difficulty, evidenceType: "SESSION_OBSERVATION", assistanceLevel: "NONE", evidenceKey: `${sessionId}:${dimension}`, occurredAt: session.endedAt ?? new Date().toISOString(), metadata: { evidenceCount: observation.evidenceCount } });
    }
    return NextResponse.json({ ...review, session });
  } catch {
    return NextResponse.json({ error: "The session review could not be generated." }, { status: 500 });
  }
}
