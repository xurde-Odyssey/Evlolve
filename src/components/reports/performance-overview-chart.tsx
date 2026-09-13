"use client";

import { useMemo, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { PerformanceOverview, PerformanceSeries } from "@/types/performance";

const ranges = ["7D", "4W", "3M", "6M", "1Y", "ALL"] as const;
const palette = [
  "var(--foreground)",
  "var(--core-stone-memory)",
  "var(--core-stone-edge)",
  "var(--core-stone-facet-mid)",
  "var(--foreground-muted)",
  "var(--primary)",
];

export function PerformanceOverviewChart({
  performance,
}: {
  performance: Record<(typeof ranges)[number], PerformanceOverview>;
}) {
  const [range, setRange] = useState<(typeof ranges)[number]>("7D");
  const [focus, setFocus] = useState<"ALL" | "GROWTH" | "BOUNDARIES">("ALL");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{ seriesId?: string; pointIndex: number } | null>(null);
  const overview = performance[range];

  const visibleSeries = useMemo(
    () => overview.series.filter((series) => {
      if (focus === "GROWTH" && series.kind !== "ACTIVITY_CONSISTENCY") return false;
      if (focus === "BOUNDARIES" && series.kind !== "BOUNDARY_ADHERENCE") return false;
      return visible[series.id] !== false;
    }),
    [focus, overview.series, visible],
  );

  const allSeries = overview.series;
  const maxPoints = Math.max(...allSeries.map((series) => series.points.length), 0);
  const width = 760;
  const height = 300;
  const left = 42;
  const right = 16;
  const top = 20;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xFor = (index: number) => left + (maxPoints <= 1 ? 0 : (index / (maxPoints - 1)) * plotWidth);
  const yFor = (value: number) => top + ((100 - value) / 100) * plotHeight;
  const strongest = overview.summary.strongestActivity;
  const constraint = overview.summary.primaryConstraint;

  function toggleSeries(seriesId: string) {
    setVisible((current) => ({ ...current, [seriesId]: current[seriesId] === false }));
  }

  return (
    <Card className="space-y-5" aria-labelledby="performance-overview-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="size-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Performance Overview</p>
          </div>
          <h2 id="performance-overview-title" className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            Standards over time
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
            Compare commitment consistency with how well you maintained the boundaries you chose.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 sm:flex" aria-label="Performance range" role="tablist">
          {ranges.map((option) => (
            <button key={option} type="button" role="tab" aria-selected={range === option} onClick={() => setRange(option)} className={cn("min-h-9 rounded px-3 text-xs font-semibold text-[var(--foreground-muted)] transition", range === option ? "bg-[var(--accent-subtle)] text-[var(--accent)] shadow-[var(--shadow-soft)]" : "hover:bg-[var(--background)] hover:text-[var(--foreground)]")}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Strongest consistency" value={strongest ? `${strongest.label} · ${strongest.consistency}%` : "Building history"} />
        <Summary label="Needs attention" value={constraint ? `${constraint.label} · ${constraint.consistency}%` : "Not enough data"} />
        <Summary label="Boundaries" value={`${overview.summary.boundarySummary.maintained} of ${overview.summary.boundarySummary.total} maintained`} />
      </div>

      {allSeries.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-12 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">Performance will appear once you begin tracking a commitment or personal boundary.</p>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">Your own history will become the comparison.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-2 sm:p-4">
            <div className="min-w-[620px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-labelledby="performance-chart-title performance-chart-description">
                <title id="performance-chart-title">Performance over time</title>
                <desc id="performance-chart-description">Growth lines show consistency. Dashed boundary lines show boundary adherence. Values are percentages from zero to one hundred.</desc>
                {[0, 25, 50, 75, 100].map((value) => (
                  <g key={value}>
                    <line x1={left} x2={width - right} y1={yFor(value)} y2={yFor(value)} stroke="var(--border)" strokeDasharray={value === 0 || value === 100 ? undefined : "2 5"} />
                    <text x={left - 8} y={yFor(value) + 4} textAnchor="end" fill="var(--foreground-muted)" fontSize="10">{value}</text>
                  </g>
                ))}
                {visibleSeries.map((series) => {
                  const color = palette[stableIndex(series.id, palette.length)];
                  return (
                    <g key={series.id}>
                      {pathForSeries(series, xFor, yFor).map((path, index) => (
                        <path key={`${series.id}-${index}`} d={path} fill="none" stroke={color} strokeWidth={hover?.seriesId === series.id ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={series.kind === "BOUNDARY_ADHERENCE" ? "5 4" : undefined} opacity={hover && hover.seriesId !== series.id ? 0.25 : 0.9} />
                      ))}
                      {series.points.map((point, pointIndex) => point.value === null ? null : (
                        <circle key={`${series.id}-${point.periodKey}`} cx={xFor(pointIndex)} cy={yFor(point.value)} r={hover?.seriesId === series.id && hover.pointIndex === pointIndex ? 5 : 3} fill="var(--background)" stroke={color} strokeWidth="2" tabIndex={0} role="button" aria-label={`${series.label}, ${series.kind === "ACTIVITY_CONSISTENCY" ? "Consistency" : "Boundary adherence"}, ${point.value}% for ${point.label}`} onMouseEnter={() => setHover({ seriesId: series.id, pointIndex })} onFocus={() => setHover({ seriesId: series.id, pointIndex })} onClick={() => setHover({ seriesId: series.id, pointIndex })} />
                      ))}
                    </g>
                  );
                })}
                {overview.contextEvents.map((event) => {
                  const pointIndex = overview.series[0]?.points.findIndex((point) => event.occurredAt >= point.periodStart && event.occurredAt < point.periodEnd) ?? -1;
                  if (pointIndex < 0) return null;
                  return <circle key={event.id} cx={xFor(pointIndex)} cy={height - 17} r="3" fill="var(--foreground-muted)" aria-label={event.label} />;
                })}
                {allSeries[0]?.points.map((point, index) => <text key={point.periodKey} x={xFor(index)} y={height - 4} textAnchor="middle" fill="var(--foreground-muted)" fontSize="10">{point.label}</text>)}
              </svg>
              {hover ? <ChartTooltip overview={overview} index={hover.pointIndex} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Performance series filters">
            {(["ALL", "GROWTH", "BOUNDARIES"] as const).map((option) => <button key={option} type="button" onClick={() => setFocus(option)} className={focus === option ? "action-pill min-h-9 px-3 text-xs" : "action-pill-outline min-h-9 px-3 text-xs"}>{option === "ALL" ? "All" : option === "GROWTH" ? "Growth" : "Boundaries"}</button>)}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allSeries.map((series) => <LegendItem key={series.id} series={series} color={palette[stableIndex(series.id, palette.length)] ?? palette[0] ?? "currentColor"} active={visible[series.id] !== false} onToggle={() => toggleSeries(series.id)} />)}
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">Solid lines are commitment consistency. Dashed lines are boundary adherence. {overview.summary.direction} direction.</p>
        </>
      )}
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3"><p className="text-[10px] font-semibold uppercase text-[var(--foreground-muted)]">{label}</p><p className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">{value}</p></div>;
}

function LegendItem({ series, color, active, onToggle }: { series: PerformanceSeries; color: string; active: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} aria-pressed={active} className={cn("flex min-h-11 items-center gap-3 rounded-md border px-3 text-left transition", active ? "border-[var(--border)] bg-[var(--background)]" : "border-transparent opacity-45")}><span className="block w-6 border-t-2" style={{ borderColor: color, borderTopStyle: series.kind === "BOUNDARY_ADHERENCE" ? "dashed" : "solid" }} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--foreground)]">{series.label}</span><span className="mt-0.5 block text-[10px] uppercase text-[var(--foreground-muted)]">{series.kind === "ACTIVITY_CONSISTENCY" ? `${series.tier ?? "growth"} · consistency` : "boundary adherence"}</span></span>{series.kind === "BOUNDARY_ADHERENCE" ? <ShieldCheck aria-hidden="true" className="size-3.5 text-[var(--foreground-muted)]" /> : null}</button>;
}

function ChartTooltip({ overview, index }: { overview: PerformanceOverview; index: number }) {
  const point = overview.series.find((series) => series.points[index]?.label)?.points[index];
  return <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]"><p className="text-xs font-semibold text-[var(--foreground)]">{point?.label ?? "Selected period"}</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{overview.series.map((series) => { const value = series.points[index]?.value; return value === null || value === undefined ? null : <p key={series.id} className="text-xs text-[var(--foreground-muted)]"><span className="font-semibold text-[var(--foreground)]">{series.label}</span> {series.kind === "ACTIVITY_CONSISTENCY" ? "Consistency" : "Boundary adherence"}: {value}%</p>; })}</div></div>;
}

function pathForSeries(series: PerformanceSeries, xFor: (index: number) => number, yFor: (value: number) => number) {
  const paths: string[] = [];
  let current = "";
  series.points.forEach((point, index) => {
    if (point.value === null) {
      if (current) paths.push(current);
      current = "";
      return;
    }
    current += current ? ` L ${xFor(index)} ${yFor(point.value)}` : `M ${xFor(index)} ${yFor(point.value)}`;
  });
  if (current) paths.push(current);
  return paths;
}

function stableIndex(value: string, length: number) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7) % length;
}
