import { NextResponse } from "next/server";
import { recommendCommunicationPractice } from "@/application/communication/recommendation";
import { scoreCommunicationSkills } from "@/application/communication/scoring";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function GET() {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in to view Communication recommendations." }, { status: 401 });
  try { const inputs = await context.repository.getCommunicationProgressInputs(context.user.id); return NextResponse.json(recommendCommunicationPractice({ weakest: scoreCommunicationSkills(inputs.evidence).weakest, summary: inputs.summary })); } catch { return NextResponse.json({ error: "Recommendation could not be loaded." }, { status: 500 }); }
}
