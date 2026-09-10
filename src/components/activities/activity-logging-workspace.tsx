"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpDown,
  ClipboardPenLine,
  Dumbbell,
  Footprints,
  LoaderCircle,
  Plus,
  Trash2,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { activityDefinitions } from "@/config/activity-definitions";
import { activityIcons } from "@/config/icon-maps";
import { ActivityHistory } from "@/components/activities/activity-history";
import { DailyQuests } from "@/components/quests/daily-quests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import {
  createEvolveApplication,
  getDailyQuestViewModel,
  getScheduledRequirementsForCurrentWeek,
  commitmentDisplayTitle,
  type EvolveLocalState,
} from "@/application/evolve";
import type {
  ServerActivityLogInput,
  ServerActivityLogResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";
import type {
  ActivityDefinition,
  ActivityKey,
  ActivityRecord,
  MeasurementOption,
  MeasurementType,
  WorkoutExercise,
} from "@/types/activity";
import type { GrowthCommitment } from "@/application/evolve";

const fallbackActivityDefinition = activityDefinitions[0] as ActivityDefinition;

type ActivityLoggingWorkspaceProps = {
  initialState: EvolveLocalState;
  logActivityAction?: (
    input: ServerActivityLogInput,
  ) => Promise<EvolveServerActionResult<ServerActivityLogResponse>>;
};

type SuccessState = {
  activityLabel: string;
  measurementText: string;
  matchedQuestCount: number;
};

type WorkoutEntry = {
  id: string;
  exercise: WorkoutExercise;
  measurementType: MeasurementType;
  value: string;
};

export function ActivityLoggingWorkspace({
  initialState,
  logActivityAction,
}: ActivityLoggingWorkspaceProps) {
  return (
    <ActivityLoggingSession
      initialState={initialState}
      logActivityAction={logActivityAction}
    />
  );
}

function ActivityLoggingSession({
  initialState,
  logActivityAction,
}: ActivityLoggingWorkspaceProps) {
  const router = useRouter();
  const [appState, setAppState] = useState<EvolveLocalState>(initialState);
  const activityRecords = appState.activityRecords;
  const quests = getDailyQuestViewModel(appState);
  const activeCommitments = appState.commitments.filter(
    (commitment) => commitment.status === "active",
  );
  const [selectedCommitmentId, setSelectedCommitmentId] = useState(
    activeCommitments[0]?.id ?? "",
  );
  const selectedCommitment = activeCommitments.find(
    (commitment) => commitment.id === selectedCommitmentId,
  ) ?? activeCommitments[0];
  const selectedActivity = selectedCommitment
    ? getActivityDefinition(selectedCommitment.activityKey)
    : fallbackActivityDefinition;
  const [measurementType, setMeasurementType] = useState<MeasurementType>(
    selectedCommitment?.measurementType ??
      selectedActivity.measurementOptions[0]?.type ??
      "completion",
  );
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([
    createWorkoutEntry("pushups"),
  ]);
  const measurementOptions = selectedActivity.key === "workout"
    ? getMeasurementOptions("workout", "general", selectedActivity)
    : selectedActivity.measurementOptions;
  const selectedMeasurement = getMeasurementOption(
    selectedActivity,
    measurementType,
  );
  const [measurementValue, setMeasurementValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionSignature, setLastSubmissionSignature] = useState<
    string | null
  >(null);

  const sortedRecords = useMemo(
    () =>
      [...activityRecords].sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      ),
    [activityRecords],
  );

  function handleCommitmentChange(commitment: GrowthCommitment) {
    const nextActivity = getActivityDefinition(commitment.activityKey);
    setSelectedCommitmentId(commitment.id);
    setWorkoutEntries([createWorkoutEntry("pushups")]);
    setMeasurementType(
      commitment.measurementType ??
        nextActivity.measurementOptions[0]?.type ??
        "completion",
    );
    setMeasurementValue("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (selectedActivity.key === "workout") {
      await handleWorkoutSubmit();
      return;
    }

    let parsedValue: number | undefined;

    if (selectedMeasurement.type !== "completion") {
      const nextValue = Number(measurementValue);

      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        setError("Enter a positive measurement value.");
        setIsSubmitting(false);
        return;
      }

      parsedValue = nextValue;
    }

    const submissionSignature = [
      selectedActivity.key,
      selectedMeasurement.type,
      parsedValue ?? "completed",
      notes.trim(),
    ].join(":");

    if (submissionSignature === lastSubmissionSignature) {
      setError("This activity was already recorded in this session.");
      setIsSubmitting(false);
      return;
    }

    const occurredAt = new Date().toISOString();
    const commandInput = {
      activityKey: selectedActivity.key,
      measurementType: selectedMeasurement.type,
      value: parsedValue,
      unit: selectedMeasurement.unit,
      exercise: undefined,
      notes,
      occurredAt,
      idempotencyKey: submissionSignature,
    } satisfies ServerActivityLogInput;

    if (logActivityAction) {
      const result = await logActivityAction(commandInput);

      if (!result.ok) {
        setError(result.message);
        setIsSubmitting(false);
        return;
      }

      setMeasurementValue("");
      setNotes("");
      setSuccess({
        activityLabel: result.data.record?.activityLabel ?? selectedActivity.label,
        measurementText: formatMeasurementText({
          type: selectedMeasurement.type,
          value: parsedValue,
          unit: selectedMeasurement.unit,
        }),
        matchedQuestCount: result.data.matchedRequirementCount,
      });
      setLastSubmissionSignature(submissionSignature);
      router.refresh();
      setIsSubmitting(false);
      return;
    }

    const app = createEvolveApplication(appState);
    const result = app.logActivity(commandInput);

    setAppState(result.state);
    setMeasurementValue("");
    setNotes("");
    setSuccess({
      activityLabel: result.record.activityLabel,
      measurementText: formatMeasurement(result.record),
      matchedQuestCount: result.matchedRequirementCount,
    });
    setLastSubmissionSignature(submissionSignature);
    setIsSubmitting(false);
  }

  async function handleWorkoutSubmit() {
    const entries = workoutEntries
      .map((entry) => ({
        ...entry,
        value: entry.value.trim(),
        measurement: getWorkoutMeasurement(entry.exercise, entry.measurementType),
      }))
      .filter((entry) => entry.measurement.type !== "completion" || entry.value.length > 0);

    if (
      entries.length === 0 ||
      entries.some((entry) =>
        entry.measurement.type !== "completion" &&
        (!entry.value || !Number.isFinite(Number(entry.value)) || Number(entry.value) <= 0),
      )
    ) {
      setError("Add a positive value for each workout exercise.");
      setIsSubmitting(false);
      return;
    }

    const occurredAt = new Date().toISOString();
    let totalLogged = 0;
    let matchedQuestCount = 0;
    let localState = appState;

    for (const entry of entries) {
      const parsedValue = entry.measurement.type === "completion" ? undefined : Number(entry.value);
      const input = {
        activityKey: "workout" as const,
        exercise: entry.exercise,
        measurementType: entry.measurement.type,
        value: parsedValue,
        unit: entry.measurement.unit,
        notes,
        occurredAt,
        idempotencyKey: `workout:${crypto.randomUUID()}`,
      } satisfies ServerActivityLogInput;

      if (logActivityAction) {
        const result = await logActivityAction(input);
        if (!result.ok) {
          setError(result.message);
          setIsSubmitting(false);
          return;
        }
        totalLogged += 1;
        matchedQuestCount += result.data.matchedRequirementCount;
      } else {
        const app = createEvolveApplication(localState);
        const result = app.logActivity(input);
        localState = result.state;
        totalLogged += 1;
        matchedQuestCount += result.matchedRequirementCount;
      }
    }

    if (!logActivityAction) setAppState(localState);
    setWorkoutEntries([createWorkoutEntry("pushups")]);
    setNotes("");
    setSuccess({
      activityLabel: `Workout · ${totalLogged} exercise${totalLogged === 1 ? "" : "s"}`,
      measurementText: "Session recorded",
      matchedQuestCount,
    });
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <div
      className="relative space-y-6"
      aria-busy={isSubmitting}
      aria-live="polite"
    >
      {isSubmitting ? (
        <div
          className="async-soft-overlay"
          role="status"
          aria-label="Recording activity"
        >
          <div className="async-soft-status">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={1.8} />
            <span>Recording your activity</span>
          </div>
        </div>
      ) : null}
      {activeCommitments.length === 0 ? (
        <SystemState
          title="No active commitments yet."
          description="Choose an Improvement Area before recording completed work."
          action={
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
              href="/settings"
            >
              Choose an Improvement Area
            </Link>
          }
        />
      ) : null}

      {selectedCommitment ? (
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
            Quick log
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            What did you complete?
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Choose one of your active commitments, then record what actually happened.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeCommitments.map((commitment) => {
            const Icon = activityIcons[commitment.activityKey] ?? activityIcons.custom;
            const selected = commitment.id === selectedCommitment.id;

            return (
              <button
                key={commitment.id}
                type="button"
                aria-pressed={selected}
                className={`group flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-[var(--success)] bg-[var(--success-subtle)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--success)] hover:bg-[var(--success-subtle)]"
                }`}
                onClick={() => handleCommitmentChange(commitment)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--success)] text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--success)_22%,transparent)] transition group-hover:scale-[1.03]">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                    {commitmentDisplayTitle(commitment)}
                  </span>
                  <span className={cn(
                    "mt-1 block truncate text-xs",
                    selected ? "font-semibold text-[var(--success)]" : "text-[var(--foreground-muted)]",
                  )}>
                    Target: {commitment.targetValue} {commitment.unit}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              {commitmentDisplayTitle(selectedCommitment)}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {selectedActivity.key === "workout"
                ? "What exercises did you do today?"
                : activityQuestion(selectedCommitment, selectedMeasurement, "general")}
            </p>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Commitment target: {selectedCommitment.targetValue} {selectedCommitment.unit}
            </p>
            {selectedActivity.key === "coding" ? (
              <p className="mt-2 text-sm font-semibold text-[var(--accent-pro)]">
                Track: {appState.learningTracks.find((track) => track.status === "active")?.title ?? "No active Learning track"}
              </p>
            ) : null}
          </div>

          {selectedActivity.key === "workout" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Workout session</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Add every exercise you completed, then save once.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-9 gap-1.5 rounded-full px-3 text-xs"
                  onClick={() => setWorkoutEntries((entries) => [...entries, createWorkoutEntry("general")])}
                >
                  <Plus aria-hidden="true" className="size-3.5" /> Add exercise
                </Button>
              </div>
              <div className="space-y-3">
                {workoutEntries.map((entry, index) => {
                  const entryMeasurement = getWorkoutMeasurement(entry.exercise, entry.measurementType);
                  const entryOptions = getMeasurementOptions("workout", entry.exercise, selectedActivity);
                  const ExerciseIcon = workoutExerciseIcons[entry.exercise];

                  return (
                    <div key={entry.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 sm:p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(12rem,1.1fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_auto] md:items-end">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">Exercise {index + 1}</span>
                          <span className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm font-semibold text-[var(--foreground)]">
                            <ExerciseIcon aria-hidden="true" className="size-4 text-[var(--accent-pro)]" />
                            <select
                              className="min-w-0 flex-1 bg-transparent outline-none"
                              value={entry.exercise}
                              onChange={(event) => {
                                const exercise = event.target.value as WorkoutExercise;
                                const nextOptions = getMeasurementOptions("workout", exercise, selectedActivity);
                                setWorkoutEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, exercise, measurementType: nextOptions[0]?.type ?? "completion", value: "" } : item));
                              }}
                            >
                              {workoutExerciseOptions.map((exercise) => <option key={exercise.value} value={exercise.value}>{exercise.label}</option>)}
                            </select>
                          </span>
                        </label>
                        {entryOptions.length > 1 ? (
                          <label className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">Measure</span>
                            <select
                              className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--foreground)]"
                              value={entry.measurementType}
                              onChange={(event) => setWorkoutEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, measurementType: event.target.value as MeasurementType, value: "" } : item))}
                            >
                              {entryOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}
                            </select>
                          </label>
                        ) : <div className="hidden md:block" />}
                        {entryMeasurement.type === "completion" ? (
                          <div className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--foreground-muted)]">Completed</div>
                        ) : (
                          <label className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">{entryMeasurement.label}</span>
                            <span className="flex min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)]">
                              <input className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--foreground)] outline-none" inputMode="decimal" min="0" step="any" type="number" value={entry.value} onChange={(event) => setWorkoutEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, value: event.target.value } : item))} />
                              <span className="flex items-center border-l border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground-muted)]">{entryMeasurement.unit}</span>
                            </span>
                          </label>
                        )}
                        {workoutEntries.length > 1 ? (
                          <button type="button" className="grid min-h-11 place-items-center rounded-md border border-[var(--border)] px-3 text-[var(--foreground-muted)] transition hover:border-[var(--accent-pro)] hover:text-[var(--accent-pro)]" aria-label={`Remove ${workoutExerciseLabel(entry.exercise)}`} onClick={() => setWorkoutEntries((entries) => entries.filter((item) => item.id !== entry.id))}>
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        ) : <div />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedActivity.key === "running" ? (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]">
                  <Footprints aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Running session</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
                    Record the distance you actually completed. One session keeps the running history clear.
                  </p>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  Distance
                </span>
                <span className="flex min-h-12 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)]">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-base font-semibold text-[var(--foreground)] outline-none"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    type="number"
                    value={measurementValue}
                    onChange={(event) => setMeasurementValue(event.target.value)}
                    aria-describedby={error ? "activity-log-error" : undefined}
                    placeholder="0.00"
                  />
                  <span className="flex items-center border-l border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground-muted)]">
                    km
                  </span>
                </span>
              </label>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
            {measurementOptions.length > 1 ? (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Measure by
                </span>
                <select
                  className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                  value={measurementType}
                  onChange={(event) => {
                    setMeasurementType(event.target.value as MeasurementType);
                    setMeasurementValue("");
                    setError(null);
                  }}
                >
                  {measurementOptions.map((measurement) => (
                    <option key={measurement.type} value={measurement.type}>
                      {measurement.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            </div>
          )}

          {selectedActivity.key !== "workout" && selectedActivity.key !== "running" && selectedMeasurement.type !== "completion" ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {selectedMeasurement.label}
              </span>
              <div className="flex min-w-0">
                <input
                  className="min-h-11 min-w-0 flex-1 rounded-l-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  type="number"
                  value={measurementValue}
                  onChange={(event) => setMeasurementValue(event.target.value)}
                  aria-describedby={error ? "activity-log-error" : undefined}
                />
                <span className="inline-flex min-h-11 items-center rounded-r-md border border-l-0 border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm font-semibold text-[var(--foreground-muted)]">
                  {selectedMeasurement.unit}
                </span>
              </div>
            </label>
          ) : selectedActivity.key !== "workout" && selectedActivity.key !== "running" ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Completion
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                This activity is recorded as completed without a numeric value.
              </p>
            </div>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Notes
            </span>
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
              placeholder="Optional..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          {error ? (
            <p
              id="activity-log-error"
              className="text-sm font-semibold text-[var(--destructive)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {success ? (
            <div
              className="motion-panel rounded-md bg-[var(--accent-subtle)] px-4 py-3"
              role="status"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Activity recorded
              </p>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {success.activityLabel} - {success.measurementText}
                {success.matchedQuestCount > 0 ? " - Quest completed" : ""}
              </p>
            </div>
          ) : null}

          <Button className="action-pill min-w-44 gap-2" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ClipboardPenLine aria-hidden="true" className="size-4" strokeWidth={1.9} />}
            {isSubmitting
              ? "Recording..."
              : selectedActivity.key === "workout"
                ? "Record Workout Session"
                : selectedActivity.key === "running"
                  ? "Record Running Session"
                : "Record Activity"}
          </Button>
        </form>
      </Card>
      ) : null}

      <DailyQuests
        evidence={appState.evidence}
        weeklyReminders={appState.weeklyReminders}
        quests={quests}
        weeklyRequirements={getScheduledRequirementsForCurrentWeek(appState)}
        now={appState.now}
        timePolicy={appState.timePolicy}
      />
      <ActivityHistory
        records={sortedRecords}
        now={appState.now}
        timezone={appState.timePolicy.timezone}
      />
    </div>
  );
}

