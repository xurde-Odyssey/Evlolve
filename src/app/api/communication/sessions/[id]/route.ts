import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before viewing a Communication session." }, { status: 401 });
  try {
    return NextResponse.json(await context.repository.getSession(context.user.id, (await params).id));
  } catch {
    return NextResponse.json({ error: "Communication session not found." }, { status: 404 });
  }
}
