import { NextResponse } from "next/server";
import { getCommunicationBossCandidate } from "@/application/communication/boss";
import { buildCommunicationInsight, scoreCommunicationSkills } from "@/application/communication/scoring";
import { getCommunicationContext } from "@/application/communication/server/auth";
import type { CommunicationProgressData } from "@/types/communication";

export async function GET() {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in to view Communication challenges." }, { status: 401 });
  try {
    const inputs = await context.repository.getCommunicationProgressInputs(context.user.id);
    const scored = scoreCommunicationSkills(inputs.evidence);
    const data: CommunicationProgressData = { dimensions: scored.dimensions, overallScore: scored.overallScore, overallBand: scored.overallBand, strongest: scored.strongest, weakest: scored.weakest, history: inputs.snapshots, summary: inputs.summary, insight: buildCommunicationInsight(scored) };
    return NextResponse.json({ eligible: getCommunicationBossCandidate(data) !== null, challenge: getCommunicationBossCandidate(data) });
  } catch { return NextResponse.json({ error: "Communication challenge eligibility could not be loaded." }, { status: 500 }); }
}
