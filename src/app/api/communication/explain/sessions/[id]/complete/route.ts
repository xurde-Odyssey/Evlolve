import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before completing Explain Better." }, { status: 401 });
  try { return NextResponse.json({ session: await context.repository.completeExplainSession(context.user.id, (await params).id) }); } catch { return NextResponse.json({ error: "Explain Better session could not be completed." }, { status: 500 }); }
}
