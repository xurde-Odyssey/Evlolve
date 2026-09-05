import type { SimulationDuration } from "../types";

const dayMs = 86_400_000;

export function durationToDays(duration: SimulationDuration) {
  if (duration === "1w") return 7;
  if (duration === "1m") return 31;
  if (duration === "3m") return 92;
  if (duration === "6m") return 183;
  if (duration === "12m") return 365;
  return 730;
}

export function addDays(start: string, offset: number) {
  return new Date(new Date(start).getTime() + offset * dayMs).toISOString();
}

export function isScheduled(schedule: "daily" | "weekday" | "three_per_week", date: string) {
  const day = new Date(date).getUTCDay();

  if (schedule === "daily") {
    return true;
  }

  if (schedule === "weekday") {
    return day >= 1 && day <= 5;
  }

  return day === 1 || day === 3 || day === 5;
}

export function isWeekCloseout(date: string) {
  return new Date(date).getUTCDay() === 6;
}

export function isMonthCloseout(date: string, nextDate: string | null) {
  if (!nextDate) {
    return true;
  }

  return new Date(date).getUTCMonth() !== new Date(nextDate).getUTCMonth();
}

export function periodKey(date: string) {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}
