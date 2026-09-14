import "server-only";

import type { CryptoComparisonPeriod, CryptoMarketItem, FootballLeague, FootballMatch, MarketNewsItem, MarketsData, MarketsPeriod, MarketsTab, SportsMarketData, SportsRange } from "@/types/markets";

const requestTimeoutMs = 8_000;

export async function getMarketsData(tab: MarketsTab, period: MarketsPeriod = "1d"): Promise<MarketsData> {
  const fetchedAt = new Date().toISOString();
  if (tab === "news") {
    const [newsResult, cryptoResult] = await Promise.allSettled([getNews(), getCrypto("1d")]);
    return { tab, fetchedAt, news: newsResult.status === "fulfilled" ? newsResult.value : [], hotItems: cryptoResult.status === "fulfilled" ? topGainers(cryptoResult.value) : [] };
  }
  if (tab === "crypto") {
    const [cryptoResult] = await Promise.allSettled([getCrypto(period as CryptoComparisonPeriod)]);
    const crypto = cryptoResult.status === "fulfilled" ? cryptoResult.value : [];
    return { tab, fetchedAt, crypto, hotItems: topGainers(crypto), warning: cryptoResult.status === "rejected" ? "Crypto data is temporarily unavailable. Try refreshing in a moment." : undefined };
  }
  const [sportsResult, cryptoResult] = await Promise.allSettled([getSports(period as SportsRange), getCrypto("1d")]);
  return { tab, fetchedAt, sports: sportsResult.status === "fulfilled" ? sportsResult.value : { matches: [], leagues: footballLeagues.map((league) => ({ name: league.name, matchCount: 0 })) }, hotItems: cryptoResult.status === "fulfilled" ? topGainers(cryptoResult.value) : [] };
}

async function getNews(): Promise<MarketNewsItem[]> {
  const feeds = [
    { source: "OnlineKhabar", url: "https://onlinekhabar.com/feed", language: "ne" as const },
    { source: "Setopati", url: "https://setopati.com/feed", language: "ne" as const },
    { source: "Ratopati", url: "https://ratopati.com/feed", language: "ne" as const },
    { source: "Artha Sarokar", url: "https://arthasarokar.com/feed", language: "ne" as const },
    { source: "Nepal News", url: "https://english.nepalnews.com/s/author/rss/", language: "en" as const },
  ];
  const results = await Promise.allSettled([
    getJson<{ hits?: Array<{ objectID?: string; title?: string; url?: string; created_at?: string }> }>("https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=6").then((payload) => (payload.hits ?? []).filter((item) => item.title && item.url).map((item) => ({ id: item.objectID ?? item.url!, title: item.title!, url: item.url!, source: sourceFromUrl(item.url!), publishedAt: item.created_at, language: "en" as const }))),
    ...feeds.map((feed) => getText(feed.url).then((xml) => parseFeed(xml, feed.source, feed.language))),
  ]);
  const items = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set<string>();
  return items.filter((item) => { const key = item.url || item.title.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "")).slice(0, 16);
}

async function getCrypto(period: CryptoComparisonPeriod): Promise<CryptoMarketItem[]> {
  const providerPeriod = period === "6m" ? "200d" : period === "1d" ? "24h" : period;
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h,${providerPeriod}`;
  const payload = await getJson<Array<{ id: string; name: string; symbol: string; image?: string; current_price?: number; price_change_percentage_24h?: number; market_cap?: number }>>(url);
  const sixMonthChanges = period === "6m" ? await getSixMonthChanges(payload.map((item) => item.id)) : new Map<string, number>();
  return payload.map((item) => ({ id: item.id, name: item.name, symbol: item.symbol, image: item.image, priceUsd: item.current_price ?? 0, change24h: item.price_change_percentage_24h, comparisonChange: sixMonthChanges.get(item.id) ?? (item as { [key: `${string}_in_currency`]: number | undefined })[`${providerPeriod}_in_currency`], marketCap: item.market_cap }));
}

async function getSixMonthChanges(ids: string[]) {
  const results = await Promise.allSettled(ids.map(async (id) => {
    const payload = await getJson<{ prices?: Array<[number, number]> }>(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=180&interval=daily`);
    const prices = payload.prices ?? [];
    const first = prices[0]?.[1];
    const last = prices.at(-1)?.[1];
    return typeof first === "number" && typeof last === "number" && first > 0 ? [id, ((last - first) / first) * 100] as const : null;
  }));
  return new Map(results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []));
}

const footballLeagues: Array<{ name: FootballLeague; code: string }> = [
  { name: "Premier League", code: "eng.1" },
  { name: "La Liga", code: "esp.1" },
  { name: "Serie A", code: "ita.1" },
  { name: "Bundesliga", code: "ger.1" },
  { name: "Ligue 1", code: "fra.1" },
  { name: "UEFA Champions League", code: "uefa.champions" },
];

