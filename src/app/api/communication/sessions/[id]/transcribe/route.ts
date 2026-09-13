import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before using voice input." }, { status: 401 });
  void params;
  const body = (await request.json()) as { transcript?: string };
  if (body.transcript?.trim()) return NextResponse.json({ transcript: body.transcript.trim(), inputSource: "VOICE_TRANSCRIPT" });
  return NextResponse.json({ error: "Speech transcription is not configured yet. Continue in text mode." }, { status: 503 });
}
