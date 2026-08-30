"use client";

import { useMemo, useState } from "react";
import { BarChart3, BookOpen, Download, LineChart, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ErrorState,
  LoadingState,
  SystemState,
} from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type { DataViewState } from "@/types/system-state";
import type {
  ActivityReport,
  PeriodComparisonMetric,
  PeriodReport,
  ReportPeriodKey,
  ReportsSnapshot,
  TargetActualMetric,
} from "@/types/report";

type ReportsWorkspaceProps = {
  snapshot: ReportsSnapshot;
  state?: DataViewState;
  errorMessage?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function ReportsWorkspace({
  snapshot,
  state = "ready",
  errorMessage,
}: ReportsWorkspaceProps) {
  const [selectedPeriodKey, setSelectedPeriodKey] =
    useState<ReportPeriodKey>("this_week");
  const selectedReport = useMemo(
    () =>
      snapshot.periods.find((report) => report.period.key === selectedPeriodKey) ??
      snapshot.periods[0],
    [selectedPeriodKey, snapshot.periods],
  );

  if (state === "loading") {
    return (
      <LoadingState
        title="Loading reports"
        description="Preparing performance data."
      />
    );
  }

  if (state === "error") {
    return (
      <ErrorState
        title="Reports unavailable"
        description={errorMessage ?? "We couldn't load this report."}
      />
    );
  }

  if (!selectedReport || state === "empty" || state === "insufficient_data") {
    return (
      <SystemState
        title={
          state === "insufficient_data"
            ? "Not enough data yet."
            : "No performance data yet."
        }
        description={
          state === "insufficient_data"
            ? "Reports need more recorded activity before comparisons are meaningful."
            : "Your reports will build as you complete and record activities."
        }
        icon={BarChart3}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:flex"
          aria-label="Report period"
          role="tablist"
        >
          {snapshot.periods.map((report) => (
            <button
              key={report.period.key}
              className={cn(
                "min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-[var(--foreground-muted)] transition",
                selectedPeriodKey === report.period.key &&
                  "bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-soft)]",
              )}
              onClick={() => setSelectedPeriodKey(report.period.key)}
              role="tab"
              type="button"
              aria-selected={selectedPeriodKey === report.period.key}
            >
              {report.period.label}
            </button>
          ))}
        </div>

        <Button
          className="gap-2"
          variant="secondary"
          onClick={() => window.print()}
        >
          <Download
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={1.9}
          />
          Export PDF
        </Button>
      </div>

      <PerformanceOverview report={selectedReport} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <TargetActualSection activities={selectedReport.activities} />
        <ConsistencySection report={selectedReport} />
      </div>

      <ReadingSection report={selectedReport} />
      <ComparisonSection report={selectedReport} />
      <ProgressionAndBaseline report={selectedReport} />
    </div>
  );
}

function PerformanceOverview({ report }: { report: PeriodReport }) {
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Performance overview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {report.period.label}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            {report.period.rangeLabel}
          </p>
        </div>
        <Badge tone="neutral">{report.overview.activitiesTracked} tracked</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric
          label="Required"
          value={report.overview.requiredCommitments}
        />
        <SummaryMetric
          label="Completed"
          value={report.overview.completedCommitments}
        />
        <SummaryMetric label="Missed" value={report.overview.missedCommitments} />
        <SummaryMetric
          label="Consistency"
          value={
            report.overview.overallConsistencyPercent === null
              ? "Not enough data"
              : `${report.overview.overallConsistencyPercent}%`
          }
          numeric={report.overview.overallConsistencyPercent !== null}
        />
        <SummaryMetric
          label="Activities"
          value={report.overview.activitiesTracked}
        />
      </div>
    </Card>
  );
}

function TargetActualSection({ activities }: { activities: ActivityReport[] }) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <BarChart3
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Target vs actual
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Period commitments compared with logged work.
          </p>
        </div>
      </div>

      {activities.length > 0 ? (
        <div
          className="divide-y divide-[var(--border)]"
          role="img"
          aria-label="Activity target versus actual comparison"
        >
          {activities.map((activity) => (
            <ActivityTargetRow key={activity.activityKey} activity={activity} />
          ))}
        </div>
      ) : (
        <SystemState
          title="No activity measurements yet."
          description="Target vs actual appears after measurable activity is recorded."
          compact
        />
      )}
    </Card>
  );
}