function formatMeasurementText(measurement: {
  type: MeasurementType;
  value?: number;
  unit?: string;
}) {
  if (measurement.type === "completion") return "Completed";

  return `${measurement.value ?? 0} ${measurement.unit ?? ""}`.trim();
}

function getActivityDefinition(activityKey: ActivityKey): ActivityDefinition {
  return (
    activityDefinitions.find((definition) => definition.key === activityKey) ??
    fallbackActivityDefinition
  );
}

function createWorkoutEntry(exercise: WorkoutExercise): WorkoutEntry {
  const measurement = getWorkoutMeasurement(exercise, exercise === "skipping" ? "repetitions" : exercise === "general" ? "completion" : "repetitions");
  return {
    id: `workout-entry:${crypto.randomUUID()}`,
    exercise,
    measurementType: measurement.type,
    value: "",
  };
}

const workoutExerciseOptions: Array<{ value: WorkoutExercise; label: string }> = [
  { value: "general", label: "General workout" },
  { value: "running", label: "Running" },
  { value: "skipping", label: "Skipping" },
  { value: "pushups", label: "Push-ups" },
  { value: "pullups", label: "Pull-ups" },
  { value: "squats", label: "Squats" },
];

const workoutExerciseIcons: Record<WorkoutExercise, LucideIcon> = {
  general: Activity,
  running: Footprints,
  skipping: Timer,
  pushups: Dumbbell,
  pullups: ArrowUpDown,
  squats: Dumbbell,
};

