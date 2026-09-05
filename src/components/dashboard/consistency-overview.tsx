import {
  CheckCircle2,
  CirclePause,
  Clock3,
  Shield,
  Slash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  ActivityStreak,
  ActivityStreakTodayState,
  ConsistencySnapshot,
} from "@/types/consistency";

type ConsistencyOverviewProps = {
  consistency: ConsistencySnapshot;
};

const stateLabels: Record<ActivityStreakTodayState, string> = {
  completed: "Qualified",
  missed: "Missed",
  scheduled_rest: "Scheduled rest",
  inactive: "Inactive",
  streak_freeze: "Freeze used",
  pending: "Pending",
};

export function ConsistencyOverview({
  consistency,
}: ConsistencyOverviewProps) {
  const hasConsistencyHistory =
    consistency.activityStreaks.length > 0 ||
    consistency.overall.currentStreak > 0 ||
    consistency.overall.bestStreak > 0;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Consistency
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
            Overall rhythm and activity streaks.
          </p>
        </div>
        <Badge tone="neutral">Streak Freeze x{consistency.availableFreezes}</Badge>
      </div>

      {!hasConsistencyHistory ? (
        <SystemState
          title="Building your record."
          description="More qualifying activity is needed before consistency can be evaluated."
          compact
        />
      ) : (
        <section aria-labelledby="activity-streaks-heading">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3
                id="activity-streaks-heading"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Activity streaks
              </h3>
            </div>
          </div>

          <ul className="grid gap-3 lg:grid-cols-2">
            {consistency.activityStreaks.map((streak) => (
              <ActivityStreakCard key={streak.activityKey} streak={streak} />
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

function ActivityStreakCard({ streak }: { streak: ActivityStreak }) {
  const isInactive = streak.status === "inactive";
  const progress =
    streak.bestStreak > 0
      ? Math.min(Math.round((streak.currentStreak / streak.bestStreak) * 100), 100)
      : 0;

  return (
    <li className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ActivityStateIcon state={streak.todayState} />
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-semibold text-[var(--foreground)]",
                isInactive && "text-[var(--foreground-muted)]",
              )}
            >
              {streak.activityLabel}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-semibold",
                getStateClassName(streak.todayState),
              )}
            >
              {getCompactStateLabel(streak)}
            </span>
          </div>
        </div>
        <CompactStreakMetric
          label={isInactive ? "Paused" : "Current"}
          value={streak.currentStreak}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Best
          </span>
          <span className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
            {streak.bestStreak} days
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
          aria-hidden="true"
        >
          <div
            className={cn(
              "h-full rounded-full",
              streak.todayState === "missed" || streak.todayState === "inactive"
                ? "bg-[var(--foreground-muted)]"
                : "bg-[var(--accent-pro)]",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function ActivityStateIcon({ state }: { state: ActivityStreakTodayState }) {
  const className = "size-4";
  const wrapperClassName =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-elevated)]";

  if (state === "completed") {
    return (
      <span className={wrapperClassName}>
        <CheckCircle2
          aria-hidden="true"
          className={`${className} text-[var(--accent-pro)]`}
          focusable="false"
          strokeWidth={1.9}
        />
      </span>
    );
  }

  if (state === "inactive") {
    return (
      <span className={wrapperClassName}>
        <CirclePause
          aria-hidden="true"
          className={`${className} text-[var(--foreground-muted)]`}
          focusable="false"
          strokeWidth={1.9}
        />
      </span>
    );
  }

  if (state === "scheduled_rest") {
    return (
      <span className={wrapperClassName}>
        <Clock3
          aria-hidden="true"
          className={`${className} text-[var(--foreground-muted)]`}
          focusable="false"
          strokeWidth={1.9}
        />
      </span>
    );
  }

  if (state === "streak_freeze") {
    return (
      <span className={wrapperClassName}>
        <Shield
          aria-hidden="true"
          className={`${className} text-[var(--foreground-muted)]`}
          focusable="false"
          strokeWidth={1.9}
        />
      </span>
    );
  }

  return (
    <span className={wrapperClassName}>
      <Slash
        aria-hidden="true"
        className={`${className} text-[var(--foreground-muted)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    </span>
  );
}

function CompactStreakMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="shrink-0 rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-right">
      <p className="text-[0.65rem] font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-1 font-mono text-sm font-semibold leading-none text-[var(--foreground)]">
        {value} days
      </p>
    </div>
  );
}

function getCompactStateLabel(streak: ActivityStreak) {
  if (streak.todayState === "scheduled_rest") {
    return streak.scheduleLabel ?? stateLabels[streak.todayState];
  }

  if (streak.todayState === "inactive") {
    return typeof streak.inactiveDays === "number"
      ? `${streak.inactiveDays}d paused`
      : stateLabels[streak.todayState];
  }

  return stateLabels[streak.todayState];
}

function getStateClassName(state: ActivityStreakTodayState) {
  if (state === "completed") {
    return "bg-[var(--accent-subtle)] text-[var(--foreground)]";
  }

  if (state === "missed") {
    return "bg-[var(--boss-subtle)] text-[var(--boss)]";
  }

  return "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]";
}
