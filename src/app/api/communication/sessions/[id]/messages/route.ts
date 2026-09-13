import { NextResponse } from "next/server";
import { getConversationProvider } from "@/application/communication/providers";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationMessageInputSource } from "@/types/communication";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before sending a message." }, { status: 401 });
  const sessionId = (await params).id;
  const body = (await request.json()) as { content?: string; inputSource?: CommunicationMessageInputSource };
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Message content is required." }, { status: 400 });

  try {
    const current = await context.repository.getSession(context.user.id, sessionId);
    if (current.session.status !== "ACTIVE") return NextResponse.json({ error: "This session is no longer active." }, { status: 409 });
    const userMessage = await context.repository.appendMessage(context.user.id, sessionId, { role: "USER", content, inputSource: body.inputSource === "VOICE_TRANSCRIPT" ? "VOICE_TRANSCRIPT" : "TEXT" });
    const messages = [...current.messages, userMessage];
    const assistantMessage = await context.repository.appendMessage(context.user.id, sessionId, { role: "ASSISTANT", content: await getConversationProvider().respond({ setup: { targetDurationMinutes: current.session.targetDurationMinutes as 5 | 10 | 15 | 20, inputMode: current.session.inputMode, difficulty: current.session.difficulty, conversationStyle: current.session.conversationStyle }, messages }), inputSource: "SYSTEM" });
    return NextResponse.json({ userMessage, assistantMessage });
  } catch {
    return NextResponse.json({ error: "The message could not be sent. You can continue in text mode." }, { status: 500 });
  }
}