async function getSports(range: SportsRange): Promise<SportsMarketData> {
  const today = new Date();
  const end = new Date(today);
  if (range === "7d") end.setDate(today.getDate() + 7);
  const dates = `${formatDateForProvider(today)}-${formatDateForProvider(end)}`;
  const results = await Promise.allSettled(footballLeagues.map(async (league) => {
    const payload = await getJson<EspnScoreboard>(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard?limit=30&dates=${dates}`);
    const matches = await Promise.all((payload.events ?? []).slice(0, 8).map(async (event): Promise<FootballMatch | null> => {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((team) => team.homeAway === "home");
      const away = competition?.competitors?.find((team) => team.homeAway === "away");
      if (!event.id || !event.date || !home?.team?.displayName || !away?.team?.displayName) return null;
      return { id: `${league.code}-${event.id}`, league: league.name, homeTeam: home.team.displayName, awayTeam: away.team.displayName, homeScore: home.score, awayScore: away.score, status: event.status?.type?.shortDetail ?? event.status?.type?.description ?? "Scheduled", kickoff: event.date, venue: competition?.venue?.fullName, probabilities: await getMatchProbabilities(league.code, event.id) };
    }));
    return matches.filter((match): match is FootballMatch => match !== null);
  }));
  const matches = results.flatMap((result) => result.status === "fulfilled" ? result.value : []).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  return { matches, leagues: footballLeagues.map((league) => ({ name: league.name, matchCount: matches.filter((match) => match.league === league.name).length })) };
}

type EspnScoreboard = {
  events?: Array<{
    id?: string;
    date?: string;
    status?: { type?: { shortDetail?: string; description?: string } };
    competitions?: Array<{
      venue?: { fullName?: string };
      competitors?: Array<{ homeAway?: string; team?: { displayName?: string }; score?: string }>;
    }>;
  }>;
};

type EspnSummary = {
  pickcenter?: Array<{
    provider?: { name?: string };
    moneyline?: {
      home?: { close?: { odds?: string } };
      draw?: { close?: { odds?: string } };
      away?: { close?: { odds?: string } };
    };
  }>;
};

function topGainers(items: CryptoMarketItem[]) {
  return items.filter((item) => typeof item.change24h === "number").sort((a, b) => (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity)).slice(0, 3);
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" }, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml: string, source: string, language: "en" | "ne"): MarketNewsItem[] {
  const entries = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return entries.map((entry, index) => {
    const title = decodeXml(readTag(entry, "title"));
    const link = decodeXml(readTag(entry, "link")) || entry.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";
    const publishedAt = readTag(entry, "pubDate") || readTag(entry, "published") || readTag(entry, "updated");
    return { id: `${source}-${index}-${link || title}`, title, url: link, source, publishedAt, language };
  }).filter((item) => item.title && item.url);
}

function readTag(value: string, tag: string) { return value.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() ?? ""; }
function decodeXml(value: string) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function formatDateForProvider(value: Date) { return value.toISOString().slice(0, 10).replaceAll("-", ""); }

async function getMatchProbabilities(league: string, eventId: string) {
  try {
    const summary = await getJson<EspnSummary>(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${eventId}`);
    const market = summary.pickcenter?.[0];
    if (!market) return undefined;
    const home = parseAmericanOdds(market?.moneyline?.home?.close?.odds);
    const draw = parseAmericanOdds(market?.moneyline?.draw?.close?.odds);
    const away = parseAmericanOdds(market?.moneyline?.away?.close?.odds);
    if (home === undefined || draw === undefined || away === undefined) return undefined;
    return normalizedProbabilities(home, draw, away, market.provider?.name ?? "Market odds");
  } catch {
    return undefined;
  }
}

function parseAmericanOdds(value?: string) { if (!value) return undefined; const parsed = Number(value.replace("+", "")); return Number.isFinite(parsed) ? parsed : undefined; }
function normalizedProbabilities(home: number, draw: number, away: number, source: string) { const implied = [moneylineProbability(home), moneylineProbability(draw), moneylineProbability(away)]; const total = implied.reduce((sum, value) => sum + value, 0); const [homeProbability, drawProbability, awayProbability] = implied; if (!total || homeProbability === undefined || drawProbability === undefined || awayProbability === undefined) return undefined; return { home: Math.round((homeProbability / total) * 100), draw: Math.round((drawProbability / total) * 100), away: Math.round((awayProbability / total) * 100), source }; }

function moneylineProbability(value: number) { return value >= 0 ? 100 / (value + 100) : -value / (-value + 100); }

function sourceFromUrl(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "External source"; }
}
