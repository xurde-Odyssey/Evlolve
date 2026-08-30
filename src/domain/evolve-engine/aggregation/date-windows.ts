export type PeriodWindow = {
  start: Date;
  end: Date;
  periodStart: string;
  periodEnd: string;
};

export function getSundayToSaturdayWeek(anchorDate: string | Date): PeriodWindow {
  const anchor = coerceDate(anchorDate);
  const start = startOfUtcDay(anchor);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return toWindow(start, end);
}

export function getCalendarMonth(anchorDate: string | Date): PeriodWindow {
  const anchor = coerceDate(anchorDate);
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));

  return toWindow(start, end);
}

export function isEvidenceInWindow(
  evidenceDate: string | undefined,
  window: PeriodWindow,
) {
  if (!evidenceDate) {
    return false;
  }

  const date = new Date(evidenceDate);

  return (
    Number.isFinite(date.getTime()) &&
    date.getTime() >= window.start.getTime() &&
    date.getTime() < window.end.getTime()
  );
}

function coerceDate(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid aggregation anchor date.");
  }

  return date;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toWindow(start: Date, end: Date): PeriodWindow {
  return {
    start,
    end,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}
