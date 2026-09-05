"use client";

import { useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  ListChecks,
  Moon,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  DailyDeadlineState,
  DailyExecutionItem,
  DailyExecutionSnapshot,
  DailyExecutionStatus,
  EvolveNotification,
  EvolveNotificationSeverity,
  ExecutionAlertLevel,
  TodayBossAlert,
  TodayInactiveAlert,
  TodayReadingState,
} from "@/types/daily-execution";
import type { WeeklyReminder } from "@/types/weekly-reminder";
import type { ServerCommandResponse } from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

type TodayExecutionProps = {
  execution: DailyExecutionSnapshot;
  completeWeeklyReminderAction?: (
    reminderId: string,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
};

const statusLabels: Record<DailyExecutionStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  qualifying_partial: "Partial",
  attempted: "Attempted",
  missed: "Missed",
  inactive: "Inactive",
  scheduled_rest: "Scheduled rest",
};

const severityLabels: Record<ExecutionAlertLevel, string> = {
  reminder: "Reminder",
  warning: "Warning",
  critical: "Critical",
};

const notificationSeverityLabels: Record<EvolveNotificationSeverity, string> = {
  reminder: "Reminder",
  warning: "Warning",
  critical: "Critical",
  success: "Success",
};

const itemPriority: Record<DailyExecutionStatus, number> = {
  pending: 0,
  in_progress: 0,
  missed: 1,
  attempted: 2,
  qualifying_partial: 3,
  inactive: 2,
  scheduled_rest: 3,
  completed: 4,
};

const statusIcons: Record<DailyExecutionStatus, LucideIcon> = {
  pending: Circle,
  in_progress: Clock3,
  completed: CheckCircle2,
  qualifying_partial: CheckCircle2,
  attempted: Circle,
  missed: XCircle,
  inactive: Moon,
  scheduled_rest: Clock3,
};

