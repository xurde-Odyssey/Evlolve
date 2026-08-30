import type { ActivityRecord } from "@/types/activity";
import type { DailyQuest, QuestStatus } from "@/types/quest";

// Temporary demo matching only. This is not the final quest evaluation engine.
export function getDemoQuestStatus(
  quest: DailyQuest,
  activityRecords: ActivityRecord[],
): QuestStatus {
  if (quest.status !== "pending" || !quest.target) {
    return quest.status;
  }

  const hasMatchingActivity = activityRecords.some((activityRecord) => {
    if (
      activityRecord.activityKey !== quest.target?.activityKey ||
      activityRecord.measurement.type !== quest.target.measurementType
    ) {
      return false;
    }

    if (typeof quest.target.value !== "number") {
      return true;
    }

    return (
      typeof activityRecord.measurement.value === "number" &&
      activityRecord.measurement.value >= quest.target.value
    );
  });

  return hasMatchingActivity ? "completed" : quest.status;
}
