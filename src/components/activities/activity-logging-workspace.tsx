"use client";

import { useMemo, useState, type FormEvent } from "react";
import { activityDefinitions } from "@/config/activity-definitions";
import { activityIcons } from "@/config/icon-maps";
import { ActivityHistory } from "@/components/activities/activity-history";
import { DailyQuests } from "@/components/quests/daily-quests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import Link from "next/link";
import {
  createEvolveApplication,
  getDailyQuestViewModel,
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
        activityLabel: selectedActivity.label,
        measurementText: formatMeasurementText({
          type: selectedMeasurement.type,
          value: parsedValue,
          unit: selectedMeasurement.unit,
        }),
        matchedQuestCount: result.data.matchedRequirementCount,
      });
      setLastSubmissionSignature(submissionSignature);
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

  return (
    <div className="space-y-6">
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
                    ? "border-[var(--primary)] bg-[var(--background)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--primary)]"
                }`}
                onClick={() => handleCommitmentChange(commitment)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--primary)]">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                    {commitment.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--foreground-muted)]">
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
              {selectedCommitment.title}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {activityQuestion(selectedCommitment, selectedMeasurement)}
            </p>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Commitment target: {selectedCommitment.targetValue} {selectedCommitment.unit}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {selectedActivity.measurementOptions.length > 1 ? (
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
                  {selectedActivity.measurementOptions.map((measurement) => (
                    <option key={measurement.type} value={measurement.type}>
                      {measurement.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {selectedMeasurement.type !== "completion" ? (
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
          ) : (
            <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Completion
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                This activity is recorded as completed without a numeric value.
              </p>
            </div>
          )}

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

          <Button className="min-w-36" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Activity"}
          </Button>
        </form>
      </Card>
      ) : null}

      <DailyQuests activityRecords={activityRecords} quests={quests} />
      <ActivityHistory records={sortedRecords} />
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

function activityQuestion(
  commitment: GrowthCommitment,
  measurement: MeasurementOption,
) {
  if (measurement.type === "completion") {
    return `Did you complete ${commitment.title}?`;
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