export function TodayExecution({ execution, completeWeeklyReminderAction }: TodayExecutionProps) {
  const [weeklyReminders, setWeeklyReminders] = useState(
    execution.weeklyReminders.reminders,
  );
  const unresolvedItems = execution.items.filter((item) => item.status === "pending");
  const requiredItems = execution.items.filter(
    (item) => item.status !== "inactive" && item.status !== "scheduled_rest",
  );
  const completedItems = execution.items.filter(
    (item) => item.status === "completed",
  );
  const missedItems = execution.items.filter((item) => item.status === "missed");
  const sortedItems = [...execution.items].sort(
    (a, b) => itemPriority[a.status] - itemPriority[b.status],
  );
  const completionPercent =
    requiredItems.length > 0
      ? Math.round((completedItems.length / requiredItems.length) * 100)
      : 0;
  const enabledWeeklyReminders = weeklyReminders.filter(
    (reminder) => reminder.enabled,
  );

  async function completeWeeklyReminder(reminderId: string) {
    if (completeWeeklyReminderAction) {
      const result = await completeWeeklyReminderAction(reminderId);
      if (!result.ok) return;
    }

    setWeeklyReminders((currentReminders) =>
      currentReminders.map((reminder) =>
        reminder.id === reminderId
          ? {
              ...reminder,
              completed: true,
              completedAt: reminder.completedAt ?? "Current weekly cycle",
            }
          : reminder,
      ),
    );
  }

  return (
    <Card className="space-y-5">
      <TodayHeader
        execution={execution}
        missedCount={missedItems.length}
        remainingCount={unresolvedItems.length}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <section className="space-y-4" aria-labelledby="today-commitments">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="today-commitments"
                className="text-sm font-semibold uppercase text-[var(--foreground-muted)]"
              >
                Today&apos;s commitments
              </h2>
              <p className="numeric mt-1 font-mono text-2xl font-semibold text-[var(--foreground)]">
                {completedItems.length}/{requiredItems.length}
              </p>
            </div>
            <div className="min-w-44">
              <Progress
                value={completionPercent}
                ariaLabel="Daily execution completion"
                ariaValueText={`${completedItems.length} of ${requiredItems.length} required commitments completed`}
                label="Complete"
              />
            </div>
          </div>

          {sortedItems.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {sortedItems.map((item) => (
                <ExecutionItemRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <SystemState
              title="No required commitments today."
              description="If nothing is configured, choose active Improvement Areas first."
              icon={CheckCircle2}
              compact
            />
          )}

          <WeeklyReminderSection
            reminders={enabledWeeklyReminders}
            onCompleteReminder={completeWeeklyReminder}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
              href="/activities"
            >
              <PlusCircle
                aria-hidden="true"
                className="size-4"
                focusable="false"
                strokeWidth={1.9}
              />
              Log Activity
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              href="/settings"
            >
              <SlidersHorizontal
                aria-hidden="true"
                className="size-4"
                focusable="false"
                strokeWidth={1.9}
              />
              Configure Commitments
            </Link>
          </div>
        </section>

        <aside className="space-y-4" aria-label="Today alerts">
          <DeadlineCard
            execution={execution}
            remainingCount={unresolvedItems.length}
            requiredCount={requiredItems.length}
          />
          {execution.automaticFreezeAvailable ? <FreezeCard /> : null}
          {execution.reading ? <ReadingReminder reading={execution.reading} /> : null}
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
        <BossAlerts alerts={execution.bossAlerts} />
        <NotificationPanel notifications={execution.notifications} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <InactiveAlerts alerts={execution.inactiveAlerts} />
        <DailyCloseout closeout={execution.closeout} />
      </div>
    </Card>
  );
}

function WeeklyReminderSection({
  reminders,
  onCompleteReminder,
}: {
  reminders: WeeklyReminder[];
  onCompleteReminder: (reminderId: string) => void | Promise<void>;
}) {
  return (
    <section
      className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
      aria-labelledby="optional-weekly-reminders"
    >
      <div className="flex items-start gap-3">
        <Bell
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2
            id="optional-weekly-reminders"
            className="text-sm font-semibold uppercase text-[var(--foreground-muted)]"
          >
            Optional this week
          </h2>
        </div>
      </div>

      {reminders.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className={cn(
                "flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between",
                reminder.completed && "opacity-75",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                {reminder.completed ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[var(--accent-pro)]"
                    focusable="false"
                    strokeWidth={1.9}
                  />
                ) : (
                  <Circle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
                    focusable="false"
                    strokeWidth={1.9}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {reminder.title}
                  </p>
                </div>
              </div>
              {reminder.completed ? (
                <span className="text-sm font-semibold text-[var(--foreground-muted)]">
                  Completed
                </span>
              ) : (
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.99]"
                  type="button"
                  onClick={() => onCompleteReminder(reminder.id)}
                  aria-label={`Mark optional weekly reminder ${reminder.title} done`}
                >
                  Done
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No optional reminders this week."
          description="Weekly Reminders can be added in Settings."
          icon={Bell}
          compact
        />
      )}
    </section>
  );
}

function TodayHeader({
  execution,
  remainingCount,
  missedCount,
}: {
  execution: DailyExecutionSnapshot;
  remainingCount: number;
  missedCount: number;
}) {
  const level = execution.alertLevel;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--background)] p-4",
        level === "reminder" && "bg-[var(--accent-subtle)]",
        level === "warning" && "bg-[var(--warning-subtle)]",
        level === "critical" && "bg-[var(--boss-subtle)]",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Today
            </p>
            {level ? (
              <Badge tone={level === "critical" ? "warning" : "neutral"}>
                {severityLabels[level]}
              </Badge>
            ) : (
              <Badge tone="neutral">Normal</Badge>
            )}
          </div>
          <h1 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {getHeadline(execution.deadlineState, remainingCount, missedCount)}
          </h1>
        </div>

        <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:min-w-44">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Current
            </span>
            <span className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
              {execution.currentTimeLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Deadline
            </span>
            <span className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
              {execution.deadlineLabel}
            </span>
          </div>
          {execution.timeRemainingLabel ? (
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {execution.timeRemainingLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExecutionItemRow({ item }: { item: DailyExecutionItem }) {
  const Icon = statusIcons[item.status];
  const isUnresolved = item.status === "pending" || item.status === "missed";
  const detail = formatItemDetails(item);

  return (
    <li
      className={cn(
        "grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        !isUnresolved && "opacity-80",
      )}
    >
      <div className="flex min-w-0 gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-elevated)]">
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4",
              item.status === "completed" && "text-[var(--accent-pro)]",
              item.status === "pending" && "text-[var(--foreground)]",
              item.status === "missed" && "text-[var(--boss)]",
              (item.status === "inactive" || item.status === "scheduled_rest") &&
                "text-[var(--foreground-muted)]",
            )}
            focusable="false"
            strokeWidth={1.9}
          />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {item.title}
            </h3>
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground-muted)]">
              {statusLabels[item.status]}
            </span>
            {item.streakAtRisk ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--boss-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--boss)]">
                <Flame
                  aria-hidden="true"
                  className="size-3"
                  focusable="false"
                  strokeWidth={1.9}
                />
                Streak at risk
              </span>
            ) : null}
          </div>
          {detail ? (
            <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
              {detail}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:min-w-36 sm:justify-end">
        {item.targetLabel ? (
          <p className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-elevated)] px-2 py-1 text-sm font-semibold text-[var(--foreground)]">
            <Target
              aria-hidden="true"
              className="size-3.5"
              focusable="false"
              strokeWidth={1.9}
            />
            {item.targetLabel}
          </p>
        ) : null}
        {item.actualLabel ? (
          <p className="inline-flex items-center gap-1.5 rounded-md bg-[var(--background)] px-2 py-1 text-sm font-semibold text-[var(--foreground-muted)]">
            <ListChecks
              aria-hidden="true"
              className="size-3.5"
              focusable="false"
              strokeWidth={1.9}
            />
            {cleanActualLabel(item.actualLabel)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function DeadlineCard({
  execution,
  remainingCount,
  requiredCount,
}: {
  execution: DailyExecutionSnapshot;
  remainingCount: number;
  requiredCount: number;
}) {
  const level = execution.alertLevel;

  return (
    <section
      className={cn(
        "space-y-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-4",
        level === "critical" && "bg-[var(--boss-subtle)]",
      )}
      aria-labelledby="daily-deadline-heading"
    >
      <div className="flex items-start gap-3">
        <Clock3
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2
            id="daily-deadline-heading"
            className="text-sm font-semibold uppercase text-[var(--foreground-muted)]"
          >
            Daily Deadline
          </h2>
          <p className="numeric mt-2 font-mono text-2xl font-semibold text-[var(--foreground)]">
            {execution.deadlineLabel}
          </p>
        </div>
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {requiredCount === 0
          ? "No required commitments today."
          : remainingCount > 0
            ? `${remainingCount} commitment${remainingCount === 1 ? "" : "s"} remaining.`
            : "All required commitments complete."}
      </p>
    </section>
  );
}

function FreezeCard() {
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--streak-subtle)] p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--streak-focused)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Automatic streak protection available
          </h2>
        </div>
      </div>
    </section>
  );
}

function ReadingReminder({ reading }: { reading: TodayReadingState }) {
  const progress =
    reading.totalPages > 0
      ? Math.round((reading.pagesRead / reading.totalPages) * 100)
      : 0;

  return (
    <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-start gap-3">
        <BookOpen
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {reading.status === "recovery" ? "Reading Recovery" : reading.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            {reading.bookTitle}
          </p>
        </div>
      </div>

      {reading.status === "recovery" ? (
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {reading.recoveryDaysRemaining ?? 0} day remaining
        </p>
      ) : (
        <>
          <Progress
            value={progress}
            ariaLabel={`${reading.bookTitle} reading progress`}
            ariaValueText={`${reading.pagesRead} of ${reading.totalPages} pages read`}
            label="Book progress"
          />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {reading.pagesRead} / {reading.totalPages} pages
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            {reading.pagesRemaining} pages remaining
          </p>
        </>
      )}
    </section>
  );
}

function BossAlerts({ alerts }: { alerts: TodayBossAlert[] }) {
  return (
    <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--boss)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2 className="text-sm font-semibold uppercase text-[var(--foreground-muted)]">
            Boss Alerts
          </h2>
        </div>
      </div>

      {alerts.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
            >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getBossTone(alert.status)}>{getBossLabel(alert.status)}</Badge>
              {alert.deadlineLabel ? (
                <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                  {alert.deadlineLabel}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              {alert.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
              {alert.message}
            </p>
            <div className="mt-3 grid gap-1 text-sm">
              {alert.targetLabel ? (
                <span className="font-semibold text-[var(--foreground)]">
                  Target: {alert.targetLabel}
                </span>
              ) : null}
              {alert.actualLabel ? (
                <span className="text-[var(--foreground-muted)]">
                  Actual: {alert.actualLabel}
                </span>
              ) : null}
              {alert.progressLabel ? (
                <span className="text-[var(--foreground-muted)]">
                  {alert.progressLabel}
                </span>
              ) : null}
            </div>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No Boss alerts."
          description="Boss offers and deadlines remain separate from daily commitments."
          icon={ShieldAlert}
          compact
        />
      )}

      <Link
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
        href="/goals"
      >
        View Boss Challenges
      </Link>
    </section>
  );
}

function NotificationPanel({
  notifications,
}: {
  notifications: EvolveNotification[];
}) {
  return (
    <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-start gap-3">
        <Bell
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2 className="text-sm font-semibold uppercase text-[var(--foreground-muted)]">
            Notifications
          </h2>
        </div>
      </div>

      {notifications.length > 0 ? (
        <ul className="space-y-3">
          {notifications.slice(0, 6).map((notification) => (
            <li
              key={notification.id}
              className="grid gap-2 rounded-md bg-[var(--surface)] p-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
            >
            <p className="numeric font-mono text-xs font-semibold text-[var(--foreground-muted)]">
              {notification.createdAt}
            </p>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {notification.title}
                </p>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    notification.severity === "critical"
                      ? "bg-[var(--boss-subtle)] text-[var(--boss)]"
                      : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]",
                  )}
                >
                  {notificationSeverityLabels[notification.severity]}
                </span>
                {notification.mandatory ? (
                  <span className="rounded-md bg-[var(--warning-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                    Mandatory
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                {notification.message}
              </p>
            </div>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No recent notifications."
          description="Meaningful reminders and system events will appear here."
          icon={Bell}
          compact
        />
      )}
    </section>
  );
}

function InactiveAlerts({ alerts }: { alerts: TodayInactiveAlert[] }) {
  return (
    <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-start gap-3">
        <Moon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <h2 className="text-sm font-semibold uppercase text-[var(--foreground-muted)]">
            Inactive Mode Alerts
          </h2>
        </div>
      </div>

      {alerts.length > 0 ? (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
            >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {alert.title}
              </p>
              {typeof alert.daysRemaining === "number" ? (
                <Badge tone="warning">{alert.daysRemaining} day left</Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              {alert.message}
            </p>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No inactive-mode alerts."
          description="Temporary pauses and expiry warnings will appear here."
          icon={Moon}
          compact
        />
      )}
    </section>
  );
}

function DailyCloseout({
  closeout,
}: {
  closeout?: DailyExecutionSnapshot["closeout"];
}) {
  return (
    <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase text-[var(--foreground-muted)]">
          Daily Closeout
        </h2>
      </div>

      {closeout ? (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <CloseoutMetric
              label="Required"
              value={String(closeout.requiredCommitments)}
            />
            <CloseoutMetric
              label="Completed"
              value={String(closeout.completedCommitments)}
            />
            <CloseoutMetric label="Missed" value={String(closeout.missedCommitments)} />
            <CloseoutMetric
              label="Progression"
              value={closeout.progressionImpactLabel}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--foreground-muted)]">
            Overall streak: {closeout.overallEvaluationLabel}
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--foreground-muted)]">Pending</p>
      )}
    </section>
  );
}

function CloseoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-1 font-mono text-sm font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function getHeadline(
  deadlineState: DailyDeadlineState,
  remainingCount: number,
  missedCount: number,
) {
  if (deadlineState === "complete") {
    return "Day complete";
  }

  if (deadlineState === "closeout") {
    return `${missedCount} missed commitment${missedCount === 1 ? "" : "s"}`;
  }

  if (deadlineState === "critical") {
    return `${remainingCount} required commitment${remainingCount === 1 ? "" : "s"} at critical risk`;
  }

  if (deadlineState === "warning") {
    return `${remainingCount} required commitment${remainingCount === 1 ? "" : "s"} still incomplete`;
  }

  if (deadlineState === "reminder") {
    return `${remainingCount} commitment${remainingCount === 1 ? "" : "s"} remain today`;
  }

  return `${remainingCount} commitment${remainingCount === 1 ? "" : "s"} pending`;
}

function formatItemDetails(item: DailyExecutionItem) {
  if (item.status === "scheduled_rest") {
    return "Rest day";
  }

  if (item.status === "inactive") {
    return item.actualLabel ?? "Paused";
  }

  if (item.status === "missed") {
    return "Missed";
  }

  if (item.streakAtRisk && item.streakLabel) {
    return item.streakLabel;
  }

  return null;
}

function cleanActualLabel(label: string) {
  return label.replace(/\s+before deadline$/i, "");
}

function getBossLabel(status: TodayBossAlert["status"]) {
  if (status === "offered") {
    return "New Boss Available";
  }

  if (status === "accepted") {
    return "Boss Deadline";
  }

  if (status === "completed") {
    return "Boss Defeated";
  }

  if (status === "failed") {
    return "Boss Failed";
  }

  return "Boss Rejected";
}

function getBossTone(status: TodayBossAlert["status"]) {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed" || status === "accepted") {
    return "warning";
  }

  return "neutral";
}