function getMeasurementOptions(
  activityKey: ActivityKey | undefined,
  exercise: WorkoutExercise,
  activityDefinition: ActivityDefinition,
) {
  if (activityKey !== "workout" || exercise === "general") {
    return activityDefinition.measurementOptions;
  }

  if (exercise === "running") {
    return [{ type: "distance", label: "Distance", unit: "km" }] satisfies MeasurementOption[];
  }

  if (exercise === "skipping") {
    return [
      { type: "repetitions", label: "Jumps", unit: "jumps" },
      { type: "duration", label: "Duration", unit: "minutes" },
    ] satisfies MeasurementOption[];
  }

  return [{ type: "repetitions", label: "Repetitions", unit: "reps" }] satisfies MeasurementOption[];
}

function getWorkoutMeasurement(exercise: WorkoutExercise, measurementType: MeasurementType): MeasurementOption {
  const options = getMeasurementOptions("workout", exercise, activityDefinitions[0] as ActivityDefinition);
  return options.find((option) => option.type === measurementType) ?? options[0] ?? { type: "completion", label: "Completion", unit: "completed" };
}

function activityQuestion(
  commitment: GrowthCommitment,
  measurement: MeasurementOption,
  exercise: WorkoutExercise,
) {
  if (commitment.activityKey === "workout" && exercise !== "general") {
    if (exercise === "skipping") {
      return measurement.type === "repetitions"
        ? "How many jumps did you complete?"
        : "How many minutes did you skip?";
    }

    if (exercise === "running") {
      return "How many km did you run?";
    }

    if (exercise === "pushups" || exercise === "pullups" || exercise === "squats") {
      return `How many reps of ${workoutExerciseLabel(exercise).toLowerCase()} did you complete?`;
    }

    return `How many ${measurement.unit} of ${workoutExerciseLabel(exercise).toLowerCase()} did you complete?`;
  }

  if (measurement.type === "completion") {
    return `Did you complete ${commitmentDisplayTitle(commitment)}?`;
  }

  const verbs: Partial<Record<ActivityKey, string>> = {
    running: "run",
    reading: "read",
    workout: "train",
    coding: "focus",
    meditation: "practice",
    sleep: "sleep",
    water: "drink",
  };
  const verb = verbs[commitment.activityKey] ?? "complete";
  if (measurement.type === "volume") {
    return `How much did you ${verb}? Enter your ${measurement.label.toLowerCase()} in ${measurement.unit}.`;
  }

  return `How many ${measurement.unit} did you ${verb}?`;
}

function workoutExerciseLabel(exercise: WorkoutExercise) {
  return workoutExerciseOptions.find((item) => item.value === exercise)?.label ?? "workout";
}

function getMeasurementOption(
  activityDefinition: ActivityDefinition,
  measurementType: MeasurementType,
): MeasurementOption {
  const fallbackMeasurement = activityDefinition
    .measurementOptions[0] as MeasurementOption;

  return (
    activityDefinition.measurementOptions.find(
      (measurement) => measurement.type === measurementType,
    ) ?? fallbackMeasurement
  );
}

function formatMeasurement(record: ActivityRecord) {
  if (record.measurement.type === "completion") {
    return "Completed";
  }

  return `${record.measurement.value} ${record.measurement.unit}`;
}