function ActivityTargetRow({ activity }: { activity: ActivityReport }) {
  const maxValue = Math.max(
    activity.primaryMetric.target,
    activity.primaryMetric.actual,
    1,
  );

  return (
    <section className="grid gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {activity.activityLabel}
          </h3>
          <VarianceBadge metric={activity.primaryMetric} />
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
          {formatVarianceSentence(activity.primaryMetric)}
        </p>
        {typeof activity.requiredSessions === "number" ? (
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {activity.completedSessions} of {activity.requiredSessions} required
            sessions completed. Missed {activity.missedSessions}.
          </p>
        ) : null}
      </div>

      <div className="min-w-0 space-y-3">
        <ChartBar
          label="Target"
          value={formatValue(
            activity.primaryMetric.target,
            activity.primaryMetric.unit,
          )}
          width={(activity.primaryMetric.target / maxValue) * 100}
          tone="target"
        />
        <ChartBar
          label="Actual"
          value={formatValue(
            activity.primaryMetric.actual,
            activity.primaryMetric.unit,
          )}
          width={(activity.primaryMetric.actual / maxValue) * 100}
          tone="actual"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--foreground-muted)]">
          <span>
            Difference{" "}
            <strong className="numeric font-mono text-[var(--foreground)]">
              {formatSignedValue(
                activity.primaryMetric.difference,
                activity.primaryMetric.unit,
              )}
            </strong>
          </span>
          {activity.secondaryMetrics.slice(0, 2).map((metric) => (
            <span key={metric.label}>
              {metric.label}{" "}
              <strong className="text-[var(--foreground)]">{metric.value}</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartBar({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: "target" | "actual";
}) {
  return (
    <div className="grid grid-cols-[3.25rem_minmax(3rem,1fr)_minmax(3.5rem,auto)] items-center gap-2 sm:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem]">
      <span className="text-xs text-[var(--foreground-muted)]">{label}</span>
      <span className="h-2 min-w-0 rounded-full bg-[var(--surface-elevated)]">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] [transition-duration:var(--motion-duration-base)] [transition-timing-function:var(--motion-ease)]",
            tone === "target" ? "bg-[var(--report-target)]" : "bg-[var(--xp)]",
          )}
          style={{ width: `${Math.min(Math.max(width, 2), 100)}%` }}
        />
      </span>
      <span className="numeric min-w-0 text-right font-mono text-[0.68rem] font-semibold text-[var(--foreground)] sm:text-xs">
        {value}
      </span>
    </div>
  );
}

