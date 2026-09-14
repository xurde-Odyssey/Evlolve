"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, CircleDot, Newspaper, RefreshCw, Trophy, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { CryptoComparisonPeriod, CryptoMarketItem, FootballMatch, MarketNewsItem, MarketsData, MarketsPeriod, MarketsTab, SportsMarketData, SportsRange } from "@/types/markets";

type MarketTab = MarketsTab;

const tabs: Array<{ id: MarketTab; label: string; icon: typeof Newspaper }> = [
  { id: "news", label: "News", icon: Newspaper },
  { id: "crypto", label: "Crypto Markets", icon: WalletCards },
  { id: "sports", label: "Sports", icon: Trophy },
];
const comparisonPeriods: Array<{ id: CryptoComparisonPeriod; label: string }> = [
  { id: "1d", label: "1D" },
  { id: "7d", label: "7D" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
];
const sportsRanges: Array<{ id: SportsRange; label: string }> = [
  { id: "1d", label: "1D" },
  { id: "7d", label: "7D" },
];

export function MarketsNewsWorkspace() {
  const [activeTab, setActiveTab] = useState<MarketTab>("news");
  const [comparisonPeriod, setComparisonPeriod] = useState<CryptoComparisonPeriod>("1d");
  const [sportsRange, setSportsRange] = useState<SportsRange>("1d");
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]!;
  const ActiveIcon = active.icon;

  async function loadFeed(tab: MarketTab, isRefresh = false, requestedPeriod: MarketsPeriod = tab === "crypto" ? comparisonPeriod : sportsRange) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const period = tab === "news" ? "1d" : requestedPeriod;
      const response = await fetch(`/api/markets?tab=${tab}&period=${period}`, { cache: "no-store" });
      const result = await response.json() as MarketsData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? result.warning ?? "The feed could not be loaded.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The feed could not be loaded.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function selectTab(tab: MarketTab) {
    setActiveTab(tab);
    void loadFeed(tab);
  }

  function selectComparisonPeriod(period: CryptoComparisonPeriod) {
    setComparisonPeriod(period);
    if (activeTab === "crypto") void loadFeed("crypto", true, period);
  }

  function selectSportsRange(range: SportsRange) {
    setSportsRange(range);
    if (activeTab === "sports") void loadFeed("sports", true, range);
  }

  // The initial request intentionally runs once; tab changes are handled by selectTab.
  useEffect(() => {
    const timer = window.setTimeout(() => void loadFeed("news"), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">/markets</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">Markets &amp; News</h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">A clear place to follow Nepali news, digital assets, and top-flight football.</p>
        </div>
      </header>

      <nav aria-label="Markets and News sections" role="tablist" className="flex w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-soft)] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-selected={activeTab === id}
            role="tab"
            onClick={() => selectTab(id)}
            className={cn(
              "flex min-h-11 min-w-[9.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold text-[var(--foreground-muted)] transition-[background-color,color,box-shadow] duration-200 hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] sm:min-w-0",
              activeTab === id && "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[var(--shadow-soft)]",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <section aria-label="Market overview" className="grid gap-4 sm:grid-cols-3">
        <OverviewMetric label="Feed status" value={error ? "Unavailable" : loading ? "Loading" : "Live"} detail={error ?? "Fetched from the selected source"} />
        <OverviewMetric label="Active view" value={active.label} detail="Switch sections above" />
        <OverviewMetric label="Last updated" value={data ? formatTime(data.fetchedAt) : "Awaiting feed"} detail="Use refresh for current data" />
      </section>

      <section aria-label="Market overview" className={cn("grid gap-5", activeTab === "crypto" && "xl:grid-cols-[1.35fr_0.65fr]")}>
        <Card className="min-h-[22rem] overflow-hidden p-0">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]">
                <ActiveIcon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">{active.label}</h2>
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">Current data from the selected feed.</p>
              </div>
            </div>
            <button type="button" onClick={() => void loadFeed(activeTab, true)} disabled={loading || refreshing} aria-label="Refresh feed" className="grid size-9 place-items-center rounded-md border border-[var(--border)] text-[var(--foreground)] transition-[box-shadow,border-color] hover:border-[var(--foreground-muted)] hover:shadow-[var(--shadow-soft)] disabled:cursor-wait disabled:opacity-50">
              <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />
            </button>
          </div>
          {activeTab === "crypto" && <PeriodSelector label="Compare change" ariaLabel="Crypto comparison period" periods={comparisonPeriods} selected={comparisonPeriod} onSelect={selectComparisonPeriod} />}
          {activeTab === "sports" && <PeriodSelector label="Match window" ariaLabel="Sports match window" periods={sportsRanges} selected={sportsRange} onSelect={selectSportsRange} />}
          {error ? <FeedError message={error} onRetry={() => void loadFeed(activeTab, true)} /> : loading ? <FeedLoading /> : <FeedContent tab={activeTab} data={data} />}
        </Card>

        {activeTab === "crypto" && <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]">
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">Market movement</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Hot items</h2>
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">Top crypto gainers from the latest market snapshot.</p>
          <HotItems items={data?.hotItems ?? []} />
        </Card>}
      </section>
    </div>
  );
}

function FeedEmptyState({ tab }: { tab: MarketTab }) {
  const copy: Record<MarketTab, { title: string; description: string }> = {
    news: { title: "Your news feed is ready to be connected.", description: "Headlines and source context will be added here without filling the page with noise." },
    crypto: { title: "Crypto market data will appear here.", description: "A compact watchlist and market movement view will be added once a data provider is selected." },
    sports: { title: "Football match data will appear here.", description: "Fixtures and results from the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and the UEFA Champions League are shown here." },
  };
  return <div className="flex min-h-[17rem] flex-col items-center justify-center px-6 text-center"><div className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"><Newspaper aria-hidden="true" className="size-5" /></div><h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{copy[tab].title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">{copy[tab].description}</p></div>;
}

function FeedContent({ tab, data }: { tab: MarketTab; data: MarketsData | null }) {
  if (tab === "news") return <NewsList items={data?.news ?? []} />;
  if (tab === "crypto") return <CryptoList items={data?.crypto ?? []} />;
  return <SportsSummary data={data?.sports} />;
}

function NewsList({ items }: { items: MarketNewsItem[] }) {
  if (!items.length) return <FeedEmptyState tab="news" />;
  return <div className="divide-y divide-[var(--border)]">{items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block px-4 py-4 transition-colors hover:bg-[var(--surface-elevated)] sm:px-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold leading-6 text-[var(--foreground)]">{item.title}</h3><p className="mt-1 text-xs text-[var(--foreground-muted)]">{item.source} · {item.publishedAt ? formatRelativeTime(item.publishedAt) : "Recent"}</p></div><span aria-hidden="true" className="text-sm text-[var(--foreground-muted)]">↗</span></div></a>)}</div>;
}

function CryptoList({ items }: { items: CryptoMarketItem[] }) {
  if (!items.length) return <FeedEmptyState tab="crypto" />;
  return <div className="divide-y divide-[var(--border)]">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[10px] font-bold uppercase text-[var(--foreground)]">{item.symbol.slice(0, 3)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.name}</p><p className="text-xs uppercase text-[var(--foreground-muted)]">{item.symbol}</p></div></div><div className="text-right"><p className="text-sm font-semibold text-[var(--foreground)]">{formatUsd(item.priceUsd)}</p><p className="text-xs text-[var(--foreground-muted)]">{formatPercent(item.comparisonChange ?? item.change24h)}</p></div></div>)}</div>;
}

function SportsSummary({ data }: { data?: SportsMarketData }) {
  if (!data) return <FeedEmptyState tab="sports" />;
  if (!data.matches.length) return <div className="flex min-h-[17rem] flex-col items-center justify-center px-6 text-center"><div className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"><Trophy aria-hidden="true" className="size-5" /></div><h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">No matches in the next seven days.</h3><p className="mt-2 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">Refresh later for the latest fixtures and results across the five leagues.</p></div>;
  return <div className="space-y-5 p-4 sm:p-5">{data.leagues.map((league) => { const matches = data.matches.filter((match) => match.league === league.name); const logo = leagueLogo(league.name); return <section key={league.name} aria-labelledby={`league-${league.name}`}><div className="mb-2 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]"><span className="grid size-7 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[10px] font-bold tracking-normal text-[var(--foreground)]" aria-hidden="true">{logo ? <Image src={logo} alt="" width={20} height={20} className="size-5 object-contain" /> : leagueBadge(league.name)}</span><span id={`league-${league.name}`}>{league.name}</span></h3><span className="text-xs text-[var(--foreground-muted)]">{league.matchCount} {league.matchCount === 1 ? "match" : "matches"}</span></div>{matches.length ? <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">{matches.slice(0, 8).map((match) => <MatchRow key={match.id} match={match} />)}</div> : <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--foreground-muted)]">No scheduled matches in this window.</p>}</section>; })}</div>;
}

function MatchRow({ match }: { match: FootballMatch }) { return <div className="grid gap-2 px-3 py-3 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center"><div className="text-xs text-[var(--foreground-muted)]"><p>{formatMatchTime(match.kickoff)}</p><p className="mt-0.5">{match.status}</p></div><div className="min-w-0 text-sm"><p className="truncate font-semibold text-[var(--foreground)]">{match.homeTeam}</p><p className="mt-1 truncate text-[var(--foreground-muted)]">{match.awayTeam}</p></div><div className="text-left text-sm font-semibold text-[var(--foreground)] sm:text-right"><p>{match.homeScore ?? "–"}</p><p className="mt-1">{match.awayScore ?? "–"}</p></div></div>; }

function PeriodSelector<T extends { id: string; label: string }>({ label, ariaLabel, periods, selected, onSelect }: { label: string; ariaLabel: string; periods: T[]; selected: string; onSelect: (id: T["id"]) => void }) { return <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">{label}</p><div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-0.5" role="group" aria-label={ariaLabel}>{periods.map((period) => <button key={period.id} type="button" onClick={() => onSelect(period.id)} className={cn("min-h-8 rounded px-2.5 text-xs font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]", selected === period.id && "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)]")}>{period.label}</button>)}</div></div>; }

function leagueBadge(name: string) { return ({ "Premier League": "PL", "La Liga": "LL", "Serie A": "SA", Bundesliga: "BL", "Ligue 1": "L1", "UEFA Champions League": "UCL" } as Record<string, string>)[name] ?? <CircleDot aria-hidden="true" className="size-3.5" />; }
function leagueLogo(name: string) { return ({ "Premier League": "/Pl.jpg", "La Liga": "/LL.png", "Serie A": "/SA.png", Bundesliga: "/BL.jpg", "Ligue 1": "/L1.png", "UEFA Champions League": "/ucl.png" } as Record<string, string>)[name]; }

function HotItems({ items }: { items: CryptoMarketItem[] }) { return items.length ? <div className="space-y-2 border-t border-[var(--border)] pt-4">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.name}</p><p className="text-xs uppercase text-[var(--foreground-muted)]">{item.symbol}</p></div><div className="text-right"><p className="text-sm font-semibold text-[var(--foreground)]">{formatUsd(item.priceUsd)}</p><p className="text-xs font-semibold text-[var(--foreground-muted)]">{formatPercent(item.change24h)}</p></div></div>)}</div> : <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--foreground-muted)]">Top gainers are unavailable right now.</div>; }
function FeedLoading() { return <div className="space-y-3 p-5" aria-live="polite"><div className="h-14 animate-pulse rounded-md bg-[var(--surface-elevated)]" /><div className="h-14 animate-pulse rounded-md bg-[var(--surface-elevated)]" /><div className="h-14 animate-pulse rounded-md bg-[var(--surface-elevated)]" /></div>; }
function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex min-h-[17rem] flex-col items-center justify-center px-6 text-center"><p role="alert" className="text-sm font-semibold text-[var(--foreground)]">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--foreground-muted)]">Try again</button></div>; }

function OverviewMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">{label}</p><p className="text-lg font-semibold text-[var(--foreground)]">{value}</p><p className="text-xs text-[var(--foreground-muted)]">{detail}</p></Card>;
}

function formatTime(value: string) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function formatRelativeTime(value: string) { const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000)); return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`; }
function formatUsd(value: number) { return value >= 1 ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${value.toFixed(6)}`; }
function formatPercent(value?: number) { return typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "No change data"; }
function formatMatchTime(value: string) { return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
