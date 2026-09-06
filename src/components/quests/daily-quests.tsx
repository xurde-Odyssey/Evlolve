import { AlertCircle, CheckCircle2, Circle, ClipboardPenLine } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { activityIcons } from "@/config/icon-maps";
import { getLocalDateKey, getSundayToSaturdayDateKeys } from "@/application/evolve/time-policy";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ActivityRecord } from "@/types/activity";
import type { DailyQuest, QuestStatus } from "@/types/quest";
import type { ScheduledRequirement } from "@/application/evolve/types";
import type { UserTimePolicy } from "@/application/evolve/time-policy";

type DailyQuestsProps = {
  activityRecords?: ActivityRecord[];
  emptyReason?: "not_configured" | "rest_day";
  quests: DailyQuest[];
  weeklyRequirements?: ScheduledRequirement[];
  now?: string;
  timePolicy?: UserTimePolicy;
};

export function DailyQuests({
  activityRecords = [],
  emptyReason = "not_configured",
  quests,
  weeklyRequirements = [],
  now,
  timePolicy,
}: DailyQuestsProps) {
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
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href="/activities"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--accent-pro)]/30 bg-[var(--accent-subtle)] px-3 py-2 text-sm font-semibold text-[var(--accent-pro)] transition hover:border-[var(--accent-pro)] focus-visible:outline-offset-2"
          >
            <ClipboardPenLine aria-hidden="true" className="size-4" strokeWidth={1.9} />
            Today&apos;s exercise
          </Link>
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
              {completedCount} / {totalCount}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              completed
            </p>
          </div>
        </div>
      </div>

      {weeklyRequirements.length > 0 && now && timePolicy ? (
        <WeeklyActivityCalendar
          activityRecords={activityRecords}
          now={now}
          timePolicy={timePolicy}
          weeklyRequirements={weeklyRequirements}
        />
      ) : totalCount > 0 ? (
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

function WeeklyActivityCalendar({
  activityRecords,
  now,
  timePolicy,
  weeklyRequirements,
}: {
  activityRecords: ActivityRecord[];
  now: string;
  timePolicy: UserTimePolicy;
  weeklyRequirements: ScheduledRequirement[];
}) {
  const days = getSundayToSaturdayDateKeys(now, timePolicy.timezone);
  const today = getLocalDateKey(now, timePolicy.timezone);
  const rows = [...new Map(weeklyRequirements.map((requirement) => [requirement.commitmentId, requirement])).values()];
  const completedCells = rows.reduce(
    (total, row) => total + days.filter((day) => isDayComplete(row, day, activityRecords, timePolicy.timezone)).length,
    0,
  );
  const scheduledCells = weeklyRequirements.length;
  const progress = scheduledCells > 0 ? (completedCells / scheduledCells) * 100 : 0;
  const todayRows = weeklyRequirements.filter((row) => row.scheduledDate === today);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const isToday = day === today;
          const completed = weeklyRequirements.filter(
            (requirement) => requirement.scheduledDate === day && isDayComplete(requirement, day, activityRecords, timePolicy.timezone),
          ).length;
          const scheduled = weeklyRequirements.filter((requirement) => requirement.scheduledDate === day).length;

          return (
            <div
              key={day}
              className={cn(
                "min-w-0 rounded-md border px-1 py-2 text-center",
                isToday
                  ? "border-[var(--accent-pro)] bg-[var(--accent-subtle)]"
                  : "border-[var(--border)] bg-[var(--background)]",
              )}
            >
              <p className="text-[0.65rem] font-semibold uppercase text-[var(--foreground-muted)]">
                {dayLabel(day)}
              </p>
              <p className={cn("numeric mt-1 font-mono text-sm font-semibold", isToday ? "text-[var(--accent-pro)]" : "text-[var(--foreground)]")}>
                {day.slice(-2)}
              </p>
              <p className="mt-1 text-[0.62rem] font-semibold text-[var(--foreground-muted)]">
                {scheduled > 0 ? `${completed}/${scheduled}` : "-"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Today</p>
        {todayRows.length > 0 ? (
          <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--background)]">
            {todayRows.map((row) => {
              const complete = isDayComplete(row, today, activityRecords, timePolicy.timezone);
              const Icon = activityIcons[row.activityKey] ?? activityIcons.custom;
              return (
                <li key={row.commitmentId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]"><Icon aria-hidden="true" className="size-3.5" /></span>
                    <span className="truncate text-sm font-semibold text-[var(--foreground)]">{row.title}</span>
                  </div>
                  <span className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                    complete ? "bg-[var(--accent-subtle)] text-[var(--accent-pro)]" : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]",
                  )}>
                    {complete ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <Circle aria-hidden="true" className="size-3.5" />}
                    {complete ? "Completed" : "Not recorded"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground-muted)]">No scheduled activity today.</p>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">This week</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{formatPercent(progress)}% complete</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Daily average</p>
          <p className="mt-1 numeric font-mono text-sm font-semibold text-[var(--foreground)]">{formatPercent(completedCells / 7)}%</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[28rem]">
          <div className="grid grid-cols-[minmax(7rem,1fr)_repeat(7,2rem)] items-center gap-1.5 border-b border-[var(--border)] pb-2">
            <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Activity</span>
            {days.map((day) => (
              <span key={day} className="text-center text-[0.62rem] font-semibold uppercase text-[var(--foreground-muted)]">{dayLabel(day).slice(0, 1)}</span>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const Icon = activityIcons[row.activityKey] ?? activityIcons.custom;
              return (
                <div key={row.commitmentId} className="grid grid-cols-[minmax(7rem,1fr)_repeat(7,2rem)] items-center gap-1.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]"><Icon aria-hidden="true" className="size-3.5" /></span>
                    <span className="truncate text-xs font-semibold text-[var(--foreground)]">{row.title}</span>
                  </div>
                  {days.map((day) => {
                    const scheduled = weeklyRequirements.some((requirement) => requirement.commitmentId === row.commitmentId && requirement.scheduledDate === day);
                    const complete = scheduled && isDayComplete(row, day, activityRecords, timePolicy.timezone);
                    return (
                      <span
                        key={day}
                        title={`${row.title}, ${day}: ${complete ? "completed" : scheduled ? "not completed" : "not scheduled"}`}
                        className={cn(
                          "grid size-7 place-items-center rounded-md border",
                          complete
                            ? "border-[var(--accent-pro)] bg-[var(--accent-pro)] text-white"
                            : scheduled
                              ? "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
                              : "border-transparent bg-transparent text-transparent",
                        )}
                      >
                        {complete ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : scheduled ? <Circle aria-hidden="true" className="size-3" /> : null}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--foreground-muted)]">Activity is recorded in Quick Log.</p>
    </div>
  );
}

function isDayComplete(
  requirement: ScheduledRequirement,
  day: string,
  activityRecords: ActivityRecord[],
  timezone: string,
) {
  if (requirement.scheduledDate !== day || requirement.exclusionState !== "NONE") return false;
  return activityRecords.some(
    (record) => record.commitmentId === requirement.commitmentId && getLocalDateKey(record.occurredAt, timezone) === day,
  );
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${day}T12:00:00Z`));
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
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-md border border-[var(--success)]/30 bg-[var(--success-subtle)] px-4 py-2 text-sm font-semibold text-[var(--success)]">
        <CheckCircle2 aria-hidden="true" className="size-4" strokeWidth={1.9} />
        {status === "qualifying_partial" ? "Partial" : "Completed"}
      </span>
    );
  }

  if (status === "missed") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-md border border-[var(--accent-pro)]/30 bg-[var(--accent-subtle)] px-4 py-2 text-sm font-semibold text-[var(--accent-pro)]">
        <AlertCircle aria-hidden="true" className="size-4" strokeWidth={1.9} />
        Missed
      </span>
    );
  }

  if (status === "excluded") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
        <Circle aria-hidden="true" className="size-4" strokeWidth={1.9} />
        Excluded
      </span>
    );
  }

  if (status === "attempted") {
    return (
      <span className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-md border border-[var(--warning)]/30 bg-[var(--warning-subtle)] px-4 py-2 text-sm font-semibold text-[var(--warning)]">
        <AlertCircle aria-hidden="true" className="size-4" strokeWidth={1.9} />
        Attempted
      </span>
    );
  }

  return (
    <Link
      href="/activities"
      className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-md border border-[var(--primary)]/25 bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
    >
      <ClipboardPenLine aria-hidden="true" className="size-4" strokeWidth={1.9} />
      Log Activity
    </Link>
  );
}
