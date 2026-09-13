import { AlertCircle, Bell, CheckCircle2, Circle, ClipboardPenLine } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { activityIcons } from "@/config/icon-maps";
import { getLocalDateKey, getSundayToSaturdayDateKeys } from "@/application/evolve/time-policy";
import { getQuestStatusForRequirement } from "@/application/evolve/selectors";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DailyQuest, QuestStatus } from "@/types/quest";
import type { ScheduledRequirement } from "@/application/evolve/types";
import type { ActivityExecutionEvidence } from "@/domain/evolve-engine";
import type { UserTimePolicy } from "@/application/evolve/time-policy";
import type { WeeklyReminder } from "@/types/weekly-reminder";

type DailyQuestsProps = {
  evidence?: ActivityExecutionEvidence[];
  weeklyReminders?: WeeklyReminder[];
  emptyReason?: "not_configured" | "rest_day";
  quests: DailyQuest[];
  weeklyRequirements?: ScheduledRequirement[];
  now?: string;
  timePolicy?: UserTimePolicy;
};

export function DailyQuests({
  evidence = [],
  weeklyReminders = [],
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
    <Card className="notebook-card space-y-5">
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
            aria-label={`Today's exercise, ${completedCount} of ${totalCount} completed`}
            className="inline-flex min-h-10 items-center justify-between gap-4 rounded-md bg-[var(--accent-subtle)] px-3 py-2 text-sm font-semibold text-[var(--accent-pro)] transition hover:bg-[var(--accent-pro)]/12 focus-visible:outline-offset-2"
          >
            <span className="inline-flex items-center gap-2">
              <ClipboardPenLine aria-hidden="true" className="size-4" strokeWidth={1.9} />
              Today&apos;s exercise
            </span>
            <span className="numeric border-l border-[var(--accent-pro)]/25 pl-4 font-mono text-sm font-semibold text-[var(--foreground)]" title={`${completedCount} of ${totalCount} daily quests completed`}>
              {completedCount} / {totalCount}
            </span>
          </Link>
        </div>
      </div>

      {weeklyRequirements.length > 0 && now && timePolicy ? (
        <WeeklyActivityCalendar
          evidence={evidence}
          weeklyReminders={weeklyReminders}
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
      {weeklyRequirements.length === 0 ? (
        <WeeklyReminderSummary reminders={weeklyReminders} />
      ) : null}
    </Card>
  );
}

function WeeklyActivityCalendar({
  evidence,
  weeklyReminders,
  now,
  timePolicy,
  weeklyRequirements,
}: {
  evidence: ActivityExecutionEvidence[];
  weeklyReminders: WeeklyReminder[];
  now: string;
  timePolicy: UserTimePolicy;
  weeklyRequirements: ScheduledRequirement[];
}) {
  const days = getSundayToSaturdayDateKeys(now, timePolicy.timezone);
  const today = getLocalDateKey(now, timePolicy.timezone);
  const rows = [...new Map(weeklyRequirements.map((requirement) => [requirement.commitmentId, requirement])).values()];
  const completedCells = rows.reduce(
    (total, row) => Math.min(row.weeklyQuota ?? days.length, total + days.filter((day) => {
      const requirement = requirementForDay(row.commitmentId, day, weeklyRequirements);
      return requirement ? isDayComplete(requirement, day, evidence, now) : false;
    }).length),
    0,
  );
  const scheduledCells = rows.reduce((total, row) => total + (row.weeklyQuota ?? 1), 0);
  const todayRows = weeklyRequirements.filter((row) => row.scheduledDate === today);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const isToday = day === today;
          const completed = weeklyRequirements.filter(
            (requirement) => requirement.scheduledDate === day && isDayComplete(requirement, day, evidence, now),
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

      <QuestHeatMap
        days={days}
        rows={rows}
        evidence={evidence}
        now={now}
        weeklyRequirements={weeklyRequirements}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Today</p>
        {todayRows.length > 0 ? (
          <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--background)]">
            {todayRows.map((row) => {
              const complete = isDayComplete(row, today, evidence, now);
              const Icon = activityIcons[row.activityKey] ?? activityIcons.custom;
              return (
                <li key={row.commitmentId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <Link
                    href="/activities"
                    aria-label={`Log ${row.title}`}
                    className="group flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-pro)]"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]"><Icon aria-hidden="true" className="size-3.5" /></span>
                    <span className="truncate text-sm font-semibold text-[var(--foreground)] transition group-hover:text-[var(--accent-pro)]">{row.title}</span>
                  </Link>
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
        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{completedCells}/{scheduledCells} complete</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Daily average</p>
          <p className="mt-1 numeric font-mono text-sm font-semibold text-[var(--foreground)]">{formatPercent(completedCells / Math.max(scheduledCells, 1))}%</p>
        </div>
      </div>

      <WeeklyReminderSummary reminders={weeklyReminders} />

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
                  <Link
                    href="/activities"
                    aria-label={`Log ${row.title}`}
                    className="group flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-pro)]"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]"><Icon aria-hidden="true" className="size-3.5" /></span>
                    <span className="truncate text-xs font-semibold text-[var(--foreground)] transition group-hover:text-[var(--accent-pro)]">{row.title}</span>
                  </Link>
                  {days.map((day) => {
                    const requirement = requirementForDay(row.commitmentId, day, weeklyRequirements);
                    const scheduled = Boolean(requirement);
                    const complete = requirement ? isDayComplete(requirement, day, evidence, now) : false;
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

function QuestHeatMap({
  days,
  rows,
  evidence,
  now,
  weeklyRequirements,
}: {
  days: string[];
  rows: ScheduledRequirement[];
  evidence: ActivityExecutionEvidence[];
  now: string;
  weeklyRequirements: ScheduledRequirement[];
}) {
  const definition = rotatingEvolveDefinition(now);
  const recordedThisWeek = rows.reduce(
    (total, row) => total + days.filter((day) => {
      const requirement = requirementForDay(row.commitmentId, day, weeklyRequirements);
      return requirement ? isDayComplete(requirement, day, evidence, now) : false;
    }).length,
    0,
  );

  return (
    <section className="w-full overflow-hidden rounded-md border border-[var(--foreground-muted)]/35 bg-[var(--background)] p-3 sm:p-4" aria-labelledby="quest-heat-map-title">
      <div className="grid gap-4 lg:grid-cols-[minmax(12rem,0.72fr)_minmax(0,1.28fr)] lg:gap-5">
        <aside className="rounded-sm border-b border-[var(--foreground-muted)]/35 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5" aria-label="Definition of consistency">
          <p className="font-serif text-4xl font-semibold leading-none tracking-tight text-[var(--foreground)] sm:text-5xl">{definition.word}</p>
          <p className="mt-3 font-serif text-xs italic text-[var(--foreground-muted)]">{definition.pronunciation} &nbsp; noun &bull; English</p>
          <div className="my-3 border-t border-[var(--foreground-muted)]/55" />
          <p className="font-serif text-sm leading-6 text-[var(--foreground)] sm:text-[15px]">{definition.description}</p>
        </aside>

        <div className="space-y-2.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p id="quest-heat-map-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]">Execution heat map</p>
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{recordedThisWeek} activit{recordedThisWeek === 1 ? "y" : "ies"} recorded this week.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-[var(--foreground-muted)]" aria-label="Heat map legend">
          <span>Less</span>
          <i className="size-3 rounded-[3px] border border-[var(--border)] bg-[var(--surface-elevated)]" aria-hidden="true" />
          <i className="size-3 rounded-[3px] bg-[var(--foreground-muted)]/55" aria-hidden="true" />
          <i className="size-3 rounded-[3px] bg-[var(--foreground-muted)]/80" aria-hidden="true" />
          <i className="size-3 rounded-[3px] bg-[var(--foreground)]" aria-hidden="true" />
          <span>More</span>
        </div>
          </div>

          <div className="w-full">
            <div className="space-y-1">
          <div className="grid grid-cols-[minmax(4.75rem,0.85fr)_repeat(7,minmax(0,1fr))] gap-1">
            <span aria-hidden="true" />
            {days.map((day) => <span key={day} className="text-center text-[0.62rem] font-semibold uppercase text-[var(--foreground-muted)]">{dayLabel(day).slice(0, 1)}</span>)}
          </div>
              {rows.map((row) => (
            <div key={row.commitmentId} className="grid grid-cols-[minmax(4.75rem,0.85fr)_repeat(7,minmax(0,1fr))] items-center gap-1">
              <span className="min-w-0 truncate text-[10px] font-semibold text-[var(--foreground)]">{row.title}</span>
              {days.map((day) => {
                const requirement = requirementForDay(row.commitmentId, day, weeklyRequirements);
                const scheduled = Boolean(requirement);
                const complete = requirement ? isDayComplete(requirement, day, evidence, now) : false;
                return (
                  <span
                    key={day}
                    className={cn(
                      "mx-auto aspect-square w-full max-w-5 rounded-sm border transition-colors",
                      complete
                        ? "border-[var(--foreground)] bg-[var(--foreground)]"
                        : scheduled
                          ? "border-[var(--border)] bg-[var(--surface-elevated)]"
                          : "border-transparent bg-transparent",
                    )}
                    title={`${row.title}, ${day}: ${complete ? "completed" : scheduled ? "scheduled" : "not scheduled"}`}
                    aria-label={`${row.title}, ${day}: ${complete ? "completed" : scheduled ? "scheduled" : "not scheduled"}`}
                  />
                );
              })}
            </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const evolveDefinitions = [
  {
    word: "consistency",
    pronunciation: "[kuhn-sis-tuhn-see]",
    description: "the ability to repeat a process or activity with the same level of quality over and over again. the adherence of the same principles in a steadfast way.",
  },
  {
    word: "discipline",
    pronunciation: "[dis-uh-plin]",
    description: "the practice of directing attention and action toward a chosen standard, especially when comfort offers an easier direction.",
  },
  {
    word: "focus",
    pronunciation: "[foh-kuhs]",
    description: "the deliberate narrowing of attention toward the work that matters, while the unnecessary is left outside the frame.",
  },
  {
    word: "passion",
    pronunciation: "[pash-uhn]",
    description: "a sustained care for meaningful work that keeps returning you to the standard, even after the first excitement has passed.",
  },
] as const;

function rotatingEvolveDefinition(now: string) {
  const dayKey = now.slice(0, 10);
  const hash = [...dayKey].reduce((total, character) => total + character.charCodeAt(0), 0);
  return evolveDefinitions[hash % evolveDefinitions.length] ?? evolveDefinitions[0];
}

function WeeklyReminderSummary({ reminders }: { reminders: WeeklyReminder[] }) {
  const visibleReminders = reminders.filter((reminder) => reminder.enabled);
  if (visibleReminders.length === 0) return null;

  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-4" aria-labelledby="weekly-reminders-summary">
      <div className="flex items-center gap-2">
        <Bell aria-hidden="true" className="size-4 text-[var(--foreground-muted)]" strokeWidth={1.9} />
        <p id="weekly-reminders-summary" className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">Weekly reminders</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {visibleReminders.map((reminder) => (
          <li key={reminder.id} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
            {reminder.completed ? <CheckCircle2 aria-hidden="true" className="size-4 text-[var(--accent-pro)]" /> : <Circle aria-hidden="true" className="size-4 text-[var(--foreground-muted)]" />}
            <span className={cn("truncate font-semibold", reminder.completed ? "text-[var(--foreground-muted)]" : "text-[var(--foreground)]")}>{reminder.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function requirementForDay(
  commitmentId: string,
  day: string,
  requirements: ScheduledRequirement[],
) {
  return requirements.find(
    (requirement) => requirement.commitmentId === commitmentId && requirement.scheduledDate === day,
  );
}

function isDayComplete(
  requirement: ScheduledRequirement,
  day: string,
  evidence: ActivityExecutionEvidence[],
  now: string,
) {
  if (requirement.scheduledDate !== day) return false;
  const requirementEvidence = evidence.filter(
    (item) => item.commitmentId === requirement.commitmentId && item.scheduledFor === requirement.scheduledDate,
  );
  const status = getQuestStatusForRequirement(requirement, requirementEvidence, now);
  return status === "completed" || status === "qualifying_partial";
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
