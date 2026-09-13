import { NextResponse } from "next/server";
import { getConversationProvider } from "@/application/communication/providers";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationSessionSetup } from "@/types/communication";

export async function POST(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before starting a Communication session." }, { status: 401 });

  const setup = (await request.json()) as Partial<CommunicationSessionSetup>;
  if (![5, 10, 15, 20].includes(setup.targetDurationMinutes ?? 0) || !setup.inputMode || !setup.difficulty || !setup.conversationStyle) {
    return NextResponse.json({ error: "Communication session setup is incomplete." }, { status: 400 });
  }

  try {
    const session = await context.repository.createSession(context.user.id, setup as CommunicationSessionSetup);
    const assistant = await context.repository.appendMessage(context.user.id, session.id, {
      role: "ASSISTANT",
      content: await getConversationProvider().respond({ setup: setup as CommunicationSessionSetup, messages: [] }),
      inputSource: "SYSTEM",
    });
    return NextResponse.json({ session, messages: [assistant] });
  } catch {
    return NextResponse.json({ error: "The Communication session could not be started." }, { status: 500 });
  }
}
