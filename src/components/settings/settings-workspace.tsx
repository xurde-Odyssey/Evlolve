"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  LockKeyhole,
  Moon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { activityDefinitions } from "@/config/activity-definitions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OfflineState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  ActivityKey,
  MeasurementOption,
  MeasurementType,
} from "@/types/activity";
import type { CommitmentTier } from "@/types/improvement";
import type {
  ActivityConfiguration,
  ActivitySchedule,
  ActivityScheduleType,
  CustomActivityDraft,
  NotificationPreference,
  ReadingRecoveryDays,
  SettingsSnapshot,
  Weekday,
} from "@/types/settings";
import type { WeeklyReminder } from "@/types/weekly-reminder";
import type {
  BookaholicActivationInput,
  ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

type SettingsWorkspaceProps = {
  snapshot: SettingsSnapshot;
  activateActivityAction?: (
    configuration: ActivityConfiguration,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  activateBookaholicAction?: (
    input: BookaholicActivationInput,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  deactivateActivityAction?: (
    activityKey: ActivityKey,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
};

const weekdayLabels: Record<Weekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

const weekdayNames: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const weekdays: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const scheduleLabels: Record<ActivityScheduleType, string> = {
  daily: "Daily",
  times_per_week: "Times per week",
  selected_days: "Selected days",
};

const tierLabels: Record<CommitmentTier, string> = {
  core: "Core",
  priority: "Priority",
  flexible: "Flexible",
};

const measurementLabels: Record<MeasurementType, string> = {
  distance: "Distance",
  duration: "Duration",
  pages: "Pages",
  volume: "Volume",
  completion: "Completion",
};

const defaultUnits: Record<MeasurementType, string> = {
  distance: "km",
  duration: "minutes",
  pages: "pages",
  volume: "L",
  completion: "completed",
};

const recoveryOptions: ReadingRecoveryDays[] = [2, 3];
const weekFrequencyOptions = [1, 2, 3, 4, 5, 6, 7];

export function SettingsWorkspace({
  snapshot,
  activateActivityAction,
  activateBookaholicAction,
  deactivateActivityAction,
}: SettingsWorkspaceProps) {
  const [activities, setActivities] = useState(snapshot.activityConfigurations);
  const [notifications, setNotifications] = useState(
    snapshot.notificationPreferences,
  );
  const [weeklyReminders, setWeeklyReminders] = useState(
    snapshot.weeklyReminders.reminders,
  );
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [customActivity, setCustomActivity] = useState(
    snapshot.customActivityDraft,
  );
  const [bookTitle, setBookTitle] = useState(snapshot.reading.currentBookTitle);
  const [bookPages, setBookPages] = useState(String(snapshot.reading.totalPages));
  const [recoveryDays, setRecoveryDays] = useState<ReadingRecoveryDays>(
    snapshot.reading.recoveryDays,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookaholicActivationOpen, setBookaholicActivationOpen] = useState(false);

  const activeCommitments = activities.filter((activity) => activity.active).length;
  const availableSlots = Math.max(snapshot.commitmentCapacity - activeCommitments, 0);

  const measurementOptionMap = useMemo<Map<ActivityKey, MeasurementOption[]>>(() => {
    return new Map(
      activityDefinitions.map((definition) => [
        definition.key,
        definition.measurementOptions,
      ]),
    );
  }, []);

  function updateActivity(
    activityKey: ActivityKey,
    update: (activity: ActivityConfiguration) => ActivityConfiguration,
  ) {
    setActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.activityKey === activityKey ? update(activity) : activity,
      ),
    );
  }

  async function toggleActivity(activityKey: ActivityKey, nextActive: boolean) {
    setErrorMessage(null);
    setStatusMessage(null);

    if (nextActive && activeCommitments >= snapshot.commitmentCapacity) {
      setErrorMessage("Commitment capacity reached. Deactivate a flexible area first.");
      return;
    }

    const activity = activities.find((item) => item.activityKey === activityKey);
    if (nextActive && activityKey === "reading" && activateBookaholicAction && activity) {
      setBookaholicActivationOpen(true);
      return;
    }
    if (nextActive && activateActivityAction && activity) {
      const result = await activateActivityAction(activity);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
    }

    if (!nextActive && deactivateActivityAction) {
      const result = await deactivateActivityAction(activityKey);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
    }

    updateActivity(activityKey, (activity) => ({
      ...activity,
      active: nextActive,
    }));
  }

  async function activateBookaholic() {
    const readingPages = Number(bookPages);
    const validationError = validateReading(bookTitle, readingPages, recoveryDays);
    if (validationError) {
      setStatusMessage(null);
      setErrorMessage(validationError);
      return;
    }

    const activity = activities.find((item) => item.activityKey === "reading");
    if (!activity || !activateBookaholicAction) return;

    const result = await activateBookaholicAction({
      configuration: activity,
      bookTitle,
      totalPages: readingPages,
      recoveryDays,
    });
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    updateActivity("reading", (currentActivity) => ({ ...currentActivity, active: true }));
    setBookaholicActivationOpen(false);
    setErrorMessage(null);
    setStatusMessage("Bookaholic is active. Your first target starts at 5 pages.");
  }

  function handleMeasurementChange(
    activity: ActivityConfiguration,
    measurementType: MeasurementType,
  ) {
    const matchingOption = measurementOptionMap
      .get(activity.activityKey)
      ?.find((option) => option.type === measurementType);

    updateActivity(activity.activityKey, (currentActivity) => ({
      ...currentActivity,
      measurementType,
      unit: matchingOption?.unit ?? defaultUnits[measurementType],
    }));
  }

  function saveSettings() {
    const readingPages = Number(bookPages);
    const validationError =
      validateConfiguredActivities(activities) ??
      validateReading(bookTitle, readingPages, recoveryDays);

    if (validationError) {
      setStatusMessage(null);
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setStatusMessage("Settings saved locally for this demo.");
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCustomActivity(customActivity);

    if (validationError) {
      setStatusMessage(null);
      setErrorMessage(validationError);
      return;
    }

    if (activeCommitments >= snapshot.commitmentCapacity) {
      setStatusMessage(null);
      setErrorMessage("Custom activity cannot activate because capacity is full.");
      return;
    }

    setErrorMessage(null);
    setStatusMessage("Custom activity configuration prepared as demo state.");
  }

  return (
    <div className="space-y-6">
      {(statusMessage || errorMessage) && (
        <p
          className={cn(
            "rounded-md border px-4 py-3 text-sm font-semibold",
            errorMessage
              ? "border-[var(--border)] bg-[var(--warning-subtle)] text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--foreground)]",
          )}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage ?? statusMessage}
        </p>
      )}

      <SettingsOverview
        activeCommitments={activeCommitments}
        availableSlots={availableSlots}
        snapshot={snapshot}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <ActivityConfigurationPanel
          activities={activities}
          capacity={snapshot.commitmentCapacity}
          activeCommitments={activeCommitments}
          measurementOptionMap={measurementOptionMap}
          onToggleActivity={toggleActivity}
          onMeasurementChange={handleMeasurementChange}
          onUpdateActivity={updateActivity}
        />

        <div className="space-y-6">
          <InactiveModePanel snapshot={snapshot} />
          <StreakProtectionPanel
            activities={activities}
            availableFreezes={snapshot.availableFreezes}
          />
          <SystemManagedPanel snapshot={snapshot} />
          <OfflineState />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <CustomActivityPanel
          customActivity={customActivity}
          onChange={setCustomActivity}
          onSubmit={handleCustomSubmit}
        />
      </div>

      {bookaholicActivationOpen ? (
        <BookaholicActivationDialog
          bookTitle={bookTitle}
          bookPages={bookPages}
          recoveryDays={recoveryDays}
          oneActiveBookEncouraged={snapshot.reading.oneActiveBookEncouraged}
          onBookPagesChange={setBookPages}
          onBookTitleChange={setBookTitle}
          onRecoveryDaysChange={setRecoveryDays}
          onCancel={() => setBookaholicActivationOpen(false)}
          onConfirm={activateBookaholic}
        />
      ) : null}

      <WeeklyRemindersPanel
        maxActive={snapshot.weeklyReminders.maxActive}
        newReminderTitle={newReminderTitle}
        reminders={weeklyReminders}
        onAddReminder={() => {
          const title = newReminderTitle.trim();

          if (!title) {
            setStatusMessage(null);
            setErrorMessage("Reminder name is required.");
            return;
          }

          const activeCount = weeklyReminders.filter(
            (reminder) => reminder.enabled,
          ).length;

          setErrorMessage(null);
          setStatusMessage("Weekly Reminder added locally for this demo.");
          setWeeklyReminders((currentReminders) => [
            ...currentReminders,
            {
              id: `weekly-reminder-${currentReminders.length + 1}`,
              title,
              enabled: activeCount < snapshot.weeklyReminders.maxActive,
              completed: false,
              createdAt: "2026-08-28",
              completedAt: null,
            },
          ]);
          setNewReminderTitle("");
        }}
        onNewReminderTitleChange={setNewReminderTitle}
        onRemoveReminder={(reminderId) => {
          setErrorMessage(null);
          setStatusMessage("Weekly Reminder removed. Completion history boundary preserved for future backend.");
          setWeeklyReminders((currentReminders) =>
            currentReminders.filter((reminder) => reminder.id !== reminderId),
          );
        }}
        onRenameReminder={(reminderId, title) => {
          setWeeklyReminders((currentReminders) =>
            currentReminders.map((reminder) =>
              reminder.id === reminderId ? { ...reminder, title } : reminder,
            ),
          );
        }}
        onToggleReminder={(reminderId, enabled) => {
          const activeCount = weeklyReminders.filter(
            (reminder) => reminder.enabled,
          ).length;

          if (enabled && activeCount >= snapshot.weeklyReminders.maxActive) {
            setStatusMessage(null);
            setErrorMessage("Turn off an active reminder before enabling another.");
            return;
          }

          setErrorMessage(null);
          setStatusMessage(null);
          setWeeklyReminders((currentReminders) =>
            currentReminders.map((reminder) =>
              reminder.id === reminderId ? { ...reminder, enabled } : reminder,
            ),
          );
        }}
      />

      <NotificationsPanel
        notifications={notifications}
        onChange={setNotifications}
      />

      <div className="flex justify-end">
        <Button className="w-full sm:w-auto" onClick={saveSettings}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function WeeklyRemindersPanel({
  reminders,
  maxActive,
  newReminderTitle,
  onAddReminder,
  onNewReminderTitleChange,
  onRemoveReminder,
  onRenameReminder,
  onToggleReminder,
}: {
  reminders: WeeklyReminder[];
  maxActive: number;
  newReminderTitle: string;
  onAddReminder: () => void;
  onNewReminderTitleChange: (title: string) => void;
  onRemoveReminder: (reminderId: string) => void;
  onRenameReminder: (reminderId: string, title: string) => void;
  onToggleReminder: (reminderId: string, enabled: boolean) => void;
}) {
  const activeCount = reminders.filter((reminder) => reminder.enabled).length;
  const activeLimitReached = activeCount >= maxActive;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
            focusable="false"
            strokeWidth={1.9}
          />
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Weekly Reminders
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              Optional actions you want Evolve to keep visible.
            </p>
          </div>
        </div>
        <Badge tone={activeLimitReached ? "warning" : "neutral"}>
          {activeCount} / {maxActive} active
        </Badge>
      </div>

      {activeLimitReached ? (
        <p className="rounded-md bg-[var(--warning-subtle)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
          Turn off an active reminder before enabling another.
        </p>
      ) : null}

      {reminders.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {reminders.map((reminder) => {
            const cannotEnable = !reminder.enabled && activeLimitReached;

            return (
              <li
                key={reminder.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {reminder.completed ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-3 size-4 shrink-0 text-[var(--accent-pro)]"
                      focusable="false"
                      strokeWidth={1.9}
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className="mt-3 size-4 shrink-0 text-[var(--foreground-muted)]"
                      focusable="false"
                      strokeWidth={1.9}
                    />
                  )}
                  <label className="min-w-0 flex-1 space-y-2">
                    <span className="sr-only">Reminder name</span>
                    <input
                      className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)]"
                      value={reminder.title}
                      onChange={(event) =>
                        onRenameReminder(reminder.id, event.target.value)
                      }
                    />
                    <span className="block text-sm text-[var(--foreground-muted)]">
                      Anytime this week ·{" "}
                      {reminder.enabled
                        ? reminder.completed
                          ? "Completed"
                          : "Pending"
                        : "Off"}
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                    <input
                      checked={reminder.enabled}
                      className="size-4 accent-[var(--primary)]"
                      disabled={cannotEnable}
                      type="checkbox"
                      onChange={(event) =>
                        onToggleReminder(reminder.id, event.target.checked)
                      }
                    />
                    {reminder.enabled ? "On" : "Off"}
                  </label>
                  <Button
                    className="gap-2"
                    variant="ghost"
                    onClick={() => onRemoveReminder(reminder.id)}
                  >
                    <Trash2
                      aria-hidden="true"
                      className="size-4"
                      focusable="false"
                      strokeWidth={1.9}
                    />
                    Remove
                  </Button>
                </div>

                {cannotEnable ? (
                  <p className="text-sm text-[var(--foreground-muted)] lg:col-span-2">
                    This reminder is off and does not count toward the active limit.
                    Turn another reminder off before enabling it.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No optional reminders.
          </p>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Add up to three things you want to keep in mind each week.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Reminder</span>
          <input
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            value={newReminderTitle}
            onChange={(event) => onNewReminderTitleChange(event.target.value)}
          />
        </label>
        <Button className="self-end gap-2" type="button" onClick={onAddReminder}>
          <Plus
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={1.9}
          />
          Add Reminder
        </Button>
      </div>
    </Card>
  );
}

function SettingsOverview({
  snapshot,
  activeCommitments,
  availableSlots,
}: {
  snapshot: SettingsSnapshot;
  activeCommitments: number;
  availableSlots: number;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Rules
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            Execution rules and configuration
          </h2>
        </div>
        <Badge tone={availableSlots > 0 ? "neutral" : "warning"}>
          {activeCommitments} / {snapshot.commitmentCapacity} active
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <OverviewMetric label="Slots open" value={String(availableSlots)} />
        <OverviewMetric label="Warning starts" value={snapshot.warningThresholdLabel} />
        <OverviewMetric
          label="Daily deadline"
          value={snapshot.progressionDeadlineLabel}
        />
        <OverviewMetric label="Calendar boundary" value={snapshot.calendarBoundaryLabel} />
        <OverviewMetric label="Freeze use" value="Automatic" />
        <OverviewMetric label="Inactive limit" value="7 days" />
      </div>
    </Card>
  );
}

function ActivityConfigurationPanel({
  activities,
  activeCommitments,
  capacity,
  measurementOptionMap,
  onToggleActivity,
  onMeasurementChange,
  onUpdateActivity,
}: {
  activities: ActivityConfiguration[];
  activeCommitments: number;
  capacity: number;
  measurementOptionMap: Map<ActivityKey, { type: MeasurementType; label: string; unit: string }[]>;
  onToggleActivity: (activityKey: ActivityKey, nextActive: boolean) => void | Promise<void>;
  onMeasurementChange: (
    activity: ActivityConfiguration,
    measurementType: MeasurementType,
  ) => void;
  onUpdateActivity: (
    activityKey: ActivityKey,
    update: (activity: ActivityConfiguration) => ActivityConfiguration,
  ) => void;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <SlidersHorizontal
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Activities
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Configure schedules and valid measurements.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          const options = measurementOptionMap.get(activity.activityKey) ?? [];

          return (
            <section
              key={activity.activityKey}
              className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {activity.activityLabel}
                    </h3>
                    <Badge tone={activity.active ? "accent" : "neutral"}>
                      {activity.active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-1 text-xs font-semibold text-[var(--foreground-muted)]">
                      {tierLabels[activity.tier]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                    Adaptive target: {activity.adaptiveTargetLabel ?? "Pending"} ·
                    Managed by Evolve
                  </p>
                </div>
                <Button
                  variant={activity.active ? "secondary" : "primary"}
                  disabled={!activity.active && activeCommitments >= capacity}
                  onClick={() =>
                    onToggleActivity(activity.activityKey, !activity.active)
                  }
                >
                  {activity.active ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
                  <span>Measurement</span>
                  <select
                    className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                    value={activity.measurementType}
                    onChange={(event) =>
                      onMeasurementChange(
                        activity,
                        event.target.value as MeasurementType,
                      )
                    }
                  >
                    {options.map((option) => (
                      <option key={option.type} value={option.type}>
                        {option.label} ({option.unit})
                      </option>
                    ))}
                  </select>
                </label>

                <ScheduleEditor
                  schedule={activity.schedule}
                  idPrefix={activity.activityKey}
                  onChange={(schedule) =>
                    onUpdateActivity(activity.activityKey, (currentActivity) => ({
                      ...currentActivity,
                      schedule,
                    }))
                  }
                />
              </div>

              {activity.tier === "core" || activity.tier === "priority" ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]">
                  <LockKeyhole
                    aria-hidden="true"
                    className="size-4"
                    focusable="false"
                    strokeWidth={1.9}
                  />
                  Core and Priority tiers are locked in Settings.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function ScheduleEditor({
  idPrefix,
  schedule,
  onChange,
}: {
  idPrefix: string;
  schedule: ActivitySchedule;
  onChange: (schedule: ActivitySchedule) => void;
}) {
  const selectedDays = schedule.selectedDays ?? [];

  function updateType(type: ActivityScheduleType) {
    if (type === "daily") {
      onChange({ type });
      return;
    }

    if (type === "times_per_week") {
      onChange({ type, timesPerWeek: schedule.timesPerWeek ?? 4 });
      return;
    }

    onChange({
      type,
      selectedDays: selectedDays.length > 0 ? selectedDays : ["sunday"],
    });
  }

  function toggleDay(day: Weekday) {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((selectedDay) => selectedDay !== day)
      : [...selectedDays, day];

    onChange({ type: "selected_days", selectedDays: nextDays });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-[var(--foreground)]">
        Schedule
      </legend>
      <select
        className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
        value={schedule.type}
        onChange={(event) => updateType(event.target.value as ActivityScheduleType)}
      >
        {Object.entries(scheduleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {schedule.type === "times_per_week" ? (
        <label className="block text-sm text-[var(--foreground-muted)]">
          <span className="sr-only">Times per week</span>
          <select
            className="mt-2 min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
            value={schedule.timesPerWeek ?? 4}
            onChange={(event) =>
              onChange({
                type: "times_per_week",
                timesPerWeek: Number(event.target.value),
              })
            }
          >
            {weekFrequencyOptions.map((option) => (
              <option key={option} value={option}>
                {option} times/week
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {schedule.type === "selected_days" ? (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-7"
          aria-label={`${idPrefix} selected days`}
        >
          {weekdays.map((day) => {
            const selected = selectedDays.includes(day);

            return (
              <button
                key={day}
                className={cn(
                  "min-h-10 rounded-md border px-2 text-sm font-semibold transition",
                  selected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)]",
                )}
                type="button"
                aria-pressed={selected}
                aria-label={weekdayNames[day]}
                onClick={() => toggleDay(day)}
              >
                {weekdayLabels[day]}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs text-[var(--foreground-muted)]">
        {formatSchedule(schedule)}
      </p>
    </fieldset>
  );
}

function InactiveModePanel({ snapshot }: { snapshot: SettingsSnapshot }) {
  const settings = [snapshot.inactiveMode.available, snapshot.inactiveMode.used];

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Moon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Inactive Mode
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Planned pause, history preserved.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {settings.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  {item.usedThisMonth
                    ? "Used this month"
                    : "Available this month"}
                </p>
              </div>
              <Badge tone={item.usedThisMonth ? "warning" : "accent"}>
                {item.usedThisMonth ? "Used" : "Available"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">
              Max {item.maxDurationDays} days · {item.monthlyAllowance} session per
              calendar month.
            </p>
            {item.availableAgainLabel ? (
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                Available again: {item.availableAgainLabel}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StreakProtectionPanel({
  activities,
  availableFreezes,
}: {
  activities: ActivityConfiguration[];
  availableFreezes: number;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Streak Protection
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Automatic when eligible.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <OverviewMetric label="Available freezes" value={String(availableFreezes)} />
        <OverviewMetric label="Use behavior" value="Automatic" />
      </div>

      <ul className="space-y-2">
        {activities.slice(0, 4).map((activity) => (
          <li
            key={activity.activityKey}
            className="flex items-center justify-between gap-3 rounded-md bg-[var(--background)] px-3 py-2 text-sm"
          >
            <span className="font-semibold text-[var(--foreground)]">
              {activity.activityLabel}
            </span>
            <span className="text-[var(--foreground-muted)]">
              {activity.freezeEligible
                ? "Eligible after sustained progress"
                : "Not yet eligible"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SystemManagedPanel({ snapshot }: { snapshot: SettingsSnapshot }) {
  return (
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
            System-Controlled
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Progression rules are not editable.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {snapshot.systemControlled.map((item) => (
          <li
            key={item.label}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {item.label}
              </p>
              <Badge tone="neutral">{item.value}</Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CustomActivityPanel({
  customActivity,
  onChange,
  onSubmit,
}: {
  customActivity: CustomActivityDraft;
  onChange: (activity: CustomActivityDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Plus
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Custom Activity
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Configure work, not rewards.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Name</span>
          <input
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            value={customActivity.name}
            onChange={(event) =>
              onChange({ ...customActivity, name: event.target.value })
            }
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
            <span>Measurement</span>
            <select
              className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
              value={customActivity.measurementType}
              onChange={(event) => {
                const measurementType = event.target.value as MeasurementType;
                onChange({
                  ...customActivity,
                  measurementType,
                  unit: defaultUnits[measurementType],
                });
              }}
            >
              {Object.entries(measurementLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
            <span>Unit</span>
            <input
              className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
              value={customActivity.unit}
              onChange={(event) =>
                onChange({ ...customActivity, unit: event.target.value })
              }
            />
          </label>
        </div>

        <ScheduleEditor
          idPrefix="custom-activity"
          schedule={customActivity.schedule}
          onChange={(schedule) => onChange({ ...customActivity, schedule })}
        />

        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Commitment tier</span>
          <select
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            value={customActivity.tier}
            onChange={(event) =>
              onChange({
                ...customActivity,
                tier: event.target.value as CommitmentTier,
              })
            }
          >
            {Object.entries(tierLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Notes</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            value={customActivity.notes}
            onChange={(event) =>
              onChange({ ...customActivity, notes: event.target.value })
            }
          />
        </label>

        <p className="text-sm text-[var(--foreground-muted)]">
          XP, penalties, difficulty, and level contribution stay managed by Evolve.
        </p>

        <Button className="w-full sm:w-auto" type="submit" variant="secondary">
          Prepare Custom Activity
        </Button>
      </form>
    </Card>
  );
}

function ReadingSettingsPanel({
  bookTitle,
  bookPages,
  oneActiveBookEncouraged,
  recoveryDays,
  onBookTitleChange,
  onBookPagesChange,
  onRecoveryDaysChange,
}: {
  bookTitle: string;
  bookPages: string;
  oneActiveBookEncouraged: boolean;
  recoveryDays: ReadingRecoveryDays;
  onBookTitleChange: (value: string) => void;
  onBookPagesChange: (value: string) => void;
  onRecoveryDaysChange: (value: ReadingRecoveryDays) => void;
}) {
  return (
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
            Reading
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Current book and recovery preference.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Book title</span>
          <input
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            value={bookTitle}
            onChange={(event) => onBookTitleChange(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Total pages</span>
          <input
            className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            inputMode="numeric"
            value={bookPages}
            onChange={(event) => onBookPagesChange(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--foreground)]">
          Reading recovery
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {recoveryOptions.map((option) => (
            <button
              key={option}
              className={cn(
                "min-h-10 rounded-md border px-3 text-sm font-semibold",
                recoveryDays === option
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)]",
              )}
              type="button"
              aria-pressed={recoveryDays === option}
              onClick={() => onRecoveryDaysChange(option)}
            >
              {option} days
            </button>
          ))}
        </div>
      </fieldset>

      {oneActiveBookEncouraged ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          One active book is encouraged. Completed books remain in Reports.
        </p>
      ) : null}
    </Card>
  );
}

function BookaholicActivationDialog({
  bookTitle,
  bookPages,
  recoveryDays,
  oneActiveBookEncouraged,
  onBookTitleChange,
  onBookPagesChange,
  onRecoveryDaysChange,
  onCancel,
  onConfirm,
}: {
  bookTitle: string;
  bookPages: string;
  recoveryDays: ReadingRecoveryDays;
  oneActiveBookEncouraged: boolean;
  onBookTitleChange: (value: string) => void;
  onBookPagesChange: (value: string) => void;
  onRecoveryDaysChange: (value: ReadingRecoveryDays) => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" role="dialog" aria-modal="true" aria-labelledby="bookaholic-activation-title">
      <Card className="w-full max-w-xl space-y-5 bg-[var(--surface)] shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
            Start a Growth Commitment
          </p>
          <h2 id="bookaholic-activation-title" className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Set up Bookaholic
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Tell Evolve what you are reading. Your first daily target begins at 5 pages and adapts gradually as your reading pace becomes clear.
          </p>
        </div>
        <ReadingSettingsPanel
          bookTitle={bookTitle}
          bookPages={bookPages}
          oneActiveBookEncouraged={oneActiveBookEncouraged}
          recoveryDays={recoveryDays}
          onBookPagesChange={onBookPagesChange}
          onBookTitleChange={onBookTitleChange}
          onRecoveryDaysChange={onRecoveryDaysChange}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>Activate Bookaholic</Button>
        </div>
      </Card>
    </div>
  );
}

function NotificationsPanel({
  notifications,
  onChange,
}: {
  notifications: NotificationPreference[];
  onChange: (notifications: NotificationPreference[]) => void;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Bell
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Notifications
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Reminder categories only.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {notifications.map((notification) => (
          <label
            key={notification.key}
            className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            <span>{notification.label}</span>
            <input
              checked={notification.enabled}
              className="size-5 accent-[var(--primary)]"
              type="checkbox"
              onChange={(event) =>
                onChange(
                  notifications.map((item) =>
                    item.key === notification.key
                      ? { ...item, enabled: event.target.checked }
                      : item,
                  ),
                )
              }
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-[var(--foreground-muted)]">
        Deadline warnings support the fixed {`10:00 PM`} cutoff; delivery logic is
        deferred.
      </p>
    </Card>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-2 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function formatSchedule(schedule: ActivitySchedule) {
  if (schedule.type === "daily") {
    return "Daily";
  }

  if (schedule.type === "times_per_week") {
    return `${schedule.timesPerWeek ?? 0} times/week`;
  }

  const selectedDays = schedule.selectedDays ?? [];

  if (selectedDays.length === 0) {
    return "Select at least one day";
  }

  return selectedDays.map((day) => weekdayLabels[day]).join(" · ");
}

function validateConfiguredActivities(activities: ActivityConfiguration[]) {
  const invalidActivity = activities.find(
    (activity) => !validateSchedule(activity.schedule),
  );

  if (invalidActivity) {
    return `${invalidActivity.activityLabel} needs a valid schedule.`;
  }

  return null;
}

function validateCustomActivity(activity: CustomActivityDraft) {
  if (activity.name.trim().length === 0) {
    return "Custom activity name is required.";
  }

  if (activity.unit.trim().length === 0) {
    return "Custom activity unit is required.";
  }

  if (!validateSchedule(activity.schedule)) {
    return "Custom activity needs a valid schedule.";
  }

  return null;
}

function validateReading(
  bookTitle: string,
  totalPages: number,
  recoveryDays: number,
) {
  if (bookTitle.trim().length === 0) {
    return "Current book title is required.";
  }

  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return "Current book total pages must be positive.";
  }

  if (!recoveryOptions.includes(recoveryDays as ReadingRecoveryDays)) {
    return "Reading recovery must be 2 or 3 days.";
  }

  return null;
}

function validateSchedule(schedule: ActivitySchedule) {
  if (schedule.type === "daily") {
    return true;
  }

  if (schedule.type === "times_per_week") {
    return (
      typeof schedule.timesPerWeek === "number" &&
      Number.isFinite(schedule.timesPerWeek) &&
      schedule.timesPerWeek > 0
    );
  }

  return Array.isArray(schedule.selectedDays) && schedule.selectedDays.length > 0;
}
