export type UserTimePolicy = {
  timezone: string;
  progressionDeadlineHour: 22;
  reminderHour: 17;
  calendarBoundaryHour: 0;
  weekStartsOn: "SUNDAY";
};

export const defaultUserTimePolicy = {
  timezone: "Asia/Kathmandu",
  progressionDeadlineHour: 22,
  reminderHour: 17,
  calendarBoundaryHour: 0,
  weekStartsOn: "SUNDAY",
} satisfies UserTimePolicy;

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
};

const weekdayMap = {
  Sun: "SUNDAY",
  Mon: "MONDAY",
  Tue: "TUESDAY",
  Wed: "WEDNESDAY",
  Thu: "THURSDAY",
  Fri: "FRIDAY",
  Sat: "SATURDAY",
} as const;

export function getLocalDateParts(instant: string | Date, timezone: string): LocalDateParts {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";
  const weekdayToken = value("weekday") as keyof typeof weekdayMap;

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
    weekday: weekdayMap[weekdayToken] ?? "SUNDAY",
  };
}

export function getLocalDateKey(instant: string | Date, timezone: string) {
  const parts = getLocalDateParts(instant, timezone);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getProgressionDeadlineAt(
  scheduledDate: string,
  policy: UserTimePolicy = defaultUserTimePolicy,
) {
  return zonedLocalTimeToUtcIso(scheduledDate, policy.progressionDeadlineHour, 0, policy.timezone);
}

export function getProgressionDeadlineLabel(policy: UserTimePolicy = defaultUserTimePolicy) {
  return formatHourLabel(policy.progressionDeadlineHour);
}

export function getReminderThresholdLabel(policy: UserTimePolicy = defaultUserTimePolicy) {
  return formatHourLabel(policy.reminderHour);
}

export function getCalendarBoundaryLabel(policy: UserTimePolicy = defaultUserTimePolicy) {
  return formatHourLabel(policy.calendarBoundaryHour);
}

export function getCalendarBoundaryAt(
  scheduledDate: string,
  policy: UserTimePolicy = defaultUserTimePolicy,
) {
  return zonedLocalTimeToUtcIso(scheduledDate, policy.calendarBoundaryHour, 0, policy.timezone);
}

export function getDeadlineState({
  now,
  deadlineAt,
}: {
  now: string;
  deadlineAt: string;
}) {
  return new Date(now).getTime() <= new Date(deadlineAt).getTime()
    ? "ON_TIME"
    : "AFTER_DEADLINE";
}

export function getNotificationDeadlineState({
  now,
  hasUnresolvedRequiredWork,
  policy = defaultUserTimePolicy,
}: {
  now: string;
  hasUnresolvedRequiredWork: boolean;
  policy?: UserTimePolicy;
}) {
  if (!hasUnresolvedRequiredWork) return "complete";

  const local = getLocalDateParts(now, policy.timezone);
  if (local.hour >= policy.progressionDeadlineHour) return "closeout";
  if (local.hour >= 21) return "critical";
  if (local.hour >= policy.reminderHour) return "warning";
  return "before_warning";
}

export function getSundayToSaturdayDateKeys(anchor: string, timezone: string) {
  const anchorDate = new Date(anchor);
  const local = getLocalDateParts(anchorDate, timezone);
  const dayIndex = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(local.weekday);
  const start = addUtcDays(anchorDate, -dayIndex);

  return Array.from({ length: 7 }, (_, index) => getLocalDateKey(addUtcDays(start, index), timezone));
}

function zonedLocalTimeToUtcIso(
  dateKey: string,
  hour: number,
  minute: number,
  timezone: string,
) {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let index = 0; index < 3; index += 1) {
    const parts = getLocalDateParts(candidate, timezone);
    const deltaMinutes =
      (parts.year - year) * 525_600 +
      (parts.month - month) * 43_800 +
      (parts.day - day) * 1_440 +
      (parts.hour - hour) * 60 +
      (parts.minute - minute);
    candidate = new Date(candidate.getTime() - deltaMinutes * 60_000);
  }

  return candidate.toISOString();
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatHourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const hour12 = normalized % 12 || 12;

  return `${hour12}:00 ${suffix}`;
}
