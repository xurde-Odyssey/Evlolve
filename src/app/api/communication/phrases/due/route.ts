import { NextResponse } from "next/server";
import { getCommunicationContext } from "@/application/communication/server/auth";

export async function GET(request: Request) {
  const context = await getCommunicationContext();
  if (!context) return NextResponse.json({ error: "Sign in before viewing due phrases." }, { status: 401 });
  const limit = Math.min(10, Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 5)));
  try { return NextResponse.json({ phrases: await context.repository.listDuePhrases(context.user.id, Number.isFinite(limit) ? limit : 5) }); } catch { return NextResponse.json({ error: "Due phrases could not be loaded." }, { status: 500 }); }
}