function ConsistencySection({ report }: { report: PeriodReport }) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Consistency
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Activity-level period signals.
        </p>
      </div>

      {report.consistency.overallPercent === null ? (
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Not enough data yet
        </p>
      ) : (
        <Progress
          value={report.consistency.overallPercent}
          label="Overall consistency"
          ariaLabel="Overall consistency"
          ariaValueText={`${report.consistency.overallPercent}%`}
        />
      )}

      <ul className="divide-y divide-[var(--border)]">
        {report.consistency.items.map((item) => (
          <li
            key={item.activityKey}
            className="grid gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {item.activityLabel}
              </p>
              <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
                {item.consistencyPercent}%
              </p>
            </div>
            <Progress
              value={item.consistencyPercent}
              ariaLabel={`${item.activityLabel} consistency`}
              ariaValueText={`${item.consistencyPercent}%`}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ReadingSection({ report }: { report: PeriodReport }) {
  const reading = report.reading;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <BookOpen
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
            focusable="false"
            strokeWidth={1.9}
          />
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Current book
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              Current book
            </h2>
          </div>
        </div>

        {reading.currentBook ? (
          <>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {reading.currentBook.book.title}
            </h3>
            <Progress
              value={reading.currentBook.progressPercent}
              label={`${reading.currentBook.pagesRead} / ${reading.currentBook.book.totalPages} pages`}
              ariaLabel={`${reading.currentBook.book.title} reading progress`}
              ariaValueText={`${reading.currentBook.progressPercent}% complete`}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric
                label="Progress"
                value={`${reading.currentBook.progressPercent}%`}
              />
              <MiniMetric
                label="Started"
                value={reading.currentBook.startedLabel}
                numeric={false}
              />
              <MiniMetric
                label="Remaining"
                value={`${reading.currentBook.pagesRemaining} pages`}
              />
            </div>
          </>
        ) : (
          <SystemState
            title="No active book."
            description="Add your next book when you're ready to begin."
            icon={BookOpen}
            compact
          />
        )}
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Reading analytics
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Books, pages, and completion pace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryMetric label="Books completed" value={reading.metrics.booksCompleted} />
          <SummaryMetric label="Pages read" value={reading.metrics.pagesRead} />
          <SummaryMetric
            label="Avg pages/day"
            value={reading.metrics.averagePagesPerDay}
          />
          <SummaryMetric
            label="Avg completion"
            value={
              reading.metrics.averageCompletionDays === null
                ? "Not enough data"
                : `${reading.metrics.averageCompletionDays} days`
            }
            numeric={reading.metrics.averageCompletionDays !== null}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Books read
          </p>
          {reading.completedBooks.length > 0 ? (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {reading.completedBooks.map((item) => (
              <li
                key={item.book.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {item.book.title}
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {item.book.totalPages} pages
                  </p>
                </div>
                <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
                  {item.completionDays === null
                    ? "Not enough data"
                    : `${item.completionDays} days`}
                </p>
              </li>
              ))}
            </ul>
          ) : (
            <SystemState
              title="No completed books yet."
              description="Finished books will become part of your permanent reading history."
              icon={BookOpen}
              compact
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function ComparisonSection({ report }: { report: PeriodReport }) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <LineChart
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Period comparison
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Descriptive change only.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ComparisonGroup title="This week vs last week" items={report.comparisons.weekly} />
        <ComparisonGroup title="This month vs last month" items={report.comparisons.monthly} />
      </div>

      <ComparisonRow item={report.comparisons.zeroPrevious} />
    </Card>
  );
}

function ComparisonGroup({
  title,
  items,
}: {
  title: string;
  items: PeriodComparisonMetric[];
}) {
  return (
    <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <ComparisonRow key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}

function ComparisonRow({ item }: { item: PeriodComparisonMetric }) {
  const maxValue = Math.max(item.previousValue, item.currentValue, 1);

  return (
    <div className="space-y-2 rounded-md bg-[var(--surface-elevated)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {item.label}
        </p>
        <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
          {formatChange(item.changePercent)}
        </p>
      </div>
      <ChartBar
        label={item.previousLabel}
        value={formatValue(item.previousValue, item.unit)}
        width={(item.previousValue / maxValue) * 100}
        tone="target"
      />
      <ChartBar
        label={item.currentLabel}
        value={formatValue(item.currentValue, item.unit)}
        width={(item.currentValue / maxValue) * 100}
        tone="actual"
      />
    </div>
  );
}

function ProgressionAndBaseline({ report }: { report: PeriodReport }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Progression summary
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Reported values only.
          </p>
        </div>

        <div className="grid gap-3">
          <MiniMetric label="Starting level" value={String(report.progression.startingLevel)} />
          <MiniMetric label="Current level" value={String(report.progression.currentLevel)} />
          <MiniMetric label="Highest level" value={String(report.progression.highestLevel)} />
          <MiniMetric
            label="Level change"
            value={formatSignedNumber(report.progression.levelChange)}
          />
        </div>

        <dl className="grid gap-2 text-sm">
          <XpLine label="Activity XP" value={report.progression.xp.activity} />
          <XpLine label="Boss XP" value={report.progression.xp.boss} />
          <XpLine label="Bonus XP" value={report.progression.xp.bonus} />
          <XpLine label="XP lost" value={-report.progression.xp.lost} />
          <XpLine label="Net XP" value={report.progression.xp.net} />
        </dl>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Baseline building
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Evidence period for adaptive systems.
          </p>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {report.baseline.map((item) => (
            <li
              key={item.activityKey}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {item.activityLabel}
              </p>
              <p className="text-sm text-[var(--foreground-muted)]">
                {item.observationLabel}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
            focusable="false"
            strokeWidth={1.9}
          />
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              System analysis
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              {report.systemAnalysis.message}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  numeric = true,
}: {
  label: string;
  value: number | string;
  numeric?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold leading-none text-[var(--foreground)]",
          numeric && "numeric font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  numeric = true,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="rounded-md bg-[var(--surface-elevated)] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-[var(--foreground)]",
          numeric && "numeric font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function XpLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--foreground-muted)]">{label}</dt>
      <dd className="numeric font-mono font-semibold text-[var(--foreground)]">
        {formatSignedNumber(value)} XP
      </dd>
    </div>
  );
}

function VarianceBadge({ metric }: { metric: TargetActualMetric }) {
  const isUnder = metric.difference < 0;

  return (
    <span
      className={cn(
        "numeric inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 font-mono text-xs font-semibold",
        isUnder
          ? "border-[var(--border)] bg-[var(--warning-subtle)] text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--success-subtle)] text-[var(--foreground)]",
      )}
    >
      {metric.variancePercent === null
        ? "New activity"
        : `${formatSignedNumber(metric.variancePercent)}%`}
    </span>
  );
}

function formatVarianceSentence(metric: TargetActualMetric) {
  if (metric.difference < 0) {
    return `Target missed by ${formatValue(Math.abs(metric.difference), metric.unit)}.`;
  }

  if (metric.difference > 0) {
    return `Target exceeded by ${formatValue(metric.difference, metric.unit)}.`;
  }

  return "Target met exactly.";
}

function formatValue(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit}`;
}

function formatSignedValue(value: number, unit: string) {
  return `${formatSignedNumber(value)} ${unit}`;
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${numberFormatter.format(value)}`;
  }

  return numberFormatter.format(value);
}

function formatChange(value: number | null) {
  if (value === null) {
    return "New activity";
  }

  return `${formatSignedNumber(value)}%`;
}
