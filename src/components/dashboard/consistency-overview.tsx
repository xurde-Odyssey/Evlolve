import {
  CheckCircle2,
  CirclePause,
  Clock3,
  Flame,
  FlameKindling,
  Shield,
  Slash,
  Sparkles,
  Target,
  Waves,
  type LucideIcon,
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

type OverallStreakDisplay = {
  colorClass: string;
  Icon: LucideIcon;
};

export function ConsistencyOverview({
  consistency,
}: ConsistencyOverviewProps) {
  const hasConsistencyHistory =
    consistency.activityStreaks.length > 0 ||
    consistency.overall.currentStreak > 0 ||
    consistency.overall.bestStreak > 0;
  const overallStatus =
    typeof consistency.overall.qualifiedToday === "boolean"
      ? consistency.overall.qualifiedToday
        ? "Qualified today"
        : "Not qualified today"
      : "Awaiting evaluation";

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

      <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.78fr)_minmax(0,1.22fr)]">
        <section
          className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4"
          aria-labelledby="overall-consistency-heading"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id="overall-consistency-heading"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Overall streak
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                Daily commitment signal.
              </p>
            </div>
            <Target
              aria-hidden="true"
              className="size-4 shrink-0 text-[var(--foreground-muted)]"
              focusable="false"
              strokeWidth={1.9}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <OverallStreakMark value={consistency.overall.currentStreak} />
            <StreakMetric
              label="Best"
              value={consistency.overall.bestStreak}
              hasHistory={consistency.overall.bestStreak > 0}
            />
          </div>

          <div className="mt-4 rounded-md bg-[var(--surface-elevated)] px-3 py-2">
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Today
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {overallStatus}
            </p>
          </div>
        </section>

        <section aria-labelledby="activity-streaks-heading">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3
                id="activity-streaks-heading"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Activity streaks
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                Pauses preserve streaks for up to {consistency.inactiveLimitDays} days.
              </p>
            </div>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {consistency.activityStreaks.map((streak) => (
              <ActivityStreakRow key={streak.activityKey} streak={streak} />
            ))}
          </ul>
        </section>
      </div>
      )}
    </Card>
  );
}

function OverallStreakMark({ value }: { value: number }) {
  const display = getOverallStreakDisplay(value);
  const Icon = display.Icon;

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--streak-subtle)] p-4">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Current
          </p>
          <div className="mt-2 flex min-w-0 items-baseline gap-2">
            <p className="numeric font-mono text-4xl font-semibold leading-none text-[var(--foreground)]">
              {value}
            </p>
            <p className="text-sm font-semibold text-[var(--foreground-muted)]">
              days
            </p>
          </div>
        </div>

        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--background)]",
            display.colorClass,
          )}
          aria-hidden="true"
        >
          <Icon className="size-6" focusable="false" strokeWidth={1.9} />
        </div>
      </div>

      <span className="sr-only">{getOverallStreakAccessibilityLabel(value)}</span>
    </div>
  );
}

function ActivityStreakRow({ streak }: { streak: ActivityStreak }) {
  const isInactive = streak.status === "inactive";
  const statusText = getActivityStatusText(streak);

  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 gap-3">
        <ActivityStateIcon state={streak.todayState} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={cn(
                "text-sm font-semibold text-[var(--foreground)]",
                isInactive && "text-[var(--foreground-muted)]",
              )}
            >
              {streak.activityLabel}
            </p>
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--foreground-muted)]">
              {stateLabels[streak.todayState]}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            {statusText}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:min-w-48">
        <CompactStreakMetric
          label={isInactive ? "Paused at" : "Current"}
          value={streak.currentStreak}
        />
        <CompactStreakMetric label="Best" value={streak.bestStreak} />
      </div>
    </li>
  );
}

function ActivityStateIcon({ state }: { state: ActivityStreakTodayState }) {
  const className = "mt-0.5 size-4 shrink-0";

  if (state === "completed") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={`${className} text-[var(--accent-pro)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  if (state === "inactive") {
    return (
      <CirclePause
        aria-hidden="true"
        className={`${className} text-[var(--foreground-muted)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  if (state === "scheduled_rest") {
    return (
      <Clock3
        aria-hidden="true"
        className={`${className} text-[var(--foreground-muted)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  if (state === "streak_freeze") {
    return (
      <Shield
        aria-hidden="true"
        className={`${className} text-[var(--foreground-muted)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  return (
    <Slash
      aria-hidden="true"
      className={`${className} text-[var(--foreground-muted)]`}
      focusable="false"
      strokeWidth={1.9}
    />
  );
}

function StreakMetric({
  label,
  value,
  hasHistory = true,
}: {
  label: string;
  value: number;
  hasHistory?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-2 font-mono text-4xl font-semibold leading-none text-[var(--foreground)]">
        {hasHistory ? value : "-"}
      </p>
      {hasHistory ? (
        <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          days
        </p>
      ) : null}
    </div>
  );
}

function getOverallStreakDisplay(value: number): OverallStreakDisplay {
  if (value < 10) {
    return {
      colorClass: "text-[var(--streak-calm)]",
      Icon: Sparkles,
    };
  }

  if (value < 20) {
    return {
      colorClass: "text-[var(--streak-steady)]",
      Icon: Flame,
    };
  }

  if (value < 30) {
    return {
      colorClass: "text-[var(--streak-focused)]",
      Icon: FlameKindling,
    };
  }

  return {
    colorClass: "text-[var(--streak-enduring)]",
    Icon: Waves,
  };
}

function getOverallStreakAccessibilityLabel(value: number) {
  if (value < 10) {
    return "Early overall streak visual tier";
  }

  if (value < 20) {
    return "Steady overall streak visual tier";
  }

  if (value < 30) {
    return "Focused overall streak visual tier";
  }

  return "Long-range overall streak visual tier";
}

function CompactStreakMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-1 font-mono text-sm font-semibold text-[var(--foreground)]">
        {value} days
      </p>
    </div>
  );
}

function getActivityStatusText(streak: ActivityStreak) {
  if (streak.todayState === "scheduled_rest") {
    return `${streak.scheduleLabel ?? "Scheduled rest"} today.`;
  }

  if (streak.todayState === "inactive") {
    const inactiveDays =
      typeof streak.inactiveDays === "number" ? `${streak.inactiveDays} day` : "Paused";
    return `${inactiveDays} inactive. Streak paused.`;
  }

  if (streak.todayState === "streak_freeze") {
    return "Freeze protected the streak.";
  }

  if (streak.todayState === "missed") {
    return "Best streak preserved.";
  }

  if (streak.todayState === "pending") {
    return "Awaiting today.";
  }

  return "On track today.";
}
