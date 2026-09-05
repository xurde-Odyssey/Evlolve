import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type { ActivityRecord } from "@/types/activity";
import type { DailyQuest, QuestStatus } from "@/types/quest";

type DailyQuestsProps = {
  activityRecords?: ActivityRecord[];
  emptyReason?: "not_configured" | "rest_day";
  quests: DailyQuest[];
};

export function DailyQuests({
  activityRecords = [],
  emptyReason = "not_configured",
  quests,
}: DailyQuestsProps) {
  void activityRecords;

  const completedCount = quests.filter((quest) =>
    quest.status === "completed" || quest.status === "qualifying_partial",
  ).length;
  const totalCount = quests.length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Daily Quests
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Required execution from active commitments.
          </p>
        </div>
        <div className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
            {completedCount} / {totalCount}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            completed
          </p>
        </div>
      </div>

      {totalCount > 0 ? (
        <>
          <div className="space-y-2">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
              role="progressbar"
              aria-label="Daily quest completion progress"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${completedCount} of ${totalCount} quests completed`}
            >
              <div
                className="h-full rounded-full bg-[var(--foreground)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {allComplete ? (
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Daily quests complete
              </p>
            ) : null}
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {quests.map((quest) => (
              <li
                key={quest.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-3">
                  <QuestStatusIcon status={quest.status} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p
                        className={cn(
                          "text-sm font-semibold text-[var(--foreground)]",
                          (quest.status === "completed" ||
                            quest.status === "qualifying_partial") &&
                            "text-[var(--foreground-muted)]",
                        )}
                      >
                        {quest.title}
                      </p>
                      {quest.source === "user" ? (
                        <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--foreground-muted)]">
                          Custom
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--foreground-muted)]">
                      {quest.description ? <span>{quest.description}</span> : null}
                      {quest.scheduleLabel ? <span>{quest.scheduleLabel}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <QuestAction status={quest.status} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <SystemState
          title={
            emptyReason === "rest_day"
              ? "No required quests today."
              : "No quests configured."
          }
          description={
            emptyReason === "rest_day"
              ? "Scheduled rest is not a missed commitment."
              : "Choose active Improvement Areas before daily quests can be built."
          }
          action={
            emptyReason === "not_configured" ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
                href="/settings"
              >
                Choose Improvement Area
              </Link>
            ) : null
          }
        />
      )}
    </Card>
  );
}

function QuestStatusIcon({ status }: { status: QuestStatus }) {
  const className = "mt-0.5 size-4 shrink-0";

  if (status === "completed" || status === "qualifying_partial") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={`${className} text-[var(--accent-pro)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  if (status === "missed") {
    return (
      <AlertCircle
        aria-hidden="true"
        className={`${className} text-[var(--foreground-muted)]`}
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  return (
    <Circle
      aria-hidden="true"
      className={`${className} text-[var(--foreground-muted)]`}
      focusable="false"
      strokeWidth={1.9}
    />
  );
}

function QuestAction({ status }: { status: QuestStatus }) {
  if (status === "completed" || status === "qualifying_partial") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
        {status === "qualifying_partial" ? "Partial" : "Completed"}
      </span>
    );
  }

  if (status === "missed") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
        Missed
      </span>
    );
  }

  if (status === "excluded") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
        Excluded
      </span>
    );
  }

  if (status === "attempted") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
        Attempted
      </span>
    );
  }

  return (
    <Link
      href="/activities"
      className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
    >
      Log Activity
    </Link>
  );
}
