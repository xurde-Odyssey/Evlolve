import { NextResponse } from "next/server";
import { getMarketsData } from "@/application/markets/data";
import type { CryptoComparisonPeriod, MarketsPeriod, MarketsTab, SportsRange } from "@/types/markets";

const tabs: MarketsTab[] = ["news", "crypto", "sports"];
const comparisonPeriods: CryptoComparisonPeriod[] = ["1d", "7d", "6m", "1y"];
const sportsRanges: SportsRange[] = ["1d", "7d"];

export async function GET(request: Request) {
  const tab = new URL(request.url).searchParams.get("tab") as MarketsTab | null;
  const periodValue = new URL(request.url).searchParams.get("period") as MarketsPeriod | null;
  const period = tab === "sports"
    ? periodValue && sportsRanges.includes(periodValue as SportsRange) ? periodValue as SportsRange : "1d"
    : periodValue && comparisonPeriods.includes(periodValue as CryptoComparisonPeriod) ? periodValue as CryptoComparisonPeriod : "1d";
  if (!tab || !tabs.includes(tab)) return NextResponse.json({ error: "Choose a valid markets tab." }, { status: 400 });
  try {
    return NextResponse.json(await getMarketsData(tab, period), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ tab, fetchedAt: new Date().toISOString(), warning: "This feed is temporarily unavailable. Try refreshing in a moment." }, { status: 503 });
  }
}
