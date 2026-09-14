export type MarketsTab = "news" | "crypto" | "sports";
export type CryptoComparisonPeriod = "1d" | "7d" | "6m" | "1y";
export type SportsRange = "1d" | "7d";
export type MarketsPeriod = CryptoComparisonPeriod | SportsRange;

export type MarketNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  language?: "en" | "ne";
};

export type CryptoMarketItem = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  priceUsd: number;
  change24h?: number;
  comparisonChange?: number;
  marketCap?: number;
};

export type FootballLeague = "Premier League" | "La Liga" | "Serie A" | "Bundesliga" | "Ligue 1" | "UEFA Champions League";

export type FootballMatch = {
  id: string;
  league: FootballLeague;
  homeTeam: string;
  awayTeam: string;
  homeScore?: string;
  awayScore?: string;
  status: string;
  kickoff: string;
  venue?: string;
  probabilities?: {
    home: number;
    draw: number;
    away: number;
    source: string;
  };
};

export type SportsBestPick = {
  matchId: string;
  league: FootballLeague;
  homeTeam: string;
  awayTeam: string;
  selection: "home" | "draw" | "away";
  selectionLabel: string;
  probability: number;
  kickoff: string;
  source: string;
};

export type SportsMarketData = {
  matches: FootballMatch[];
  leagues: Array<{ name: FootballLeague; matchCount: number }>;
  bestPicks: SportsBestPick[];
};

export type MarketsData = {
  tab: MarketsTab;
  fetchedAt: string;
  news?: MarketNewsItem[];
  crypto?: CryptoMarketItem[];
  hotItems?: CryptoMarketItem[];
  sports?: SportsMarketData;
  warning?: string;
};
