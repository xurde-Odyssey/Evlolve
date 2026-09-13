import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import { getCommunicationProviderConfig } from "@/application/communication/config";
import { allowCommunicationRequest } from "@/application/communication/rate-limit";
import { getSpeechToTextProvider } from "@/application/communication/providers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before using voice input." }, { status: 401 });
  const sessionId = (await params).id;
  if (!allowCommunicationRequest(context.user.id, "transcribe", 12)) return NextResponse.json({ error: "Too many recordings. Please wait a moment and try again." }, { status: 429 });

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { transcript?: string };
    if (body.transcript?.trim()) return NextResponse.json({ sessionId, transcript: body.transcript.trim(), inputSource: "VOICE_TRANSCRIPT", rawAudioRetained: false });
    return NextResponse.json({ error: "A transcript or audio recording is required." }, { status: 400 });
  }

  if (!contentType.includes("multipart/form-data")) return NextResponse.json({ error: "Use an audio recording or transcript." }, { status: 415 });
  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) return NextResponse.json({ error: "Audio recording is required." }, { status: 400 });
  const config = getCommunicationProviderConfig();
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);
  if (durationSeconds && (!Number.isFinite(durationSeconds) || durationSeconds > config.audioMaxSeconds)) return NextResponse.json({ error: `Recordings must be shorter than ${config.audioMaxSeconds} seconds.` }, { status: 413 });
  if (file.size > config.audioMaxMb * 1024 * 1024) return NextResponse.json({ error: `Audio must be smaller than ${config.audioMaxMb} MB.` }, { status: 413 });
  if (!file.type.startsWith("audio/")) return NextResponse.json({ error: "Unsupported audio format." }, { status: 415 });

  try {
    const transcript = await getSpeechToTextProvider().transcribe({ audio: file, language: "en" });
    return NextResponse.json({ sessionId, transcript, inputSource: "VOICE_TRANSCRIPT", rawAudioRetained: false });
  } catch {
    return NextResponse.json({ error: "We couldn't transcribe that recording. Try again or type your response." }, { status: 503 });
  }
}
