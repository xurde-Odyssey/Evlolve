import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before viewing a Communication review." }, { status: 401 });
  try {
    const data = await context.repository.getSession(context.user.id, (await params).id);
    return NextResponse.json(data.review ? { ...data.review, session: data.session } : data);
  } catch {
    return NextResponse.json({ error: "Communication review not found." }, { status: 404 });
  }
}
