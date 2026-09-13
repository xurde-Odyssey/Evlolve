import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before requesting a hint." }, { status: 401 });
  try {
    const item = await context.repository.getMeaningItem(context.user.id, (await params).id);
    return NextResponse.json({ hint: item.content.shortMeaning });
  } catch { return NextResponse.json({ error: "A hint is not available right now." }, { status: 404 }); }
}
