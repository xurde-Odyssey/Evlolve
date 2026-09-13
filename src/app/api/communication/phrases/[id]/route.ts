import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before viewing this phrase." }, { status: 401 });
  try { return NextResponse.json({ phrase: await context.repository.getPhrase(context.user.id, (await params).id) }); } catch { return NextResponse.json({ error: "Phrase not found." }, { status: 404 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before editing this phrase." }, { status: 401 });
  const body = (await request.json()) as { meaning?: string; example?: string; personalNote?: string; isArchived?: boolean };
  try { return NextResponse.json({ phrase: await context.repository.updatePhrase(context.user.id, (await params).id, body) }); } catch { return NextResponse.json({ error: "Phrase could not be updated." }, { status: 500 }); }
}
