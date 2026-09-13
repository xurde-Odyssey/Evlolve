import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";
import { communicationActivityLogInput } from "@/application/communication/progression";
import { logActivityAuthoritatively } from "@/application/evolve/server/commands";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before completing meaning practice." }, { status: 401 });
  try {
    const session = await context.repository.completeMeaningSession(context.user.id, (await params).id);
    const durationSeconds = Math.max(0, Math.round((Date.parse(session.endedAt ?? new Date().toISOString()) - Date.parse(session.startedAt)) / 1000));
    const activityInput = session.status === "COMPLETED" ? communicationActivityLogInput(session.id, { module: "UNDERSTAND_MEANING", durationSeconds, meaningfulUnits: session.completedItemCount, endedAt: session.endedAt ?? new Date().toISOString() }) : null;
    const outcome = activityInput ? await logActivityAuthoritatively(activityInput) : undefined;
    return NextResponse.json({ session, progression: { credited: Boolean(outcome?.ok), xpAwarded: outcome?.ok ? outcome.data.xpAwarded : 0 } });
  } catch { return NextResponse.json({ error: "Meaning session could not be completed." }, { status: 500 }); }
}
