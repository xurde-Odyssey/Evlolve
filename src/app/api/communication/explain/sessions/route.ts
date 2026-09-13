import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import { buildExplainTasks } from "@/application/communication/explain";
import type { CommunicationDifficulty, CommunicationExplainInputMode, CommunicationExplainPracticeType } from "@/types/communication";

export async function POST(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before starting Explain Better." }, { status: 401 });
  const body = (await request.json()) as { practiceType?: CommunicationExplainPracticeType; difficulty?: CommunicationDifficulty; inputMode?: CommunicationExplainInputMode };
  const practiceType = body.practiceType ?? "MIXED";
  const difficulty = body.difficulty ?? "ADAPTIVE";
  const inputMode = body.inputMode ?? "VOICE_TEXT";
  if (!["MIXED", "SITUATION", "IDEA", "STORY", "OPINION"].includes(practiceType) || !["ADAPTIVE", "EASY", "NORMAL", "CHALLENGING"].includes(difficulty) || !["VOICE_TEXT", "TEXT_ONLY"].includes(inputMode)) return NextResponse.json({ error: "Explain Better setup is invalid." }, { status: 400 });
  try { return NextResponse.json(await context.repository.createExplainSession(context.user.id, { practiceType, difficulty, inputMode }, buildExplainTasks(practiceType, difficulty)), { status: 201 }); } catch { return NextResponse.json({ error: "Explain Better session could not start." }, { status: 500 }); }
}
