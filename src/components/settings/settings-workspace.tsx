"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Ban,
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Check,
  Circle,
  ChevronDown,
  LockKeyhole,
  LoaderCircle,
  Moon,
  Plus,
  Power,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UsersRound,
} from "lucide-react";
import { activityDefinitions } from "@/config/activity-definitions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OfflineState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import {
  isVisualMode,
  saveVisualMode,
  VISUAL_MODE_STORAGE_KEY,
  type VisualMode,
} from "@/lib/ui/visual-mode";
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
  WeeklyReminderInput,
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
  updateActivityAction?: (
    configuration: ActivityConfiguration,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  saveWeeklyRemindersAction?: (
    reminders: WeeklyReminderInput[],
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
  repetitions: "Repetitions",
  completion: "Completion",
};

const defaultUnits: Record<MeasurementType, string> = {
  distance: "km",
  duration: "minutes",
  pages: "pages",
  volume: "L",
  repetitions: "reps",
  completion: "completed",
};

const recoveryOptions: ReadingRecoveryDays[] = [2, 3];
const weekFrequencyOptions = [1, 2, 3, 4, 5, 6, 7];

export function SettingsWorkspace({
  snapshot,
  activateActivityAction,
  activateBookaholicAction,
  deactivateActivityAction,
  saveWeeklyRemindersAction,
  updateActivityAction,
}: SettingsWorkspaceProps) {
  const router = useRouter();
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
  const [isSaving, setIsSaving] = useState(false);
  const [pendingActivityKey, setPendingActivityKey] = useState<ActivityKey | null>(null);
  const [bookaholicActivationOpen, setBookaholicActivationOpen] = useState(false);
  const [learningActivationOpen, setLearningActivationOpen] = useState(false);
  const [learningFocus, setLearningFocus] = useState("");
  const [visualMode, setVisualMode] = useState<VisualMode>("minimal");

  const activeCommitments = activities.filter((activity) => activity.active).length;
  const availableSlots = Math.max(snapshot.commitmentCapacity - activeCommitments, 0);

  useEffect(() => {
    const savedMode = localStorage.getItem(VISUAL_MODE_STORAGE_KEY);
    if (!isVisualMode(savedMode)) return;

    const syncTimer = window.setTimeout(() => setVisualMode(savedMode), 0);
    return () => window.clearTimeout(syncTimer);
  }, []);

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

    setPendingActivityKey(activityKey);

    const activity = activities.find((item) => item.activityKey === activityKey);
    if (nextActive && activityKey === "reading" && activateBookaholicAction && activity) {
      setBookaholicActivationOpen(true);
      setPendingActivityKey(null);
      return;
    }
    if (nextActive && activityKey === "coding" && activity) {
      setLearningFocus("");
      setLearningActivationOpen(true);
      setPendingActivityKey(null);
      return;
    }
    if (nextActive && activateActivityAction && activity) {
      const result = await activateActivityAction(activity);
      if (!result.ok) {
        setPendingActivityKey(null);
        setErrorMessage(result.message);
        return;
      }
    }

    if (!nextActive && deactivateActivityAction) {
      const result = await deactivateActivityAction(activityKey);
      if (!result.ok) {
        setPendingActivityKey(null);
        setErrorMessage(result.message);
        return;
      }
    }

    updateActivity(activityKey, (activity) => ({
      ...activity,
      active: nextActive,
    }));
    if (activateActivityAction || deactivateActivityAction) {
      router.refresh();
    }
    setPendingActivityKey(null);
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
    router.refresh();
  }

  async function activateLearning() {
    const focus = learningFocus.trim();
    if (!focus) {
      setErrorMessage("Enter what you are learning.");
      return;
    }

    const activity = activities.find((item) => item.activityKey === "coding");
    if (!activity) return;

    const configuration = {
      ...activity,
      activityLabel: `Learning · ${focus}`,
    };

    if (activateActivityAction) {
      const result = await activateActivityAction(configuration);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
    }

    updateActivity("coding", (currentActivity) => ({
      ...currentActivity,
      activityLabel: `Learning · ${focus}`,
    }));
    setLearningActivationOpen(false);
    setErrorMessage(null);
    setStatusMessage(`Learning · ${focus} is active.`);
    router.refresh();
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

  async function saveSettings() {
    if (isSaving) return;

    const readingPages = Number(bookPages);
    const validationError =
      validateConfiguredActivities(activities) ??
      validateReading(bookTitle, readingPages, recoveryDays);

    if (validationError) {
      setStatusMessage(null);
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    if (updateActivityAction) {
      const activeConfigurations = activities.filter((activity) => activity.active);
      for (const activity of activeConfigurations) {
        const result = await updateActivityAction(activity);
        if (!result.ok) {
          setIsSaving(false);
          setStatusMessage(null);
          setErrorMessage(result.message);
          return;
        }
      }
    }

    if (saveWeeklyRemindersAction) {
      const result = await saveWeeklyRemindersAction(
        weeklyReminders.map(({ id, title, enabled }) => ({ id, title, enabled })),
      );
      if (!result.ok) {
        setIsSaving(false);
        setStatusMessage(null);
        setErrorMessage(result.message);
        return;
      }
    }

    setErrorMessage(null);
    setStatusMessage(
      saveWeeklyRemindersAction || updateActivityAction
        ? "Settings saved."
        : "Settings prepared for this development workspace.",
    );
    setIsSaving(false);
    router.refresh();
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
    <div className="settings-workspace space-y-8">
      {(statusMessage || errorMessage) && (
        <p
          className={cn(
            "motion-panel rounded-lg border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-soft)]",
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

      <VisualStylePanel
        mode={visualMode}
        onChange={(mode) => {
          setVisualMode(mode);
          saveVisualMode(mode);
        }}
      />

      <div className="settings-primary-grid grid items-start gap-7 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <div className="grid min-w-0 gap-5">
          <ActivityConfigurationPanel
            activities={activities}
            capacity={snapshot.commitmentCapacity}
            activeCommitments={activeCommitments}
            measurementOptionMap={measurementOptionMap}
            onToggleActivity={toggleActivity}
            pendingActivityKey={pendingActivityKey}
            onMeasurementChange={handleMeasurementChange}
            onUpdateActivity={updateActivity}
          />
          <NotificationsPanel
            notifications={notifications}
            onChange={setNotifications}
          />
        </div>

        <div className="settings-rail grid gap-5">
          <InactiveModePanel snapshot={snapshot} />
          <StreakProtectionPanel
            activities={activities}
            availableFreezes={snapshot.availableFreezes}
          />
          <SystemManagedPanel snapshot={snapshot} />
          <OfflineState />
          <BehaviorBoundariesPanel />
          <CustomActivityPanel
            customActivity={customActivity}
            onChange={setCustomActivity}
            onSubmit={handleCustomSubmit}
          />
        </div>
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

      {learningActivationOpen ? (
        <LearningActivationDialog
          focus={learningFocus}
          onFocusChange={setLearningFocus}
          onCancel={() => setLearningActivationOpen(false)}
          onConfirm={activateLearning}
        />
      ) : null}

      <WeeklyRemindersPanel
        maxActive={snapshot.weeklyReminders.maxActive}
        newReminderTitle={newReminderTitle}
        reminders={weeklyReminders}
        onAddReminder={async () => {
          const title = newReminderTitle.trim();

          if (!title) {
            setStatusMessage(null);
            setErrorMessage("Reminder name is required.");
            return;
          }

          const activeCount = weeklyReminders.filter(
            (reminder) => reminder.enabled,
          ).length;

          const nextReminder = {
            id: `weekly-reminder-${Date.now()}`,
            title,
            enabled: activeCount < snapshot.weeklyReminders.maxActive,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
          } satisfies WeeklyReminder;
          const nextReminders = [
            ...weeklyReminders,
            nextReminder,
          ];
          setErrorMessage(null);
          setWeeklyReminders(nextReminders);
          setNewReminderTitle("");
          if (saveWeeklyRemindersAction) {
            const result = await saveWeeklyRemindersAction(
              nextReminders.map(({ id, title: reminderTitle, enabled }) => ({
                id,
                title: reminderTitle,
                enabled,
              })),
            );
            if (!result.ok) {
              setWeeklyReminders(weeklyReminders);
              setNewReminderTitle(title);
              setStatusMessage(null);
              setErrorMessage(result.message);
              return;
            }
          }
          setStatusMessage("Reminder saved.");
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

      <div className="flex justify-end">
        <Button className="action-pill w-full gap-2 sm:w-auto" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function BehaviorBoundariesPanel() {
  const [openForm, setOpenForm] = useState<"social" | "boundary" | null>(null);
  const [socialType, setSocialType] = useState("Social outing");
  const [socialNotes, setSocialNotes] = useState("");
  const [boundaryName, setBoundaryName] = useState("");
  const [boundaryMode, setBoundaryMode] = useState("ZERO");
  const [boundaryLimit, setBoundaryLimit] = useState("1");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function showSavedMessage(message: string) {
    setSavedMessage(message);
    setOpenForm(null);
  }

  return (
    <Card className="settings-panel space-y-6">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--accent)]">
          <ShieldCheck
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Behavior &amp; boundaries
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Keep lifestyle context and personal limits separate from your growth commitments.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent)]">
            <UsersRound
              aria-hidden="true"
              className="size-4"
              focusable="false"
              strokeWidth={1.9}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">Social outings</p>
            <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
              Record context only when it helps explain your rhythm.
            </p>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            aria-label="Add social outing"
            aria-expanded={openForm === "social"}
            onClick={() => {
              setSavedMessage(null);
              setOpenForm(openForm === "social" ? null : "social");
            }}
          >
            {openForm === "social" ? <ChevronDown className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          </button>
          </div>
          {openForm === "social" ? (
            <form
              className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                showSavedMessage(`${socialType} added to your behavior context.`);
                setSocialNotes("");
              }}
            >
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                What happened?
                <select
                  value={socialType}
                  onChange={(event) => setSocialType(event.target.value)}
                  className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  <option>Social outing</option>
                  <option>Late night</option>
                  <option>Recreation</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                Note <span className="font-normal">(optional)</span>
                <input
                  value={socialNotes}
                  onChange={(event) => setSocialNotes(event.target.value)}
                  placeholder="Add useful context"
                  className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)]"
                />
              </label>
              <div className="flex justify-end">
                <Button type="submit" className="min-h-10 px-3 text-xs">
                  Record context
                </Button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Ban
              aria-hidden="true"
              className="size-4"
              focusable="false"
              strokeWidth={1.9}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">Quit or reduce something</p>
            <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
              Set a personal boundary such as a zero limit or weekly cap.
            </p>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            aria-label="Add personal boundary"
            aria-expanded={openForm === "boundary"}
            onClick={() => {
              setSavedMessage(null);
              setOpenForm(openForm === "boundary" ? null : "boundary");
            }}
          >
            {openForm === "boundary" ? <ChevronDown className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          </button>
          </div>
          {openForm === "boundary" ? (
            <form
              className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!boundaryName.trim()) return;
                showSavedMessage(`${boundaryName.trim()} boundary added.`);
              }}
            >
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                What do you want to change?
                <input
                  required
                  value={boundaryName}
                  onChange={(event) => setBoundaryName(event.target.value)}
                  placeholder="For example, alcohol or gaming"
                  className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                  Boundary
                  <select
                    value={boundaryMode}
                    onChange={(event) => setBoundaryMode(event.target.value)}
                    className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="ZERO">Quit completely</option>
                    <option value="FREQUENCY_CAP">Limit per week</option>
                    <option value="QUANTITY_CAP">Limit quantity</option>
                  </select>
                </label>
                {boundaryMode !== "ZERO" ? (
                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                    Allowed amount
                    <input
                      min="1"
                      type="number"
                      value={boundaryLimit}
                      onChange={(event) => setBoundaryLimit(event.target.value)}
                      className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="min-h-10 px-3 text-xs">
                  Set boundary
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
      {savedMessage ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--accent-subtle)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]" role="status">
          {savedMessage}
        </p>
      ) : null}
    </Card>
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
  onAddReminder: () => void | Promise<void>;
  onNewReminderTitleChange: (title: string) => void;
  onRemoveReminder: (reminderId: string) => void;
  onRenameReminder: (reminderId: string, title: string) => void;
  onToggleReminder: (reminderId: string, enabled: boolean) => void;
}) {
  const activeCount = reminders.filter((reminder) => reminder.enabled).length;
  const activeLimitReached = activeCount >= maxActive;

  return (
    <Card className="settings-panel space-y-6">
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

function VisualStylePanel({
  mode,
  onChange,
}: {
  mode: VisualMode;
  onChange: (mode: VisualMode) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <BookOpenText aria-hidden="true" className="mt-0.5 size-5 text-[var(--accent-pro)]" strokeWidth={1.8} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
            Visual mode
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Choose your working atmosphere
          </h2>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Visual mode">
        {([
          ["modern", "Modern", "Current Evolve style"],
          ["minimal", "Minimal", "Monochrome journal style"],
        ] as const).map(([value, label, description]) => {
          const selected = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(value)}
              className={cn(
                "flex min-h-16 items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition",
                selected
                  ? "border-[var(--accent-pro)] bg-[var(--accent-subtle)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:border-[var(--accent-pro)]",
              )}
            >
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs">{description}</span>
              </span>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-[var(--accent-pro)]" : "border-[var(--border)]")}>
                {selected ? <span className="size-2.5 rounded-full bg-[var(--accent-pro)]" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--foreground-muted)]">Applies instantly and does not change your Evolve data or progression.</p>
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
    <Card className="settings-overview space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Rules
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            Execution rules and configuration
          </h2>
        </div>
        <Badge tone={availableSlots > 0 ? "success" : "accent"}>
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
  pendingActivityKey,
  onMeasurementChange,
  onUpdateActivity,
}: {
  activities: ActivityConfiguration[];
  activeCommitments: number;
  capacity: number;
  measurementOptionMap: Map<ActivityKey, { type: MeasurementType; label: string; unit: string }[]>;
  onToggleActivity: (activityKey: ActivityKey, nextActive: boolean) => void | Promise<void>;
  pendingActivityKey: ActivityKey | null;
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
    <Card className="settings-panel space-y-6">
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
              className="settings-activity-item space-y-5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {activity.activityLabel}
                    </h3>
                    <Badge tone={activity.active ? "success" : "accent"}>
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
                  variant="ghost"
                  className="action-pill-outline gap-2"
                  disabled={pendingActivityKey === activity.activityKey || (!activity.active && activeCommitments >= capacity)}
                  onClick={() =>
                    onToggleActivity(activity.activityKey, !activity.active)
                  }
                >
                  {pendingActivityKey === activity.activityKey ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Power aria-hidden="true" className="size-4" strokeWidth={1.9} />}
                  {pendingActivityKey === activity.activityKey ? (activity.active ? "Deactivating..." : "Activating...") : activity.active ? "Deactivate" : "Activate"}
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
    if (selectedDays.length === 1 && selectedDays.includes(day)) {
      return;
    }

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
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
          <div
            className="grid grid-cols-7 gap-1.5"
            aria-label={`${idPrefix} selected days`}
            role="group"
          >
            {weekdays.map((day) => {
              const selected = selectedDays.includes(day);

              return (
                <button
                  key={day}
                  className={cn(
                    "group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 text-xs font-semibold transition focus-visible:z-10",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)]"
                      : "border-transparent bg-[var(--background)] text-[var(--foreground-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
                  )}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${weekdayNames[day]}${selected ? " selected" : ""}`}
                  onClick={() => toggleDay(day)}
                >
                  <span className="text-[0.68rem] uppercase tracking-[0.08em]">
                    {weekdayLabels[day]}
                  </span>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      selected
                        ? "border-[var(--primary-foreground)]/70 bg-[var(--primary-foreground)]/15"
                        : "border-[var(--border)] bg-[var(--surface)]",
                    )}
                  >
                    {selected ? <Check aria-hidden="true" className="size-3" strokeWidth={2.4} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2 text-xs text-[var(--foreground-muted)]">
            <span>{selectedDays.length} {selectedDays.length === 1 ? "day" : "days"} selected</span>
            <span>{formatSchedule(schedule)}</span>
          </div>
        </div>
      ) : null}

      {schedule.type !== "selected_days" ? (
        <p className="text-xs text-[var(--foreground-muted)]">
          {formatSchedule(schedule)}
        </p>
      ) : null}
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
              <Badge tone={item.usedThisMonth ? "accent" : "success"}>
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

        <Button
          className="action-pill w-full gap-2 sm:w-auto"
          type="submit"
          variant="primary"
        >
          <Plus
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={2}
          />
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
          <Button className="action-pill gap-2" variant="primary" onClick={onConfirm}><Power aria-hidden="true" className="size-4" />Activate Bookaholic</Button>
        </div>
      </Card>
    </div>
  );
}

function LearningActivationDialog({
  focus,
  onFocusChange,
  onCancel,
  onConfirm,
}: {
  focus: string;
  onFocusChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-activation-title"
    >
      <Card className="w-full max-w-xl space-y-5 bg-[var(--surface)] shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
            Start a Growth Commitment
          </p>
          <h2 id="learning-activation-title" className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            What are you learning?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Name the capability or outcome you are building. Evolve will show it with your Learning commitment.
          </p>
        </div>
        <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
          <span>Learning focus</span>
          <input
            autoFocus
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
            placeholder="e.g. Data Analyst"
            value={focus}
            onChange={(event) => onFocusChange(event.target.value)}
          />
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button className="action-pill gap-2" variant="primary" onClick={onConfirm}><Power aria-hidden="true" className="size-4" />Activate Learning</Button>
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
