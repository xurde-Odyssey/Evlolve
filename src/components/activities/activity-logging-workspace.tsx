"use client";

import { useMemo, useState, type FormEvent } from "react";
import { activityDefinitions } from "@/config/activity-definitions";
import { ActivityHistory } from "@/components/activities/activity-history";
import { DailyQuests } from "@/components/quests/daily-quests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import Link from "next/link";
import { getDemoQuestStatus } from "@/lib/demo/quest-matching";
import type {
  ActivityDefinition,
  ActivityKey,
  ActivityRecord,
  MeasurementOption,
  MeasurementType,
} from "@/types/activity";
import type { DailyQuest } from "@/types/quest";

const fallbackActivityDefinition = activityDefinitions[0] as ActivityDefinition;

type ActivityLoggingWorkspaceProps = {
  initialActivityRecords: ActivityRecord[];
  quests: DailyQuest[];
};

type SuccessState = {
  activityLabel: string;
  measurementText: string;
  matchedQuestCount: number;
};

export function ActivityLoggingWorkspace({
  initialActivityRecords,
  quests,
}: ActivityLoggingWorkspaceProps) {
  if (activityDefinitions.length === 0) {
    return (
      <SystemState
        title="No active activities."
        description="Activate an Improvement Area before logging work."
        action={
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
            href="/settings"
          >
            Activate Improvement Area
          </Link>
        }
      />
    );
  }

  return (
    <ActivityLoggingSession
      initialActivityRecords={initialActivityRecords}
      quests={quests}
    />
  );
}

function ActivityLoggingSession({
  initialActivityRecords,
  quests,
}: ActivityLoggingWorkspaceProps) {
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>(
    initialActivityRecords,
  );
  const [activityKey, setActivityKey] = useState<ActivityKey>(
    fallbackActivityDefinition.key,
  );
  const selectedActivity = getActivityDefinition(activityKey);
  const [measurementType, setMeasurementType] = useState<MeasurementType>(
    selectedActivity.measurementOptions[0]?.type ?? "completion",
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

  function handleActivityChange(nextKey: ActivityKey) {
    const nextActivity = getActivityDefinition(nextKey);
    setActivityKey(nextKey);
    setMeasurementType(nextActivity.measurementOptions[0]?.type ?? "completion");
    setMeasurementValue("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    const record: ActivityRecord = {
      id: `activity-${activityRecords.length + 1}-${selectedActivity.key}`,
      activityKey: selectedActivity.key,
      activityLabel: selectedActivity.label,
      measurement: {
        type: selectedMeasurement.type,
        value: parsedValue,
        unit: selectedMeasurement.unit,
      },
      notes: notes.trim() || undefined,
      occurredAt,
      status: "completed",
    };
    const nextRecords = [record, ...activityRecords];
    const matchedQuestCount = countNewDemoQuestMatches(
      quests,
      activityRecords,
      nextRecords,
    );

    setActivityRecords(nextRecords);
    setMeasurementValue("");
    setNotes("");
    setSuccess({
      activityLabel: record.activityLabel,
      measurementText: formatMeasurement(record),
      matchedQuestCount,
    });
    setLastSubmissionSignature(submissionSignature);
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Log activity
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Record completed real-world activity while it is still recent.
            Long-term 24-hour validation will be enforced later.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                What did you do?
              </span>
              <select
                className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                value={activityKey}
                onChange={(event) =>
                  handleActivityChange(event.target.value as ActivityKey)
                }
              >
                {activityDefinitions.map((activityDefinition) => (
                  <option
                    key={activityDefinition.key}
                    value={activityDefinition.key}
                  >
                    {activityDefinition.label}
                  </option>
                ))}
              </select>
            </label>

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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Activity"}
          </Button>
        </form>
      </Card>

      <DailyQuests activityRecords={activityRecords} quests={quests} />
      <ActivityHistory records={sortedRecords} />
    </div>
  );
}

function getActivityDefinition(activityKey: ActivityKey): ActivityDefinition {
  return (
    activityDefinitions.find((definition) => definition.key === activityKey) ??
    fallbackActivityDefinition
  );
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

function countNewDemoQuestMatches(
  quests: DailyQuest[],
  previousRecords: ActivityRecord[],
  nextRecords: ActivityRecord[],
) {
  return quests.filter((quest) => {
    if (quest.status !== "pending" || !quest.target) {
      return false;
    }

    const wasMatched = getDemoQuestStatus(quest, previousRecords) === "completed";
    const isMatched = getDemoQuestStatus(quest, nextRecords) === "completed";

    return !wasMatched && isMatched;
  }).length;
}
