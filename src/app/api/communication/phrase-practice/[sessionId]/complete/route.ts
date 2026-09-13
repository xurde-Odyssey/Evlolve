import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before completing phrase practice." }, { status: 401 });
  try { return NextResponse.json({ session: await context.repository.completePractice(context.user.id, (await params).sessionId) }); } catch { return NextResponse.json({ error: "Phrase practice could not be completed." }, { status: 500 }); }
}
