import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { activityIcons } from "@/config/icon-maps";
import { getLocalDateKey } from "@/application/evolve/time-policy";
import type { ActivityRecord } from "@/types/activity";

type ActivityHistoryProps = {
  records: ActivityRecord[];
  now: string;
  timezone: string;
};

export function ActivityHistory({ records, now, timezone }: ActivityHistoryProps) {
  const today = getLocalDateKey(now, timezone);
  const todayRecords = records.filter(
    (record) => getLocalDateKey(record.occurredAt, timezone) === today,
  );

  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Recent activity
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Your latest logged actions today.
        </p>
      </div>

      {todayRecords.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {todayRecords.map((record) => (
            <ActivityHistoryRow key={record.id} record={record} timezone={timezone} />
          ))}
        </ul>
      ) : (
        <SystemState
          title="No activity recorded today."
          description="Log completed work to see today's activity here."
          compact
        />
      )}
    </Card>
  );
}

function ActivityHistoryRow({ record, timezone }: { record: ActivityRecord; timezone: string }) {
  const Icon = activityIcons[record.activityKey];
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {displayActivityLabel(record)}
          </p>
          {record.notes ? (
            <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
              {record.notes}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
          {formatMeasurement(record)}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Today - {dateFormatter.format(new Date(record.occurredAt))}
        </p>
      </div>
    </li>
  );
}

function formatMeasurement(record: ActivityRecord) {
  if (record.measurement.type === "completion") {
    return "Completed";
  }

  return `${record.measurement.value} ${record.measurement.unit}`;
}

function displayActivityLabel(record: ActivityRecord) {
  if (record.activityKey !== "coding") return record.activityLabel;

  return record.activityLabel
    .replace(/^Coding\s*\/\s*Learning\b/i, "Learning")
    .replace(/^Coding\b/i, "Learning");
}
