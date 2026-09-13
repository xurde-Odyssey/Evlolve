import { NextResponse } from "next/server";
import { buildCommunicationInsight, makeSnapshot, scoreCommunicationSkills } from "@/application/communication/scoring";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationProgressData } from "@/types/communication";

export async function GET() {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in to view Communication progress." }, { status: 401 });
  try {
    const inputs = await context.repository.getCommunicationProgressInputs(context.user.id);
    const scored = scoreCommunicationSkills(inputs.evidence);
    const now = new Date().toISOString();
    await context.repository.saveCommunicationProfile(context.user.id, scored.dimensions, scored.overallScore, scored.overallBand);
    const today = now.slice(0, 10);
    if (!inputs.snapshots.some((snapshot) => snapshot.capturedAt.slice(0, 10) === today)) await context.repository.saveCommunicationSnapshots(context.user.id, scored.dimensions.map((dimension) => makeSnapshot(crypto.randomUUID(), dimension, now)));
    const data: CommunicationProgressData = { dimensions: scored.dimensions, overallScore: scored.overallScore, overallBand: scored.overallBand, strongest: scored.strongest, weakest: scored.weakest, history: [...inputs.snapshots, ...scored.dimensions.map((dimension) => makeSnapshot(`current-${dimension.dimension}`, dimension, now))], summary: inputs.summary, insight: buildCommunicationInsight(scored) };
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Communication progress could not be loaded." }, { status: 500 }); }
}
